import { create } from 'zustand';

import { getPaywallStatus, purchase, restore, type Plan } from '@/lib/payments';

export type PurchasePhase = 'idle' | 'processing' | 'success' | 'error';

export interface SubscriptionState {
  isPro: boolean;
  plan: Plan | null;
  /** Drives the paywall CTA: idle → processing → success | error. */
  phase: PurchasePhase;
  /** True once the persisted entitlement has been loaded. */
  hydrated: boolean;
  /** Loads entitlement state from the payments provider. */
  hydrate: () => Promise<void>;
  purchase: (plan: Plan) => Promise<boolean>;
  restore: () => Promise<boolean>;
  resetPhase: () => void;
}

/**
 * Entitlement state lives in lib/payments (the provider persists it);
 * this store mirrors it for synchronous access from any screen.
 */
export const useSubscription = create<SubscriptionState>((set) => ({
  isPro: false,
  plan: null,
  phase: 'idle',
  hydrated: false,

  hydrate: async () => {
    try {
      const status = await getPaywallStatus();
      set({ isPro: status.isPro, plan: status.plan, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  purchase: async (plan) => {
    set({ phase: 'processing' });
    try {
      const status = await purchase(plan);
      set({ isPro: status.isPro, plan: status.plan, phase: 'success' });
      return status.isPro;
    } catch {
      set({ phase: 'error' });
      return false;
    }
  },

  restore: async () => {
    set({ phase: 'processing' });
    try {
      const status = await restore();
      set({
        isPro: status.isPro,
        plan: status.plan,
        phase: status.isPro ? 'success' : 'idle',
      });
      return status.isPro;
    } catch {
      set({ phase: 'error' });
      return false;
    }
  },

  resetPhase: () => set({ phase: 'idle' }),
}));
