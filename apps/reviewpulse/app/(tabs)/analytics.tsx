// ReviewPulse — Analytics Dashboard (Sprint 9)
// Industrial gauge-cluster dashboard: big stat readouts, teal+lime charts, time-period toggle
// Pro-gated: free users see blurred mock preview with upgrade CTA (preserved from Sprint 8)

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare,
  Lock,
  Crown,
  Sparkles,
  RefreshCw,
  Minus,
} from 'lucide-react-native';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Layout,
  Spacing,
  Radius,
  Shadows,
  FontFamily,
  Duration,
  HapticMap,
} from '@/constants';
import { useIsPro } from '@/hooks/useIsPro';
import { useAuthStore } from '@/store/auth';
import { useReviewsStore } from '@/store/reviews';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimePeriod = '30d' | '90d' | '1y';

type ReviewRow = {
  id: string;
  platform: string;
  rating: number;
  review_date: string;
  owner_reply: string | null;
};


// ─── Helpers ──────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Layout.screenPaddingH * 2 - Spacing.md * 2 - 20;

function getPeriodDays(period: TimePeriod): number {
  switch (period) {
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
  }
}

function getPeriodLabel(period: TimePeriod): string {
  switch (period) {
    case '30d': return 'Last 30 Days';
    case '90d': return 'Last 90 Days';
    case '1y': return 'Last Year';
  }
}

/** Group reviews into weekly buckets for velocity chart */
function groupByWeek(reviews: ReviewRow[], days: number): { label: string; value: number }[] {
  const now = Date.now();
  const cutoff = now - days * 86400000;
  const filtered = reviews.filter(
    (r) => r.review_date && new Date(r.review_date).getTime() >= cutoff
  );

  // Determine bucket count: 30d=4 weeks, 90d=12 weeks, 1y=12 months
  const bucketCount = days <= 30 ? 4 : days <= 90 ? 12 : 12;
  const bucketMs = (days * 86400000) / bucketCount;
  const buckets: number[] = new Array(bucketCount).fill(0);

  for (const r of filtered) {
    const t = new Date(r.review_date).getTime();
    const idx = Math.min(
      Math.floor((t - cutoff) / bucketMs),
      bucketCount - 1
    );
    if (idx >= 0) buckets[idx]++;
  }

  return buckets.map((count, i) => {
    // Label: show abbreviated dates
    const bucketStart = new Date(cutoff + i * bucketMs);
    const label =
      days <= 90
        ? `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`
        : bucketStart.toLocaleString('en', { month: 'short' });
    return { label, value: count };
  });
}

/** Compute rolling average rating over time periods */
function computeRatingTrend(
  reviews: ReviewRow[],
  days: number
): { value: number; label: string; dataPointText: string }[] {
  const now = Date.now();
  const cutoff = now - days * 86400000;
  const filtered = reviews
    .filter((r) => r.review_date && new Date(r.review_date).getTime() >= cutoff && r.rating)
    .sort((a, b) => new Date(a.review_date).getTime() - new Date(b.review_date).getTime());

  if (filtered.length === 0) return [];

  const pointCount = days <= 30 ? 6 : days <= 90 ? 9 : 12;
  const bucketMs = (days * 86400000) / pointCount;
  const points: { value: number; label: string; dataPointText: string }[] = [];

  for (let i = 0; i < pointCount; i++) {
    const bucketEnd = cutoff + (i + 1) * bucketMs;
    const inBucket = filtered.filter(
      (r) => new Date(r.review_date).getTime() <= bucketEnd
    );
    if (inBucket.length === 0) continue;

    const avg = inBucket.reduce((s, r) => s + r.rating, 0) / inBucket.length;
    const d = new Date(cutoff + (i + 0.5) * bucketMs);
    const label =
      days <= 90
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : d.toLocaleString('en', { month: 'short' });

    points.push({
      value: parseFloat(avg.toFixed(2)),
      label,
      dataPointText: avg.toFixed(1),
    });
  }

  return points;
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ text, isDark }: { text: string; isDark: boolean }) {
  const theme = isDark ? DarkTheme : LightTheme;
  return (
    <Text
      style={[
        Typography.label,
        {
          color: theme.textTertiary,
          marginBottom: Spacing.sm,
          marginTop: Spacing.lg,
        },
      ]}
    >
      {text}
    </Text>
  );
}

