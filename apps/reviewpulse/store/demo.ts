// ReviewPulse — Demo Data Store
// Provides seed data as a fallback when Supabase queries return empty
// This ensures the app feels populated on first launch
// Demo mode auto-deactivates when a real Google Business is connected

import { create } from "zustand";
import {
  getSeedData,
  type SeedData,
  type SeedReview,
  type SeedCustomer,
  type SeedRequest,
} from "@/lib/seed-data";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

const DEMO_INIT_KEY = "reviewpulse_demo_initialized";

type DemoState = {
  initialized: boolean;
  active: boolean; // true when using demo data (no real business connected)
  seedData: SeedData | null;
  initialize: (userId: string) => Promise<void>;
  deactivate: () => void;
  getReviews: () => SeedReview[];
  getCustomers: () => SeedCustomer[];
  getRequests: (customerId?: string) => SeedRequest[];
  getBusinessProfile: () => SeedData["businessProfile"] | null;
  addReply: (reviewId: string, reply: string) => void;
};

export const useDemoStore = create<DemoState>()((set, get) => ({
  initialized: false,
  active: false,
  seedData: null,

  initialize: async (userId: string) => {
    if (get().initialized) return;

    try {
      // Check if the user has a real connected business profile
      const { data: profiles } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1);

      const hasRealBusiness = (profiles?.length ?? 0) > 0;

      if (hasRealBusiness) {
        // Real business connected — no demo mode needed
        set({ initialized: true, active: false, seedData: null });
        return;
      }

      // No real business — activate demo mode with seed data
      const data = await getSeedData(userId);
      await AsyncStorage.setItem(DEMO_INIT_KEY, "true");
      set({ initialized: true, active: true, seedData: data });
    } catch {
      set({ initialized: true, active: false });
    }
  },

  deactivate: () => {
    set({ active: false, seedData: null });
  },

  getReviews: () => {
    return get().seedData?.reviews ?? [];
  },

  getCustomers: () => {
    return get().seedData?.customers ?? [];
  },

  getRequests: (customerId?: string) => {
    const requests = get().seedData?.requests ?? [];
    if (customerId) {
      return requests.filter((r) => r.customer_id === customerId);
    }
    return requests;
  },

  getBusinessProfile: () => {
    return get().seedData?.businessProfile ?? null;
  },

  addReply: (reviewId: string, reply: string) => {
    const data = get().seedData;
    if (!data) return;

    const updatedReviews = data.reviews.map((r) =>
      r.id === reviewId ? { ...r, owner_reply: reply, ai_draft: null } : r
    );

    set({
      seedData: { ...data, reviews: updatedReviews },
    });
  },
}));
