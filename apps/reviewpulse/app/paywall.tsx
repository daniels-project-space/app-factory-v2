// ReviewPulse — Paywall Screen (Sprint 8)
// Premium subscription conversion screen: monthly/annual toggle, 7-day trial, RevenueCat purchase
// Modal presentation — accessed from onboarding, Pro gate banners, settings
// Aesthetic: dark teal authority header, electric lime conversion signals, stat-sized pricing

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  X,
  CheckCircle,
  MessageSquare,
  Sparkles,
  BarChart2,
  Bell,
  Shield,
  RotateCcw,
  Zap,
  Crown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { PurchasesPackage } from 'react-native-purchases';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Layout,
  Shadows,
  Duration,
  SpringConfigs,
} from '@/constants';
import { getOfferings, purchase, restorePurchases } from '@/lib/payments';
import { useSubscriptionStore } from '@/store/subscription';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { track } from '@/lib/analytics';

// ─── Types ──────────────────────────────────────────────────────────────────────

type PlanInterval = 'monthly' | 'annual';
type ScreenState = 'loading' | 'ready' | 'purchasing' | 'restoring' | 'success' | 'error';

interface FeatureItem {
  icon: typeof MessageSquare;
  label: string;
  description: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const PRO_FEATURES: FeatureItem[] = [
  {
    icon: MessageSquare,
    label: 'Unlimited SMS Requests',
    description: 'Send review requests to every customer, no monthly cap',
  },
  {
    icon: Sparkles,
    label: 'AI Reply Drafts',
    description: 'Claude writes professional replies in seconds',
  },
  {
    icon: BarChart2,
    label: 'Full Analytics',
    description: 'Rating trends, velocity charts, response rates',
  },
  {
    icon: Bell,
    label: 'Instant Push Alerts',
    description: 'Know the moment a new review lands',
  },
  {
    icon: Shield,
    label: 'Multi-Platform Monitoring',
    description: 'Google, Yelp, and Trustpilot in one feed',
  },
];

const MONTHLY_PRICE = '$14.99';
const ANNUAL_PRICE = '$119.99';
const ANNUAL_MONTHLY_EQUIV = '$10.00';
const SAVE_PERCENT = '33%';

// ─── Component ──────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ source?: string }>();

  const user = useAuthStore((s) => s.user);

