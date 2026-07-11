import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  _hasHydrated: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      _hasHydrated: false,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Always mark hydrated — even on first install when state is undefined
        if (state) {
          state.setHasHydrated(true);
        } else {
          useOnboardingStore.getState().setHasHydrated(true);
        }
      },
    }
  )
);

// Ensure hydration happens even if store is empty
useOnboardingStore.persist.onFinishHydration(() => {
  useOnboardingStore.getState().setHasHydrated(true);
});
