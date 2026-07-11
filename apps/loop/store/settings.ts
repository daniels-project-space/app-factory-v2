import { createPersistedStore } from '@/lib/store';

export type ThemeOverride = 'system' | 'light' | 'dark';

export interface SettingsState {
  /** Manual theme choice; 'system' follows the OS color scheme. */
  themeOverride: ThemeOverride;
  /** True once the user finishes (or skips) onboarding. */
  onboardingCompleted: boolean;
  /** True once persisted state has been loaded from AsyncStorage. */
  hasHydrated: boolean;
  setThemeOverride: (value: ThemeOverride) => void;
  completeOnboarding: () => void;
  setHasHydrated: (value: boolean) => void;
}

interface PersistedSettings {
  themeOverride: ThemeOverride;
  onboardingCompleted: boolean;
}

export const useSettings = createPersistedStore<SettingsState, PersistedSettings>(
  'settings',
  (set) => ({
    themeOverride: 'system',
    onboardingCompleted: false,
    hasHydrated: false,
    setThemeOverride: (value) => set({ themeOverride: value }),
    completeOnboarding: () => set({ onboardingCompleted: true }),
    setHasHydrated: (value) => set({ hasHydrated: value }),
  }),
  {
    partialize: (state) => ({
      themeOverride: state.themeOverride,
      onboardingCompleted: state.onboardingCompleted,
    }),
    onRehydrateStorage: () => (state) => {
      state?.setHasHydrated(true);
    },
  },
);
