// ReviewPulse — Skeleton Loader Component
// Pulsing placeholder for async content — never show a spinner
// Shapes: rect, circle, text. Composes into ReviewCard skeleton, StatCard skeleton etc.

import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';
import { useColorScheme } from 'nativewind';
import { DarkTheme, LightTheme, Radius, Spacing } from '@/constants';

// ─── Skeleton Atom ────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = Radius.xs, style }: SkeletonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Review Card Skeleton ─────────────────────────────────────────────────────

export function ReviewCardSkeleton() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        gap: Spacing.md,
      }}
    >
      {/* Avatar */}
      <Skeleton width={40} height={40} borderRadius={Radius.full} />

      <View style={{ flex: 1, gap: Spacing.xs }}>
        {/* Name + date row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={120} height={14} />
          <Skeleton width={60} height={12} />
        </View>

        {/* Star row */}
        <Skeleton width={80} height={12} />

        {/* Review text lines */}
        <Skeleton width="100%" height={13} />
        <Skeleton width="75%" height={13} />
      </View>
    </View>
  );
}

// ─── Stat Card Skeleton ───────────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <View style={{ padding: Spacing.md, gap: Spacing.xs }}>
      <Skeleton width={60} height={36} />
      <Skeleton width={80} height={11} />
    </View>
  );
}

// ─── Customer List Item Skeleton ──────────────────────────────────────────────

export function CustomerItemSkeleton() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        gap: Spacing.md,
      }}
    >
      <Skeleton width={40} height={40} borderRadius={Radius.full} />
      <View style={{ flex: 1, gap: Spacing.xs }}>
        <Skeleton width={140} height={14} />
        <Skeleton width={100} height={12} />
      </View>
      <Skeleton width={56} height={28} borderRadius={Radius.sm} />
    </View>
  );
}

// ─── Full Screen Skeleton Lists ───────────────────────────────────────────────

interface SkeletonListProps {
  count?: number;
  type?: 'review' | 'customer';
}

export function SkeletonList({ count = 5, type = 'review' }: SkeletonListProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          {type === 'review' ? <ReviewCardSkeleton /> : <CustomerItemSkeleton />}
          {i < count - 1 && (
            <View
              style={{
                height: 1,
                backgroundColor: isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
                marginLeft: Spacing.md + 40 + Spacing.md, // align under name
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}
