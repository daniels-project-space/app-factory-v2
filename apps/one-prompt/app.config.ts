import { ExpoConfig, ConfigContext } from "expo/config";

const APP_SLUG = process.env.APP_SLUG || "one-prompt";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.APP_NAME || "OnePrompt",
  slug: APP_SLUG,
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  scheme: APP_SLUG,
  runtimeVersion: { policy: "fingerprint" as const },
  splash: {
    backgroundColor: "#0F0F0E",
    resizeMode: "contain",
  },
  updates: {
    url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID || ""}`,
    enabled: true,
    checkAutomatically: "ON_LOAD" as const,
    fallbackToCacheTimeout: 3000,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || "com.appfactory.oneprompt",
    usesAppleSignIn: true,
    associatedDomains: process.env.APP_DOMAIN
      ? [`applinks:${process.env.APP_DOMAIN}`]
      : undefined,
    infoPlist: {
      NSCameraUsageDescription: "OnePrompt uses the camera for photo journaling prompts.",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#0F0F0E",
    },
    package: process.env.ANDROID_PACKAGE || "com.appfactory.oneprompt",
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-apple-authentication",
    ["expo-notifications", { color: "#A3B899" }],
    ["expo-camera", { cameraPermission: "OnePrompt needs camera access for photo journaling." }],
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    sentryDsn: process.env.SENTRY_DSN,
    posthogApiKey: process.env.POSTHOG_API_KEY,
    posthogHost: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
    revenuecatApiKey: process.env.REVENUECAT_API_KEY,
    appDomain: process.env.APP_DOMAIN,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
  experiments: {
    typedRoutes: true,
    // Subpath hosting: EXPO_BASE_URL set by the factory preview pipeline
    // (build-verify.sh) to /preview/<slug>. Native iOS/Android ignore this.
    baseUrl: process.env.EXPO_BASE_URL || undefined,
  },
});
