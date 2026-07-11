import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const configUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

// On web, use same-origin proxy to avoid mixed-content issues (HTTPS page -> HTTP Supabase)
const supabaseUrl =
  Platform.OS === "web" && typeof window !== "undefined" && configUrl
    ? `${window.location.origin}/supabase/reviewpulse`
    : configUrl;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase credentials in app config");
}

export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
