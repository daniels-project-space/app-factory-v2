// ReviewPulse — Onboarding Step 2: Connect Google Business Profile
// Full implementation: OAuth initiation UI, permission transparency, trust signals
// Actual GBP OAuth flow wired via connect-google Edge Function (Sprint 5)

import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Lock, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Spacing,
  Radius,
  Layout,
} from '@/constants';
import { useSettingsStore } from '@/store/settings';

const PERMISSIONS = [
  'Read your Google reviews in real time',
  'Post replies only when you approve them',
  'Never auto-posts or makes changes without you',
] as const;

// Google "G" badge — React Native Views only
function GoogleBadge() {
  return (
    <View
      style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2.5,
        borderColor: '#4285F4',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        shadowColor: '#4285F4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <Text
        style={{
          fontFamily: 'Barlow-Condensed-ExtraBold',
          fontSize: 40,
          color: '#4285F4',
          lineHeight: 44,
        }}
      >
        G
      </Text>
    </View>
  );
}

export default function ConnectGoogleScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const setOnboardingComplete = useSettingsStore((s) => s.setOnboardingComplete);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting(true);
    try {
      // Sprint 5: call connect-google Edge Function to initiate GBP OAuth
      // For now, advance to business search screen
      router.push('/onboarding/find-business');
    } finally {
      setConnecting(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: Layout.screenPaddingH,
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: Spacing.xl,
        }}
      >
        {/* Progress dots — step 2 of 3 */}
        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.xs,
            marginBottom: Spacing['2xl'],
          }}
        >
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: i === 1 ? 24 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  i <= 1 ? Colors.primary[500] : theme.borderDefault,
              }}
            />
          ))}
        </View>

        {/* Google badge */}
        <GoogleBadge />

        {/* Headline */}
        <Text
          style={[
            Typography.h2,
            {
              color: theme.textPrimary,
              textAlign: 'center',
              marginTop: Spacing.lg,
              marginBottom: Spacing.sm,
            },
          ]}
        >
          CONNECT YOUR{'\n'}GOOGLE BUSINESS
        </Text>

        {/* Explanation */}
        <Text
          style={[
            Typography.body,
            {
              color: theme.textSecondary,
              textAlign: 'center',
              marginBottom: Spacing.xl,
              paddingHorizontal: Spacing.sm,
            },
          ]}
        >
          ReviewPulse needs read access to your reviews and permission to
          post replies. We never post without your approval.
        </Text>

        {/* Permission bullets */}
        <View
          style={{
            backgroundColor: isDark ? DarkTheme.bgSurface2 : Colors.primary[50],
            borderRadius: Radius.md,
            padding: Spacing.md,
            width: '100%',
            gap: Spacing.sm,
            marginBottom: Spacing.xl,
          }}
        >
          {PERMISSIONS.map((p) => (
            <View
              key={p}
              style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}
            >
              <Lock
                size={15}
                color={Colors.primary[isDark ? 300 : 500]}
                strokeWidth={1.5}
              />
              <Text
                style={[
                  Typography.bodySm,
                  { color: theme.textSecondary, flex: 1, lineHeight: 20 },
                ]}
              >
                {p}
              </Text>
            </View>
          ))}
        </View>

        {/* Google-styled connect button */}
        <Pressable
          onPress={handleConnect}
          disabled={connecting}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.sm,
            height: 56,
            width: '100%',
            borderRadius: Radius.xs,
            borderWidth: 1.5,
            borderColor: '#4285F4',
            backgroundColor: pressed
              ? 'rgba(66,133,244,0.06)'
              : isDark
              ? DarkTheme.bgSurface
              : '#FFFFFF',
            opacity: connecting ? 0.7 : 1,
            marginBottom: Spacing.md,
          })}
        >
          <Text
            style={{
              fontFamily: 'Barlow-Condensed-ExtraBold',
              fontSize: 22,
              color: '#4285F4',
              lineHeight: 24,
            }}
          >
            G
          </Text>
          <Text
            style={[
              Typography.button,
              {
                color: isDark ? DarkTheme.textPrimary : '#3C4043',
                letterSpacing: 0.5,
              },
            ]}
          >
            {connecting ? 'Connecting...' : 'Connect with Google'}
          </Text>
        </Pressable>

        {/* Skip */}
        <Pressable onPress={handleSkip} style={{ paddingVertical: Spacing.sm }} hitSlop={8}>
          <Text style={[Typography.bodySm, { color: theme.textTertiary }]}>
            I'll do this later
          </Text>
        </Pressable>

        {/* Trust signal */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            marginTop: Spacing.xl,
          }}
        >
          <Shield size={13} color={theme.textTertiary} strokeWidth={1.5} />
          <Text style={[Typography.caption, { color: theme.textTertiary }]}>
            256-bit encrypted • No posting without your approval
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
