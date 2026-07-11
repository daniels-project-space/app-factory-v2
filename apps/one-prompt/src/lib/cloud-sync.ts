import { supabase } from './supabase';
import { useAuthStore } from './state/auth-store';
import { useSettingsStore } from './state/settings-store';
import { useJournalStore, JournalEntry, MoodEntry } from './state/journal-store';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---- Types ----
interface CloudJournalEntry {
  id: string;
  user_id: string;
  date: string;
  prompt: string;
  content: string;
  reveal_at: number | null;
  photo_uri: string | null;
  photo_prompt: string | null;
  mood: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncQueueItem {
  type: 'upsert' | 'delete';
  date: string;
  entry?: JournalEntry;
  mood?: MoodEntry;
  timestamp: number;
  retryCount?: number;
}

const MAX_QUEUE_RETRIES = 4;

// ---- State ----
let syncQueue: SyncQueueItem[] = [];
let isSyncing = false;

const SYNC_QUEUE_KEY = 'cloud-sync-queue';

async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  } catch {
    // Non-fatal: queue will just be in-memory this session
  }
}

export async function loadPersistedQueue(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SyncQueueItem[];
      syncQueue = [...syncQueue, ...parsed];
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    }
  } catch {
    // Non-fatal
  }
}
let syncListeners: ((status: SyncStatus) => void)[] = [];

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'uploading_photo'; photoDate: string }
  | { state: 'success'; syncedCount: number }
  | { state: 'error'; message: string }
  | { state: 'offline' };

let currentStatus: SyncStatus = { state: 'idle' };

function setStatus(status: SyncStatus) {
  currentStatus = status;
  syncListeners.forEach((listener) => listener(status));
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

/**
 * Reset module-level sync state on sign-out to prevent previous user's queued
 * operations from being applied under a new user's session.
 */
export function resetSyncState(): void {
  syncQueue = [];
  isSyncing = false;
  setStatus({ state: 'idle' });
  AsyncStorage.removeItem(SYNC_QUEUE_KEY).catch((_err) => void 0);
}

export function onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

// ---- Helpers ----
function getUserId(): string | null {
  const user = useAuthStore.getState().user;
  return user?.id ?? null;
}

function isSyncEnabled(): boolean {
  return useSettingsStore.getState().cloudSyncEnabled;
}

async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  } catch {
    // If NetInfo fails (e.g. web), assume online
    return true;
  }
}

/**
 * Refresh a Supabase storage signed URL that may be expiring within 30 days.
 * Extracts the storage path from the signed URL and generates a fresh 1-year URL.
 * Returns the original URL if it cannot be parsed or refreshed.
 */
async function refreshSignedUrlIfExpiringSoon(signedUrl: string): Promise<string> {
  try {
    // Only process Supabase storage signed URLs
    const pathMatch = signedUrl.match(/\/object\/sign\/journal-photos\/(.+?)(?:\?|$)/);
    if (!pathMatch?.[1]) return signedUrl;

    // Decode the token to check expiry without making a network call
    const tokenMatch = signedUrl.match(/[?&]token=([^&]+)/);
    if (tokenMatch?.[1]) {
      const [, payloadB64] = tokenMatch[1].split('.');
      if (payloadB64) {
        const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
        const expiresAt = (payload.exp as number | undefined) ?? 0;
        const thirtyDaysFromNow = Date.now() / 1000 + 30 * 24 * 60 * 60;
        if (expiresAt > thirtyDaysFromNow) {
          // More than 30 days remaining — no refresh needed
          return signedUrl;
        }
      }
    }

    const storagePath = decodeURIComponent(pathMatch[1]);
    const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
    const { data, error } = await supabase.storage
      .from('journal-photos')
      .createSignedUrl(storagePath, ONE_YEAR_SECONDS);

    if (error || !data) return signedUrl;
    return data.signedUrl;
  } catch {
    return signedUrl;
  }
}

/**
 * Upload a local photo to Supabase Storage and return the public URL.
 * Compresses to max 1024px / 80% quality JPEG before uploading.
 * Returns null if upload fails (entry will still sync without photo).
 */
