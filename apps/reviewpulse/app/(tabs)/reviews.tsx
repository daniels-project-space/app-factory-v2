// ReviewPulse — Reviews Tab
// Full review management: FlatList feed, filter tabs, platform badges, quick-reply, FAB
// Queries reviews via store; subscribes to realtime inserts

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  Star,
  Send,
  Filter,
  MessageSquare,
  Flag,
  AlertTriangle,
  Activity,
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
  Shadows,
  FontFamily,
  HapticMap,
} from '@/constants';
import { ReviewCard, type Review } from '@/components/shared/ReviewCard';
import { SkeletonList } from '@/components/shared/SkeletonLoader';
import { useAuthStore } from '@/store/auth';
import { useReviewsStore, type ReviewFilter } from '@/store/reviews';
import { useDemoStore } from '@/store/demo';

// ─── Filter Chip ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: ReviewFilter; label: string; icon?: React.ReactNode }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'google', label: 'GOOGLE' },
  { key: 'yelp', label: 'YELP' },
  { key: 'pending', label: 'PENDING' },
  { key: 'flagged', label: 'FLAGGED' },
];

function FilterChip({
  label,
  active,
  count,
  onPress,
}: {
  label: string;
  active: boolean;
  count?: number;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}${active ? ', selected' : ''}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Radius.full,
        backgroundColor: active
          ? Colors.primary[500]
          : pressed
            ? isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3
            : isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
        borderWidth: active ? 0 : 1,
        borderColor: active ? 'transparent' : isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
      })}
    >
      <Text
        style={{
          fontFamily: active ? FontFamily.barlowCondensedBold : FontFamily.barlowCondensedSemiBold,
          fontSize: 13,
          letterSpacing: 0.5,
          color: active ? '#FFFFFF' : theme.textSecondary,
        }}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          style={{
            backgroundColor: active
              ? 'rgba(255,255,255,0.25)'
              : isDark ? DarkTheme.bgSurface3 : Colors.slate[200],
            borderRadius: Radius.full,
            minWidth: 20,
            height: 18,
            paddingHorizontal: 5,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: FontFamily.barlowCondensedBold,
              fontSize: 11,
              color: active ? '#FFFFFF' : theme.textTertiary,
              lineHeight: 12,
            }}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Stat Badge (compact) ─────────────────────────────────────────────────────

function StatBadge({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
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
        ...(isDark
          ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
          : Shadows.sm),
      }}
    >
      <Text
        style={{
          fontFamily: 'Barlow-Condensed-ExtraBold',
          fontSize: 22,
          color: accent ? Colors.accent[700] : Colors.primary[500],
          lineHeight: 24,
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

// ─── Divider ──────────────────────────────────────────────────────────────────

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

// ─── Empty State — No Business Connected ──────────────────────────────────────

function EmptyNotConnected() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <View
      style={{
        marginTop: Spacing['2xl'],
        backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        marginHorizontal: Layout.screenPaddingH,
        ...(isDark
          ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
          : Shadows.sm),
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: isDark ? Colors.primary[900] : Colors.primary[50],
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Spacing.md,
        }}
      >
        <Activity size={30} color={Colors.primary[500]} strokeWidth={1.5} />
      </View>
      <Text
        style={[
          Typography.h3,
          { color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
        ]}
      >
        Connect Your Business
      </Text>
      <Text
        style={[
          Typography.bodySm,
          {
            color: theme.textSecondary,
            textAlign: 'center',
            marginBottom: Spacing.lg,
          },
        ]}
      >
        Link your Google Business Profile to start monitoring and responding to reviews.
      </Text>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/onboarding/connect-google');
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          height: 44,
          paddingHorizontal: Spacing.lg,
          borderRadius: Radius.xs,
          backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
        })}
      >
        <Text style={[Typography.button, { color: '#FFFFFF', fontSize: 14 }]}>
          CONNECT NOW
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Empty State — Connected but no reviews for filter ────────────────────────

