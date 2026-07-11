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

  useEffect(() => {
    void hydrateSubscription();
  }, [hydrateSubscription]);

  const ready = (fontsLoaded || fontError !== null) && settingsHydrated;

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
