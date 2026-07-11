import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useTheme } from '@/hooks/useTheme';
import { scheduleAnchorNotifications, scheduleReengagementNudge } from '@/lib/notifications';
import { useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';
import { useSubscription } from '@/store/subscription';

// Keep the native splash visible until fonts + persisted state are ready.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (e.g. web) — safe to ignore.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  const theme = useTheme();
  const settingsHydrated = useSettings((s) => s.hasHydrated);
  const onboardingCompleted = useSettings((s) => s.onboardingCompleted);
  const hydrateSubscription = useSubscription((s) => s.hydrate);
  const habitsHydrated = useHabits((s) => s.hasHydrated);
  const reconcileStreak = useHabits((s) => s.reconcile);
  const anchorTimes = useHabits((s) => s.anchorTimes);

  useEffect(() => {
    void hydrateSubscription();
  }, [hydrateSubscription]);

  // Runs once per app open, after the habits store loads from disk: dims
  // the flame for any calendar day missed entirely since last time (see
  // lib/reconcile.ts) so the flame is always truthful on reopen. A missed
  // day also fires the re-engagement nudge a few hours later.
  useEffect(() => {
    if (!habitsHydrated) return;
    const missedDays = reconcileStreak();
    if (missedDays > 0) {
      void scheduleReengagementNudge();
    }
  }, [habitsHydrated, reconcileStreak]);

  // Keeps the three anchor-time notifications in sync with the current
  // windows across app restarts (native only — no-ops on web).
  useEffect(() => {
    if (habitsHydrated && onboardingCompleted) {
      void scheduleAnchorNotifications(anchorTimes);
    }
  }, [habitsHydrated, onboardingCompleted, anchorTimes]);

  const ready = (fontsLoaded || fontError !== null) && settingsHydrated && habitsHydrated;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        {/* Route guards: onboarding first, then the main app. */}
        <Stack.Protected guard={!onboardingCompleted}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboardingCompleted}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
