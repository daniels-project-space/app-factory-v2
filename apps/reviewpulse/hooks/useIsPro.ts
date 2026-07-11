// ReviewPulse — useIsPro hook
// Single source of truth for Pro subscription status across the app
// Reads from subscription store (synced with RevenueCat + Supabase profiles.is_pro)

import { useCallback } from 'react';
import { useSubscriptionStore } from '@/store/subscription';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';

/** Returns { isPro, loading, refresh } for gating Pro features */
export function useIsPro() {
  const isPro = useSubscriptionStore((s) => s.isPro);
  const loading = useSubscriptionStore((s) => s.loading);
  const checkSubscription = useSubscriptionStore((s) => s.checkSubscription);
  const user = useAuthStore((s) => s.user);

  const refresh = useCallback(async () => {
    // Check RevenueCat entitlement first
    await checkSubscription();

    // Also check Supabase profiles.is_pro as fallback (webhook-synced)
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_pro')
          .eq('id', user.id)
          .single();

        if (!error && data?.is_pro && !useSubscriptionStore.getState().isPro) {
          useSubscriptionStore.setState({ isPro: true });
        }
      } catch {
        // Non-critical — RevenueCat is primary source
      }
    }
  }, [user, checkSubscription]);

  return { isPro, loading, refresh };
}
