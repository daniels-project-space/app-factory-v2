// ReviewPulse — Root Layout
// Loads fonts, initializes services, sets up navigation + auth guard
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  SourceSans3_300Light,
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';
import { initSentry } from '@/lib/sentry';
import { initAnalytics } from '@/lib/analytics';
import { initPayments } from '@/lib/payments';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { useSubscriptionStore } from '@/store/subscription';
import { useDemoStore } from '@/store/demo';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import '../global.css';
import { DevToolsBridge } from "@/components/DevToolsBridge";


SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const hasSeenIntro = useSettingsStore((s) => s.hasSeenIntro);
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete);

  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    'Barlow-Condensed-SemiBold':  BarlowCondensed_600SemiBold,
    'Barlow-Condensed-Bold':      BarlowCondensed_700Bold,
    'Barlow-Condensed-ExtraBold': BarlowCondensed_800ExtraBold,
    'Source-Sans-Light':          SourceSans3_300Light,
    'Source-Sans-Regular':        SourceSans3_400Regular,
    'Source-Sans-SemiBold':       SourceSans3_600SemiBold,
    'Source-Sans-Bold':           SourceSans3_700Bold,
  });

  const checkSubscription = useSubscriptionStore((s) => s.checkSubscription);
  const initializeDemo = useDemoStore((s) => s.initialize);

  // Init services once on mount
  useEffect(() => {
    initSentry();
    initAnalytics();
    initPayments();
    initialize();
    checkSubscription();
  }, [initialize, checkSubscription]);

  // Initialize demo data when user is available
  useEffect(() => {
    if (user) {
      initializeDemo(user.id);
    }
  }, [user, initializeDemo]);

  // Register for push notifications after authentication
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(user.id, token);
        }
      } catch {
        // Non-blocking — user can still use the app without push notifications
      }
    })();
  }, [user]);

  // Hide splash only when BOTH fonts loaded AND auth initialized
  useEffect(() => {
    if (fontsLoaded && initialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, initialized]);

  // Auth guard — redirect based on intro + auth + onboarding state
  useEffect(() => {
    if (!initialized || !fontsLoaded) return;

    const inIntro = segments[0] === 'intro';
    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const inLegal = segments[0] === 'legal';

    // Legal pages are always accessible (App Store requires this)
    if (inLegal) return;

    if (user) {
      // Authenticated user: skip intro/auth, enforce onboarding gate
      if (!onboardingComplete && !inOnboarding) {
        router.replace('/onboarding/business-type');
      } else if (onboardingComplete && (inAuthGroup || inOnboarding || inIntro)) {
        router.replace('/(tabs)');
      }
      // Already in tabs or a valid non-auth screen — no redirect needed
    } else {
      // Unauthenticated user
      if (!hasSeenIntro && !inIntro) {
        router.replace('/intro');
      } else if (hasSeenIntro && inIntro) {
        router.replace('/auth/welcome');
      } else if (hasSeenIntro && !inAuthGroup && !inIntro) {
        router.replace('/auth/welcome');
      }
    }
  }, [user, initialized, fontsLoaded, hasSeenIntro, onboardingComplete, segments, router]);

  // ─── Notification Deep Link Handler ─────────────────────────────────────
  const responseListener = useRef<Notifications.EventSubscription>(null);

  useEffect(() => {
    // Handle notification taps (when app is in background/killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'new_review' && data?.review_id) {
          router.push(`/reviews/${data.review_id}`);
        }
      }
    );

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  return (
    <DevToolsBridge>
    <GestureHandlerRootView style={{ flex: 1 }}>
      {!initialized ? (
        // Block rendering only on auth init — fonts load async and swap in without blocking.
        // Splash screen is hidden once BOTH initialized AND fontsLoaded (see useEffect above).
        // This prevents the E2E gate from seeing a blank screen when devSkipAuth=1.
        <View style={{ flex: 1, backgroundColor: '#0D1117' }} testID="app-loading" />
      ) : (
      <ErrorBoundary>
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }}>
          {/* Main app */}
          <Stack.Screen name="(tabs)" />
          {/* Pre-auth intro slides */}
          <Stack.Screen name="intro" />
          {/* Auth flow */}
          <Stack.Screen name="auth/welcome" options={{ gestureEnabled: false }} />
          <Stack.Screen name="auth/sign-in" options={{ gestureEnabled: false }} />
          <Stack.Screen name="auth/sign-up" options={{ gestureEnabled: false }} />
          <Stack.Screen name="auth/forgot-password" options={{ gestureEnabled: false }} />
          {/* Onboarding (shown once after sign up) */}
          <Stack.Screen name="onboarding/index" />
          <Stack.Screen name="onboarding/business-type" />
          <Stack.Screen name="onboarding/connect-google" />
          <Stack.Screen name="onboarding/find-business" />
          <Stack.Screen name="onboarding/first-request" />
          <Stack.Screen name="onboarding/paywall" options={{ presentation: 'modal' }} />
          {/* Review detail */}
          <Stack.Screen name="reviews/[id]" options={{ headerShown: false }} />
          {/* Send review request */}
          <Stack.Screen name="request/new" options={{ presentation: 'modal', headerShown: false }} />
          {/* Notification center */}
          <Stack.Screen name="notifications/index" options={{ presentation: 'modal', headerShown: false }} />
          {/* Customer detail */}
          <Stack.Screen name="customers/[id]" options={{ headerShown: false }} />
          {/* Templates */}
          <Stack.Screen name="templates/index" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="templates/[id]" options={{ presentation: 'modal', headerShown: false }} />
          {/* Yelp connect flow */}
          <Stack.Screen name="yelp/connect" options={{ headerShown: false }} />
          {/* Standalone paywall (upgrade from within app) */}
          <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
          {/* Legal documents */}
          <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
          <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ErrorBoundary>
      )}
    </GestureHandlerRootView>
    </DevToolsBridge>
  );
}
