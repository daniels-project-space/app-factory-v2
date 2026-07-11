// ReviewPulse — Notification Center (Sprint 10)
// Modal screen: industrial log feed of review alerts
// Tapping a notification navigates to the review detail screen
// "Mark all read" in header clears unread indicators

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';
import {
  X,
  Star,
  AlertTriangle,
  Bell,
  BellOff,
} from 'lucide-react-native';
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
import { SkeletonList } from '@/components/shared/SkeletonLoader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: {
    review_id?: string;
    platform?: string;
    rating?: number;
  };
  read: boolean;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function getRatingIcon(rating: number | undefined) {
  if (!rating) return { Icon: Bell, color: Colors.primary[500], bg: Colors.primary[50] };
  if (rating >= 4) return { Icon: Star, color: Colors.success[500], bg: Colors.success[100] };
  if (rating === 3) return { Icon: Star, color: Colors.warning[500], bg: Colors.warning[100] };
  return { Icon: AlertTriangle, color: Colors.error[500], bg: Colors.error[100] };
}

function getRatingIconDark(rating: number | undefined) {
  if (!rating) return { bg: Colors.primary[900] + '80' };
  if (rating >= 4) return { bg: 'rgba(4, 120, 87, 0.2)' };
  if (rating === 3) return { bg: 'rgba(180, 83, 9, 0.2)' };
  return { bg: 'rgba(185, 28, 28, 0.2)' };
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotificationRow({
  item,
  isDark,
  onPress,
}: {
  item: NotificationItem;
  isDark: boolean;
  onPress: () => void;
}) {
  const theme = isDark ? DarkTheme : LightTheme;
  const { Icon, color, bg } = getRatingIcon(item.data?.rating);
  const darkBg = getRatingIconDark(item.data?.rating).bg;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: Spacing.md,
        paddingRight: Spacing.md + 4,
        gap: Spacing.sm,
        backgroundColor: pressed
          ? isDark
            ? DarkTheme.bgSurface2
            : Colors.slate[50]
          : 'transparent',
        // Unread left accent bar
        borderLeftWidth: item.read ? 0 : 3,
        borderLeftColor: item.read ? 'transparent' : Colors.accent[300],
        paddingLeft: item.read ? Spacing.md : Spacing.md - 3,
      })}
    >
      {/* Rating-coded icon */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDark ? darkBg : bg,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        <Icon size={16} color={color} strokeWidth={2} />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 2,
          }}
        >
          <Text
            style={{
              fontFamily: item.read
                ? FontFamily.sourceSansSemiBold
                : FontFamily.sourceSansBold,
              fontSize: 14,
              color: theme.textPrimary,
              flex: 1,
              marginRight: Spacing.sm,
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontFamily: FontFamily.sourceSansRegular,
              fontSize: 11,
              color: theme.textTertiary,
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            {timeAgo(item.created_at)}
          </Text>
        </View>

        {item.body && (
          <Text
            style={[
              Typography.caption,
              { color: theme.textSecondary, lineHeight: 17 },
            ]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
        )}
      </View>

      {/* Unread dot */}
      {!item.read && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: Colors.accent[300],
            position: 'absolute',
            right: Spacing.sm,
            top: Spacing.md + 2,
          }}
        />
      )}
    </Pressable>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyNotifications({ isDark }: { isDark: boolean }) {
  const theme = isDark ? DarkTheme : LightTheme;
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 60,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: isDark ? DarkTheme.bgSurface2 : Colors.slate[50],
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: Spacing.md,
        }}
      >
        <BellOff size={28} color={theme.textTertiary} strokeWidth={1.5} />
      </View>
      <Text
        style={[
          Typography.h3,
          { color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
        ]}
      >
        All Quiet
      </Text>
      <Text
        style={[
          Typography.bodySm,
          { color: theme.textSecondary, textAlign: 'center', maxWidth: 240 },
        ]}
      >
        New review notifications will appear here as they come in.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationCenter() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const user = useAuthStore((s) => s.user);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('[Notifications] fetch failed:', error.message);
      } else {
        setNotifications((data ?? []) as NotificationItem[]);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(async () => {
    HapticMap.pullToRefresh();
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  // ─── Mark All Read ────────────────────────────────────────────────────────

  const markAllRead = useCallback(async () => {
    if (!user || unreadCount === 0) return;
    HapticMap.buttonPress();

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) console.warn('Mark all read failed:', error.message);
  }, [user, unreadCount]);

  // ─── Tap Notification ─────────────────────────────────────────────────────

  const handleTap = useCallback(
    async (item: NotificationItem) => {
      HapticMap.listItemTap();

      // Mark as read
      if (!item.read) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
        supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', item.id)
          .then(({ error }) => { if (error) console.warn('Mark read failed:', error.message); });
      }

      // Navigate to review if available
      if (item.data?.review_id) {
        router.push(`/reviews/${item.data.review_id}`);
      }
    },
    []
  );

  // ─── Separator ────────────────────────────────────────────────────────────

  const Separator = () => (
    <View
      style={{
        height: 1,
        backgroundColor: theme.borderDefault,
        marginLeft: Spacing.md + 36 + Spacing.sm,
      }}
    />
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Layout.screenPaddingH,
          paddingVertical: Spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.borderDefault,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={[Typography.h2, { color: theme.textPrimary }]}>
            NOTIFICATIONS
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: Colors.accent[300],
                borderRadius: Radius.full,
                paddingHorizontal: 7,
                paddingVertical: 2,
                minWidth: 22,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: FontFamily.barlowCondensedBold,
                  fontSize: 12,
                  color: Colors.primary[950],
                }}
              >
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          {unreadCount > 0 && (
            <Pressable onPress={markAllRead} hitSlop={8}>
              <Text
                style={{
                  fontFamily: FontFamily.sourceSansSemiBold,
                  fontSize: 13,
                  color: Colors.primary[500],
                }}
              >
                Mark all read
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              HapticMap.buttonPress();
              router.back();
            }}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDark ? DarkTheme.bgSurface2 : Colors.slate[50],
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <X size={18} color={theme.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* Loading */}
      {loading ? (
        <View
          style={{
            paddingHorizontal: Layout.screenPaddingH,
            paddingTop: Spacing.md,
          }}
        >
          <SkeletonList count={6} type="customer" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              isDark={isDark}
              onPress={() => handleTap(item)}
            />
          )}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={<EmptyNotifications isDark={isDark} />}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 40,
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
      )}
    </SafeAreaView>
  );
}
