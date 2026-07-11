import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.APP_NAME || "ReviewPulse",
  slug: process.env.APP_SLUG || "reviewpulse",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: process.env.APP_SLUG || "reviewpulse",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0F7B7B",  // ReviewPulse primary teal
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || "com.appfactory.reviewpulse",
    infoPlist: {
      NSContactsUsageDescription: "ReviewPulse uses contacts to auto-fill customer phone numbers for review requests.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: process.env.ANDROID_PACKAGE || "com.appfactory.reviewpulse",
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  experiments: {
    // Subpath hosting: EXPO_BASE_URL is set by the factory preview pipeline
    // (build-verify.sh) to /preview/<slug>. Native iOS/Android builds ignore
    // this — it only affects web routing and asset URLs.
    baseUrl: process.env.EXPO_BASE_URL || undefined,
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#ffffff",
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG || "app-factory",
        project: process.env.SENTRY_PROJECT || "reviewpulse",
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    sentryDsn: process.env.SENTRY_DSN,
    posthogApiKey: process.env.POSTHOG_API_KEY,
    posthogHost: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
    revenuecatApiKey: process.env.REVENUECAT_API_KEY,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
