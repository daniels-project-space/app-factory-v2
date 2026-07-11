import { View, Text, Pressable, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useState, useCallback, useEffect } from 'react';
import { X, Sparkles, Camera, Heart, PenTool, BookOpen, FileText, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import { useOfferings, usePurchase, useRestorePurchases } from '@/lib/usePremium';
import { isRevenueCatEnabled } from '@/lib/revenuecatClient';


const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PlanType = 'monthly' | 'yearly';

type FeatureItem = { icon: React.ComponentType<{ size: number; color: string }>; title: string; subtitle: string; color: string };

function FeatureRow({ feature, textColor, secondaryColor, accent }: { feature: FeatureItem; textColor: string; secondaryColor: string; accent: string }) {
  const scale = useSharedValue(1);
  const featureStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const Icon = feature.icon;
  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 22, stiffness: 200 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 22, stiffness: 200 }); }}
      style={featureStyle}
      className="flex-row items-center mb-3"
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3 flex-shrink-0"
        style={{ backgroundColor: `${feature.color}20` }}
      >
        <Icon size={18} color={feature.color} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-sm" style={{ color: textColor }}>
          {feature.title}
        </Text>
        <Text className="font-sans text-xs mt-0.5" style={{ color: secondaryColor }}>
          {feature.subtitle}
        </Text>
      </View>
      <View
        className="w-5 h-5 rounded-full items-center justify-center ml-2 flex-shrink-0"
        style={{ backgroundColor: accent }}
      >
        <Check size={11} color="#FFFFFF" strokeWidth={3} />
      </View>
    </AnimatedPressable>
  );
}

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Weekly Insights',
    subtitle: 'Personalized reflections from your words',
    color: '#6366F1',
  },
  {
    icon: Camera,
    title: 'Photo Journaling',
    subtitle: 'Capture moments alongside your thoughts',
    color: '#F59E0B',
  },
  {
    icon: Heart,
    title: 'Mood Tracking',
    subtitle: 'Understand your emotional patterns over time',
    color: '#EC4899',
  },
  {
    icon: PenTool,
    title: 'Custom Prompts',
    subtitle: 'Write your own daily questions',
    color: '#10B981',
  },
  {
    icon: BookOpen,
    title: 'Philosopher Guides',
    subtitle: 'Wisdom lenses from Stoics to Existentialists',
    color: '#8B5CF6',
  },
  {
    icon: FileText,
    title: 'PDF Export',
    subtitle: 'Beautiful journal exports to keep forever',
    color: '#0EA5E9',
  },
];

