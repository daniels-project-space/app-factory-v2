import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  hasEntitlement,
  isRevenueCatEnabled,
} from '@/lib/revenuecatClient';
import type { PurchasesPackage } from 'react-native-purchases';

// Secure storage adapter for Zustand (falls back to memory on web)
const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      // Web fallback - use localStorage (less secure but web has different threat model)
      return localStorage.getItem(name);
    }
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(name, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {
      // Silently fail - better than crashing
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(name);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      // Silently fail
    }
  },
};

// Entitlement ID matches what we created in RevenueCat
const PREMIUM_ENTITLEMENT_ID = 'premium';

// How long we trust cached premium status without re-verifying (24h)
const VERIFICATION_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

// Store for tracking local premium state (for optimistic updates and offline)
interface PremiumState {
  isPremium: boolean;
  lastVerifiedAt: number | null; // Unix timestamp (ms) of last successful RC check
  _hasHydrated: boolean;
  _forceFreeTier: boolean; // Force free tier for testing
  setIsPremium: (isPremium: boolean) => void;
  setLastVerifiedAt: (ts: number) => void;
  resetPremium: () => void;
  setHasHydrated: (state: boolean) => void;
  setForceFreeTier: (force: boolean) => void;
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set) => ({
      isPremium: false,
      lastVerifiedAt: null,
      _hasHydrated: false,
      _forceFreeTier: false,
      setIsPremium: (isPremium) => set({ isPremium }),
      setLastVerifiedAt: (ts) => set({ lastVerifiedAt: ts }),
      resetPremium: () => set({ isPremium: false, _forceFreeTier: true }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setForceFreeTier: (force) => set({ _forceFreeTier: force }),
    }),
    {
      name: 'premium-secure',
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Query key for premium status
const PREMIUM_QUERY_KEY = ['premium-status'];
const OFFERINGS_QUERY_KEY = ['offerings'];

/**
 * Hook to check if user has premium access
 */
export function usePremiumStatus() {
  const setIsPremium = usePremiumStore((s) => s.setIsPremium);
  const setLastVerifiedAt = usePremiumStore((s) => s.setLastVerifiedAt);
  const localIsPremium = usePremiumStore((s) => s.isPremium);
  const lastVerifiedAt = usePremiumStore((s) => s.lastVerifiedAt);
  const forceFreeTier = usePremiumStore((s) => s._forceFreeTier);

  const query = useQuery({
    queryKey: [...PREMIUM_QUERY_KEY, forceFreeTier],
    queryFn: async () => {
      // If force free tier is set, always return false
      if (forceFreeTier) {
        return false;
      }
      if (!isRevenueCatEnabled()) {
        return false;
      }
      const result = await hasEntitlement(PREMIUM_ENTITLEMENT_ID);
      if (result.ok) {
        return result.data;
      }
      return false;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Sync to local store for offline access; record verification timestamp
  useEffect(() => {
    if (query.data !== undefined) {
      setIsPremium(query.data);
      setLastVerifiedAt(Date.now());
    }
  }, [query.data, setIsPremium, setLastVerifiedAt]);

  // If force free tier, always return false
  if (forceFreeTier) {
    return {
      isPremium: false,
      isLoading: false,
      refetch: query.refetch,
    };
  }

  // When query.data is undefined (network failure), fall back to cache only within grace period.
  // If the cached value is older than 24h, treat subscription as unverified to prevent
  // stale "premium" cache from granting access to users whose subscription has lapsed.
  const cacheAge = lastVerifiedAt ? Date.now() - lastVerifiedAt : Infinity;
  const cacheIsFresh = cacheAge < VERIFICATION_GRACE_PERIOD_MS;
  const effectiveLocal = cacheIsFresh ? localIsPremium : false;

  return {
    isPremium: query.data ?? effectiveLocal,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Hook to get available offerings/packages
 */
export function useOfferings() {
  return useQuery({
    queryKey: OFFERINGS_QUERY_KEY,
    queryFn: async () => {
      if (!isRevenueCatEnabled()) {
        return null;
      }
      const result = await getOfferings();
      if (result.ok) {
        return result.data;
      }
      return null;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook for purchasing a package
 */
export function usePurchase() {
  const queryClient = useQueryClient();
  const setIsPremium = usePremiumStore((s) => s.setIsPremium);
  const setForceFreeTier = usePremiumStore((s) => s.setForceFreeTier);

  return useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const result = await purchasePackage(pkg);
      if (!result.ok) {
        throw new Error(result.reason);
      }
      return result.data;
    },
    onSuccess: (customerInfo) => {
      // Check if premium is now active
      const isPremium = Boolean(
        customerInfo.entitlements.active?.[PREMIUM_ENTITLEMENT_ID]
      );
      // Disable force free tier when purchase is successful
      if (isPremium) {
        setForceFreeTier(false);
      }
      setIsPremium(isPremium);
      // Invalidate the premium query to refetch
      queryClient.invalidateQueries({ queryKey: PREMIUM_QUERY_KEY });
    },
  });
}

/**
 * Hook for restoring purchases
 */
export function useRestorePurchases() {
  const queryClient = useQueryClient();
  const setIsPremium = usePremiumStore((s) => s.setIsPremium);
  const setForceFreeTier = usePremiumStore((s) => s.setForceFreeTier);

  return useMutation({
    mutationFn: async () => {
      const result = await restorePurchases();
      if (!result.ok) {
        throw new Error(result.reason);
      }
      return result.data;
    },
    onSuccess: (customerInfo) => {
      const isPremium = Boolean(
        customerInfo.entitlements.active?.[PREMIUM_ENTITLEMENT_ID]
      );
      // Disable force free tier when restore finds premium
      if (isPremium) {
        setForceFreeTier(false);
      }
      setIsPremium(isPremium);
      queryClient.invalidateQueries({ queryKey: PREMIUM_QUERY_KEY });
    },
  });
}

/**
 * Simple hook to check premium without loading state
 */
export function useIsPremium(): boolean {
  const { isPremium } = usePremiumStatus();
  return isPremium;
}

/**
 * Hook to reset local premium state for testing
 */
export function useResetPurchases() {
  const queryClient = useQueryClient();
  const resetPremium = usePremiumStore((s) => s.resetPremium);

  return useCallback(async () => {
    // Reset local zustand store (this also sets _forceFreeTier to true)
    resetPremium();
    // Clear the react-query cache immediately
    queryClient.setQueryData([...PREMIUM_QUERY_KEY, false], false);
    queryClient.setQueryData([...PREMIUM_QUERY_KEY, true], false);
    // Also clear from secure storage directly to ensure it persists
    await secureStorage.removeItem('premium-secure');
    // Invalidate all premium queries to refetch
    queryClient.invalidateQueries({ queryKey: PREMIUM_QUERY_KEY });
  }, [resetPremium, queryClient]);
}

// Note: Premium status is managed by RevenueCat
// Local state is used for caching and offline access only
