import PostHog from "posthog-react-native";
import Constants from "expo-constants";

const apiKey = Constants.expoConfig?.extra?.posthogApiKey;
const host = Constants.expoConfig?.extra?.posthogHost || "https://eu.i.posthog.com";

let posthog: PostHog | null = null;

export function initAnalytics(): PostHog | null {
  if (!apiKey) return null;
  posthog = new PostHog(apiKey, { host });
  return posthog;
}

export function identify(userId: string, properties?: Record<string, any>) {
  posthog?.identify(userId, properties);
}

export function track(event: string, properties?: Record<string, any>) {
  posthog?.capture(event, properties);
}

export function screen(name: string, properties?: Record<string, any>) {
  posthog?.screen(name, properties);
}

export function reset() {
  posthog?.reset();
}

export { posthog };
