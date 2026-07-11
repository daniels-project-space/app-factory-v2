// ReviewPulse — Card Component
// Variants: default (content card), stat (metric tile), action (tappable CTA card)
// Light mode: white surface + sm shadow | Dark mode: dark surface + border definition

import React from 'react';
import { View, Text, Pressable, Animated, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { useRef } from 'react';
import {
  LightTheme,
  DarkTheme,
  Typography,
  Colors,
  Layout,
  Radius,
  Shadows,
  Spacing,
} from '@/constants';

// ─── Default Card ────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
}

export function Card({ children, style, onPress, padding = Layout.cardPadding }: CardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useRef(new Animated.Value(1)).current;

  const cardStyle: ViewStyle = {
    backgroundColor: isDark ? DarkTheme.bgSurface : LightTheme.bgSurface,
    borderRadius: Radius.md,
    padding,
    ...(isDark
      ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
      : Shadows.sm),
    ...style,
  };

  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[cardStyle, { ...style, transform: undefined }]}
        android_ripple={{ color: 'rgba(15,123,123,0.08)', borderless: false }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  value: string | number;
  label: string;
  sublabel?: string;
  accent?: boolean;  // Use lime accent for "pulse" metrics
  style?: ViewStyle;
  onPress?: () => void;
}

export function StatCard({ value, label, sublabel, accent = false, style, onPress }: StatCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
    Haptics.selectionAsync();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  const content = (
    <>
      {/* Accent bar — "pulse" indicator */}
      {accent && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: Colors.accent[300],
            borderTopLeftRadius: Radius.md,
            borderTopRightRadius: Radius.md,
          }}
        />
      )}

      <Text
        style={[
          Typography.stat,
          {
            color: accent
              ? (isDark ? Colors.accent[300] : Colors.accent[700])
              : (isDark ? DarkTheme.textPrimary : LightTheme.textPrimary),
            marginBottom: 2,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text
        style={[
          Typography.label,
          {
            color: isDark ? DarkTheme.textSecondary : LightTheme.textSecondary,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {sublabel && (
        <Text
          style={[
            Typography.caption,
            { color: isDark ? DarkTheme.textTertiary : LightTheme.textTertiary, marginTop: 2 },
          ]}
          numberOfLines={1}
        >
          {sublabel}
        </Text>
      )}
    </>
  );

  const cardStyle: ViewStyle = {
    backgroundColor: isDark ? DarkTheme.bgSurface : LightTheme.bgSurface,
    borderRadius: Radius.md,
    padding: Layout.cardPadding,
    minHeight: Layout.statCardHeight,
    justifyContent: 'center',
    overflow: 'hidden',
    ...(isDark
      ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
      : Shadows.sm),
  };

  if (!onPress) {
    return <View style={[cardStyle, style]}>{content}</View>;
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={cardStyle}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

// ─── Action Card ─────────────────────────────────────────────────────────────

interface ActionCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  rightElement?: React.ReactNode;
}

export function ActionCard({ title, subtitle, icon, onPress, style, rightElement }: ActionCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: isDark ? DarkTheme.bgSurface : LightTheme.bgSurface,
          borderRadius: Radius.md,
          padding: Layout.cardPadding,
          minHeight: Layout.actionCardHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          ...(isDark
            ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
            : Shadows.sm),
        }}
        android_ripple={{ color: 'rgba(15,123,123,0.08)', borderless: false }}
      >
        {icon && (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: Radius.sm,
              backgroundColor: isDark ? DarkTheme.bgSurface3 : Colors.primary[50],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text
            style={[Typography.h4, { color: isDark ? DarkTheme.textPrimary : LightTheme.textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                Typography.bodySm,
                { color: isDark ? DarkTheme.textSecondary : LightTheme.textSecondary, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {rightElement ?? (
          <Text
            style={[
              Typography.h3,
              { color: isDark ? DarkTheme.textTertiary : LightTheme.textTertiary },
            ]}
          >
            ›
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