// ─── Time Period Toggle ───────────────────────────────────────────────────────

function PeriodToggle({
  selected,
  onChange,
  isDark,
}: {
  selected: TimePeriod;
  onChange: (p: TimePeriod) => void;
  isDark: boolean;
}) {
  const theme = isDark ? DarkTheme : LightTheme;
  const periods: TimePeriod[] = ['30d', '90d', '1y'];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: isDark ? DarkTheme.bgSurface2 : Colors.slate[50],
        borderRadius: Radius.sm,
        padding: 3,
      }}
    >
      {periods.map((p) => {
        const active = p === selected;
        return (
          <Pressable
            key={p}
            onPress={() => {
              HapticMap.segmentSwitch();
              onChange(p);
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: Radius.xs,
              backgroundColor: active
                ? isDark
                  ? Colors.primary[900]
                  : '#FFFFFF'
                : 'transparent',
              alignItems: 'center',
              ...(active && !isDark ? Shadows.sm : {}),
            }}
          >
            <Text
              style={{
                fontFamily: active
                  ? FontFamily.barlowCondensedBold
                  : FontFamily.barlowCondensedSemiBold,
                fontSize: 14,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: active
                  ? Colors.primary[500]
                  : theme.textTertiary,
              }}
            >
              {p === '1y' ? '1 YEAR' : p.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Gauge Stat Card ──────────────────────────────────────────────────────────

function GaugeStat({
  value,
  label,
  sub,
  accent,
  trend,
  isDark,
  large,
}: {
  value: string;
  label: string;
  sub?: string;
  accent?: boolean;
  trend?: 'up' | 'down' | 'flat';
  isDark: boolean;
  large?: boolean;
}) {
  const theme = isDark ? DarkTheme : LightTheme;
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? Colors.success[500]
      : trend === 'down'
      ? Colors.error[500]
      : theme.textTertiary;

  return (
    <View
      style={{
        flex: large ? 1.2 : 1,
        backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
        borderRadius: Radius.md,
        padding: large ? Spacing.md : Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: large ? 90 : 72,
        ...(isDark
          ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
          : Shadows.sm),
      }}
    >
      <Text
        style={{
          fontFamily: FontFamily.barlowCondensedExtraBold,
          fontSize: large ? 36 : 26,
          lineHeight: large ? 38 : 28,
          letterSpacing: -0.5,
          color: accent ? Colors.accent[700] : Colors.primary[500],
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
      {sub && trend && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            marginTop: 3,
          }}
        >
          <TrendIcon size={10} color={trendColor} strokeWidth={2.5} />
          <Text
            style={{
              fontFamily: FontFamily.sourceSansSemiBold,
              fontSize: 11,
              color: trendColor,
            }}
          >
            {sub}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Chart Card Wrapper ───────────────────────────────────────────────────────

function ChartCard({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
        borderRadius: Radius.md,
        padding: Spacing.md,
        ...(isDark
          ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
          : Shadows.sm),
      }}
    >
      {children}
    </View>
  );
}

// ─── Skeleton Pulse ───────────────────────────────────────────────────────────

function SkeletonBlock({
  width,
  height,
  isDark,
  radius,
}: {
  width: number | string;
  height: number;
  isDark: boolean;
  radius?: number;
}) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{
        width: width as number,
        height,
        borderRadius: radius ?? Radius.xs,
        backgroundColor: isDark ? DarkTheme.bgSurface3 : Colors.slate[100],
        opacity: pulseAnim,
      }}
    />
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function AnalyticsSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <View style={{ padding: Layout.screenPaddingH, gap: Spacing.md }}>
      {/* Period toggle skeleton */}
      <SkeletonBlock width="100%" height={36} isDark={isDark} radius={Radius.sm} />
      {/* Stat cards */}
      <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1 }}>
            <SkeletonBlock width="100%" height={72} isDark={isDark} radius={Radius.md} />
          </View>
        ))}
      </View>
      {/* Chart skeletons */}
      <SkeletonBlock width="100%" height={200} isDark={isDark} radius={Radius.md} />
      <SkeletonBlock width="100%" height={180} isDark={isDark} radius={Radius.md} />
      {/* Bottom row */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock width="100%" height={160} isDark={isDark} radius={Radius.md} />
        </View>
        <View style={{ flex: 1 }}>
          <SkeletonBlock width="100%" height={160} isDark={isDark} radius={Radius.md} />
        </View>
      </View>
      {/* Insight card */}
      <SkeletonBlock width="100%" height={80} isDark={isDark} radius={Radius.md} />
    </View>
  );
}