function EmptyFiltered({ filter }: { filter: ReviewFilter }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const messages: Record<ReviewFilter, { title: string; subtitle: string; Icon: typeof Star }> = {
    all: {
      title: 'No Reviews Yet',
      subtitle: 'New reviews will appear here as they come in. Send a review request to get started!',
      Icon: Star,
    },
    google: {
      title: 'No Google Reviews',
      subtitle: 'Google reviews will appear here once customers start leaving them.',
      Icon: Star,
    },
    yelp: {
      title: 'No Yelp Reviews',
      subtitle: 'Connect your Yelp business page to monitor reviews here.',
      Icon: Star,
    },
    pending: {
      title: 'All Caught Up!',
      subtitle: 'Every review has been responded to. Great work staying on top of your reputation.',
      Icon: MessageSquare,
    },
    flagged: {
      title: 'No Flagged Reviews',
      subtitle: 'Reviews you flag for investigation will appear here.',
      Icon: Flag,
    },
  };

  const msg = messages[filter];

  return (
    <View
      style={{
        padding: Spacing.xl,
        alignItems: 'center',
        marginTop: Spacing.lg,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: isDark ? Colors.primary[900] : Colors.primary[50],
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Spacing.md,
        }}
      >
        <msg.Icon size={24} color={Colors.primary[500]} strokeWidth={1.5} />
      </View>
      <Text
        style={[
          Typography.h3,
          { color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
        ]}
      >
        {msg.title}
      </Text>
      <Text
        style={[
          Typography.bodySm,
          { color: theme.textSecondary, textAlign: 'center', maxWidth: 280 },
        ]}
      >
        {msg.subtitle}
      </Text>
      {filter === 'all' && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/request/new');
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            paddingVertical: Spacing.sm,
            paddingHorizontal: Spacing.md,
            borderRadius: Radius.sm,
            borderWidth: 1.5,
            borderColor: Colors.primary[500],
            backgroundColor: pressed
              ? isDark ? Colors.primary[900] : Colors.primary[50]
              : 'transparent',
            marginTop: Spacing.lg,
          })}
        >
          <Send size={14} color={Colors.primary[500]} strokeWidth={2} />
          <Text style={[Typography.buttonSm, { color: Colors.primary[500] }]}>
            SEND A REVIEW REQUEST
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <View
      style={{
        padding: Spacing.xl,
        alignItems: 'center',
        marginTop: Spacing['2xl'],
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: isDark ? Colors.error[700] + '20' : Colors.error[100],
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Spacing.md,
        }}
      >
        <AlertTriangle size={24} color={Colors.error[500]} strokeWidth={1.5} />
      </View>
      <Text
        style={[
          Typography.h3,
          { color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
        ]}
      >
        Something Went Wrong
      </Text>
      <Text
        style={[
          Typography.bodySm,
          { color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
        ]}
      >
        Could not load reviews. Check your connection and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          height: 44,
          paddingHorizontal: Spacing.lg,
          borderRadius: Radius.md,
          backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text style={[Typography.buttonSm, { color: '#FFFFFF' }]}>TRY AGAIN</Text>
      </Pressable>
    </View>
  );
}

// ─── Reviews Screen ───────────────────────────────────────────────────────────

export default function ReviewsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const user = useAuthStore((s) => s.user);
  const demoActive = useDemoStore((s) => s.active);
  const demoReviews = useDemoStore((s) => s.getReviews);
  const demoProfile = useDemoStore((s) => s.getBusinessProfile);

  // Store state
  const storeReviews = useReviewsStore((s) => s.reviews);
  const loading = useReviewsStore((s) => s.loading);
  const refreshing = useReviewsStore((s) => s.refreshing);
  const filter = useReviewsStore((s) => s.filter);
  const storeBusinessProfileId = useReviewsStore((s) => s.businessProfileId);
  const setFilter = useReviewsStore((s) => s.setFilter);
  const fetchReviews = useReviewsStore((s) => s.fetchReviews);
  const refreshReviews = useReviewsStore((s) => s.refreshReviews);
  const getFilteredReviews = useReviewsStore((s) => s.getFilteredReviews);
  const getStats = useReviewsStore((s) => s.getStats);
  const subscribeToRealtime = useReviewsStore((s) => s.subscribeToRealtime);

  // Use demo data when store is empty and demo is active
  const reviews = storeReviews.length > 0 ? storeReviews : (demoActive ? demoReviews() as unknown as Review[] : []);
  const businessProfileId = storeBusinessProfileId ?? (demoActive && demoProfile() ? demoProfile()!.id : null);

  const [hasError, setHasError] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    setHasError(false);
    fetchReviews(user.id).catch(() => setHasError(true));
  }, [user, fetchReviews]);

  // ─── Realtime Subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!businessProfileId) return;
    const unsub = subscribeToRealtime(businessProfileId);
    return unsub;
  }, [businessProfileId, subscribeToRealtime]);

  // ─── Pull-to-Refresh ───────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasError(false);
    try {
      await refreshReviews(user.id);
    } catch {
      setHasError(true);
    }
  }, [user, refreshReviews]);

  // ─── Filtered Data ─────────────────────────────────────────────────────────

  const filteredReviews = useMemo(() => getFilteredReviews(), [reviews, filter, getFilteredReviews]);
  const stats = useMemo(() => getStats(), [reviews, getStats]);

  // ─── Filter counts ─────────────────────────────────────────────────────────

  const filterCounts = useMemo(() => ({
    all: reviews.length,
    google: reviews.filter((r) => r.platform === 'google').length,
    yelp: reviews.filter((r) => r.platform === 'yelp').length,
    pending: reviews.filter((r) => !r.owner_reply).length,
    flagged: reviews.filter((r) => r.is_flagged).length,
  }), [reviews]);

  // ─── List Header ───────────────────────────────────────────────────────────

  const ListHeader = (
    <View>
      {/* Title */}
      <View
        style={{
          paddingHorizontal: Layout.screenPaddingH,
          paddingTop: Spacing.xl,
          paddingBottom: Spacing.md,
        }}
      >
        <Text style={[Typography.h1, { color: theme.textPrimary }]}>
          REVIEWS
        </Text>
      </View>

      {/* Stats row */}
      {businessProfileId && reviews.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.xs,
            paddingHorizontal: Layout.screenPaddingH,
            marginBottom: Spacing.md,
          }}
        >
          <StatBadge value={String(stats.totalCount)} label="Total" />
          <StatBadge value={stats.avgRating} label="Avg Rating" accent />
          <StatBadge value={stats.responseRate} label="Replied" />
          <StatBadge value={String(stats.pendingCount)} label="Pending" />
        </View>
      )}

      {/* Filter chips */}
      {businessProfileId && reviews.length > 0 && (
        <View
          style={{
            paddingHorizontal: Layout.screenPaddingH,
            marginBottom: Spacing.md,
          }}
        >
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={FILTER_OPTIONS}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ gap: Spacing.sm }}
            renderItem={({ item }) => (
              <FilterChip
                label={item.label}
                active={filter === item.key}
                count={filterCounts[item.key]}
                onPress={() => {
                  HapticMap.chipSelect();
                  setFilter(item.key);
                }}
              />
            )}
          />
        </View>
      )}

      {/* Section header */}
      {businessProfileId && filteredReviews.length > 0 && (
        <View style={{ paddingHorizontal: Layout.screenPaddingH, marginBottom: Spacing.xs }}>
          <Text
            style={[
              Typography.label,
              { color: theme.textSecondary },
            ]}
          >
            {filter === 'all'
              ? `${filteredReviews.length} REVIEW${filteredReviews.length !== 1 ? 'S' : ''}`
              : `${filteredReviews.length} ${filter.toUpperCase()} REVIEW${filteredReviews.length !== 1 ? 'S' : ''}`}
          </Text>
        </View>
      )}
    </View>
  );

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View
          style={{
            paddingHorizontal: Layout.screenPaddingH,
            paddingTop: Spacing.xl,
            paddingBottom: Spacing.md,
          }}
        >
          <Text style={[Typography.h1, { color: theme.textPrimary }]}>REVIEWS</Text>
        </View>
        <View
          style={{
            backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
            borderRadius: Radius.md,
            marginHorizontal: Layout.screenPaddingH,
            overflow: 'hidden',
            ...(isDark
              ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
              : Shadows.sm),
          }}
        >
          <SkeletonList count={6} type="review" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────

  if (hasError && reviews.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View
          style={{
            paddingHorizontal: Layout.screenPaddingH,
            paddingTop: Spacing.xl,
          }}
        >
          <Text style={[Typography.h1, { color: theme.textPrimary }]}>REVIEWS</Text>
        </View>
        <ErrorState onRetry={() => user && fetchReviews(user.id).catch(() => setHasError(true))} />
      </SafeAreaView>
    );
  }

  // ─── No Business Connected ──────────────────────────────────────────────────

  if (!businessProfileId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View
          style={{
            paddingHorizontal: Layout.screenPaddingH,
            paddingTop: Spacing.xl,
          }}
        >
          <Text style={[Typography.h1, { color: theme.textPrimary }]}>REVIEWS</Text>
        </View>
        <EmptyNotConnected />
      </SafeAreaView>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <FlatList
        data={filteredReviews}
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
        ListEmptyComponent={<EmptyFiltered filter={filter} />}
        contentContainerStyle={{
          backgroundColor:
            filteredReviews.length > 0
              ? isDark ? DarkTheme.bgSurface : '#FFFFFF'
              : 'transparent',
          borderRadius: filteredReviews.length > 0 ? Radius.md : 0,
          marginHorizontal: filteredReviews.length > 0 ? Layout.screenPaddingH : 0,
          overflow: 'hidden',
          paddingBottom: 120,
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
        getItemLayout={(_, index) => ({
          length: 108,
          offset: 108 * index,
          index,
        })}
      />

      {/* FAB — Request Review */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/request/new');
        }}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 100,
          right: Layout.screenPaddingH,
          width: Layout.fabSize,
          height: Layout.fabSize,
          borderRadius: Layout.fabSize / 2,
          backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
          alignItems: 'center',
          justifyContent: 'center',
          ...Shadows.lg,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <Send size={22} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </SafeAreaView>
  );
}
