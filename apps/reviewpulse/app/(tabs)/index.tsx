// ReviewPulse — Home / Review Feed Screen
// FlashList feed with demo data fallback, actionable insights, pull-to-refresh
// Queries reviews + business profile on mount; falls back to seed data if empty

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  Activity,
  Star,
  MessageSquare,
  Zap,
  Send,
  Bell,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  Award,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Spacing,
  Radius,
  Layout,
  FontFamily,
  HapticMap,
} from '@/constants';
import { ReviewCard, type Review } from '@/components/shared/ReviewCard';
import { SkeletonList } from '@/components/shared/SkeletonLoader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useDemoStore } from '@/store/demo';
import { useReviewsStore, type BusinessProfile } from '@/store/reviews';
import { generateInsights, getSeverityColor, type Insight, type InsightType } from '@/lib/insights';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Insight Icon Map ─────────────────────────────────────────────────────────

function InsightIcon({ type, color }: { type: InsightType; color: string }) {
  const size = 16;
  const sw = 2;
  switch (type) {
    case 'rating_drop': return <TrendingDown size={size} color={color} strokeWidth={sw} />;
    case 'trend_up': return <TrendingUp size={size} color={color} strokeWidth={sw} />;
    case 'response_needed': return <MessageSquare size={size} color={color} strokeWidth={sw} />;
    case 'top_complaint': return <AlertTriangle size={size} color={color} strokeWidth={sw} />;
    case 'top_praise': return <ThumbsUp size={size} color={color} strokeWidth={sw} />;
    case 'milestone': return <Award size={size} color={color} strokeWidth={sw} />;
  }
}

// ─── Insight Card ─────────────────────────────────────────────────────────────

