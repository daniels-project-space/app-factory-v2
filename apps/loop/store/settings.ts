import { createPersistedStore } from '@/lib/store';

export type ThemeOverride = 'system' | 'light' | 'dark';

export interface SettingsState {
  /** Manual theme choice; 'system' follows the OS color scheme. */
  themeOverride: ThemeOverride;
  /** True once the user finishes (or skips) onboarding. */
  onboardingCompleted: boolean;
  /** Native anchor-time reminders. No-ops on web; see lib/notifications.ts. */
  notificationsEnabled: boolean;
  /** True once the reflection tab has ever been opened — the "first weekly
   *  reflection" hard-paywall trigger fires only the first time. */
  reflectionSeen: boolean;
  /** True once the auto hard-paywall (3rd anchor completion OR first
   *  reflection, whichever comes first) has fired at least once. */
  hardPaywallTriggered: boolean;
  /** True once persisted state has been loaded from AsyncStorage. */
  hasHydrated: boolean;
  setThemeOverride: (value: ThemeOverride) => void;
  setNotificationsEnabled: (value: boolean) => void;
  markReflectionSeen: () => void;
  markHardPaywallTriggered: () => void;
  completeOnboarding: () => void;
  setHasHydrated: (value: boolean) => void;
}

interface PersistedSettings {
  themeOverride: ThemeOverride;
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  reflectionSeen: boolean;
  hardPaywallTriggered: boolean;
}

export const useSettings = createPersistedStore<SettingsState, PersistedSettings>(
  'settings',
  (set) => ({
    themeOverride: 'system',
    onboardingCompleted: false,
    notificationsEnabled: true,
    reflectionSeen: false,
    hardPaywallTriggered: false,
    hasHydrated: false,
    setThemeOverride: (value) => set({ themeOverride: value }),
    setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
    markReflectionSeen: () => set({ reflectionSeen: true }),
    markHardPaywallTriggered: () => set({ hardPaywallTriggered: true }),
    completeOnboarding: () => set({ onboardingCompleted: true }),
    setHasHydrated: (value) => set({ hasHydrated: value }),
  }),
  {
    partialize: (state) => ({
      themeOverride: state.themeOverride,
      onboardingCompleted: state.onboardingCompleted,
      notificationsEnabled: state.notificationsEnabled,
      reflectionSeen: state.reflectionSeen,
      hardPaywallTriggered: state.hardPaywallTriggered,
    }),
    onRehydrateStorage: () => (state) => {
      state?.setHasHydrated(true);
    },
  },
);
