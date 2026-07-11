// ReviewPulse — Review Detail Screen
// Sprint 6: Full review detail, AI draft generation, reply posting, flag modal, Pro gate
// Layout: header -> reviewer card -> review text -> reply section -> flag sheet

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  ChevronLeft,
  Flag,
  Sparkles,
  Send,
  RefreshCw,
  Check,
  AlertTriangle,
  X,
  Lock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react-native';
// Haptics used via HapticMap
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Spacing,
  Radius,
  Layout,
  Shadows,
  HapticMap,
  FontFamily,
  getAvatarColor,
} from '@/constants';
import { StarRatingDisplay } from '@/components/shared/StarRating';
import { Skeleton } from '@/components/shared/SkeletonLoader';
import { Button } from '@/components/shared/Button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useSubscriptionStore } from '@/store/subscription';
import { useDemoStore } from '@/store/demo';
import { generateReplySuggestions, getToneColor, type ReplySuggestion, type ReplyTone } from '@/lib/reply-templates';
import type { Review } from '@/components/shared/ReviewCard';

// --- Types ---

type ReplyState = 'none' | 'generating' | 'draft' | 'posting' | 'posted' | 'existing' | 'error';

const FLAG_REASONS = [
  { id: 'fake', label: 'Fake review' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'conflict', label: 'Conflict of interest' },
  { id: 'spam', label: 'Spam or advertising' },
  { id: 'other', label: 'Other' },
] as const;

const PLATFORM_LABEL: Record<string, string> = {
  google: 'Google',
  yelp: 'Yelp',
  trustpilot: 'Trustpilot',
  facebook: 'Facebook',
};

const PLATFORM_COLOR: Record<string, string> = {
  google: '#4285F4',
  yelp: '#D32323',
  trustpilot: '#00B67A',
  facebook: '#1877F2',
};

// --- Helpers ---

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

// --- Shimmer Text Block ---

function ShimmerTextBlock() {
  return (
    <View style={{ gap: Spacing.sm }}>
      <Skeleton width="100%" height={14} />
      <Skeleton width="95%" height={14} />
      <Skeleton width="88%" height={14} />
      <Skeleton width="60%" height={14} />
    </View>
  );
}