async function uploadPhotoToStorage(
  localUri: string,
  userId: string,
  date: string
): Promise<string | null> {
  // Skip if already a remote URL
  if (localUri.startsWith('https://') || localUri.startsWith('http://')) {
    return localUri;
  }

  try {
    // Compress image to max 1024px / 80% quality
    const compressed = await manipulateAsync(
      localUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: SaveFormat.JPEG }
    );

    // Read compressed file as base64
    const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Decode base64 to Uint8Array
    const byteCharacters = atob(base64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }

    const storagePath = `${userId}/photos/${date}.jpg`;

    const { error } = await supabase.storage
      .from('journal-photos')
      .upload(storagePath, byteArray, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('[CloudSync] Photo upload error:', error.message);
      return null;
    }

    // journal-photos is a private bucket so getPublicUrl() returns a URL that 403s.
    // Use a long-lived signed URL instead so photos survive device restores.
    const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
    const { data: signedData, error: signError } = await supabase.storage
      .from('journal-photos')
      .createSignedUrl(storagePath, ONE_YEAR_SECONDS);

    if (signError || !signedData) {
      console.error('[CloudSync] Photo signed URL error:', signError?.message);
      return null;
    }

    return signedData.signedUrl;
  } catch (err) {
    console.error('[CloudSync] Photo upload exception:', err);
    return null;
  }
}

function localToCloud(entry: JournalEntry, userId: string): Record<string, unknown> {
  const mood = useJournalStore.getState().getMoodForDate(entry.date);
  // Only sync cloud URLs (https://). Local file URIs must be uploaded first; syncing them
  // would overwrite a valid cloud URL with null on the remote row.
  const cloudPhotoUri =
    entry.photoUri && entry.photoUri.startsWith('https://') ? entry.photoUri : null;
  return {
    user_id: userId,
    date: entry.date,
    prompt: entry.prompt,
    content: entry.content,
    reveal_at: entry.revealAt,
    photo_uri: cloudPhotoUri,
    photo_prompt: entry.photoPrompt ?? null,
    mood: mood?.mood ?? null,
  };
}

function cloudToLocal(cloud: CloudJournalEntry): JournalEntry {
  const createdAt = new Date(cloud.created_at).getTime();
  return {
    id: cloud.date + '-' + createdAt,
    date: cloud.date,
    prompt: cloud.prompt,
    content: cloud.content,
    createdAt,
    updatedAt: new Date(cloud.updated_at).getTime(),
    revealAt: cloud.reveal_at ?? createdAt,
    photoUri: cloud.photo_uri ?? undefined,
    photoPrompt: cloud.photo_prompt ?? undefined,
  };
}

// ---- Core Sync Functions ----

/**
 * Sync a single entry to the cloud after saving locally.
 * Called automatically when cloudSyncEnabled is true.
 */
export async function syncEntry(date: string): Promise<void> {
  const userId = getUserId();
  if (!userId || !isSyncEnabled()) return;

  // Defer to in-progress fullSync to avoid concurrent upserts on the same row
  if (isSyncing) {
    const entry = useJournalStore.getState().getEntryByDate(date);
    if (entry) {
      syncQueue.push({ type: 'upsert', date, entry, timestamp: Date.now() });
      await persistQueue();
    }
    return;
  }

  const online = await isOnline();
  if (!online) {
    const entry = useJournalStore.getState().getEntryByDate(date);
    if (entry) {
      syncQueue.push({ type: 'upsert', date, entry, timestamp: Date.now() });
      await persistQueue();
    }
    setStatus({ state: 'offline' });
    return;
  }

  try {
    const entry = useJournalStore.getState().getEntryByDate(date);
    if (!entry) return;

    // Upload photo to Supabase Storage if this is a local photo entry
    let entryToSync = entry;
    if (entry.photoUri && !entry.photoUri.startsWith('https://')) {
      setStatus({ state: 'uploading_photo', photoDate: date });
      const cloudPhotoUrl = await uploadPhotoToStorage(entry.photoUri, userId, date);
      if (cloudPhotoUrl) {
        // Preserve the original local file URI so the photo remains viewable even after the
        // signed URL expires (e.g. offline, sync disabled, or after 1 year expiry).
        const localUri = entry.photoUri;
        useJournalStore.setState((state) => ({
          entries: state.entries.map((e) =>
            e.date === date
              ? { ...e, photoUri: cloudPhotoUrl, localPhotoUri: localUri }
              : e
          ),
        }));
        entryToSync = { ...entry, photoUri: cloudPhotoUrl };
      }
    }

    const cloudData = localToCloud(entryToSync, userId);

    const { error } = await supabase
      .from('journal_entries')
      .upsert(cloudData, { onConflict: 'user_id,date' });

    if (error) {
      console.error('[CloudSync] syncEntry error:', error.message);
      syncQueue.push({ type: 'upsert', date, entry, timestamp: Date.now(), retryCount: 0 });
      await persistQueue();
    }
  } catch (err) {
    console.error('[CloudSync] syncEntry exception:', err);
    const entry = useJournalStore.getState().getEntryByDate(date);
    if (entry) {
      syncQueue.push({ type: 'upsert', date, entry, timestamp: Date.now(), retryCount: 0 });
      await persistQueue();
    }
  }
}

