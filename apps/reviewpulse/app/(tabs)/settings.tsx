// ReviewPulse — Settings Tab (Sprint 12: full settings screen)
// All sections: profile header, connected platforms, subscription, notifications,
// preferences, account, about

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  Switch,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import {
  User,
  Crown,
  Link2,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Shield,
  Mail,
  Star,
  Info,
  Trash2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react-native';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Layout,
  Spacing,
  Radius,
  FontFamily,
  HapticMap,
} from '@/constants';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { useIsPro } from '@/hooks/useIsPro';
import { supabase } from '@/lib/supabase';
import { getAvatarColor } from '@/constants/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectedPlatform = {
  platform: string;
  business_name: string;
  is_active: boolean;
  current_rating: number | null;
  total_reviews: number;
  last_polled_at: string | null;
};

// ─── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  value,
  onChange,
  isDark,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
}) {
  const theme = isDark ? DarkTheme : LightTheme;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
      }}
    >
      <View style={{ flex: 1, marginRight: Spacing.md }}>
        <Text
          style={{
            fontFamily: FontFamily.sourceSansSemiBold,
            fontSize: 15,
            color: theme.textPrimary,
          }}
        >
          {label}
        </Text>
        {description && (
          <Text
            style={[
              Typography.caption,
              { color: theme.textTertiary, marginTop: 2 },
            ]}
          >
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          HapticMap.toggleSwitch();
          onChange(v);
        }}
        trackColor={{
          false: isDark ? DarkTheme.bgSurface3 : Colors.slate[200],
          true: Colors.primary[500],
        }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
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
          marginTop: Spacing.lg,
          marginBottom: Spacing.sm,
        },
      ]}
    >
      {text}
    </Text>
  );
}

// ─── Card Wrapper ─────────────────────────────────────────────────────────────

function CardWrapper({
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
        marginBottom: Spacing.sm,
        ...(isDark
          ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
          : {}),
      }}
    >
      {children}
    </View>
  );
}

// ─── Nav Row (tappable, chevron) ──────────────────────────────────────────────

function NavRow({
  label,
  icon: Icon,
  onPress,
  isDark,
  badge,
  badgeColor,
  destructive,
}: {
  label: string;
  icon: typeof User;
  onPress?: () => void;
  isDark: boolean;
  badge?: string;
  badgeColor?: string;
  destructive?: boolean;
}) {
  const theme = isDark ? DarkTheme : LightTheme;
  const textColor = destructive ? Colors.error[500] : theme.textPrimary;
  const iconColor = destructive ? Colors.error[500] : theme.textSecondary;

  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          HapticMap.buttonPress();
          onPress();
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm + 2,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
        }}
      >
        <Icon size={18} color={iconColor} strokeWidth={1.8} />
        <Text style={[Typography.h4, { color: textColor }]}>{label}</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.xs,
        }}
      >
        {badge && (
          <View
            style={{
              backgroundColor: badgeColor
                ? `${badgeColor}18`
                : isDark
                  ? DarkTheme.bgSurface3
                  : Colors.slate[100],
              paddingHorizontal: Spacing.sm,
              paddingVertical: 3,
              borderRadius: Radius.sm,
            }}
          >
            <Text
              style={{
                fontFamily: FontFamily.barlowCondensedSemiBold,
                fontSize: 12,
                letterSpacing: 0.5,
                color: badgeColor || theme.textSecondary,
                textTransform: 'uppercase',
              }}
            >
              {badge}
            </Text>
          </View>
        )}
        {!destructive && (
          <ChevronRight
            size={16}
            color={theme.textTertiary}
            strokeWidth={2}
          />
        )}
      </View>
    </Pressable>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider({ isDark }: { isDark: boolean }) {
  const theme = isDark ? DarkTheme : LightTheme;
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.borderDefault,
        marginVertical: 2,
      }}
    />
  );
}

// ─── Platform Status Row ──────────────────────────────────────────────────────