// ─── Empty State (Pro user, no data) ──────────────────────────────────────────

function EmptyAnalytics({ isDark }: { isDark: boolean }) {
  const theme = isDark ? DarkTheme : LightTheme;
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing['2xl'],
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: isDark ? Colors.primary[900] : Colors.primary[50],
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: Spacing.lg,
        }}
      >
        <BarChart2 size={32} color={Colors.primary[500]} strokeWidth={1.5} />
      </View>
      <Text
        style={[
          Typography.h2,
          { color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
        ]}
      >
        NO DATA YET
      </Text>
      <Text
        style={[
          Typography.bodySm,
          {
            color: theme.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 280,
          },
        ]}
      >
        Analytics will populate after your first reviews come in. Send some review requests to get started.
      </Text>
    </View>
  );
}

// ─── Platform Bar ─────────────────────────────────────────────────────────────

function PlatformBar({
  platform,
  count,
  total,
  isDark,
}: {
  platform: string;
  count: number;
  total: number;
  isDark: boolean;
}) {
  const theme = isDark ? DarkTheme : LightTheme;
  const pct = total > 0 ? (count / total) * 100 : 0;
  const platformColors: Record<string, string> = {
    google: '#4285F4',
    yelp: '#D32323',
    trustpilot: '#00B67A',
    facebook: '#1877F2',
  };
  const barColor = platformColors[platform] ?? Colors.primary[500];

  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.sourceSansSemiBold,
            fontSize: 13,
            color: theme.textSecondary,
            textTransform: 'capitalize',
          }}
        >
          {platform}
        </Text>
        <Text
          style={{
            fontFamily: FontFamily.barlowCondensedBold,
            fontSize: 14,
            color: theme.textPrimary,
          }}
        >
          {count} ({pct.toFixed(0)}%)
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: isDark ? DarkTheme.bgSurface3 : Colors.slate[100],
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.max(pct, 2)}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}

// ─── AI Insights Card ─────────────────────────────────────────────────────────

function InsightsCard({
  insight,
  loading,
  onRefresh,
  isDark,
}: {
  insight: string | null;
  loading: boolean;
  onRefresh: () => void;
  isDark: boolean;
}) {
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <View
      style={{
        backgroundColor: isDark
          ? Colors.primary[950] + 'CC'
          : Colors.primary[50],
        borderRadius: Radius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: isDark ? Colors.primary[700] + '40' : Colors.primary[100],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: Spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} color={Colors.accent[300]} strokeWidth={2} />
          <Text
            style={[Typography.label, { color: Colors.primary[500], fontSize: 12 }]}
          >
            AI INSIGHT
          </Text>
        </View>
        <Pressable
          onPress={() => {
            HapticMap.buttonPress();
            onRefresh();
          }}
          hitSlop={12}
        >
          <RefreshCw
            size={14}
            color={theme.textTertiary}
            strokeWidth={2}
            style={loading ? { opacity: 0.4 } : {}}
          />
        </Pressable>
      </View>
      {loading ? (
        <SkeletonBlock width="100%" height={40} isDark={isDark} radius={Radius.xs} />
      ) : insight ? (
        <Text
          style={[
            Typography.bodySm,
            { color: isDark ? DarkTheme.textSecondary : Colors.primary[900], lineHeight: 21 },
          ]}
        >
          {insight}
        </Text>
      ) : (
        <Text
          style={[Typography.bodySm, { color: theme.textTertiary, fontStyle: 'italic' }]}
        >
          Connect your Google Business Profile to get AI-powered insights.
        </Text>
      )}
    </View>
  );
}