/**
 * Pull all entries from the cloud and merge with local.
 * Cloud entries win if updated_at is newer; local wins otherwise.
 * Entries only in cloud get added locally; entries only locally get pushed up.
 */
export async function syncFromCloud(): Promise<number> {
  const userId = getUserId();
  if (!userId || !isSyncEnabled()) return 0;

  const online = await isOnline();
  if (!online) {
    setStatus({ state: 'offline' });
    return 0;
  }

  if (isSyncing) return 0;
  isSyncing = true;
  setStatus({ state: 'syncing' });

  try {
    const { data: cloudEntries, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('[CloudSync] syncFromCloud fetch error:', error.message);
      setStatus({ state: 'error', message: error.message });
      return 0;
    }

    if (!cloudEntries) {
      setStatus({ state: 'success', syncedCount: 0 });
      return 0;
    }

    const localEntries = useJournalStore.getState().entries;
    // Dedup by date — keep the entry with the latest updatedAt when duplicates exist
    const localByDate = new Map<string, typeof localEntries[number]>();
    for (const e of localEntries) {
      const existing = localByDate.get(e.date);
      if (!existing || (e.updatedAt ?? e.createdAt) > (existing.updatedAt ?? existing.createdAt)) {
        localByDate.set(e.date, e);
      }
    }
    const cloudByDate = new Map((cloudEntries as CloudJournalEntry[]).map((e) => [e.date, e]));

    let syncedCount = 0;

    // 1. Merge cloud entries into local
    for (const [date, cloudEntry] of cloudByDate) {
      const localEntry = localByDate.get(date);

      if (!localEntry) {
        // Cloud-only: add to local store
        const newLocal = cloudToLocal(cloudEntry);
        useJournalStore.setState((state) => ({
          entries: [...state.entries, newLocal],
        }));

        // Also restore mood if present
        if (cloudEntry.mood) {
          useJournalStore.getState().addMoodEntry({
            date: cloudEntry.date,
            mood: cloudEntry.mood,
            score: moodToScore(cloudEntry.mood),
          });
        }
        syncedCount++;
      } else {
        // Both exist: latest updated_at wins
        const cloudUpdated = new Date(cloudEntry.updated_at).getTime();
        const localUpdated = localEntry.updatedAt ?? localEntry.createdAt;

        if (cloudUpdated > localUpdated) {
          const updated = cloudToLocal(cloudEntry);
          useJournalStore.setState((state) => ({
            entries: state.entries.map((e) => (e.date === date ? updated : e)),
          }));
          syncedCount++;
        }
      }
    }

    // 1b. Refresh photo signed URLs approaching expiry (within 30 days)
    const allLocalEntries = useJournalStore.getState().entries;
    for (const entry of allLocalEntries) {
      if (entry.photoUri?.startsWith('https://') && entry.photoUri.includes('/object/sign/')) {
        const refreshed = await refreshSignedUrlIfExpiringSoon(entry.photoUri);
        if (refreshed !== entry.photoUri) {
          useJournalStore.setState((state) => ({
            entries: state.entries.map((e) =>
              e.date === entry.date ? { ...e, photoUri: refreshed } : e
            ),
          }));
        }
      }
    }

    // 2. Push local-only entries to cloud
    const entriesToPush: JournalEntry[] = [];
    for (const [date, localEntry] of localByDate) {
      if (!cloudByDate.has(date)) {
        entriesToPush.push(localEntry);
      }
    }

    if (entriesToPush.length > 0) {
      const cloudRows = entriesToPush.map((entry) => localToCloud(entry, userId));

      const { error: pushError } = await supabase
        .from('journal_entries')
        .upsert(cloudRows, { onConflict: 'user_id,date' });

      if (pushError) {
        console.error('[CloudSync] Push local entries error:', pushError.message);
      } else {
        syncedCount += entriesToPush.length;
      }
    }

    // Recalculate streak after merge
    useJournalStore.getState().calculateStreak();

    setStatus({ state: 'success', syncedCount });
    return syncedCount;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    console.error('[CloudSync] syncFromCloud exception:', message);
    setStatus({ state: 'error', message });
    return 0;
  } finally {
    isSyncing = false;
  }
}

