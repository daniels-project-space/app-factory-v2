// ReviewPulse — ReviewCard Component
// Full review display: avatar, author, stars, text excerpt, reply/draft status, platform badge
// Used in: home feed, reviews tab, search results

import { View, Text, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Check, Flag, MessageSquare } from 'lucide-react-native';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Spacing,
  Radius,
  getAvatarColor,
} from '@/constants';
import { StarRatingDisplay } from './StarRating';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Review = {
  id: string;
  platform: 'google' | 'yelp' | 'trustpilot' | 'facebook';
  reviewer_name: string | null;
  reviewer_avatar_url: string | null;
  rating: number | null;
  review_text: string | null;
  review_url: string | null;
  owner_reply: string | null;
  ai_draft: string | null;
  is_new: boolean;
  is_flagged: boolean;
  review_date: string | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_BADGE: Record<string, { letter: string; color: string }> = {
  google:     { letter: 'G', color: '#4285F4' },
  yelp:       { letter: 'Y', color: '#D32323' },
  trustpilot: { letter: 'T', color: '#00B67A' },
  facebook:   { letter: 'f', color: '#1877F2' },
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ReviewAvatar({ name }: { name: string | null }) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
  const bg = getAvatarColor(name ?? 'Anonymous');

  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: Radius.full,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Text
        style={{
          fontFamily: 'Barlow-Condensed-Bold',
          fontSize: 18,
          color: '#FFFFFF',
          lineHeight: 20,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
  onPress?: () => void;
}

export function ReviewCard({ review, onPress }: ReviewCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const badge = PLATFORM_BADGE[review.platform] ?? PLATFORM_BADGE.google;
  const hasReply = !!review.owner_reply;
  const hasDraft = !hasReply && !!review.ai_draft;
  const name = review.reviewer_name ?? 'Anonymous';

  // Reply status styling
  const replyStatus = hasReply
    ? {
        label: 'Replied',
        color: Colors.primary[500],
        bg: isDark ? Colors.primary[900] : Colors.primary[50],
        Icon: Check,
      }
    : hasDraft
    ? {
        label: 'Draft ready',
        color: Colors.accent[700],
        bg: isDark ? '#1E2D00' : Colors.accent[50],
        Icon: MessageSquare,
      }
    : {
        label: 'No reply',
        color: theme.textTertiary,
        bg: isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
        Icon: null,
      };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
        backgroundColor: pressed
          ? isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2
          : 'transparent',
      })}
    >
      {/* Avatar */}
      <ReviewAvatar name={review.reviewer_name} />

      {/* Content */}
      <View style={{ flex: 1, gap: 4 }}>
        {/* Row 1: Name + badges + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          <Text
            style={[
              Typography.bodySm,
              {
                color: theme.textPrimary,
                fontFamily: 'Source-Sans-SemiBold',
                flex: 1,
              },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>

          {/* NEW badge */}
          {review.is_new && (
            <View
              style={{
                backgroundColor: Colors.accent[300],
                borderRadius: Radius.sm,
                paddingHorizontal: 5,
                paddingVertical: 1,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Barlow-Condensed-Bold',
                  fontSize: 9,
                  color: Colors.primary[900],
                  letterSpacing: 0.8,
                }}
              >
                NEW
              </Text>
            </View>
          )}

          {/* Platform badge */}
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: Radius.full,
              backgroundColor: badge.color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Barlow-Condensed-Bold',
                fontSize: 10,
                color: '#FFFFFF',
                lineHeight: 11,
              }}
            >
              {badge.letter}
            </Text>
          </View>

          {/* Timestamp */}
          <Text style={[Typography.caption, { color: theme.textTertiary }]}>
            {relativeTime(review.review_date ?? review.created_at)}
          </Text>
        </View>

        {/* Row 2: Stars */}
        {review.rating !== null && (
          <StarRatingDisplay rating={review.rating} size="sm" />
        )}

        {/* Row 3: Review text */}
        {review.review_text ? (
          <Text
            style={[Typography.bodySm, { color: theme.textSecondary, lineHeight: 20 }]}
            numberOfLines={3}
          >
            {review.review_text}
          </Text>
        ) : (
          <Text
            style={[Typography.caption, { color: theme.textTertiary, fontStyle: 'italic' }]}
          >
            No review text
          </Text>
        )}

        {/* Row 4: Reply status + flag */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            marginTop: 2,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: replyStatus.bg,
              borderRadius: Radius.sm,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            {replyStatus.Icon && (
              <replyStatus.Icon
                size={10}
                color={replyStatus.color}
                strokeWidth={hasReply ? 2.5 : 2}
              />
            )}
            <Text
              style={{
                fontFamily: 'Source-Sans-SemiBold',
                fontSize: 11,
                color: replyStatus.color,
              }}
            >
              {replyStatus.label}
            </Text>
          </View>

          {review.is_flagged && (
            <Flag size={12} color={Colors.error[500]} strokeWidth={1.5} />
          )}
        </View>
      </View>
    </Pressable>
  );
}
