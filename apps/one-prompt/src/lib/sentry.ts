import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

export function initSentry() {
  const dsn = Constants.expoConfig?.extra?.sentryDsn;
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    environment: __DEV__ ? "development" : "production",
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (context) Sentry.setContext("extra", context);
  Sentry.captureException(error);
}

export function setUser(id: string, email?: string) {
  Sentry.setUser({ id, email });
}

export function clearUser() {
  Sentry.setUser(null);
}

export { Sentry };