function InsightCard({ insight, isDark }: { insight: Insight; isDark: boolean }) {
  const theme = isDark ? DarkTheme : LightTheme;
  const colors = getSeverityColor(insight.severity);

  return (
    <View
      style={{
        backgroundColor: isDark ? `${colors.text}15` : colors.bg,
        borderRadius: Radius.md,
        padding: Spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.border,
        marginBottom: Spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
        <View style={{ marginTop: 2 }}>
          <InsightIcon type={insight.type} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: FontFamily.sourceSansSemiBold,
              fontSize: 14,
              color: isDark ? theme.textPrimary : colors.text,
              marginBottom: 2,
            }}
          >
            {insight.title}
          </Text>
          <Text
            style={[
              Typography.caption,
              { color: isDark ? theme.textSecondary : colors.text, opacity: 0.85, lineHeight: 17 },
            ]}
          >
            {insight.description}
          </Text>
          {insight.actionLabel && (
            <Pressable
              onPress={() => {
                HapticMap.buttonPress();
                if (insight.type === 'response_needed') {
                  router.push('/(tabs)/reviews');
                }
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginTop: Spacing.xs,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: FontFamily.barlowCondensedSemiBold,
                  fontSize: 12,
                  color: Colors.primary[500],
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {insight.actionLabel}
              </Text>
              <ChevronRight size={12} color={Colors.primary[500]} strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  value: string;
  label: string;
  accent?: boolean;
}

function StatCard({ value, label, accent }: StatCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
        borderRadius: Radius.md,
        padding: Spacing.md,
        alignItems: 'center',
        minHeight: 64,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'Barlow-Condensed-ExtraBold',
          fontSize: 24,
          color: accent ? Colors.accent[700] : Colors.primary[500],
          lineHeight: 26,
        }}
      >
        {value}
      </Text>
      <Text
        style={[
          Typography.caption,
          {
            color: theme.textTertiary,
            textAlign: 'center',
            marginTop: 2,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Empty Home State ─────────────────────────────────────────────────────────

function EmptyHome({ hasProfile, onSendRequest }: { hasProfile: boolean; onSendRequest: () => void }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  if (!hasProfile) {
    return (
      <View style={{ alignItems: 'center', paddingTop: Spacing['2xl'], paddingHorizontal: Spacing.xl }}>
        <Star size={40} color={Colors.primary[500]} strokeWidth={1.5} />
        <Text style={[Typography.h3, { color: theme.textPrimary, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
          CONNECT YOUR BUSINESS
        </Text>
        <Text style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          Connect your Google Business Profile to start monitoring reviews and sending SMS requests.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', paddingTop: Spacing['2xl'], paddingHorizontal: Spacing.xl }}>
      <MessageSquare size={40} color={Colors.primary[500]} strokeWidth={1.5} />
      <Text style={[Typography.h3, { color: theme.textPrimary, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
        NO REVIEWS YET
      </Text>
      <Text style={[Typography.body, { color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xl }]}>
        Send your first SMS review request and watch the reviews roll in.
      </Text>
      <Pressable
        onPress={onSendRequest}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.xl,
          borderRadius: Radius.md,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={{ fontFamily: FontFamily.barlowCondensedSemiBold, fontSize: 15, letterSpacing: 0.5, color: '#FFFFFF' }}>
          New Request
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────

function Divider() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.borderDefault,
        marginLeft: Spacing.md + 40 + Spacing.sm,
      }}
    />
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const user = useAuthStore((s) => s.user);
  const demoActive = useDemoStore((s) => s.active);
  const demoReviews = useDemoStore((s) => s.getReviews);
  const demoProfile = useDemoStore((s) => s.getBusinessProfile);

  // Reviews and business profile from shared store — avoids duplicate Supabase calls
  const storeReviews = useReviewsStore((s) => s.reviews);
  const storeProfile = useReviewsStore((s) => s.businessProfile);
  const storeLoading = useReviewsStore((s) => s.loading);
  const storeRefreshing = useReviewsStore((s) => s.refreshing);
  const storeInitialized = useReviewsStore((s) => s.initialized);
  const fetchReviews = useReviewsStore((s) => s.fetchReviews);
  const refreshReviews = useReviewsStore((s) => s.refreshReviews);

  // Fall back to demo data when store has no real data after loading
  const businessProfile: BusinessProfile | null = storeProfile ?? (
    demoActive && storeInitialized ? (demoProfile() as BusinessProfile | null) : null
  );
  const reviews: Review[] = storeReviews.length > 0
    ? storeReviews
    : (demoActive && storeInitialized ? demoReviews() as unknown as Review[] : []);
  const loading = storeLoading;
  const refreshing = storeRefreshing;

  const newCount = useMemo(() => reviews.filter((r) => r.is_new).length, [reviews]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count, error: notifErr } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (!notifErr) setUnreadNotifications(count ?? 0);
    } catch {
      if (demoActive) setUnreadNotifications(3);
    }
  }, [user, demoActive]);

  useEffect(() => {
    if (!user) return;
    // Trigger review/profile fetch if store not yet initialized (e.g., home tab opened first)
    if (!storeInitialized) {
      fetchReviews(user.id).catch(() => {});
    }
    fetchNotificationCount();
  }, [user, storeInitialized, fetchReviews, fetchNotificationCount]);

  // ─── Pull-to-Refresh ───────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshReviews(user.id);
    await fetchNotificationCount();
  }, [user, refreshReviews, fetchNotificationCount]);

  // ─── Derived Stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = reviews.length;
    const rated = reviews.filter((r) => r.rating !== null);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
        : 0;
    const replied = reviews.filter((r) => r.owner_reply !== null).length;
    const responseRate = total > 0 ? Math.round((replied / total) * 100) : 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = reviews.filter(
      (r) => r.review_date && new Date(r.review_date).getTime() > weekAgo
    ).length;

    return {
      total,
      avgRating: avgRating > 0 ? avgRating.toFixed(1) : '--',
      responseRate: total > 0 ? `${responseRate}%` : '--',
      thisWeek: thisWeek > 0 ? `+${thisWeek}` : '0',
    };
  }, [reviews]);

  // ─── Insights ───────────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    if (reviews.length === 0) return [];
    // Cast reviews to SeedReview-compatible shape for insights engine
    const reviewsForInsights = reviews.map((r) => ({
      ...r,
      reviewer_name: r.reviewer_name ?? '',
      reviewer_avatar_url: null as null,
      rating: r.rating ?? 0,
      review_url: r.review_url ?? null,
      review_text: r.review_text ?? '',
      review_date: r.review_date ?? r.created_at,
      platform: r.platform as 'google' | 'yelp',
    }));
    return generateInsights(reviewsForInsights);
  }, [reviews]);

  // ─── Header Component ──────────────────────────────────────────────────────

  const ListHeader = (
    <View style={{ paddingHorizontal: Layout.screenPaddingH }}>
      {/* Greeting row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: Spacing.lg,
          marginTop: Spacing.lg,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[Typography.h4, { color: theme.textSecondary, marginBottom: 2 }]}>
            {getGreeting()}
          </Text>
          {businessProfile?.business_name ? (
            <Text style={[Typography.h1, { color: theme.textPrimary }]} numberOfLines={1}>
              {businessProfile.business_name.toUpperCase()}
            </Text>
          ) : (
            <View
              style={{
                height: 28,
                width: 160,
                backgroundColor: isDark ? DarkTheme.bgSurface : '#E8EEF0',
                borderRadius: 4,
                marginTop: 2,
              }}
            />
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm }}>
          {/* New reviews indicator */}
          {newCount > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: Colors.accent[300],
                borderRadius: Radius.full,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Zap size={12} color={Colors.primary[900]} fill={Colors.primary[900]} strokeWidth={1} />
              <Text
                style={{
                  fontFamily: FontFamily.barlowCondensedBold,
                  fontSize: 12,
                  color: Colors.primary[900],
                  letterSpacing: 0.5,
                }}
              >
                {newCount} NEW
              </Text>
            </View>
          )}

          {/* Settings gear icon */}
          <Pressable
            onPress={() => {
              HapticMap.buttonPress();
              router.push('/(tabs)/settings');
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Settings size={18} color={theme.textSecondary} strokeWidth={2} />
          </Pressable>

          {/* Bell icon -- notification center */}
          <Pressable
            onPress={() => {
              HapticMap.buttonPress();
              router.push('/notifications');
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ''}`}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Bell size={18} color={theme.textSecondary} strokeWidth={2} />
            {unreadNotifications > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: Colors.error[500],
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: isDark ? DarkTheme.bgBase : LightTheme.bgBase,
                }}
              >
                <Text
                  style={{
                    fontFamily: FontFamily.barlowCondensedBold,
                    fontSize: 9,
                    color: '#FFFFFF',
                    lineHeight: 10,
                  }}
                >
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Stats row */}
      {businessProfile && (
        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.xs,
            marginBottom: Spacing.lg,
          }}
        >
          <StatCard value={String(stats.total)} label="Reviews" />
          <StatCard value={stats.avgRating} label="Avg Rating" accent />
          <StatCard value={stats.responseRate} label="Replied" />
          <StatCard value={stats.thisWeek} label="This Week" />
        </View>
      )}

      {/* Actionable Insights */}
      {insights.length > 0 && (
        <View style={{ marginBottom: Spacing.lg }}>
          <Text
            style={[
              Typography.label,
              { color: theme.textSecondary, marginBottom: Spacing.sm },
            ]}
          >
            INSIGHTS
          </Text>
          {insights.slice(0, 3).map((insight) => (
            <InsightCard key={insight.id} insight={insight} isDark={isDark} />
          ))}
        </View>
      )}

      {/* Section header */}
      {businessProfile && reviews.length > 0 && (
        <Text
          style={[
            Typography.label,
            { color: theme.textSecondary, marginBottom: Spacing.sm },
          ]}
        >
          RECENT REVIEWS
        </Text>
      )}
    </View>
  );

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View
          style={{
            backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
            borderRadius: Radius.md,
            marginHorizontal: Layout.screenPaddingH,
            marginTop: Spacing.xl,
            overflow: 'hidden',
          }}
        >
          <SkeletonList count={5} type="review" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <FlatList
        data={businessProfile ? reviews : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/reviews/${item.id}`);
            }}
          />
        )}
        ItemSeparatorComponent={Divider}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyHome
            hasProfile={!!businessProfile}
            onSendRequest={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/request/new');
            }}
          />
        }
        contentContainerStyle={{
          backgroundColor: businessProfile && reviews.length > 0
            ? isDark ? DarkTheme.bgSurface : '#FFFFFF'
            : 'transparent',
          borderRadius: reviews.length > 0 ? Radius.md : 0,
          marginHorizontal: businessProfile && reviews.length > 0 ? Layout.screenPaddingH : 0,
          overflow: 'hidden',
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[500]}
            colors={[Colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* New Request FAB — pill button with icon + label for discoverability */}
      {businessProfile && (
        <Pressable
          accessibilityLabel="New Request"
          accessibilityRole="button"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/request/new');
          }}
          style={({ pressed }) => ({
            position: 'absolute',
            bottom: 100,
            right: Layout.screenPaddingH,
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
            paddingVertical: 14,
            paddingHorizontal: Spacing.lg,
            borderRadius: 30,
            shadowColor: '#0F7B7B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 10,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{
            fontFamily: FontFamily.barlowCondensedSemiBold,
            fontSize: 15,
            letterSpacing: 0.5,
            color: '#FFFFFF',
          }}>
            New Request
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
