import { create } from "zustand";
import { checkEntitlement } from "@/lib/payments";

type SubscriptionState = {
  isPro: boolean;
  loading: boolean;
  checkSubscription: () => Promise<void>;
};

export const useSubscriptionStore = create<SubscriptionState>()((set) => ({
  isPro: false,
  loading: true,

  checkSubscription: async () => {
    try {
      const isPro = await checkEntitlement("pro");
      set({ isPro, loading: false });
    } catch {
      set({ isPro: false, loading: false });
    }
  },
}));

/** Convenience selector — use in components: const isPro = useIsPro() */
export const useIsPro = () => useSubscriptionStore((s) => s.isPro);
