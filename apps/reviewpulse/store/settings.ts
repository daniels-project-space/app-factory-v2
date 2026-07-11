import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SettingsState = {
  hasSeenIntro: boolean;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  theme: "light" | "dark" | "system";
  setHasSeenIntro: (v: boolean) => void;
  setOnboardingComplete: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setTheme: (v: "light" | "dark" | "system") => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hasSeenIntro: false,
      onboardingComplete: false,
      notificationsEnabled: true,
      theme: "system",
      setHasSeenIntro: (v) => set({ hasSeenIntro: v }),
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
      setTheme: (v) => set({ theme: v }),
    }),
    { name: "app-settings", storage: createJSONStorage(() => AsyncStorage) }
  )
);
