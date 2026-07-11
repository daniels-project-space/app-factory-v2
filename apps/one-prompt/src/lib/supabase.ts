import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

const configUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

// On web, use same-origin proxy to avoid mixed-content issues (HTTPS page -> HTTP Supabase)
const supabaseUrl =
  Platform.OS === "web" && typeof window !== "undefined" && configUrl
    ? `${window.location.origin}/supabase/one-prompt`
    : configUrl;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env. " +
    "Auth and database features will not work until configured."
  );
}

// Secure storage adapter for Supabase auth tokens.
// iOS uses Keychain via expo-secure-store; Android uses EncryptedSharedPreferences.
// Falls back to localStorage on web (different threat model, no Keychain).
const secureAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail — better than crashing auth flow
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silently fail
    }
  },
};

// Exported so edge function callers can construct the functions URL without
// accessing the protected supabase.supabaseUrl property.
export const SUPABASE_URL = supabaseUrl || "https://not-configured.supabase.co";

export const supabase = createClient(
  SUPABASE_URL,
  supabaseAnonKey || "not-configured",
  {
    auth: {
      storage: secureAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
