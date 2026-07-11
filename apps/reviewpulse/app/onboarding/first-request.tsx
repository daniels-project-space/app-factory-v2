// ReviewPulse — Onboarding Final Step: First Review Request
// Shown after user connects their Google Business profile
// Celebrates the setup, prompts to send first SMS request via send-sms edge function

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  MessageSquare,
  ArrowRight,
  Zap,
  Check,
  AlertCircle,
} from 'lucide-react-native';
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
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { useSettingsStore } from '@/store/settings';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import {
  registerForPushNotifications,
  savePushToken,
} from '@/lib/notifications';

const LIME = Colors.accent[300];

type SendState = 'idle' | 'form' | 'sending' | 'success' | 'error';

// Animated lime check circle
function SuccessBadge({ scale }: { scale: Animated.Value }) {
  return (
    <Animated.View
      style={{
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: LIME,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
        shadowColor: LIME,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      <Zap
        size={40}
        color={Colors.primary[900]}
        fill={Colors.primary[900]}
        strokeWidth={1.5}
      />
    </Animated.View>
  );
}

export default function FirstRequestScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const setOnboardingComplete = useSettingsStore(
    (s) => s.setOnboardingComplete
  );
  const user = useAuthStore((s) => s.user);

  const [sendState, setSendState] = useState<SendState>('idle');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Request push notification permission on mount (non-blocking)
  useEffect(() => {
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token && user) {
          await savePushToken(user.id, token);
        }
      } catch {
        // Non-blocking
      }
    })();
  }, [user]);

  // Entrance animations
  const badgeScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 10,
        bounciness: 16,
      }),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [badgeScale, contentOpacity, contentTranslate]);

  const handleShowForm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSendState('form');
  };

  const validateForm = () => {
    let valid = true;
    setNameError('');
    setPhoneError('');

    if (!customerName.trim()) {
      setNameError('Customer name is required');
      valid = false;
    }

    if (!customerPhone.trim()) {
      setPhoneError('Phone number is required');
      valid = false;
    } else {
      const digits = customerPhone.replace(/\D/g, '');
      if (digits.length < 10) {
        setPhoneError('Enter a valid phone number');
        valid = false;
      }
    }

    return valid;
  };

  const handleSendSms = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSendState('sending');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          template_id: 'default',
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send SMS');
      }

      const result = data as {
        success: boolean;
        error?: string;
        detail?: string;
      };

      if (!result.success) {
        throw new Error(result.error ?? 'Unknown error');
      }

      setSendState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Mark onboarding complete after successful send
      setOnboardingComplete(true);

      // Navigate to main app after a brief celebration
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    } catch (err) {
      setSendState('error');
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMessage(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  // SMS sent successfully
  if (sendState === 'success') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: Layout.screenPaddingH,
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: Colors.success[500],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Spacing.lg,
            }}
          >
            <Check size={44} color="#FFFFFF" strokeWidth={2.5} />
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
            REQUEST SENT!
          </Text>
          <Text
            style={[
              Typography.body,
              { color: theme.textSecondary, textAlign: 'center' },
            ]}
          >
            Your first review request is on its way. Taking you to your
            dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show SMS form
  if (sendState === 'form' || sendState === 'sending' || sendState === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: Layout.screenPaddingH,
              paddingTop: Spacing.xl,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Text
              style={[
                Typography.h2,
                {
                  color: theme.textPrimary,
                  marginBottom: Spacing.xs,
                },
              ]}
            >
              SEND YOUR FIRST REQUEST
            </Text>
            <Text
              style={[
                Typography.body,
                {
                  color: theme.textSecondary,
                  marginBottom: Spacing.xl,
                },
              ]}
            >
              Enter a customer's info and we'll text them a review link.
            </Text>

            {/* Form */}
            <View style={{ gap: Spacing.md, marginBottom: Spacing.lg }}>
              <Input
                label="Customer Name"
                variant="text"
                value={customerName}
                onChangeText={setCustomerName}
                error={nameError}
                placeholder="John Smith"
                autoCapitalize="words"
                autoCorrect={false}
              />

              <Input
                label="Phone Number"
                variant="text"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                error={phoneError}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
              />
            </View>

            {/* SMS Preview */}
            <View
              style={{
                backgroundColor: isDark
                  ? DarkTheme.bgSurface
                  : LightTheme.bgSurface,
                borderRadius: Radius.md,
                padding: Spacing.md,
                marginBottom: Spacing.lg,
                borderWidth: 1,
                borderColor: theme.borderDefault,
              }}
            >
              <Text
                style={[
                  Typography.label,
                  { color: theme.textTertiary, marginBottom: Spacing.xs },
                ]}
              >
                SMS PREVIEW
              </Text>
              <Text
                style={[
                  Typography.bodySm,
                  { color: theme.textSecondary, lineHeight: 20 },
                ]}
              >
                Hi {customerName.trim().split(' ')[0] || 'Customer'}, thanks
                for choosing your business! We'd love a quick review: [review
                link] - Reply STOP to opt out.
              </Text>
            </View>

            {/* Error message */}
            {errorMessage ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.sm,
                  backgroundColor: Colors.error[100],
                  borderRadius: Radius.sm,
                  padding: Spacing.md,
                  marginBottom: Spacing.lg,
                  borderLeftWidth: 3,
                  borderLeftColor: Colors.error[500],
                }}
              >
                <AlertCircle
                  size={18}
                  color={Colors.error[500]}
                  strokeWidth={1.5}
                />
                <Text
                  style={[
                    Typography.bodySm,
                    { color: Colors.error[700], flex: 1 },
                  ]}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Send button */}
            <Button
              label={sendState === 'sending' ? 'Sending...' : 'Send SMS Request'}
              variant="primary"
              onPress={handleSendSms}
              loading={sendState === 'sending'}
              disabled={sendState === 'sending'}
              fullWidth
              style={{ marginBottom: Spacing.md }}
            />

            {/* Skip */}
            <Pressable
              onPress={handleSkip}
              style={{ alignSelf: 'center', paddingVertical: Spacing.sm }}
              hitSlop={8}
            >
              <Text
                style={[Typography.bodySm, { color: theme.textTertiary }]}
              >
                Skip for now
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Default: celebration + CTA
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
        {/* Progress dots */}
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
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: Colors.accent[300],
              }}
            />
          ))}
        </View>

        {/* Success badge */}
        <SuccessBadge scale={badgeScale} />

        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslate }],
            width: '100%',
            alignItems: 'center',
          }}
        >
          {/* Headline */}
          <Text
            style={[
              Typography.h1,
              {
                color: theme.textPrimary,
                textAlign: 'center',
                marginTop: Spacing.xl,
                marginBottom: Spacing.sm,
              },
            ]}
          >
            {"YOU'RE ALL SET!"}
          </Text>

          {/* Sub-headline */}
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
            Google is connected. Now send your first review request in seconds.
          </Text>

          {/* How it works */}
          <View
            style={{
              backgroundColor: isDark
                ? DarkTheme.bgSurface
                : LightTheme.bgSurface,
              borderRadius: Radius.md,
              padding: Spacing.md,
              width: '100%',
              gap: Spacing.sm,
              marginBottom: Spacing.xl,
            }}
          >
            <Text
              style={[
                Typography.label,
                { color: theme.textTertiary, marginBottom: Spacing.xs },
              ]}
            >
              HOW IT WORKS
            </Text>

            {[
              { num: '1', label: 'Enter a customer name and phone number' },
              {
                num: '2',
                label: 'Pick a template (we have one ready for you)',
              },
              {
                num: '3',
                label: 'Hit send - we track the result automatically',
              },
            ].map((step) => (
              <View
                key={step.num}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: Spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: Colors.primary[500],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Barlow-Condensed-Bold',
                      fontSize: 12,
                      color: '#FFFFFF',
                      lineHeight: 13,
                    }}
                  >
                    {step.num}
                  </Text>
                </View>
                <Text
                  style={[
                    Typography.bodySm,
                    { color: theme.textSecondary, flex: 1, lineHeight: 20 },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Primary CTA */}
          <Pressable
            onPress={handleShowForm}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.sm,
              height: 56,
              width: '100%',
              borderRadius: Radius.xs,
              backgroundColor: pressed
                ? Colors.primary[700]
                : Colors.primary[500],
              marginBottom: Spacing.md,
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <MessageSquare size={20} color="#FFFFFF" strokeWidth={2} />
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>
              SEND MY FIRST REQUEST
            </Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>

          {/* Secondary */}
          <Pressable
            onPress={handleSkip}
            style={{ paddingVertical: Spacing.sm }}
            hitSlop={8}
          >
            <Text
              style={[Typography.bodySm, { color: theme.textTertiary }]}
            >
              {"I'll do this later"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
