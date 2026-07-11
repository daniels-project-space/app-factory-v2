// ReviewPulse — StarRating Component
// Display variant: read-only stars with optional numeric label
// Interactive variant: tap to rate (1-5)
// Colors by rating: green (4-5), yellow (3), red (1-2)

import React, { useRef } from 'react';
import { View, Pressable, Text, Animated, ViewStyle } from 'react-native';
import { Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, getRatingColor } from '@/constants';

type StarSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<StarSize, { star: number; gap: number; fontSize: number }> = {
  sm: { star: 12, gap: 2,  fontSize: 12 },
  md: { star: 16, gap: 3,  fontSize: 14 },
  lg: { star: 24, gap: 4,  fontSize: 18 },
};

// ─── Display StarRating (read-only) ──────────────────────────────────────────

interface StarRatingDisplayProps {
  rating: number;            // 1–5, supports decimals (3.7)
  size?: StarSize;
  showLabel?: boolean;       // Show the numeric rating next to stars
  showCount?: boolean;       // Show review count "(142)"
  count?: number;
  style?: ViewStyle;
}

export function StarRatingDisplay({
  rating,
  size = 'md',
  showLabel = false,
  showCount = false,
  count,
  style,
}: StarRatingDisplayProps) {
  const { star: starSize, gap, fontSize } = SIZE_MAP[size];
  const color = getRatingColor(rating);

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: gap * 2 }, style]}>
      {/* Stars */}
      <View style={{ flexDirection: 'row', gap }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = rating >= n;
          const partial = !filled && rating > n - 1;
          // For partial stars, show filled with reduced opacity
          const opacity = partial ? 0.35 : 1;

          return (
            <View key={n} style={{ opacity }}>
              <Star
                size={starSize}
                color={color}
                fill={filled || partial ? color : 'transparent'}
                strokeWidth={1.5}
              />
            </View>
          );
        })}
      </View>

      {/* Numeric label */}
      {showLabel && (
        <Text
          style={[
            Typography.bodySm,
            {
              color,
              fontFamily: 'Source-Sans-Bold',
              fontSize,
              lineHeight: fontSize + 2,
            },
          ]}
        >
          {rating.toFixed(1)}
        </Text>
      )}

      {/* Count */}
      {showCount && count !== undefined && (
        <Text
          style={[
            Typography.caption,
            { color: Colors.slate[500] },
          ]}
        >
          ({count.toLocaleString()})
        </Text>
      )}
    </View>
  );
}

// ─── Interactive StarRating (picker) ─────────────────────────────────────────

interface StarRatingPickerProps {
  value: number;             // 0 = unrated
  onChange: (rating: number) => void;
  size?: StarSize;
  style?: ViewStyle;
}

export function StarRatingPicker({ value, onChange, size = 'lg', style }: StarRatingPickerProps) {
  const { star: starSize, gap } = SIZE_MAP[size];
  const scaleRefs = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const handlePress = (rating: number) => {
    // Bounce the selected star
    Animated.sequence([
      Animated.spring(scaleRefs[rating - 1], {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
      Animated.spring(scaleRefs[rating - 1], {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 5,
      }),
    ]).start();

    Haptics.selectionAsync();
    onChange(rating);
  };

  const color = value > 0 ? getRatingColor(value) : Colors.slate[300];

  return (
    <View style={[{ flexDirection: 'row', gap: gap * 2 }, style]}>
      {[1, 2, 3, 4, 5].map((n) => {
        const isSelected = value >= n;

        return (
          <Animated.View
            key={n}
            style={{ transform: [{ scale: scaleRefs[n - 1] }] }}
          >
            <Pressable
              onPress={() => handlePress(n)}
              hitSlop={8}
            >
              <Star
                size={starSize}
                color={isSelected ? color : Colors.slate[300]}
                fill={isSelected ? color : 'transparent'}
                strokeWidth={isSelected ? 1 : 1.5}
              />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
