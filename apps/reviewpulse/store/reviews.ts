// ReviewPulse — Reviews Store (Zustand + Supabase)
// Central store for reviews across all platforms: CRUD, filtering, aggregation, realtime

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Review } from '@/components/shared/ReviewCard';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewFilter = 'all' | 'google' | 'yelp' | 'pending' | 'flagged';

export type BusinessProfile = {
  id: string;
  business_name: string;
  platform: string;
  current_rating: number | null;
  total_reviews: number;
  last_polled_at: string | null;
  place_id: string | null;
};

export type ReviewStats = {
  totalCount: number;
  avgRating: string;
  responseRate: string;
  thisWeek: number;
  pendingCount: number;
  flaggedCount: number;
  byPlatform: Record<string, number>;
};

type ReviewsState = {
  reviews: Review[];
  loading: boolean;
  refreshing: boolean;
  initialized: boolean;
  filter: ReviewFilter;
  businessProfileId: string | null;
  businessProfile: BusinessProfile | null;

  // Actions
  setFilter: (filter: ReviewFilter) => void;
  fetchReviews: (userId: string) => Promise<void>;
  refreshReviews: (userId: string) => Promise<void>;
  markAsRead: (reviewId: string, userId: string) => Promise<void>;
  updateReviewReply: (reviewId: string, reply: string) => void;
  subscribeToRealtime: (businessProfileId: string) => () => void;

  // Computed (via selectors)
  getFilteredReviews: () => Review[];
  getStats: () => ReviewStats;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useReviewsStore = create<ReviewsState>()((set, get) => ({
  reviews: [],
  loading: true,
  refreshing: false,
  initialized: false,
  filter: 'all',
  businessProfileId: null,
  businessProfile: null,

  setFilter: (filter) => set({ filter }),

  fetchReviews: async (userId) => {
    set({ loading: true });
    try {
      // Fetch business profile first
      const { data: profiles, error: profileErr } = await supabase
        .from('business_profiles')
        .select('id, business_name, platform, current_rating, total_reviews, last_polled_at, place_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('connected_at', { ascending: false })
        .limit(1);

      if (profileErr) {
        console.warn('[Reviews] business_profiles fetch failed:', profileErr.message);
      }

      const profile = (profiles?.[0] ?? null) as BusinessProfile | null;
      set({ businessProfileId: profile?.id ?? null, businessProfile: profile });

      if (!profile) {
        set({ reviews: [], loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('reviews')
        .select('id, platform, reviewer_name, reviewer_avatar_url, rating, review_text, review_url, owner_reply, ai_draft, is_new, is_flagged, review_date, created_at')
        .eq('business_profile_id', profile.id)
        .order('review_date', { ascending: false })
        .limit(200);

      if (error) {
        console.warn('[Reviews] fetch failed:', error.message);
      } else {
        set({ reviews: (data ?? []) as Review[] });
      }
    } catch {
      // Silent — stale data shown
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  refreshReviews: async (userId) => {
    set({ refreshing: true });
    const profileId = get().businessProfileId;

    try {
      if (!profileId) {
        // Try to get business profile
        await get().fetchReviews(userId);
        set({ refreshing: false });
        return;
      }

      const { data, error } = await supabase
        .from('reviews')
        .select('id, platform, reviewer_name, reviewer_avatar_url, rating, review_text, review_url, owner_reply, ai_draft, is_new, is_flagged, review_date, created_at')
        .eq('business_profile_id', profileId)
        .order('review_date', { ascending: false })
        .limit(200);

      if (!error) {
        set({ reviews: (data ?? []) as Review[] });
      }
    } catch {
      // Silent
    } finally {
      set({ refreshing: false });
    }
  },

  markAsRead: async (reviewId, userId) => {
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === reviewId ? { ...r, is_new: false } : r
      ),
    }));

    // Fire-and-forget DB update — filter by both id and user_id for safety
    supabase
      .from('reviews')
      .update({ is_new: false })
      .eq('id', reviewId)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) console.warn('Mark read failed:', error.message);
      });
  },

  updateReviewReply: (reviewId, reply) => {
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === reviewId ? { ...r, owner_reply: reply } : r
      ),
    }));
  },

  subscribeToRealtime: (businessProfileId) => {
    const channel = supabase
      .channel(`reviews-store-${businessProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
          filter: `business_profile_id=eq.${businessProfileId}`,
        },
        (payload) => {
          const newReview = payload.new as unknown as Review;
          set((state) => ({
            reviews: [newReview, ...state.reviews],
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reviews',
          filter: `business_profile_id=eq.${businessProfileId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as Review;
          set((state) => ({
            reviews: state.reviews.map((r) =>
              r.id === updated.id ? { ...r, ...updated } : r
            ),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  getFilteredReviews: () => {
    const { reviews, filter } = get();
    switch (filter) {
      case 'google':
        return reviews.filter((r) => r.platform === 'google');
      case 'yelp':
        return reviews.filter((r) => r.platform === 'yelp');
      case 'pending':
        return reviews.filter((r) => !r.owner_reply);
      case 'flagged':
        return reviews.filter((r) => r.is_flagged);
      default:
        return reviews;
    }
  },

  getStats: () => {
    const { reviews } = get();
    const total = reviews.length;
    const rated = reviews.filter((r) => r.rating !== null);
    const avgRating =
      rated.length > 0
        ? (rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length).toFixed(1)
        : '—';
    const replied = reviews.filter((r) => r.owner_reply !== null).length;
    const responseRate = total > 0 ? `${Math.round((replied / total) * 100)}%` : '—';
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = reviews.filter(
      (r) => r.review_date && new Date(r.review_date).getTime() > weekAgo
    ).length;
    const pendingCount = reviews.filter((r) => !r.owner_reply).length;
    const flaggedCount = reviews.filter((r) => r.is_flagged).length;

    const byPlatform: Record<string, number> = {};
    for (const r of reviews) {
      byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + 1;
    }

    return { totalCount: total, avgRating, responseRate, thisWeek, pendingCount, flaggedCount, byPlatform };
  },
}));
