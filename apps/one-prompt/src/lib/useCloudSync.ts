import { useEffect, useCallback, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from './state/auth-store';
import { useSettingsStore } from './state/settings-store';
import { useJournalStore } from './state/journal-store';
import {
  fullSync,
  syncEntry,
  processQueue,
  startNetworkListener,
  stopNetworkListener,
  onSyncStatusChange,
  resetSyncState,
  SyncStatus,
} from './cloud-sync';

/**
 * Hook that orchestrates cloud sync.
 * - Runs fullSync on mount (if enabled + authenticated)
 * - Watches journal entries for changes and syncs new/updated entries
 * - Processes offline queue when coming back online
 * - Listens for app foreground to re-sync
 */
export function useCloudSync() {
  const user = useAuthStore((s) => s.user);
  const cloudSyncEnabled = useSettingsStore((s) => s.cloudSyncEnabled);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'idle' });
  const prevEntriesRef = useRef<string>('');
  const hasRunInitialSync = useRef(false);

  // Track sync status
  useEffect(() => {
    const unsub = onSyncStatusChange(setSyncStatus);
    return unsub;
  }, []);

  // Reset pending sync queue when the user signs out to prevent cross-account data leaks
  const prevUserRef = useRef<string | null>(null);
  useEffect(() => {
    const prevUser = prevUserRef.current;
    const nextUser = user?.id ?? null;
    if (prevUser !== null && nextUser === null) {
      // User just signed out — clear any queued operations from their session
      resetSyncState();
    }
    prevUserRef.current = nextUser;
  }, [user]);

  // Initial sync on mount or when sync gets enabled
  useEffect(() => {
    if (!cloudSyncEnabled || !user) {
      hasRunInitialSync.current = false;
      return;
    }

    if (hasRunInitialSync.current) return;
    hasRunInitialSync.current = true;

    // Small delay to let the store hydrate
    const timer = setTimeout(() => {
      fullSync().catch((e: unknown) => console.error('[CloudSync] initial fullSync failed:', e));
      processQueue().catch((e: unknown) => console.error('[CloudSync] initial processQueue failed:', e));
    }, 1500);

    return () => clearTimeout(timer);
  }, [cloudSyncEnabled, user]);

  // Watch for entry changes and sync individual entries
  useEffect(() => {
    if (!cloudSyncEnabled || !user) return;

    const unsub = useJournalStore.subscribe((state) => {
      const currentKeys = state.entries.map(
        (e) => e.date + ':' + e.updatedAt + ':' + (e.content || '').length
      );
      const currentSnapshot = JSON.stringify(currentKeys);

      if (prevEntriesRef.current && prevEntriesRef.current !== currentSnapshot) {
        const prevKeySet = new Set<string>(JSON.parse(prevEntriesRef.current) as string[]);

        for (const entry of state.entries) {
          const prevKey = entry.date + ':' + entry.updatedAt + ':' + (entry.content || '').length;
          if (!prevKeySet.has(prevKey)) {
            // This entry is new or changed
            syncEntry(entry.date).catch((e) => console.error('[CloudSync] subscribe syncEntry failed:', e));
          }
        }
      }

      prevEntriesRef.current = currentSnapshot;
    });

    // Initialize the snapshot (stores as JSON array of key strings for O(1) Set lookup)
    const entries = useJournalStore.getState().entries;
    prevEntriesRef.current = JSON.stringify(
      entries.map((e) => e.date + ':' + e.updatedAt + ':' + (e.content || '').length)
    );

    return unsub;
  }, [cloudSyncEnabled, user]);

  // Network listener for offline queue
  useEffect(() => {
    if (!cloudSyncEnabled || !user) return;
    startNetworkListener();
    return () => stopNetworkListener();
  }, [cloudSyncEnabled, user]);

  // Re-sync when app comes to foreground
  useEffect(() => {
    if (!cloudSyncEnabled || !user) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        processQueue().catch((e: unknown) => console.error('[CloudSync] processQueue failed:', e));
        fullSync().catch((e: unknown) => console.error('[CloudSync] fullSync on foreground failed:', e));
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [cloudSyncEnabled, user]);

  const triggerSync = useCallback(async () => {
    if (!cloudSyncEnabled || !user) return 0;
    return fullSync();
  }, [cloudSyncEnabled, user]);

  return { syncStatus, triggerSync };
}