export default function PaywallScreen() {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');

  const { data: offerings } = useOfferings();
  const purchaseMutation = usePurchase();
  const restoreMutation = useRestorePurchases();

  // Animation values
  const headerOpacity = useSharedValue(0);
  const featuresOpacity = useSharedValue(0);
  const pricingOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Staggered entrance animations with cubic easing per rubric (no linear easing)
    const ease = { duration: 500, easing: Easing.out(Easing.cubic) };
    headerOpacity.value = withDelay(100, withTiming(1, ease));
    featuresOpacity.value = withDelay(250, withTiming(1, ease));
    pricingOpacity.value = withDelay(400, withTiming(1, ease));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: interpolate(headerOpacity.value, [0, 1], [20, 0]) }],
  }));

  const featuresStyle = useAnimatedStyle(() => ({
    opacity: featuresOpacity.value,
    transform: [{ translateY: interpolate(featuresOpacity.value, [0, 1], [20, 0]) }],
  }));

  const pricingStyle = useAnimatedStyle(() => ({
    opacity: pricingOpacity.value,
    transform: [{ translateY: interpolate(pricingOpacity.value, [0, 1], [20, 0]) }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleClose = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [hapticEnabled]);

  const handleSelectPlan = useCallback((plan: PlanType) => {
    if (hapticEnabled) {
      Haptics.selectionAsync();
    }
    setSelectedPlan(plan);
  }, [hapticEnabled]);

  const handlePurchase = useCallback(async () => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 22 })
    );

    if (!isRevenueCatEnabled()) {
      Alert.alert('Subscriptions unavailable', 'Please try again later.');
      return;
    }

    if (!offerings?.current) {
      Alert.alert('Still loading', 'Please wait a moment and try again.');
      return;
    }

    const packageId = selectedPlan === 'yearly' ? '$rc_annual' : '$rc_monthly';
    const pkg = offerings.current.availablePackages.find(
      (p) => p.identifier === packageId
    );

    if (pkg) {
      try {
        await purchaseMutation.mutateAsync(pkg);
        router.back();
      } catch {
        // Purchase error already handled by mutation
      }
    }
  }, [hapticEnabled, offerings, selectedPlan, purchaseMutation]);

  const handleRestore = useCallback(async () => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await restoreMutation.mutateAsync();
      router.back();
    } catch {
      // Restore error already handled by mutation
    }
  }, [hapticEnabled, restoreMutation]);

  const handleContinueFree = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [hapticEnabled]);

  // Get package prices from offerings
  const monthlyPackage = offerings?.current?.availablePackages.find(
    (p) => p.identifier === '$rc_monthly'
  );
  const yearlyPackage = offerings?.current?.availablePackages.find(
    (p) => p.identifier === '$rc_annual'
  );

  const monthlyPrice = monthlyPackage?.product?.priceString ?? '--/mo';
  const yearlyPrice = yearlyPackage?.product?.priceString ?? '--/yr';

  // Calculate monthly equivalent for yearly (show only when real price is available)
  const yearlyMonthly = yearlyPackage?.product?.price
    ? yearlyPackage.product.priceString
      ? `${(yearlyPackage.product.price / 12).toLocaleString(undefined, { style: 'currency', currency: yearlyPackage.product.currencyCode ?? 'USD', maximumFractionDigits: 2 })}/mo`
      : '--/mo'
    : '--/mo';

  // Calculate savings percentage for the yearly vs monthly anchor
  const savingsPercent = (monthlyPackage?.product?.price && yearlyPackage?.product?.price)
    ? Math.round((1 - (yearlyPackage.product.price / 12) / monthlyPackage.product.price) * 100)
    : 40; // default to 40% when prices not loaded

  const isProcessing = purchaseMutation.isPending || restoreMutation.isPending;

  return (
    <View className="flex-1">
      <LinearGradient
        colors={theme.gradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          {/* Close Button */}
          <Pressable
            onPress={handleClose}
            className="absolute top-14 right-5 z-10 w-10 h-10 items-center justify-center rounded-full active:scale-95"
            style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.6)' : 'rgba(232,235,228,0.6)' }}
            accessibilityLabel="Close paywall"
            accessibilityRole="button"
          >
            <X size={20} color={theme.textSecondary} />
          </Pressable>

          <View className="flex-1 px-6 justify-between py-6">
            {/* Header */}
            <Animated.View style={headerStyle} className="items-center pt-8">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-5"
                style={{ backgroundColor: theme.accentLight }}
              >
                <Sparkles size={32} color={theme.accent} />
              </View>

              <Text
                className="font-bold text-2xl text-center tracking-tight"
                style={{ color: theme.text }}
              >
                Go deeper with{'\n'}One Thought+
              </Text>

              <Text
                className="font-sans text-base text-center mt-3 leading-relaxed"
                style={{ color: theme.textSecondary }}
              >
                Turn your daily sentences{'\n'}into lasting insight.
              </Text>
            </Animated.View>

            {/* Features */}
            <Animated.View style={featuresStyle} className="mt-6">
              <BlurView
                intensity={theme.isDark ? 40 : 60}
                tint={theme.isDark ? 'dark' : 'light'}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                }}
              >
                <View className="p-5" style={{ backgroundColor: theme.card }}>
                  <Text
                    className="font-semibold text-sm mb-4 text-center"
                    style={{ color: theme.textSecondary }}
                  >
                    Everything in One Thought+
                  </Text>
                  <View>
                    {FEATURES.map((feature) => (
                      <FeatureRow
                        key={feature.title}
                        feature={feature}
                        textColor={theme.text}
                        secondaryColor={theme.textSecondary}
                        accent={theme.accent}
                      />
                    ))}
                  </View>
                </View>
              </BlurView>
            </Animated.View>

            {/* Pricing */}
            <Animated.View style={pricingStyle} className="mt-6">
              {/* Plan Selector */}
              <View className="flex-row space-x-3">
                {/* Monthly */}
                <Pressable
                  onPress={() => handleSelectPlan('monthly')}
                  className="flex-1"
                  accessibilityLabel={`Subscribe monthly – ${monthlyPrice} per month`}
                  accessibilityRole="button"
                >
                  <BlurView
                    intensity={theme.isDark ? 40 : 60}
                    tint={theme.isDark ? 'dark' : 'light'}
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                      borderColor: selectedPlan === 'monthly' ? theme.accent : theme.cardBorder,
                    }}
                  >
                    <View className="p-4" style={{ backgroundColor: theme.card }}>
                      <Text className="font-sans text-sm mb-1" style={{ color: theme.textSecondary }}>
                        Monthly
                      </Text>
                      <Text className="font-bold text-xl" style={{ color: theme.text }}>
                        {monthlyPrice}
                      </Text>
                      <Text className="font-sans text-xs mt-1" style={{ color: theme.textMuted }}>
                        per month
                      </Text>
                    </View>
                  </BlurView>
                </Pressable>

                {/* Yearly */}
                <Pressable
                  onPress={() => handleSelectPlan('yearly')}
                  className="flex-1"
                  accessibilityLabel={`Subscribe yearly – ${yearlyPrice} per year (best value)`}
                  accessibilityRole="button"
                >
                  <View className="relative">
                    {/* Best Value Badge */}
                    <View className="absolute -top-2 z-10 left-0 right-0 items-center">
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Text className="font-semibold text-xs text-white">
                          Save {savingsPercent}%
                        </Text>
                      </View>
                    </View>

                    <BlurView
                      intensity={theme.isDark ? 40 : 60}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: selectedPlan === 'yearly' ? 2 : 1,
                        borderColor: selectedPlan === 'yearly' ? theme.accent : theme.cardBorder,
                      }}
                    >
                      <View className="p-4" style={{ backgroundColor: theme.card }}>
                        <Text className="font-sans text-sm mb-1" style={{ color: theme.textSecondary }}>
                          Yearly
                        </Text>
                        <Text className="font-bold text-xl" style={{ color: theme.text }}>
                          {yearlyPrice}
                        </Text>
                        <Text className="font-sans text-xs mt-1" style={{ color: theme.accent }}>
                          {yearlyMonthly}
                        </Text>
                      </View>
                    </BlurView>
                  </View>
                </Pressable>
              </View>

              {/* CTA Button */}
              <AnimatedPressable
                onPress={handlePurchase}
                disabled={isProcessing}
                testID="upgrade-button"
                accessibilityLabel={`Subscribe ${selectedPlan} – ${selectedPlan === 'yearly' ? yearlyPrice + ' per year' : monthlyPrice + ' per month'}`}
                accessibilityRole="button"
                style={[buttonStyle, { marginTop: 20, opacity: isProcessing ? 0.7 : 1 }]}
              >
                <View
                  style={{
                    backgroundColor: theme.accent,
                    paddingVertical: 18,
                    borderRadius: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text className="font-semibold text-base text-white">
                    {isProcessing ? 'Processing...' : 'Start free trial'}
                  </Text>
                  <Text className="text-white text-xs mt-1 opacity-80">
                    7 days free · cancel anytime
                  </Text>
                </View>
              </AnimatedPressable>

              {/* Secondary Actions */}
              <View className="flex-row items-center justify-center mt-4 space-x-4">
                <Pressable
                  onPress={handleContinueFree}
                  disabled={isProcessing}
                  accessibilityLabel="Continue with free plan"
                  accessibilityRole="button"
                >
                  <Text className="font-medium text-sm" style={{ color: theme.textSecondary }}>
                    Continue free
                  </Text>
                </Pressable>

                <Text style={{ color: theme.textMuted }}>•</Text>

                <Pressable
                  onPress={handleRestore}
                  disabled={isProcessing}
                  accessibilityLabel="Restore previous purchases"
                  accessibilityRole="button"
                >
                  <Text className="font-medium text-sm" style={{ color: theme.textSecondary }}>
                    Restore purchases
                  </Text>
                </Pressable>
              </View>

              {/* Loss-aversion nudge */}
              <Text
                className="font-sans text-xs text-center mt-3 leading-relaxed px-4"
                style={{ color: theme.textSecondary }}
              >
                After your trial, your AI reflections and photo entries will be locked — but your words are always yours to keep.
              </Text>

              {/* Legal Text */}
              <Text
                className="font-sans text-xs text-center mt-3 leading-relaxed px-4"
                style={{ color: theme.textMuted }}
              >
                Payment charged to your {Platform.OS === 'android' ? 'Google Play account' : 'Apple ID'} at trial end. Cancel anytime before renewal.
              </Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
