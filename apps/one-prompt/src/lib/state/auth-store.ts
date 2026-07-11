import { Platform } from "react-native";
import * as AppleAuthenticationModule from "expo-apple-authentication";
import { create } from "zustand";
import { Session, User, Subscription } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { identify, reset as resetAnalytics } from "@/lib/analytics";
import { setUser, clearUser } from "@/lib/sentry";
import { useJournalStore } from "@/lib/state/journal-store";
import { useSettingsStore } from "@/lib/state/settings-store";

// Module-level subscription reference to prevent leaks
let authSubscription: Subscription | null = null;
// In-flight initialization promise — prevents TOCTOU when initialize() is called concurrently
let initializingPromise: Promise<void> | null = null;

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    // Coalesce concurrent callers: return the in-flight promise to avoid the TOCTOU race
    // where two calls both pass the `initialized` guard before either sets it to true.
    if (initializingPromise) return initializingPromise;

    // Tear down any stale listener before creating a new one (only here, inside
    // the not-initialized path — prevents duplicate listeners on Fast Refresh
    // while avoiding the double-mount bug where unsubscribing before the guard
    // left the second call with no listener).
    authSubscription?.unsubscribe();
    authSubscription = null;

    initializingPromise = (async () => {
      let session: Session | null = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        set({ session, user: session?.user ?? null, loading: false, initialized: true });
      } catch {
        set({ session: null, user: null, loading: false, initialized: true });
        initializingPromise = null;
        return;
      } finally {
        initializingPromise = null;
      }

      if (session?.user) {
        identify(session.user.id, {});
        setUser(session.user.id, session.user.email);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        const prevUserId = get().user?.id;
        const nextUserId = newSession?.user?.id;

        // Clear local journal data and pending sync queue when switching accounts
        if (prevUserId && nextUserId && prevUserId !== nextUserId) {
          useJournalStore.getState().clearAllData();
          // resetSyncState is called by useCloudSync when user becomes null (avoids circular import)
        }

        set({ session: newSession, user: newSession?.user ?? null });
        if (newSession?.user) {
          identify(newSession.user.id, { email: newSession.user.email ?? null });
          setUser(newSession.user.id, newSession.user.email);
        } else {
          resetAnalytics();
          clearUser();
        }
      });

      authSubscription = subscription;
    })();
    return initializingPromise;
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[Auth] signOut error:', error.message);
    resetAnalytics();
    clearUser();
    // Only clear local journal data if cloud sync was enabled (entries exist in the cloud).
    // If the user never enabled cloud sync and has local-only entries, clearing them here
    // would permanently delete their journal — there is no recovery path.
    const { cloudSyncEnabled } = useSettingsStore.getState();
    const { entries } = useJournalStore.getState();
    if (cloudSyncEnabled || entries.length === 0) {
      useJournalStore.getState().clearAllData();
    }
    // resetSyncState is called by useCloudSync when user becomes null (avoids circular import)
    set({ user: null, session: null });
  },

  deleteAccount: async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Failed to get session: ${sessionError.message}`);
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/delete-account`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error((body['error'] as string | undefined) ?? 'Failed to delete account');
    }

    // Clean up local state after successful server deletion
    resetAnalytics();
    clearUser();
    useJournalStore.getState().clearAllData();
    // resetSyncState is called by useCloudSync when user becomes null (avoids circular import)
    set({ user: null, session: null });
  },

  signInWithApple: async () => {
    if (Platform.OS === "ios") {
      const credential = await AppleAuthenticationModule.signInAsync({
        requestedScopes: [
          AppleAuthenticationModule.AppleAuthenticationScope.FULL_NAME,
          AppleAuthenticationModule.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Apple sign-in failed: no identity token");
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) throw error;

      if (credential.fullName?.givenName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(" ");
        await supabase.auth.updateUser({
          data: { display_name: fullName },
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "apple" });
      if (error) throw error;
    }
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
}));
