// DevToolsBridge — receives commands from the dashboard via postMessage
// Drop this into any app's components/ directory and wrap it in the root layout
import { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';

const DEV_KEYS = {
  SKIP_AUTH: '__dev_skip_auth',
  SKIP_ONBOARDING: '__dev_skip_onboarding',
  SAMPLE_DATA: '__dev_sample_data',
  TEST_PURCHASE: '__dev_test_purchase',
  DEBUG_OVERLAY: '__dev_debug_overlay',
};

// ─── Module-level pre-render injection ────────────────────────────────────────
// Apply devSkipAuth synchronously at import time (before the first React render)
// so the auth store already has initialized=true when the root layout mounts.
// This eliminates the race between supabase.auth.getSession() and DevToolsBridge's
// useEffect, which caused blank screens and auth failures in the E2E gate.
if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && typeof (globalThis as typeof globalThis & { sessionStorage?: Storage }).sessionStorage !== 'undefined') {
  try {
    const rawSearch =
      globalThis.sessionStorage?.getItem('__devParams') ??
      (typeof location !== 'undefined' ? location.search : '');
    const params = new URLSearchParams(rawSearch);
    if (params.get('devSkipAuth') === '1') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useAuthStore.setState({
        user: { id: 'demo-user-e2e', email: 'demo@reviewpulse.app' } as any,
        session: { user: { id: 'demo-user-e2e' } } as any,
        initialized: true,
        loading: false,
      });
      useSettingsStore.setState({ hasSeenIntro: true, onboardingComplete: true });
    }
  } catch {
    // Non-blocking: if module-level injection fails, useEffect fallback handles it
  }
}

export function DevToolsBridge({ children }: { children: React.ReactNode }) {
  // URL-param dev tools work in ALL builds so the E2E gate can drive the app
  // via ?devSkipAuth=1 in the static preview URL.
  // postMessage commands are guarded to __DEV__ builds only.

  const [debugVisible, setDebugVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check URL params on initial load (for direct links).
    // The SPA routing script strips query params before React mounts and saves
    // them in sessionStorage.__devParams; fall back to window.location.search.
    const rawSearch =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('__devParams')) ||
      window.location.search;
    const params = new URLSearchParams(rawSearch);
    if (params.get('devSkipAuth') === '1') applyAction('skip_auth');
    if (params.get('devSkipOnboarding') === '1') applyAction('skip_onboarding');
    if (params.get('devSampleData') === '1') applyAction('load_sample_data');
    if (params.get('devTestPurchase') === '1') applyAction('test_purchase');
    if (params.get('devDebug') === '1') applyAction('toggle_debug');
    if (params.get('devReset') === '1') applyAction('reset_state');

    // postMessage handler is __DEV__-only (production safety)
    // @ts-ignore __DEV__ is a React Native global
    if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type !== 'dev-tools') return;
      applyAction(event.data.action);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  async function applyAction(action: string) {
    try {
      switch (action) {
        case 'skip_auth': {
          await AsyncStorage.setItem(DEV_KEYS.SKIP_AUTH, 'true');

          const injectDemoUser = () => {
            useAuthStore.setState({
              user: { id: 'demo-user-e2e', email: 'demo@reviewpulse.app' } as any,
              session: { user: { id: 'demo-user-e2e' } } as any,
              initialized: true,
            });
            useSettingsStore.setState({ hasSeenIntro: true, onboardingComplete: true });
            try { router.replace('/(tabs)'); } catch {}
          };

          // If auth is already initialized, inject immediately.
          // If not, wait for auth init then re-inject (prevents init() overwriting demo user).
          if (useAuthStore.getState().initialized) {
            injectDemoUser();
          } else {
            const unsub = useAuthStore.subscribe((state) => {
              if (state.initialized) {
                unsub();
                injectDemoUser();
              }
            });
            // Inject now too — if the race is tight, this may briefly show
            // until auth init overwrites it, then the subscription re-injects.
            injectDemoUser();
          }
          break;
        }

        case 'skip_onboarding':
          await AsyncStorage.setItem(DEV_KEYS.SKIP_ONBOARDING, 'true');
          await AsyncStorage.setItem('onboarding_complete', 'true');
          await AsyncStorage.setItem('hasSeenOnboarding', 'true');
          useSettingsStore.getState().setOnboardingComplete(true);
          try { router.replace('/(tabs)'); } catch {}
          break;

        case 'load_sample_data':
          await AsyncStorage.setItem(DEV_KEYS.SAMPLE_DATA, JSON.stringify({
            loaded: true,
            timestamp: new Date().toISOString(),
            items: [
              { id: '1', name: 'Demo Review 1', createdAt: new Date().toISOString() },
              { id: '2', name: 'Demo Review 2', createdAt: new Date().toISOString() },
              { id: '3', name: 'Demo Review 3', createdAt: new Date().toISOString() },
            ]
          }));
          // Reload to pick up sample data
          window.location.reload();
          break;

        case 'test_purchase':
          await AsyncStorage.setItem(DEV_KEYS.TEST_PURCHASE, 'true');
          await AsyncStorage.setItem('subscription_status', JSON.stringify({
            isActive: true,
            plan: 'pro_monthly',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isSandbox: true,
          }));
          window.location.reload();
          break;

        case 'reset_state':
          await AsyncStorage.clear();
          window.location.reload();
          break;

        case 'toggle_debug':
          const current = await AsyncStorage.getItem(DEV_KEYS.DEBUG_OVERLAY);
          const newVal = current !== 'true';
          await AsyncStorage.setItem(DEV_KEYS.DEBUG_OVERLAY, String(newVal));
          setDebugVisible(newVal);
          if (newVal) {
            const keys = await AsyncStorage.getAllKeys();
            const entries = await AsyncStorage.multiGet(keys);
            setDebugInfo(entries.map(([k, v]) =>
              `${k}: ${(v || '').slice(0, 50)}`
            ).join('\n'));
          }
          break;
      }
    } catch (e) {
      console.warn('[DevToolsBridge]', action, 'failed:', e);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {debugVisible && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugTitle}>Debug Overlay</Text>
          <Text style={styles.debugText}>{debugInfo || 'No data'}</Text>
        </View>
      )}
    </View>
  );
}

// Helper: check if auth should be skipped (call from auth store)
export async function shouldSkipAuth(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  const val = await AsyncStorage.getItem(DEV_KEYS.SKIP_AUTH);
  return val === 'true';
}

// Helper: check if onboarding should be skipped
export async function shouldSkipOnboarding(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  const val = await AsyncStorage.getItem(DEV_KEYS.SKIP_ONBOARDING);
  if (val === 'true') return true;
  const done = await AsyncStorage.getItem('onboarding_complete');
  return done === 'true';
}

const styles = StyleSheet.create({
  debugOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 12,
    maxHeight: 200,
  },
  debugTitle: {
    color: '#3fb950',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 4,
  },
  debugText: {
    color: '#e6edf3',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});
