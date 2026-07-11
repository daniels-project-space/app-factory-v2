import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { useEffect } from 'react';
import BackgroundMusicPlayer from '@/components/BackgroundMusicPlayer';
import { initSentry } from '@/lib/sentry';
import { initAnalytics } from '@/lib/analytics';
import { useAuthStore } from '@/lib/state/auth-store';
import { useCloudSync } from '@/lib/useCloudSync';
import { BASE_COLORS } from '@/lib/baseColors';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Custom light theme for calm aesthetic — colors sourced from shared BASE_COLORS
const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: BASE_COLORS.light.background,
    card: BASE_COLORS.light.card,
    text: BASE_COLORS.light.text,
    border: BASE_COLORS.light.border,
    primary: BASE_COLORS.light.primary,
  },
};

// Custom dark theme — colors sourced from shared BASE_COLORS
const NightTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: BASE_COLORS.dark.background,
    card: BASE_COLORS.dark.card,
    text: BASE_COLORS.dark.text,
    border: BASE_COLORS.dark.border,
    primary: BASE_COLORS.dark.primary,
  },
};

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  return (
    <ThemeProvider value={colorScheme === 'dark' ? NightTheme : LightTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="sign-up" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="forgot-password" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="history"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="entry/[date]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="weekly-reflection"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="legal"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="custom-prompts"
          options={{
            presentation: 'modal',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="prompt-categories"
          options={{
            presentation: 'modal',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="photo-prompt"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="paths"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="mood-insights"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="philosopher-guide"
          options={{
            presentation: 'modal',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    initSentry();
    initAnalytics();
  }, []);

  // Initialize Supabase auth session
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  // Cloud sync: auto-syncs on launch, watches for entry changes, handles offline queue
  useCloudSync();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <BackgroundMusicPlayer />
          <RootLayoutNav colorScheme={colorScheme as 'light' | 'dark' | null | undefined} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