function PlatformRow({
  name,
  isConnected,
  isActive,
  rating,
  reviewCount,
  onReconnect,
  onConnect,
  isDark,
}: {
  name: string;
  isConnected: boolean;
  isActive: boolean;
  rating: number | null;
  reviewCount: number;
  onReconnect?: () => void;
  onConnect?: () => void;
  isDark: boolean;
}) {
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
        {/* Status dot */}
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: isConnected && isActive
              ? Colors.success[500]
              : isConnected
                ? Colors.warning[500]
                : Colors.neutral[400],
          }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: FontFamily.sourceSansSemiBold,
              fontSize: 15,
              color: theme.textPrimary,
            }}
          >
            {name}
          </Text>
          <Text style={[Typography.caption, { color: theme.textTertiary, marginTop: 1 }]}>
            {isConnected
              ? isActive
                ? `${rating?.toFixed(1) ?? '—'} avg · ${reviewCount} reviews`
                : 'Token expired — reconnect'
              : 'Not connected'}
          </Text>
        </View>
      </View>

      {isConnected && !isActive ? (
        <Pressable
          onPress={() => {
            HapticMap.connectPlatform();
            onReconnect?.();
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: Colors.warning[100],
            paddingHorizontal: Spacing.sm,
            paddingVertical: 5,
            borderRadius: Radius.sm,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <RefreshCw size={13} color={Colors.warning[700]} strokeWidth={2} />
          <Text
            style={{
              fontFamily: FontFamily.sourceSansSemiBold,
              fontSize: 12,
              color: Colors.warning[700],
            }}
          >
            Reconnect
          </Text>
        </Pressable>
      ) : isConnected && isActive ? (
        <CheckCircle2
          size={18}
          color={Colors.success[500]}
          strokeWidth={2}
        />
      ) : (
        <Pressable
          onPress={() => {
            HapticMap.connectPlatform();
            onConnect?.();
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: isDark
              ? `${Colors.primary[500]}20`
              : Colors.primary[50],
            paddingHorizontal: Spacing.sm,
            paddingVertical: 5,
            borderRadius: Radius.sm,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Link2 size={13} color={Colors.primary[500]} strokeWidth={2} />
          <Text
            style={{
              fontFamily: FontFamily.sourceSansSemiBold,
              fontSize: 12,
              color: Colors.primary[500],
            }}
          >
            Connect
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Theme Selector ───────────────────────────────────────────────────────────

function ThemeSelector({
  currentTheme,
  onSelect,
  isDark,
}: {
  currentTheme: 'light' | 'dark' | 'system';
  onSelect: (t: 'light' | 'dark' | 'system') => void;
  isDark: boolean;
}) {
  const theme = isDark ? DarkTheme : LightTheme;
  const options: { key: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm }}>
      {options.map(({ key, label, icon: Icon }) => {
        const isSelected = currentTheme === key;
        return (
          <Pressable
            key={key}
            onPress={() => {
              HapticMap.chipSelect();
              onSelect(key);
            }}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: Spacing.sm + 2,
              borderRadius: Radius.sm,
              backgroundColor: isSelected
                ? isDark
                  ? Colors.primary[900]
                  : Colors.primary[50]
                : isDark
                  ? DarkTheme.bgSurface3
                  : Colors.slate[50],
              borderWidth: isSelected ? 1.5 : 1,
              borderColor: isSelected
                ? Colors.primary[500]
                : isDark
                  ? DarkTheme.borderDefault
                  : Colors.slate[200],
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Icon
              size={15}
              color={isSelected ? Colors.primary[500] : theme.textTertiary}
              strokeWidth={2}
            />
            <Text
              style={{
                fontFamily: isSelected
                  ? FontFamily.sourceSansSemiBold
                  : FontFamily.sourceSansRegular,
                fontSize: 13,
                color: isSelected ? Colors.primary[500] : theme.textSecondary,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);
  const { isPro } = useIsPro();
  const router = useRouter();

  // Theme preference
  const currentTheme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyAllReviews, setNotifyAllReviews] = useState(true);
  const [notifyNegativeOnly, setNotifyNegativeOnly] = useState(false);

  // Connected platforms
  const [platforms, setPlatforms] = useState<ConnectedPlatform[]>([]);
  const [, setLoadingPlatforms] = useState(true);

  // Business name from profile
  const [businessName, setBusinessName] = useState('');

  // Fetch settings + platforms on mount
  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoadingPlatforms(true);
      try {
        const [settingsRes, profileRes, platformsRes] = await Promise.all([
          supabase
            .from('user_settings')
            .select('notifications_enabled, notify_all_reviews, notify_negative_only')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('profiles')
            .select('business_name')
            .eq('id', user.id)
            .single(),
          supabase
            .from('business_profiles')
            .select('platform, business_name, is_active, current_rating, total_reviews, last_polled_at')
            .eq('user_id', user.id),
        ]);

        if (settingsRes.error) {
          console.warn('[Settings] user_settings query failed:', settingsRes.error.message);
        } else if (settingsRes.data) {
          setNotificationsEnabled(settingsRes.data.notifications_enabled ?? true);
          setNotifyAllReviews(settingsRes.data.notify_all_reviews ?? true);
          setNotifyNegativeOnly(settingsRes.data.notify_negative_only ?? false);
        }

        if (profileRes.error) {
          console.warn('[Settings] profiles query failed:', profileRes.error.message);
        } else if (profileRes.data?.business_name) {
          setBusinessName(profileRes.data.business_name);
        }

        if (platformsRes.error) {
          console.warn('[Settings] business_profiles query failed:', platformsRes.error.message);
        } else if (platformsRes.data) {
          setPlatforms(platformsRes.data);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.warn('[Settings] data load failed:', msg);
      } finally {
        setLoadingPlatforms(false);
      }
    })();
  }, [user]);

  // Persist toggle changes
  const updateSetting = useCallback(
    async (field: string, value: boolean) => {
      if (!user) return;
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, [field]: value },
          { onConflict: 'user_id' }
        );
      if (error) console.warn('Setting update failed:', error.message);
    },
    [user]
  );

  const googleProfile = platforms.find((p) => p.platform === 'google');
  const yelpProfile = platforms.find((p) => p.platform === 'yelp');

  // Avatar initials
  const displayName = businessName || user?.email || 'U';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <ScrollView
        contentContainerStyle={{
          padding: Layout.screenPaddingH,
          paddingTop: Spacing.xl,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            Typography.h1,
            { color: theme.textPrimary, marginBottom: Spacing.lg },
          ]}
        >
          SETTINGS
        </Text>

        {/* ── 1. Profile Header ──────────────────────────────────────── */}
        <CardWrapper isDark={isDark}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.md,
            }}
          >
            {/* Avatar */}
            <View
              style={{
                width: Layout.avatarLg,
                height: Layout.avatarLg,
                borderRadius: Layout.avatarLg / 2,
                backgroundColor: getAvatarColor(displayName),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: FontFamily.barlowCondensedBold,
                  fontSize: 22,
                  color: '#FFFFFF',
                }}
              >
                {initials}
              </Text>
            </View>

            {/* Name + email */}
            <View style={{ flex: 1 }}>
              <Text
                style={[Typography.h3, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {businessName || 'Your Business'}
              </Text>
              <Text
                style={[
                  Typography.bodySm,
                  { color: theme.textTertiary, marginTop: 2 },
                ]}
                numberOfLines={1}
              >
                {user?.email ?? ''}
              </Text>
            </View>

            {/* Pro badge */}
            {isPro && (
              <View
                style={{
                  backgroundColor: isDark
                    ? `${Colors.accent[300]}20`
                    : Colors.accent[50],
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 4,
                  borderRadius: Radius.sm,
                  borderWidth: 1,
                  borderColor: Colors.accent[400],
                }}
              >
                <Text
                  style={{
                    fontFamily: FontFamily.barlowCondensedBold,
                    fontSize: 12,
                    letterSpacing: 0.8,
                    color: Colors.accent[700],
                    textTransform: 'uppercase',
                  }}
                >
                  PRO
                </Text>
              </View>
            )}
          </View>
        </CardWrapper>

        {/* ── 2. Connected Platforms ──────────────────────────────────── */}
        <SectionLabel text="CONNECTED PLATFORMS" isDark={isDark} />
        <CardWrapper isDark={isDark}>
          <PlatformRow
            name="Google Business Profile"
            isConnected={!!googleProfile}
            isActive={googleProfile?.is_active ?? false}
            rating={googleProfile?.current_rating ?? null}
            reviewCount={googleProfile?.total_reviews ?? 0}
            onReconnect={() => router.push('/onboarding/connect-google')}
            onConnect={() => router.push('/onboarding/connect-google')}
            isDark={isDark}
          />
          <Divider isDark={isDark} />
          <PlatformRow
            name="Yelp"
            isConnected={!!yelpProfile}
            isActive={yelpProfile?.is_active ?? false}
            rating={yelpProfile?.current_rating ?? null}
            reviewCount={yelpProfile?.total_reviews ?? 0}
            onConnect={() => {
              router.push('/yelp/connect');
            }}
            onReconnect={() => {
              router.push('/yelp/connect');
            }}
            isDark={isDark}
          />
        </CardWrapper>

        {/* ── 3. Subscription ────────────────────────────────────────── */}
        <SectionLabel text="SUBSCRIPTION" isDark={isDark} />
        <CardWrapper isDark={isDark}>
          <NavRow
            label={isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
            icon={Crown}
            isDark={isDark}
            badge={isPro ? 'Pro' : 'Free'}
            badgeColor={isPro ? Colors.accent[700] : undefined}
            onPress={() => router.push('/paywall')}
          />
        </CardWrapper>

        {/* ── 4. Notifications ───────────────────────────────────────── */}
        <SectionLabel text="NOTIFICATIONS" isDark={isDark} />
        <CardWrapper isDark={isDark}>
          <ToggleRow
            label="Push Notifications"
            description="Get notified when new reviews come in"
            value={notificationsEnabled}
            onChange={(v) => {
              setNotificationsEnabled(v);
              updateSetting('notifications_enabled', v);
            }}
            isDark={isDark}
          />

          {notificationsEnabled && (
            <>
              <Divider isDark={isDark} />
              <ToggleRow
                label="All Reviews"
                description="Notify for every new review"
                value={notifyAllReviews}
                onChange={(v) => {
                  setNotifyAllReviews(v);
                  if (v) setNotifyNegativeOnly(false);
                  updateSetting('notify_all_reviews', v);
                  if (v) updateSetting('notify_negative_only', false);
                }}
                isDark={isDark}
              />
              <ToggleRow
                label="Negative Reviews Only"
                description="Only notify for 1-2 star reviews"
                value={notifyNegativeOnly}
                onChange={(v) => {
                  setNotifyNegativeOnly(v);
                  if (v) setNotifyAllReviews(false);
                  updateSetting('notify_negative_only', v);
                  if (v) updateSetting('notify_all_reviews', false);
                }}
                isDark={isDark}
              />
            </>
          )}
        </CardWrapper>

        {/* ── 5. Preferences ─────────────────────────────────────────── */}
        <SectionLabel text="APPEARANCE" isDark={isDark} />
        <CardWrapper isDark={isDark}>
          <Text
            style={{
              fontFamily: FontFamily.sourceSansSemiBold,
              fontSize: 15,
              color: theme.textPrimary,
              marginBottom: 2,
            }}
          >
            Theme
          </Text>
          <Text
            style={[Typography.caption, { color: theme.textTertiary }]}
          >
            Choose how ReviewPulse looks
          </Text>
          <ThemeSelector
            currentTheme={currentTheme}
            onSelect={setTheme}
            isDark={isDark}
          />
        </CardWrapper>

        {/* ── 6. Account ─────────────────────────────────────────────── */}
        <SectionLabel text="ACCOUNT" isDark={isDark} />
        <CardWrapper isDark={isDark}>
          <NavRow
            label="Sign Out"
            icon={LogOut}
            isDark={isDark}
            destructive
            onPress={() => {
              HapticMap.deleteConfirm();
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
              ]);
            }}
          />
          <Divider isDark={isDark} />
          <NavRow
            label="Delete Account"
            icon={Trash2}
            isDark={isDark}
            destructive
            onPress={() => {
              HapticMap.deleteConfirm();
              Alert.alert(
                'Delete Account',
                'This will permanently delete your account and all data. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      // Delete user data then sign out
                      if (user) {
                        await supabase.rpc('delete_user_data', {
                          target_user_id: user.id,
                        });
                      }
                      signOut();
                    },
                  },
                ]
              );
            }}
          />
        </CardWrapper>

        {/* ── 7. About ───────────────────────────────────────────────── */}
        <SectionLabel text="ABOUT" isDark={isDark} />
        <CardWrapper isDark={isDark}>
          <NavRow
            label="Terms of Service"
            icon={Shield}
            isDark={isDark}
            onPress={() => router.push('/legal/terms')}
          />
          <Divider isDark={isDark} />
          <NavRow
            label="Privacy Policy"
            icon={Shield}
            isDark={isDark}
            onPress={() => router.push('/legal/privacy')}
          />
          <Divider isDark={isDark} />
          <NavRow
            label="Contact Support"
            icon={Mail}
            isDark={isDark}
            onPress={() =>
              Linking.openURL('mailto:support@reviewpulse.app')
            }
          />
          <Divider isDark={isDark} />
          <NavRow
            label="Rate ReviewPulse"
            icon={Star}
            isDark={isDark}
            onPress={() => {
              HapticMap.buttonPress();
              // Will be replaced with actual App Store link
              Alert.alert('Thanks!', 'App Store link coming soon.');
            }}
          />
          <Divider isDark={isDark} />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: Spacing.sm + 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Info size={18} color={theme.textTertiary} strokeWidth={1.8} />
              <Text style={[Typography.h4, { color: theme.textTertiary }]}>
                Version
              </Text>
            </View>
            <Text
              style={{
                fontFamily: FontFamily.sourceSansRegular,
                fontSize: 14,
                color: theme.textTertiary,
              }}
            >
              1.0.0
            </Text>
          </View>
        </CardWrapper>

        {/* Bottom spacer */}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}
