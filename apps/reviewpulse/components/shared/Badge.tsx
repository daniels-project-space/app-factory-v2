// ReviewPulse — Badge Component
// Used for: review status, platform indicator, subscription tier, new/replied labels
// ALL CAPS Barlow Condensed — small, punchy, unambiguous

import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Radius, Spacing } from '@/constants';

type BadgeVariant =
  | 'new'        // Lime — unread review
  | 'replied'    // Green — owner has replied
  | 'pending'    // Yellow — awaiting delivery
  | 'delivered'  // Teal — SMS delivered
  | 'failed'     // Red — SMS failed
  | 'pro'        // Primary teal — pro user badge
  | 'free'       // Slate — free tier
  | 'google'     // Teal
  | 'yelp'       // Red
  | 'trustpilot' // Green
  | 'facebook';  // Blue

type BadgeSize = 'sm' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<
  BadgeVariant,
  { bg: string; text: string; border?: string }
> = {
  new:        { bg: Colors.accent[300],   text: Colors.accent[700] },
  replied:    { bg: Colors.success[100],  text: Colors.success[700] },
  pending:    { bg: Colors.warning[100],  text: Colors.warning[700] },
  delivered:  { bg: Colors.primary[50],   text: Colors.primary[700] },
  failed:     { bg: Colors.error[100],    text: Colors.error[700] },
  pro:        { bg: Colors.primary[500],  text: '#FFFFFF' },
  free:       { bg: Colors.slate[100],    text: Colors.slate[700],   border: Colors.slate[200] },
  google:     { bg: Colors.primary[50],   text: Colors.primary[700] },
  yelp:       { bg: Colors.error[100],    text: Colors.error[700] },
  trustpilot: { bg: Colors.success[100],  text: Colors.success[700] },
  facebook:   { bg: '#EEF4FE',            text: '#1877F2' },
};

export function Badge({ label, variant = 'new', size = 'default', style }: BadgeProps) {
  const colors = VARIANT_STYLES[variant];
  const isSmall = size === 'sm';

  const containerStyle: ViewStyle = {
    backgroundColor: colors.bg,
    borderRadius: Radius.full,
    paddingHorizontal: isSmall ? Spacing.xs + 2 : Spacing.sm,
    paddingVertical: isSmall ? 2 : 4,
    alignSelf: 'flex-start',
    ...(colors.border && { borderWidth: 1, borderColor: colors.border }),
    ...style,
  };

  const textStyle: TextStyle = {
    ...Typography.label,
    fontSize: isSmall ? 10 : 11,
    lineHeight: isSmall ? 12 : 14,
    color: colors.text,
    letterSpacing: 0.6,
  };

  return (
    <View style={containerStyle}>
      <Text style={textStyle} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Dot Badge (for unread indicators) ───────────────────────────────────────

interface DotBadgeProps {
  color?: string;
  size?: number;
  style?: ViewStyle;
}

export function DotBadge({
  color = Colors.accent[300],
  size = 8,
  style,
}: DotBadgeProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