// ─── Free User Locked Overlay (preserved from Sprint 8) ──────────────────────

function LockedOverlay({ isDark }: { isDark: boolean }) {
  const theme = isDark ? DarkTheme : LightTheme;
  const router = useRouter();

  const mockStats = [
    { label: 'Avg Rating', value: '4.7', icon: Star },
    { label: 'Reviews', value: '142', icon: MessageSquare },
    { label: 'Trend', value: '+12%', icon: TrendingUp },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Mock stats - visible but blurred */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
        {mockStats.map((stat) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
              borderRadius: Radius.md,
              padding: Spacing.md,
              alignItems: 'center',
              opacity: 0.35,
            }}
          >
            <stat.icon size={20} color={Colors.primary[300]} strokeWidth={1.5} />
            <Text
              style={[
                Typography.h2,
                { color: theme.textPrimary, marginTop: Spacing.xs },
              ]}
            >
              {stat.value}
            </Text>
            <Text style={[Typography.caption, { color: theme.textTertiary }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Mock chart area - blurred placeholder */}
      <View
        style={{
          backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
          borderRadius: Radius.md,
          padding: Spacing.xl,
          height: 180,
          marginBottom: Spacing.md,
          opacity: 0.25,
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 6,
            justifyContent: 'center',
          }}
        >
          {[40, 65, 55, 80, 70, 90, 75].map((h, i) => (
            <View
              key={i}
              style={{
                width: 24,
                height: h,
                backgroundColor: Colors.primary[300],
                borderRadius: 4,
              }}
            />
          ))}
        </View>
      </View>

      {/* Mock list items - blurred */}
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
            borderRadius: Radius.md,
            padding: Spacing.md,
            marginBottom: Spacing.sm,
            opacity: 0.2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.md,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: Radius.full,
              backgroundColor: Colors.primary[100],
            }}
          />
          <View style={{ flex: 1 }}>
            <View
              style={{
                width: '70%',
                height: 12,
                borderRadius: 4,
                backgroundColor: theme.textTertiary,
                marginBottom: 6,
              }}
            />
            <View
              style={{
                width: '45%',
                height: 10,
                borderRadius: 4,
                backgroundColor: theme.textTertiary,
              }}
            />
          </View>
        </View>
      ))}

      {/* Upgrade overlay */}
      <View
        style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: isDark
              ? 'rgba(19, 29, 43, 0.92)'
              : 'rgba(255, 255, 255, 0.92)',
            borderRadius: Radius.lg,
            padding: Spacing['2xl'],
            alignItems: 'center',
            width: '100%',
            maxWidth: 340,
            borderWidth: 1,
            borderColor: isDark
              ? Colors.accent[700] + '40'
              : Colors.accent[300] + '30',
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: Radius.full,
              backgroundColor: isDark
                ? Colors.primary[900] + '80'
                : Colors.primary[50],
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: Spacing.md,
            }}
          >
            <Lock size={28} color={Colors.primary[500]} strokeWidth={2} />
          </View>

          <Text
            style={[
              Typography.h2,
              {
                color: theme.textPrimary,
                textAlign: 'center',
                marginBottom: Spacing.sm,
              },
            ]}
          >
            ANALYTICS IS PRO
          </Text>

          <Text
            style={[
              Typography.bodySm,
              {
                color: theme.textSecondary,
                textAlign: 'center',
                marginBottom: Spacing.lg,
                lineHeight: 20,
              },
            ]}
          >
            Track your review trends, response rates, and rating history with
            detailed analytics.
          </Text>

          <Pressable
            onPress={() => {
              HapticMap.buttonPress();
              router.push('/paywall');
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.sm,
              backgroundColor: pressed
                ? Colors.accent[500]
                : Colors.accent[300],
              borderRadius: Radius.md,
              paddingVertical: 14,
              paddingHorizontal: Spacing.xl,
              width: '100%',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Crown size={18} color={Colors.primary[950]} strokeWidth={2.5} />
            <Text style={[Typography.button, { color: Colors.primary[950] }]}>
              UPGRADE TO PRO
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Main Analytics Screen ────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const { isPro } = useIsPro();
  const user = useAuthStore((s) => s.user);

  // Reviews from shared store — avoids duplicate Supabase call
  const storeReviews = useReviewsStore((s) => s.reviews);
  const storeLoading = useReviewsStore((s) => s.loading);
  const storeRefreshing = useReviewsStore((s) => s.refreshing);
  const storeInitialized = useReviewsStore((s) => s.initialized);
  const fetchReviews = useReviewsStore((s) => s.fetchReviews);
  const refreshReviews = useReviewsStore((s) => s.refreshReviews);

  // Cast to ReviewRow shape needed by chart helpers (subset of full Review)
  const reviews = useMemo<ReviewRow[]>(
    () =>
      storeReviews
        .filter((r) => r.review_date != null)
        .map((r) => ({
          id: r.id,
          platform: r.platform,
          rating: r.rating ?? 0,
          review_date: r.review_date as string,
          owner_reply: r.owner_reply,
        })),
    [storeReviews]
  );

  const loading = isPro ? storeLoading : false;
  const refreshing = storeRefreshing;

  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // Trigger initial fetch if analytics is opened before reviews tab
  useEffect(() => {
    if (isPro && user && !storeInitialized) {
      fetchReviews(user.id).catch(() => {});
    }
  }, [isPro, user, storeInitialized, fetchReviews]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    HapticMap.pullToRefresh();
    await refreshReviews(user.id);
  }, [user, refreshReviews]);

  // ─── AI Insight ───────────────────────────────────────────────────────────

  const fetchInsight = useCallback(async () => {
    if (!user || reviews.length === 0) return;
    setInsightLoading(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('generate-insights', {
        body: { user_id: user.id, period: period },
      });
      if (invokeErr) {
        console.warn('[Analytics] generate-insights failed:', invokeErr.message);
      } else if (data?.insight) {
        setInsight(data.insight);
      }
    } catch {
      // Silent
    } finally {
      setInsightLoading(false);
    }
  }, [user, reviews.length, period]);

  useEffect(() => {
    if (isPro && reviews.length > 0 && !insight) {
      fetchInsight();
    }
  }, [isPro, reviews.length, fetchInsight, insight]);

  // ─── Computed Stats ───────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const days = getPeriodDays(period);
    const cutoff = Date.now() - days * 86400000;
    const periodReviews = reviews.filter(
      (r) => r.review_date && new Date(r.review_date).getTime() >= cutoff
    );

    const totalAll = reviews.length;
    const totalPeriod = periodReviews.length;
    const rated = periodReviews.filter((r) => r.rating);
    const avgRating =
      rated.length > 0
        ? rated.reduce((s, r) => s + r.rating, 0) / rated.length
        : 0;

    const replied = periodReviews.filter((r) => r.owner_reply !== null).length;
    const responseRate = totalPeriod > 0 ? (replied / totalPeriod) * 100 : 0;

    // Previous period for trend comparison
    const prevCutoff = cutoff - days * 86400000;
    const prevReviews = reviews.filter(
      (r) =>
        r.review_date &&
        new Date(r.review_date).getTime() >= prevCutoff &&
        new Date(r.review_date).getTime() < cutoff
    );
    const prevCount = prevReviews.length;
    const velocityTrend: 'up' | 'down' | 'flat' =
      totalPeriod > prevCount ? 'up' : totalPeriod < prevCount ? 'down' : 'flat';
    const velocityDelta =
      prevCount > 0
        ? Math.round(((totalPeriod - prevCount) / prevCount) * 100)
        : totalPeriod > 0
        ? 100
        : 0;

    // Platform breakdown
    const platforms: Record<string, number> = {};
    for (const r of reviews) {
      platforms[r.platform] = (platforms[r.platform] ?? 0) + 1;
    }

    return {
      totalAll,
      totalPeriod,
      avgRating,
      responseRate,
      replied,
      velocityTrend,
      velocityDelta,
      platforms,
    };
  }, [reviews, period]);

  // ─── Chart Data ───────────────────────────────────────────────────────────

  const ratingTrendData = useMemo(
    () => computeRatingTrend(reviews, getPeriodDays(period)),
    [reviews, period]
  );

  const velocityData = useMemo(
    () => groupByWeek(reviews, getPeriodDays(period)),
    [reviews, period]
  );

  const donutData = useMemo(() => {
    const replied = stats.replied;
    const unreplied = stats.totalPeriod - replied;
    if (stats.totalPeriod === 0) return [];
    return [
      {
        value: replied,
        color: Colors.primary[500],
        text: `${Math.round(stats.responseRate)}%`,
      },
      {
        value: Math.max(unreplied, 0),
        color: isDark ? DarkTheme.bgSurface3 : Colors.slate[100],
      },
    ];
  }, [stats, isDark]);

  // ─── Free User Gate ───────────────────────────────────────────────────────

  if (!isPro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View
          style={{ padding: Layout.screenPaddingH, paddingTop: Spacing.xl, flex: 1 }}
        >
          <Text
            style={[
              Typography.h1,
              { color: theme.textPrimary, marginBottom: Spacing.xl },
            ]}
          >
            ANALYTICS
          </Text>
          <LockedOverlay isDark={isDark} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View style={{ paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.xl }}>
          <Text
            style={[
              Typography.h1,
              { color: theme.textPrimary, marginBottom: Spacing.lg },
            ]}
          >
            ANALYTICS
          </Text>
        </View>
        <AnalyticsSkeleton isDark={isDark} />
      </SafeAreaView>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────────────────

  if (reviews.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View style={{ paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.xl }}>
          <Text
            style={[
              Typography.h1,
              { color: theme.textPrimary, marginBottom: Spacing.lg },
            ]}
          >
            ANALYTICS
          </Text>
        </View>
        <EmptyAnalytics isDark={isDark} />
      </SafeAreaView>
    );
  }

  // ─── Chart Colors ─────────────────────────────────────────────────────────

  const chartTextColor = theme.textTertiary;
  const chartLineColor = Colors.primary[500];
  const chartBarColor = Colors.primary[500];
  const chartGridColor = isDark ? DarkTheme.borderDefault : Colors.slate[100];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Layout.screenPaddingH,
          paddingTop: Spacing.xl,
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
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: Spacing.lg,
          }}
        >
          <Text style={[Typography.h1, { color: theme.textPrimary }]}>
            ANALYTICS
          </Text>
          <Text
            style={[
              Typography.caption,
              { color: theme.textTertiary, marginTop: 6 },
            ]}
          >
            {getPeriodLabel(period)}
          </Text>
        </View>

        {/* Period Toggle */}
        <PeriodToggle selected={period} onChange={setPeriod} isDark={isDark} />

        {/* ── Stat Cards Row ─────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.xs,
            marginTop: Spacing.lg,
          }}
        >
          <GaugeStat
            value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '--'}
            label="Avg Rating"
            accent
            isDark={isDark}
            large
          />
          <GaugeStat
            value={String(stats.totalPeriod)}
            label="Reviews"
            sub={
              stats.velocityDelta !== 0
                ? `${stats.velocityDelta > 0 ? '+' : ''}${stats.velocityDelta}%`
                : undefined
            }
            trend={stats.velocityTrend}
            isDark={isDark}
          />
          <GaugeStat
            value={`${Math.round(stats.responseRate)}%`}
            label="Replied"
            isDark={isDark}
          />
          <GaugeStat
            value={String(stats.totalAll)}
            label="Total"
            isDark={isDark}
          />
        </View>

        {/* ── Rating Trend Chart ─────────────────────────────────────────── */}
        {ratingTrendData.length > 1 && (
          <>
            <SectionLabel text="RATING TREND" isDark={isDark} />
            <ChartCard isDark={isDark}>
              <LineChart
                data={ratingTrendData}
                width={CHART_WIDTH}
                height={160}
                color={chartLineColor}
                thickness={2.5}
                dataPointsColor={Colors.accent[300]}
                dataPointsRadius={5}
                curved
                curvature={0.2}
                startFillColor={Colors.primary[500] + '30'}
                endFillColor={Colors.primary[500] + '05'}
                areaChart
                hideRules
                yAxisTextStyle={{
                  fontFamily: FontFamily.sourceSansRegular,
                  fontSize: 11,
                  color: chartTextColor,
                }}
                xAxisLabelTextStyle={{
                  fontFamily: FontFamily.sourceSansRegular,
                  fontSize: 10,
                  color: chartTextColor,
                  width: 40,
                  textAlign: 'center',
                }}
                yAxisColor="transparent"
                xAxisColor={chartGridColor}
                maxValue={5}
                noOfSections={5}
                spacing={(CHART_WIDTH - 40) / Math.max(ratingTrendData.length - 1, 1)}
                initialSpacing={10}
                endSpacing={10}
                showVerticalLines={false}
                rulesColor={chartGridColor}
                rulesType="dashed"
                dashWidth={4}
                dashGap={4}
                isAnimated
                animationDuration={Duration.slow}
                pointerConfig={{
                  pointerStripColor: Colors.primary[300],
                  pointerStripWidth: 1,
                  pointerColor: Colors.accent[300],
                  radius: 6,
                  pointerLabelWidth: 60,
                  pointerLabelHeight: 30,
                  pointerLabelComponent: (items: { value: number }[]) => {
                    return (
                      <View
                        style={{
                          backgroundColor: Colors.primary[900],
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          marginLeft: -20,
                          marginTop: -8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FontFamily.barlowCondensedBold,
                            fontSize: 14,
                            color: Colors.accent[300],
                          }}
                        >
                          {items[0]?.value?.toFixed(1)} ★
                        </Text>
                      </View>
                    );
                  },
                }}
              />
            </ChartCard>
          </>
        )}

        {/* ── Review Velocity Chart ──────────────────────────────────────── */}
        {velocityData.length > 0 && (
          <>
            <SectionLabel text="REVIEW VELOCITY" isDark={isDark} />
            <ChartCard isDark={isDark}>
              <BarChart
                data={velocityData.map((d) => ({
                  value: d.value,
                  label: d.label,
                  frontColor: chartBarColor,
                  topLabelComponent: () =>
                    d.value > 0 ? (
                      <Text
                        style={{
                          fontFamily: FontFamily.barlowCondensedBold,
                          fontSize: 12,
                          color: Colors.primary[500],
                          textAlign: 'center',
                          marginBottom: 2,
                        }}
                      >
                        {d.value}
                      </Text>
                    ) : null,
                }))}
                width={CHART_WIDTH}
                height={140}
                barWidth={
                  Math.min(
                    28,
                    (CHART_WIDTH - 40) / velocityData.length - 8
                  )
                }
                barBorderRadius={4}
                noOfSections={4}
                yAxisTextStyle={{
                  fontFamily: FontFamily.sourceSansRegular,
                  fontSize: 11,
                  color: chartTextColor,
                }}
                xAxisLabelTextStyle={{
                  fontFamily: FontFamily.sourceSansRegular,
                  fontSize: 10,
                  color: chartTextColor,
                  width: 36,
                  textAlign: 'center',
                }}
                yAxisColor="transparent"
                xAxisColor={chartGridColor}
                rulesColor={chartGridColor}
                rulesType="dashed"
                dashWidth={4}
                dashGap={4}
                isAnimated
                animationDuration={Duration.slow}
                spacing={
                  (CHART_WIDTH - 40) / velocityData.length -
                  Math.min(28, (CHART_WIDTH - 40) / velocityData.length - 8)
                }
                initialSpacing={10}
              />
            </ChartCard>
          </>
        )}

        {/* ── Bottom Row: Response Rate + Platform Breakdown ─────────────── */}
        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.sm,
            marginTop: Spacing.lg,
          }}
        >
          {/* Response Rate Donut */}
          <View style={{ flex: 1 }}>
            <Text
              style={[
                Typography.label,
                { color: theme.textTertiary, marginBottom: Spacing.sm },
              ]}
            >
              RESPONSE RATE
            </Text>
            <ChartCard isDark={isDark}>
              <View style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
                {donutData.length > 0 ? (
                  <PieChart
                    data={donutData}
                    donut
                    radius={52}
                    innerRadius={36}
                    innerCircleColor={
                      isDark ? DarkTheme.bgSurface : '#FFFFFF'
                    }
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Text
                          style={{
                            fontFamily: FontFamily.barlowCondensedExtraBold,
                            fontSize: 22,
                            color: Colors.primary[500],
                            lineHeight: 24,
                          }}
                        >
                          {Math.round(stats.responseRate)}%
                        </Text>
                      </View>
                    )}
                    isAnimated
                  />
                ) : (
                  <View
                    style={{
                      width: 104,
                      height: 104,
                      borderRadius: 52,
                      borderWidth: 12,
                      borderColor: isDark
                        ? DarkTheme.bgSurface3
                        : Colors.slate[100],
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FontFamily.barlowCondensedBold,
                        fontSize: 18,
                        color: theme.textTertiary,
                      }}
                    >
                      --
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: theme.textSecondary,
                      marginTop: Spacing.sm,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {stats.replied} of {stats.totalPeriod} replied
                </Text>
              </View>
            </ChartCard>
          </View>

          {/* Platform Breakdown */}
          <View style={{ flex: 1 }}>
            <Text
              style={[
                Typography.label,
                { color: theme.textTertiary, marginBottom: Spacing.sm },
              ]}
            >
              PLATFORMS
            </Text>
            <ChartCard isDark={isDark}>
              <View style={{ paddingVertical: Spacing.xs }}>
                {Object.entries(stats.platforms).length > 0 ? (
                  Object.entries(stats.platforms)
                    .sort((a, b) => b[1] - a[1])
                    .map(([platform, count]) => (
                      <PlatformBar
                        key={platform}
                        platform={platform}
                        count={count}
                        total={stats.totalAll}
                        isDark={isDark}
                      />
                    ))
                ) : (
                  <Text
                    style={[
                      Typography.bodySm,
                      {
                        color: theme.textTertiary,
                        textAlign: 'center',
                        paddingVertical: Spacing.xl,
                      },
                    ]}
                  >
                    No platform data
                  </Text>
                )}
              </View>
            </ChartCard>
          </View>
        </View>

        {/* ── AI Insights ────────────────────────────────────────────────── */}
        <SectionLabel text="AI INSIGHTS" isDark={isDark} />
        <InsightsCard
          insight={insight}
          loading={insightLoading}
          onRefresh={fetchInsight}
          isDark={isDark}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