  // State
  const [selectedPlan, setSelectedPlan] = useState<PlanInterval>('annual');
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const featuresFade = useRef(new Animated.Value(0)).current;
  const priceFade = useRef(new Animated.Value(0)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const toggleSlide = useRef(new Animated.Value(1)).current; // 0=monthly, 1=annual
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ─── Load offerings ─────────────────────────────────────────────────────────

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    loadOfferings();
    runEntranceAnimation();
    startPulse();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadOfferings = async () => {
    try {
      const pkgs = await getOfferings();
      setPackages(pkgs);
      setScreenState('ready');
    } catch {
      // RevenueCat not configured yet — show fallback prices
      setScreenState('ready');
    }
  };

  const runEntranceAnimation = () => {
    Animated.stagger(100, [
      Animated.timing(headerFade, {
        toValue: 1,
        duration: Duration.slow,
        useNativeDriver: true,
      }),
      Animated.timing(featuresFade, {
        toValue: 1,
        duration: Duration.slow,
        useNativeDriver: true,
      }),
      Animated.timing(priceFade, {
        toValue: 1,
        duration: Duration.slow,
        useNativeDriver: true,
      }),
      Animated.timing(ctaFade, {
        toValue: 1,
        duration: Duration.slow,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  // ─── Purchase handlers ──────────────────────────────────────────────────────

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScreenState('purchasing');
    track('paywall_purchase_tap', { plan: selectedPlan, source: params.source });

    try {
      // Find the right package
      const targetId = selectedPlan === 'annual' ? 'annual' : 'monthly';
      const pkg = packages.find((p) =>
        p.identifier.toLowerCase().includes(targetId),
      );

      if (pkg) {
        const customerInfo = await purchase(pkg);
        const hasProEntitlement = customerInfo.entitlements.active['pro'] !== undefined;

        if (hasProEntitlement) {
          // Update local state
          useSubscriptionStore.setState({ isPro: true });

          // Update Supabase profile
          if (user) {
            const { error: profileErr } = await supabase
              .from('profiles')
              .update({ is_pro: true })
              .eq('id', user.id);
            if (profileErr) {
              Alert.alert(
                'Subscription Active',
                'Your purchase was successful, but we could not sync your account. Please sign out and back in.',
              );
            }
          }

          track('paywall_purchase_success', { plan: selectedPlan });
          showSuccessAnimation();
          return;
        }
      }

      // Dev-only fallback: simulate success when RevenueCat is not configured
      // This block is stripped in production builds
      if (__DEV__ && packages.length === 0) {
        useSubscriptionStore.setState({ isPro: true });
        if (user) {
          const { error: devErr } = await supabase
            .from('profiles')
            .update({ is_pro: true })
            .eq('id', user.id);
          if (devErr) {
            Alert.alert(
              'Sync Error',
              'Could not update your account. Please sign out and back in.',
            );
          }
        }
        track('paywall_purchase_success', { plan: selectedPlan, mode: 'dev' });
        showSuccessAnimation();
        return;
      }

      if (packages.length === 0) {
        Alert.alert('Store Unavailable', 'Subscription options are not available right now. Please try again later.');
        setScreenState('ready');
        return;
      }

      setScreenState('ready');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      // User cancellation is not an error
      if (message.includes('cancel') || message.includes('Cancel')) {
        setScreenState('ready');
        return;
      }
      setErrorMessage(message);
      setScreenState('error');
      track('paywall_purchase_error', { error: message });
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreenState('restoring');
    track('paywall_restore_tap');

    try {
      const customerInfo = await restorePurchases();
      const hasProEntitlement = customerInfo.entitlements.active['pro'] !== undefined;

      if (hasProEntitlement) {
        useSubscriptionStore.setState({ isPro: true });
        if (user) {
          const { error: restoreErr } = await supabase
            .from('profiles')
            .update({ is_pro: true })
            .eq('id', user.id);
          if (restoreErr) console.warn('Restore profile update failed:', restoreErr.message);
        }
        track('paywall_restore_success');
        showSuccessAnimation();
      } else {
        setErrorMessage('No active subscription found');
        setScreenState('error');
      }
    } catch {
      setErrorMessage('Could not restore purchases. Try again.');
      setScreenState('error');
    }
  };

  const showSuccessAnimation = () => {
    setScreenState('success');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        ...SpringConfigs.bouncy,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 2s
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }, 2000);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    track('paywall_dismiss', { source: params.source });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleTogglePlan = (plan: PlanInterval) => {
    if (plan === selectedPlan) return;
    Haptics.selectionAsync();
    setSelectedPlan(plan);
    Animated.spring(toggleSlide, {
      toValue: plan === 'annual' ? 1 : 0,
      ...SpringConfigs.button,
      useNativeDriver: true,
    }).start();
  };

  // ─── Derived values ─────────────────────────────────────────────────────────

  const displayPrice = selectedPlan === 'monthly' ? MONTHLY_PRICE : ANNUAL_PRICE;
  const displayInterval = selectedPlan === 'monthly' ? '/ month' : '/ year';
  const displaySubtext =
    selectedPlan === 'monthly'
      ? 'Billed monthly \u2022 cancel anytime'
      : `${ANNUAL_MONTHLY_EQUIV}/mo billed annually \u2022 cancel anytime`;

  // ─── Success overlay ───────────────────────────────────────────────────────

  if (screenState === 'success') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.primary[950],
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: insets.bottom,
        }}
      >
        <Animated.View
          style={{
            opacity: successOpacity,
            transform: [{ scale: successScale }],
            alignItems: 'center',
          }}
        >
          {/* Lime circle with checkmark */}
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: Colors.accent[300],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Spacing.xl,
              ...Shadows.lg,
            }}
          >
            <CheckCircle size={64} color={Colors.primary[950]} strokeWidth={2.5} />
          </View>

          <Text
            style={[
              Typography.h1,
              { color: '#FFFFFF', textAlign: 'center', marginBottom: Spacing.sm },
            ]}
          >
            YOU'RE PRO
          </Text>
          <Text
            style={[
              Typography.body,
              { color: Colors.accent[300], textAlign: 'center' },
            ]}
          >
            All features unlocked. Go get those reviews.
          </Text>
        </Animated.View>
      </View>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: Colors.primary[950] }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Close button ─────────────────────────────────────────────── */}
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: insets.top + Spacing.sm,
            right: Spacing.md,
            zIndex: 10,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={22} color="rgba(255,255,255,0.7)" strokeWidth={2} />
        </Pressable>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + Spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header section ───────────────────────────────────────── */}
          <Animated.View
            style={{
              opacity: headerFade,
              transform: [
                {
                  translateY: headerFade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
              paddingHorizontal: Layout.screenPaddingH,
              paddingTop: Spacing['2xl'] + 20,
              paddingBottom: Spacing.xl,
              alignItems: 'center',
            }}
          >
            {/* Crown badge */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.accent[300],
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.lg,
                ...Shadows.lg,
              }}
            >
              <Crown size={32} color={Colors.primary[950]} strokeWidth={2.5} />
            </View>

            <Text
              style={[
                Typography.h1,
                {
                  color: '#FFFFFF',
                  textAlign: 'center',
                  fontSize: 36,
                  letterSpacing: 1,
                },
              ]}
            >
              REVIEWPULSE PRO
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: Spacing.sm,
                backgroundColor: 'rgba(202, 255, 71, 0.12)',
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.xs + 2,
                borderRadius: Radius.full,
              }}
            >
              <Zap size={14} color={Colors.accent[300]} strokeWidth={2.5} />
              <Text
                style={[
                  Typography.label,
                  {
                    color: Colors.accent[300],
                    marginLeft: Spacing.xs,
                    fontSize: 12,
                    letterSpacing: 1.2,
                  },
                ]}
              >
                7-DAY FREE TRIAL
              </Text>
            </View>
          </Animated.View>

          {/* ── Accent line divider ──────────────────────────────────── */}
          <View
            style={{
              height: 2,
              marginHorizontal: Layout.screenPaddingH + Spacing.xl,
              backgroundColor: Colors.accent[300],
              opacity: 0.25,
              borderRadius: 1,
            }}
          />

          {/* ── Features list ────────────────────────────────────────── */}
          <Animated.View
            style={{
              opacity: featuresFade,
              transform: [
                {
                  translateY: featuresFade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
              paddingHorizontal: Layout.screenPaddingH,
              paddingTop: Spacing.xl,
              paddingBottom: Spacing.lg,
            }}
          >
            {PRO_FEATURES.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <View
                  key={feature.label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: index < PRO_FEATURES.length - 1 ? Spacing.lg : 0,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: 'rgba(15, 123, 123, 0.4)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: Spacing.md,
                      marginTop: 2,
                    }}
                  >
                    <IconComponent
                      size={18}
                      color={Colors.accent[300]}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        Typography.h4,
                        { color: '#FFFFFF', marginBottom: 2 },
                      ]}
                    >
                      {feature.label}
                    </Text>
                    <Text
                      style={[
                        Typography.bodySm,
                        { color: 'rgba(255,255,255,0.5)' },
                      ]}
                    >
                      {feature.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>

          {/* ── Pricing section ───────────────────────────────────────── */}
          <Animated.View
            style={{
              opacity: priceFade,
              transform: [
                {
                  translateY: priceFade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
              paddingHorizontal: Layout.screenPaddingH,
              paddingTop: Spacing.md,
            }}
          >
            {/* Plan toggle */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: Radius.md,
                padding: 4,
                marginBottom: Spacing.xl,
              }}
            >
              {/* Toggle indicator (animated) */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  width: '50%',
                  height: '100%',
                  borderRadius: Radius.md - 2,
                  backgroundColor: Colors.primary[500],
                  transform: [
                    {
                      translateX: toggleSlide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1], // Will be overridden by layout
                      }),
                    },
                  ],
                }}
              />

              {/* Monthly tab */}
              <Pressable
                onPress={() => handleTogglePlan('monthly')}
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md - 2,
                  alignItems: 'center',
                  borderRadius: Radius.md - 2,
                  backgroundColor:
                    selectedPlan === 'monthly' ? Colors.primary[500] : 'transparent',
                }}
              >
                <Text
                  style={[
                    Typography.buttonSm,
                    {
                      color:
                        selectedPlan === 'monthly'
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.5)',
                    },
                  ]}
                >
                  MONTHLY
                </Text>
              </Pressable>

              {/* Annual tab */}
              <Pressable
                onPress={() => handleTogglePlan('annual')}
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md - 2,
                  alignItems: 'center',
                  borderRadius: Radius.md - 2,
                  backgroundColor:
                    selectedPlan === 'annual' ? Colors.primary[500] : 'transparent',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: Spacing.xs,
                }}
              >
                <Text
                  style={[
                    Typography.buttonSm,
                    {
                      color:
                        selectedPlan === 'annual'
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.5)',
                    },
                  ]}
                >
                  ANNUAL
                </Text>
                <View
                  style={{
                    backgroundColor: Colors.accent[300],
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: Radius.xs,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Typography.label.fontFamily,
                      fontSize: 10,
                      color: Colors.primary[950],
                      fontWeight: '700',
                      letterSpacing: 0.5,
                    }}
                  >
                    SAVE {SAVE_PERCENT}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Price display */}
            <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text
                  style={[
                    Typography.display,
                    {
                      color: '#FFFFFF',
                      fontSize: 52,
                      lineHeight: 56,
                    },
                  ]}
                >
                  {displayPrice}
                </Text>
                <Text
                  style={[
                    Typography.h3,
                    {
                      color: 'rgba(255,255,255,0.4)',
                      marginLeft: Spacing.xs,
                    },
                  ]}
                >
                  {displayInterval}
                </Text>
              </View>
              <Text
                style={[
                  Typography.bodySm,
                  {
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: Spacing.xs,
                  },
                ]}
              >
                {displaySubtext}
              </Text>
            </View>
          </Animated.View>

          {/* ── CTA section ───────────────────────────────────────────── */}
          <Animated.View
            style={{
              opacity: ctaFade,
              paddingHorizontal: Layout.screenPaddingH,
              paddingTop: Spacing.sm,
            }}
          >
            {/* Error banner */}
            {screenState === 'error' && (
              <View
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.15)',
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                  marginBottom: Spacing.md,
                  borderWidth: 1,
                  borderColor: 'rgba(220, 38, 38, 0.3)',
                }}
              >
                <Text
                  style={[
                    Typography.bodySm,
                    { color: Colors.error[300], textAlign: 'center' },
                  ]}
                >
                  {errorMessage || 'Something went wrong. Please try again.'}
                </Text>
              </View>
            )}

            {/* Primary CTA — START FREE TRIAL */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                onPress={handlePurchase}
                testID="upgrade-button"
                disabled={screenState === 'purchasing' || screenState === 'loading'}
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? Colors.accent[500]
                    : Colors.accent[300],
                  height: Layout.buttonHeight,
                  borderRadius: Radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: screenState === 'purchasing' ? 0.8 : 1,
                  ...Shadows.lg,
                })}
              >
                {screenState === 'purchasing' ? (
                  <ActivityIndicator color={Colors.primary[950]} size="small" />
                ) : screenState === 'loading' ? (
                  <ActivityIndicator color={Colors.primary[950]} size="small" />
                ) : (
                  <Text
                    style={[
                      Typography.button,
                      {
                        color: Colors.primary[950],
                        fontSize: 19,
                        letterSpacing: 1,
                      },
                    ]}
                  >
                    START FREE TRIAL
                  </Text>
                )}
              </Pressable>
            </Animated.View>

            {/* Continue free */}
            <Pressable
              onPress={handleDismiss}
              style={{
                paddingVertical: Spacing.md,
                alignItems: 'center',
                marginTop: Spacing.sm,
              }}
            >
              <Text
                style={[
                  Typography.body,
                  { color: 'rgba(255,255,255,0.35)', fontSize: 15 },
                ]}
              >
                Continue with Free (5 requests/month)
              </Text>
            </Pressable>

            {/* Restore purchases */}
            <Pressable
              onPress={handleRestore}
              disabled={screenState === 'restoring'}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: Spacing.sm,
                marginTop: Spacing.xs,
              }}
            >
              {screenState === 'restoring' ? (
                <ActivityIndicator
                  color="rgba(255,255,255,0.4)"
                  size="small"
                  style={{ marginRight: Spacing.xs }}
                />
              ) : (
                <RotateCcw
                  size={14}
                  color="rgba(255,255,255,0.35)"
                  strokeWidth={2}
                  style={{ marginRight: Spacing.xs }}
                />
              )}
              <Text
                style={[
                  Typography.bodySm,
                  { color: 'rgba(255,255,255,0.35)' },
                ]}
              >
                Restore Purchases
              </Text>
            </Pressable>

            {/* Legal text */}
            <Text
              style={[
                Typography.caption,
                {
                  color: 'rgba(255,255,255,0.2)',
                  textAlign: 'center',
                  marginTop: Spacing.lg,
                  paddingHorizontal: Spacing.md,
                  lineHeight: 18,
                },
              ]}
            >
              Payment will be charged to your App Store account at confirmation of
              purchase. Subscription automatically renews unless canceled at least 24
              hours before the end of the current period. By subscribing you agree to
              our{' '}
              <Text
                style={{ color: 'rgba(255,255,255,0.5)', textDecorationLine: 'underline' }}
                onPress={() => router.push('/legal/terms')}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                style={{ color: 'rgba(255,255,255,0.5)', textDecorationLine: 'underline' }}
                onPress={() => router.push('/legal/privacy')}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