/**
 * Push all local entries to the cloud. Used for initial sync or manual trigger.
 */
export async function syncToCloud(): Promise<number> {
  const userId = getUserId();
  if (!userId || !isSyncEnabled()) return 0;

  const online = await isOnline();
  if (!online) {
    setStatus({ state: 'offline' });
    return 0;
  }

  if (isSyncing) return 0;
  isSyncing = true;
  setStatus({ state: 'syncing' });

  try {
    const localEntries = useJournalStore.getState().entries;
    if (localEntries.length === 0) {
      setStatus({ state: 'success', syncedCount: 0 });
      return 0;
    }

    const cloudRows = localEntries.map((entry) => localToCloud(entry, userId));

    const { error } = await supabase
      .from('journal_entries')
      .upsert(cloudRows, { onConflict: 'user_id,date' });

    if (error) {
      console.error('[CloudSync] syncToCloud error:', error.message);
      setStatus({ state: 'error', message: error.message });
      return 0;
    }

    const count = localEntries.length;
    setStatus({ state: 'success', syncedCount: count });
    return count;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    console.error('[CloudSync] syncToCloud exception:', message);
    setStatus({ state: 'error', message });
    return 0;
  } finally {
    isSyncing = false;
  }
}

/**
 * Full bidirectional sync: pull from cloud, push local-only entries.
 * Intended for "Sync Now" button and app launch.
 */
export async function fullSync(): Promise<number> {
  return syncFromCloud();
}

/**
 * Process any queued sync items (from when the device was offline).
 */
export async function processQueue(): Promise<void> {
  if (syncQueue.length === 0) return;

  const online = await isOnline();
  if (!online) return;

  const userId = getUserId();
  if (!userId) return;

  const queue = [...syncQueue];
  syncQueue = [];

  for (const item of queue) {
    if (item.type === 'upsert' && item.entry) {
      let entryToSync = item.entry;

      // Upload photo if it's still a local URI
      if (item.entry.photoUri && !item.entry.photoUri.startsWith('https://')) {
        const cloudPhotoUrl = await uploadPhotoToStorage(
          item.entry.photoUri,
          userId,
          item.date
        );
        if (cloudPhotoUrl) {
          useJournalStore.setState((state) => ({
            entries: state.entries.map((e) =>
              e.date === item.date ? { ...e, photoUri: cloudPhotoUrl } : e
            ),
          }));
          entryToSync = { ...item.entry, photoUri: cloudPhotoUrl };
        }
      }

      const cloudData = localToCloud(entryToSync, userId);
      const { error } = await supabase
        .from('journal_entries')
        .upsert(cloudData, { onConflict: 'user_id,date' });

      if (error) {
        const retries = (item.retryCount ?? 0) + 1;
        if (retries < MAX_QUEUE_RETRIES) {
          console.warn(`[CloudSync] Queue item failed (attempt ${retries}/${MAX_QUEUE_RETRIES}):`, error.message);
          syncQueue.push({ ...item, retryCount: retries });
        } else {
          console.error(`[CloudSync] Queue item dropped after ${MAX_QUEUE_RETRIES} attempts:`, error.message);
        }
      }
    }
  }
}

// ---- Mood Helper ----
function moodToScore(mood: string): number {
  const moodScores: Record<string, number> = {
    joyful: 5, excited: 5, hopeful: 4, accomplished: 5,
    peaceful: 4, content: 4, grateful: 4, loved: 5,
    thoughtful: 3, neutral: 3, calm: 3,
    tired: 2, anxious: 2, stressed: 2, frustrated: 2,
    sad: 1, angry: 1, overwhelmed: 1,
  };
  return moodScores[mood.toLowerCase()] ?? 3;
}

// ---- Network Recovery ----
let unsubscribeNetInfo: (() => void) | null = null;

/**
 * Start listening for network recovery to process queued syncs.
 */
export function startNetworkListener(): void {
  if (unsubscribeNetInfo) return;

  try {
    unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && syncQueue.length > 0 && isSyncEnabled()) {
        processQueue().catch((e) => console.error('[CloudSync] processQueue on reconnect failed:', e));
      }
    });
  } catch {
    // NetInfo may not be available on all platforms
  }
}

/**
 * Stop the network recovery listener.
 */
export function stopNetworkListener(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}