// --- Review Detail Screen ---

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const demoActive = useDemoStore((s) => s.active);
  const demoReviews = useDemoStore((s) => s.getReviews);
  const demoAddReply = useDemoStore((s) => s.addReply);

  // --- State ---

  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyState, setReplyState] = useState<ReplyState>('none');
  const [draftText, setDraftText] = useState('');
  const [textExpanded, setTextExpanded] = useState(false);
  const [textNeedsExpand, setTextNeedsExpand] = useState(false);
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [selectedFlagReason, setSelectedFlagReason] = useState<string | null>(null);
  const [flagging, setFlagging] = useState(false);
  const [proGateBanner, setProGateBanner] = useState(false);
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [draftSyncFailed, setDraftSyncFailed] = useState(false);
  const [replySyncFailed, setReplySyncFailed] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Animation refs
  const successScale = useRef(new Animated.Value(0)).current;
  const proGateSlide = useRef(new Animated.Value(0)).current;
  const replyBorderColor = useRef(new Animated.Value(0)).current;

  // --- Fetch Review ---

  const fetchReview = useCallback(async () => {
    if (!id) return;
    try {
      // Try Supabase first
      const { data, error } = await supabase
        .from('reviews')
        .select('id, platform, reviewer_name, reviewer_avatar_url, rating, review_text, review_url, owner_reply, ai_draft, is_new, is_flagged, flag_reason, flagged_at, review_date, created_at')
        .eq('id', id)
        .eq('user_id', user?.id ?? '')
        .single();

      if (!error && data) {
        const r = data as Review;
        setReview(r);
        initReplyState(r);
        markRead(r);
        return;
      }

      // Fallback to demo data
      if (demoActive) {
        const demoReview = demoReviews().find((r) => r.id === id);
        if (demoReview) {
          const r = demoReview as unknown as Review;
          setReview(r);
          initReplyState(r);
          return;
        }
      }
    } catch {
      // Try demo data on error
      if (demoActive) {
        const demoReview = demoReviews().find((r) => r.id === id);
        if (demoReview) {
          const r = demoReview as unknown as Review;
          setReview(r);
          initReplyState(r);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, demoActive, demoReviews, user]);

  function initReplyState(r: Review) {
    if (r.owner_reply) {
      setReplyState('existing');
    } else if (r.ai_draft) {
      setDraftText(r.ai_draft);
      setReplyState('draft');
    } else {
      setReplyState('none');
    }

    // Generate smart reply suggestions
    if (!r.owner_reply) {
      const sug = generateReplySuggestions(r.reviewer_name, r.rating, r.review_text);
      setSuggestions(sug);
      setShowSuggestions(true);
    }
  }

  function markRead(r: Review) {
    if (r.is_new && user) {
      supabase
        .from('reviews')
        .update({ is_new: false })
        .eq('id', r.id)
        .eq('user_id', user.id)
        .then(({ error: err }) => { if (err) console.warn('Mark read failed:', err.message); });
    }
  }

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  // --- Generate AI Draft ---

  const handleGenerateDraft = async () => {
    setDraftSyncFailed(false);
    if (!isPro) {
      setProGateBanner(true);
      Animated.spring(proGateSlide, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 8,
      }).start();
      HapticMap.buttonPress();
      return;
    }

    if (!review) return;
    HapticMap.buttonPress();
    setReplyState('generating');
    setShowSuggestions(false);

    try {
      if (demoActive) {
        // Demo mode: use the professional suggestion as the AI draft
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const sug = generateReplySuggestions(review.reviewer_name, review.rating, review.review_text);
        const draft = sug[0]?.text ?? 'Thank you for your feedback! We appreciate your review.';
        setDraftText(draft);
        setReplyState('draft');
        HapticMap.replySaved();
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-reply', {
        body: {
          review_id: review.id,
          review_text: review.review_text,
          rating: review.rating,
          reviewer_name: review.reviewer_name,
          platform: review.platform,
        },
      });

      if (error) throw error;

      const draft = data?.draft ?? '';
      setDraftText(draft);
      setReplyState('draft');

      // Save draft to DB (non-critical if this fails)
      if (user) {
        const { error: draftError } = await supabase
          .from('reviews')
          .update({ ai_draft: draft })
          .eq('id', review.id)
          .eq('user_id', user.id);
        if (draftError) {
          console.warn('Save draft failed:', draftError.message);
          setDraftSyncFailed(true);
        }
      }

      HapticMap.replySaved();
    } catch {
      setReplyState('error');
      HapticMap.requestFailed();
    }
  };

  // --- Post Reply ---

  const handlePostReply = async () => {
    if (!review || !draftText.trim()) return;
    setReplySyncFailed(false);
    HapticMap.submitReply();
    setReplyState('posting');

    try {
      if (demoActive) {
        // Demo mode: simulate posting delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        demoAddReply(review.id, draftText.trim());
      } else {
        const { error } = await supabase.functions.invoke('post-reply', {
          body: {
            review_id: review.id,
            reply_text: draftText.trim(),
          },
        });

        if (error) throw error;
      }

      // Update local state
      setReview((prev) => prev ? { ...prev, owner_reply: draftText.trim() } : prev);
      setReplyState('posted');

      // Persist reply to DB
      if (user) {
        const { error: replyError } = await supabase
          .from('reviews')
          .update({ owner_reply: draftText.trim() })
          .eq('id', review.id)
          .eq('user_id', user.id);
        if (replyError) {
          console.warn('Persist reply failed:', replyError.message);
          setReplySyncFailed(true);
        }
      }

      // Success animation
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 12,
      }).start();

      // Flash border from lime to teal
      Animated.sequence([
        Animated.timing(replyBorderColor, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(replyBorderColor, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]).start();

      HapticMap.replySaved();
    } catch {
      setReplyState('draft');
      HapticMap.requestFailed();
      Alert.alert('Failed to post reply', 'Check your connection and try again.');
    }
  };

  // --- Flag Review ---

  const handleFlag = async () => {
    if (!review || !selectedFlagReason) return;
    setFlagging(true);
    HapticMap.flagReview();

    try {
      if (!user) throw new Error('Not authenticated');
      const { error: flagErr } = await supabase
        .from('reviews')
        .update({
          is_flagged: true,
          flag_reason: selectedFlagReason,
          flagged_at: new Date().toISOString(),
        })
        .eq('id', review.id)
        .eq('user_id', user.id);

      if (flagErr) throw flagErr;

      setReview((prev) => prev ? { ...prev, is_flagged: true } : prev);
      setFlagModalVisible(false);
      setSelectedFlagReason(null);
      HapticMap.reviewSent();
    } catch {
      HapticMap.requestFailed();
      Alert.alert('Failed to flag review', 'Please try again.');
    } finally {
      setFlagging(false);
    }
  };

  const dismissProGate = () => {
    Animated.timing(proGateSlide, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setProGateBanner(false));
  };

  // --- Loading State ---

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: Layout.screenPaddingH,
            paddingVertical: Spacing.md,
          }}
        >
          <Skeleton width={24} height={24} borderRadius={Radius.xs} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Skeleton width={80} height={20} />
          </View>
        </View>

        <View style={{ padding: Layout.screenPaddingH, gap: Spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
            <Skeleton width={56} height={56} borderRadius={Radius.full} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <Skeleton width={140} height={18} />
              <Skeleton width={100} height={14} />
              <Skeleton width={80} height={14} />
            </View>
          </View>

          <ShimmerTextBlock />

          <Skeleton width="100%" height={56} borderRadius={Radius.md} />
        </View>
      </SafeAreaView>
    );
  }

  if (!review) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase, alignItems: 'center', justifyContent: 'center', padding: Layout.screenPaddingH }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? DarkTheme.bgSurface2 : Colors.slate[100], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg }}>
          <AlertTriangle size={28} color={Colors.warning[500]} strokeWidth={2} />
        </View>
        <Text style={[Typography.h2, { color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.sm }]}>Review not found</Text>
        <Text style={[Typography.body, { color: theme.textTertiary, textAlign: 'center', marginBottom: Spacing.xl, maxWidth: 260 }]}>This review may have been removed or is no longer available.</Text>
        <Button label="GO BACK" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  // --- Derived Values ---

  const avatarBg = getAvatarColor(review.reviewer_name ?? 'Anonymous');
  const initial = review.reviewer_name ? review.reviewer_name.trim().charAt(0).toUpperCase() : '?';
  const platformLabel = PLATFORM_LABEL[review.platform] ?? 'Google';
  const platformColor = PLATFORM_COLOR[review.platform] ?? '#4285F4';

  const borderInterpolated = replyBorderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.primary[500], Colors.accent[300]],
  });

  // --- Render ---

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: Layout.screenPaddingH,
            paddingVertical: Spacing.sm,
            height: Layout.headerHeight,
          }}
        >
          <Pressable
            onPress={() => {
              HapticMap.buttonPress();
              router.back();
            }}
            hitSlop={12}
            style={({ pressed }) => ({
              padding: Spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
          </Pressable>

          <Text style={[Typography.h2, { color: theme.textPrimary }]}>REVIEW</Text>

          <Pressable
            onPress={() => {
              HapticMap.buttonPress();
              if (review.is_flagged) {
                Alert.alert('Already flagged', 'This review has been reported.');
              } else {
                setFlagModalVisible(true);
              }
            }}
            hitSlop={12}
            style={({ pressed }) => ({
              padding: Spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Flag
              size={20}
              color={review.is_flagged ? Colors.error[500] : theme.textTertiary}
              fill={review.is_flagged ? Colors.error[500] : 'transparent'}
              strokeWidth={1.5}
            />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: Layout.screenPaddingH,
            paddingBottom: insets.bottom + Spacing['2xl'],
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Reviewer Card */}
          <View
            style={{
              backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
              borderRadius: Radius.lg,
              padding: Spacing.lg,
              ...(isDark
                ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
                : Shadows.sm),
            }}
          >
            {/* Avatar + info row */}
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              {/* Large avatar */}
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: Radius.full,
                  backgroundColor: avatarBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Barlow-Condensed-ExtraBold',
                    fontSize: 24,
                    color: '#FFFFFF',
                    lineHeight: 26,
                  }}
                >
                  {initial}
                </Text>
              </View>

              {/* Name, platform, date */}
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[Typography.h3, { color: theme.textPrimary }]}
                  numberOfLines={1}
                >
                  {review.reviewer_name ?? 'Anonymous'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  {/* Platform badge */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: isDark
                        ? `${platformColor}20`
                        : `${platformColor}12`,
                      borderRadius: Radius.sm,
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: Radius.full,
                        backgroundColor: platformColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Barlow-Condensed-Bold',
                          fontSize: 8,
                          color: '#FFFFFF',
                          lineHeight: 9,
                        }}
                      >
                        {review.platform.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        Typography.caption,
                        {
                          color: platformColor,
                          fontFamily: 'Source-Sans-SemiBold',
                        },
                      ]}
                    >
                      {platformLabel}
                    </Text>
                  </View>

                  {/* Date */}
                  <Text style={[Typography.caption, { color: theme.textTertiary }]}>
                    {formatDate(review.review_date ?? review.created_at)}
                  </Text>
                </View>

                {/* Stars */}
                {review.rating !== null && (
                  <View style={{ marginTop: 2 }}>
                    <StarRatingDisplay rating={review.rating} size="md" showLabel />
                  </View>
                )}
              </View>
            </View>

            {/* Flagged indicator */}
            {review.is_flagged && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.xs,
                  marginTop: Spacing.md,
                  backgroundColor: isDark ? Colors.error[700] + '20' : Colors.error[100],
                  borderRadius: Radius.sm,
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: Spacing.xs,
                }}
              >
                <Flag size={12} color={Colors.error[500]} fill={Colors.error[500]} strokeWidth={1} />
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: Colors.error[isDark ? 300 : 700],
                      fontFamily: 'Source-Sans-SemiBold',
                    },
                  ]}
                >
                  Flagged for review
                </Text>
              </View>
            )}
          </View>

          {/* Review Text */}
          <View style={{ marginTop: Spacing.lg }}>
            <Text
              style={[Typography.label, { color: theme.textTertiary, marginBottom: Spacing.sm }]}
            >
              REVIEW
            </Text>

            {review.review_text ? (
              <View>
                <Text
                  style={[Typography.body, { color: theme.textPrimary, lineHeight: 26 }]}
                  numberOfLines={textExpanded ? undefined : 6}
                  onTextLayout={(e) => {
                    if (e.nativeEvent.lines.length > 6) {
                      setTextNeedsExpand(true);
                    }
                  }}
                >
                  {review.review_text}
                </Text>
                {textNeedsExpand && (
                  <Pressable
                    onPress={() => {
                      setTextExpanded(!textExpanded);
                      HapticMap.buttonPress();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: Spacing.xs,
                    }}
                  >
                    <Text
                      style={[
                        Typography.bodySm,
                        {
                          color: Colors.primary[isDark ? 300 : 500],
                          fontFamily: 'Source-Sans-SemiBold',
                        },
                      ]}
                    >
                      {textExpanded ? 'Show less' : 'Read more'}
                    </Text>
                    {textExpanded ? (
                      <ChevronUp size={14} color={Colors.primary[isDark ? 300 : 500]} strokeWidth={2} />
                    ) : (
                      <ChevronDown size={14} color={Colors.primary[isDark ? 300 : 500]} strokeWidth={2} />
                    )}
                  </Pressable>
                )}
              </View>
            ) : (
              <Text
                style={[Typography.bodySm, { color: theme.textTertiary, fontStyle: 'italic' }]}
              >
                This reviewer left a rating without any text.
              </Text>
            )}
          </View>

          {/* Reply Section */}
          <View style={{ marginTop: Spacing.xl }}>
            <Text
              style={[Typography.label, { color: theme.textTertiary, marginBottom: Spacing.sm }]}
            >
              YOUR REPLY
            </Text>

            {/* State: existing reply */}
            {replyState === 'existing' && review.owner_reply && (
              <View
                style={{
                  backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                  borderLeftWidth: 3,
                  borderLeftColor: Colors.primary[500],
                  ...(isDark
                    ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
                    : Shadows.sm),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm }}>
                  <Check size={14} color={Colors.primary[500]} strokeWidth={2.5} />
                  <Text
                    style={[
                      Typography.caption,
                      {
                        color: Colors.primary[500],
                        fontFamily: 'Source-Sans-SemiBold',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      },
                    ]}
                  >
                    Reply posted
                  </Text>
                  <Text style={[Typography.caption, { color: theme.textTertiary, marginLeft: 'auto' }]}>
                    {relativeTime(review.created_at)}
                  </Text>
                </View>
                <Text style={[Typography.bodySm, { color: theme.textSecondary, lineHeight: 22 }]}>
                  {review.owner_reply}
                </Text>
              </View>
            )}

            {/* State: no reply (Yelp) -- show "Reply on Yelp" external link */}
            {replyState === 'none' && review.platform === 'yelp' && (
              <View>
                <Pressable
                  onPress={() => {
                    HapticMap.buttonPress();
                    const url = review.review_url;
                    if (url) {
                      Linking.openURL(url);
                    } else {
                      Alert.alert('No URL', 'Unable to open this review on Yelp.');
                    }
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: Spacing.sm,
                    backgroundColor: '#D32323',
                    paddingVertical: Spacing.md,
                    borderRadius: Radius.md,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <ExternalLink size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: 'Barlow-Condensed-Bold',
                      fontSize: 14,
                      letterSpacing: 0.8,
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                    }}
                  >
                    Reply on Yelp
                  </Text>
                </Pressable>
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: theme.textTertiary,
                      textAlign: 'center',
                      marginTop: Spacing.sm,
                    },
                  ]}
                >
                  Yelp requires replies through their app or website
                </Text>
              </View>
            )}

            {/* State: no reply (Google/other) -- show suggestions + draft button */}
            {replyState === 'none' && review.platform !== 'yelp' && (
              <View>
                {/* Smart Reply Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <View style={{ marginBottom: Spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm }}>
                      <Sparkles size={14} color={Colors.accent[isDark ? 300 : 700]} strokeWidth={2} />
                      <Text
                        style={[
                          Typography.caption,
                          {
                            color: Colors.accent[isDark ? 300 : 700],
                            fontFamily: 'Source-Sans-SemiBold',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          },
                        ]}
                      >
                        Suggested Replies
                      </Text>
                    </View>
                    {suggestions.map((sug) => {
                      const toneColor = getToneColor(sug.tone);
                      return (
                        <Pressable
                          key={sug.tone}
                          onPress={() => {
                            HapticMap.buttonPress();
                            setDraftText(sug.text);
                            setReplyState('draft');
                            setShowSuggestions(false);
                          }}
                          style={({ pressed }) => ({
                            backgroundColor: pressed
                              ? isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3
                              : isDark ? DarkTheme.bgSurface : '#FFFFFF',
                            borderRadius: Radius.md,
                            padding: Spacing.md,
                            marginBottom: Spacing.xs,
                            borderWidth: 1,
                            borderColor: isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
                          })}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: toneColor }} />
                              <Text
                                style={{
                                  fontFamily: FontFamily.sourceSansSemiBold,
                                  fontSize: 13,
                                  color: theme.textPrimary,
                                }}
                              >
                                {sug.toneLabel}
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontFamily: FontFamily.barlowCondensedSemiBold,
                                fontSize: 11,
                                color: Colors.primary[500],
                                letterSpacing: 0.5,
                                textTransform: 'uppercase',
                              }}
                            >
                              USE THIS
                            </Text>
                          </View>
                          <Text
                            style={[Typography.caption, { color: theme.textTertiary, lineHeight: 17 }]}
                          >
                            {sug.toneDescription}
                          </Text>
                          <Text
                            style={[Typography.bodySm, { color: theme.textSecondary, marginTop: Spacing.xs, lineHeight: 20 }]}
                            numberOfLines={3}
                          >
                            {sug.text}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <Button
                  label="DRAFT REPLY WITH AI"
                  onPress={handleGenerateDraft}
                  variant="primary"
                  fullWidth
                  icon={
                    isPro
                      ? <Sparkles size={18} color="#FFFFFF" strokeWidth={2} />
                      : <Lock size={16} color="#FFFFFF" strokeWidth={2} />
                  }
                />

                {/* Pro gate banner -- slides in if not pro */}
                {proGateBanner && (
                  <Animated.View
                    style={{
                      transform: [{
                        translateY: proGateSlide.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        }),
                      }],
                      opacity: proGateSlide,
                      marginTop: Spacing.sm,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        HapticMap.buttonPress();
                        dismissProGate();
                        router.push('/paywall');
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.sm,
                        backgroundColor: isDark
                          ? Colors.accent[700] + '25'
                          : Colors.accent[50],
                        borderRadius: Radius.md,
                        padding: Spacing.md,
                        borderWidth: 1,
                        borderColor: isDark
                          ? Colors.accent[700] + '40'
                          : Colors.accent[300] + '60',
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Lock size={16} color={Colors.accent[isDark ? 400 : 700]} strokeWidth={2} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            Typography.bodySm,
                            { color: theme.textPrimary, fontFamily: 'Source-Sans-SemiBold' },
                          ]}
                        >
                          PRO FEATURE
                        </Text>
                        <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                          Unlock AI-drafted replies for $14.99/mo
                        </Text>
                      </View>
                      <ChevronLeft
                        size={16}
                        color={theme.textTertiary}
                        strokeWidth={2}
                        style={{ transform: [{ rotate: '180deg' }] }}
                      />
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            )}

            {/* State: generating -- shimmer */}
            {replyState === 'generating' && (
              <View
                style={{
                  backgroundColor: isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3,
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <Sparkles size={14} color={Colors.accent[isDark ? 300 : 700]} strokeWidth={2} />
                  <Text
                    style={[
                      Typography.caption,
                      {
                        color: Colors.accent[isDark ? 300 : 700],
                        fontFamily: 'Source-Sans-SemiBold',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      },
                    ]}
                  >
                    Generating reply...
                  </Text>
                </View>
                <ShimmerTextBlock />
              </View>
            )}

            {/* State: draft ready -- editable */}
            {replyState === 'draft' && (
              <View>
                <View
                  style={{
                    backgroundColor: isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3,
                    borderRadius: Radius.md,
                    padding: Spacing.md,
                    borderWidth: 1,
                    borderColor: isDark ? DarkTheme.borderFocus : LightTheme.borderFocus,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm }}>
                    <Sparkles size={12} color={Colors.accent[isDark ? 300 : 700]} strokeWidth={2} />
                    <Text
                      style={[
                        Typography.caption,
                        {
                          color: Colors.accent[isDark ? 300 : 700],
                          fontFamily: 'Source-Sans-SemiBold',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        },
                      ]}
                    >
                      AI DRAFT
                    </Text>
                  </View>
                  <TextInput
                    value={draftText}
                    onChangeText={setDraftText}
                    multiline
                    style={[
                      Typography.bodySm,
                      {
                        color: theme.textPrimary,
                        lineHeight: 22,
                        minHeight: 100,
                        textAlignVertical: 'top',
                        padding: 0,
                      },
                    ]}
                    placeholderTextColor={theme.textTertiary}
                    placeholder="Edit your reply..."
                  />
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="POST REPLY"
                      onPress={handlePostReply}
                      variant="primary"
                      fullWidth
                      disabled={!draftText.trim()}
                      icon={<Send size={16} color="#FFFFFF" strokeWidth={2} />}
                    />
                  </View>
                  <Button
                    label="REDO"
                    onPress={handleGenerateDraft}
                    variant="ghost"
                    size="sm"
                    icon={<RefreshCw size={14} color={Colors.primary[isDark ? 300 : 500]} strokeWidth={2} />}
                  />
                </View>
                {draftSyncFailed && (
                  <Text
                    style={[
                      Typography.caption,
                      { color: Colors.warning[500], marginTop: Spacing.xs, textAlign: 'center' },
                    ]}
                  >
                    Draft not saved — will be lost on close
                  </Text>
                )}
              </View>
            )}

            {/* State: posting -- loading */}
            {replyState === 'posting' && (
              <View
                style={{
                  backgroundColor: isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3,
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                }}
              >
                <Text style={[Typography.bodySm, { color: theme.textSecondary, lineHeight: 22 }]}>
                  {draftText}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.xs,
                    marginTop: Spacing.md,
                    justifyContent: 'center',
                  }}
                >
                  <Send size={14} color={Colors.primary[500]} strokeWidth={2} />
                  <Text
                    style={[
                      Typography.caption,
                      {
                        color: Colors.primary[500],
                        fontFamily: 'Source-Sans-SemiBold',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      },
                    ]}
                  >
                    Posting to {platformLabel}...
                  </Text>
                </View>
              </View>
            )}

            {/* State: posted -- success */}
            {replyState === 'posted' && (
              <Animated.View
                style={{
                  backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                  borderLeftWidth: 3,
                  borderLeftColor: borderInterpolated,
                  ...(isDark
                    ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
                    : Shadows.sm),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm }}>
                  <Animated.View style={{ transform: [{ scale: successScale }] }}>
                    <Check size={16} color={Colors.success[500]} strokeWidth={2.5} />
                  </Animated.View>
                  <Text
                    style={[
                      Typography.caption,
                      {
                        color: Colors.success[500],
                        fontFamily: 'Source-Sans-SemiBold',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      },
                    ]}
                  >
                    Reply posted successfully
                  </Text>
                </View>
                <Text style={[Typography.bodySm, { color: theme.textSecondary, lineHeight: 22 }]}>
                  {draftText}
                </Text>
                {replySyncFailed && (
                  <Text
                    style={[
                      Typography.caption,
                      { color: Colors.warning[500], marginTop: Spacing.xs },
                    ]}
                  >
                    Reply posted but local sync failed — reopen to refresh
                  </Text>
                )}
              </Animated.View>
            )}

            {/* State: error */}
            {replyState === 'error' && (
              <View>
                <View
                  style={{
                    backgroundColor: isDark ? Colors.error[700] + '15' : Colors.error[100],
                    borderRadius: Radius.md,
                    padding: Spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.sm,
                    marginBottom: Spacing.md,
                  }}
                >
                  <AlertTriangle size={18} color={Colors.error[500]} strokeWidth={2} />
                  <Text style={[Typography.bodySm, { color: Colors.error[isDark ? 300 : 700], flex: 1 }]}>
                    Failed to generate reply. Please try again.
                  </Text>
                </View>
                <Button
                  label="TRY AGAIN"
                  onPress={handleGenerateDraft}
                  variant="primary"
                  fullWidth
                  icon={<RefreshCw size={16} color="#FFFFFF" strokeWidth={2} />}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Flag Modal (Bottom Sheet) */}
      <Modal
        visible={flagModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFlagModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: theme.overlay }}
          onPress={() => {
            setFlagModalVisible(false);
            setSelectedFlagReason(null);
          }}
        />

        <View
          style={{
            backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
            borderTopLeftRadius: Radius.xl,
            borderTopRightRadius: Radius.xl,
            paddingHorizontal: Layout.screenPaddingH,
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.lg,
            ...(isDark ? {} : Shadows.upward),
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark ? DarkTheme.borderStrong : LightTheme.borderDefault,
              alignSelf: 'center',
              marginBottom: Spacing.lg,
            }}
          />

          {/* Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
            <Text style={[Typography.h2, { color: theme.textPrimary }]}>FLAG REVIEW</Text>
            <Pressable
              onPress={() => {
                setFlagModalVisible(false);
                setSelectedFlagReason(null);
              }}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <X size={20} color={theme.textTertiary} strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={[Typography.bodySm, { color: theme.textSecondary, marginBottom: Spacing.lg }]}>
            Select a reason for flagging this review. Flagged reviews are reported to the platform for investigation.
          </Text>

          {/* Reason options */}
          {FLAG_REASONS.map((reason) => {
            const isSelected = selectedFlagReason === reason.id;
            return (
              <Pressable
                key={reason.id}
                onPress={() => {
                  setSelectedFlagReason(reason.id);
                  HapticMap.chipSelect();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.md,
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing.md,
                  borderRadius: Radius.md,
                  marginBottom: Spacing.xs,
                  backgroundColor: isSelected
                    ? isDark ? Colors.error[700] + '20' : Colors.error[100]
                    : pressed
                      ? isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2
                      : 'transparent',
                  borderWidth: isSelected ? 1.5 : 1,
                  borderColor: isSelected
                    ? Colors.error[500]
                    : isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
                })}
              >
                {/* Radio indicator */}
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: Radius.full,
                    borderWidth: isSelected ? 6 : 2,
                    borderColor: isSelected
                      ? Colors.error[500]
                      : isDark ? DarkTheme.borderStrong : LightTheme.borderDefault,
                  }}
                />

                <Text
                  style={[
                    Typography.bodySm,
                    {
                      color: isSelected
                        ? Colors.error[isDark ? 300 : 700]
                        : theme.textPrimary,
                      fontFamily: isSelected ? 'Source-Sans-SemiBold' : 'Source-Sans-Regular',
                      flex: 1,
                    },
                  ]}
                >
                  {reason.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Report button */}
          <View style={{ marginTop: Spacing.lg }}>
            <Button
              label="REPORT REVIEW"
              onPress={handleFlag}
              variant="destructive"
              fullWidth
              disabled={!selectedFlagReason}
              loading={flagging}
              icon={<Flag size={16} color="#FFFFFF" strokeWidth={2} />}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
