import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { identify, reset as resetAnalytics } from "@/lib/analytics";
import { setUser, clearUser } from "@/lib/sentry";
import { identifyUser, logoutUser } from "@/lib/payments";
import { useSubscriptionStore } from "@/store/subscription";
import { useSettingsStore } from "@/store/settings";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) console.warn('[Auth] getSession failed:', sessionErr.message);
    // Re-check: DevToolsBridge may have injected a demo user while we awaited.
    // If so, respect it and don't overwrite.
    if (get().initialized) return;
    set({ session: session ?? null, user: session?.user ?? null, loading: false, initialized: true });

    if (session?.user) {
      identify(session.user.id, { email: session.user.email });
      setUser(session.user.id, session.user.email);
      identifyUser(session.user.id).catch((e: unknown) => console.warn('RevenueCat:', e));
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        identify(session.user.id, { email: session.user.email });
        setUser(session.user.id, session.user.email);
        identifyUser(session.user.id).catch((e: unknown) => console.warn('RevenueCat:', e));
      }
    });
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Set state immediately — don't wait for onAuthStateChange (prevents redirect bounce)
    set({ session: data.session, user: data.session?.user ?? null });
  },

  signUp: async (email, password, metadata?: Record<string, unknown>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: metadata ? { data: metadata } : undefined,
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    resetAnalytics();
    clearUser();
    // Clear cross-user state — prevents Pro features leaking to next signed-in user.
    // Do this BEFORE awaiting RevenueCat so the UI updates immediately.
    useSubscriptionStore.setState({ isPro: false, loading: false });
    useSettingsStore.setState({ onboardingComplete: false, hasSeenIntro: false });
    set({ user: null, session: null });
    // Await RevenueCat logout with timeout — failed logout must not leave prior
    // user's Pro entitlement active. Purchases.reset() clears the cached customer
    // ID regardless of network outcome so the next logIn() starts clean.
    try {
      await Promise.race([
        logoutUser(),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
    } catch (e: unknown) {
      console.warn('RevenueCat logout:', e instanceof Error ? e.message : e);
    }
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) throw error;
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
}));
