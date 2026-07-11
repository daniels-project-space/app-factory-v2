import { View, Text, AccessibilityInfo } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Lock, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import type { RevealDelay } from '@/lib/state/journal-store';

interface EnergyBubbleSendProps {
  isAnimating: boolean;
  onAnimationComplete: () => void;
  revealDelay: RevealDelay;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ANIMATION_DURATION = 2000; // 2 seconds total

export default function EnergyBubbleSend({
  isAnimating,
  onAnimationComplete,
  revealDelay,
}: EnergyBubbleSendProps) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showSentState, setShowSentState] = useState(false);

  // Check reduce motion accessibility setting
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Animation values
  const cardCompression = useSharedValue(1);
  const bubbleScale = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);
  const bubbleFillProgress = useSharedValue(0);
  const bubblePulse = useSharedValue(1);
  const bubbleLift = useSharedValue(0);
  const shimmerOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const sentStateOpacity = useSharedValue(0);

  const getRevealText = useCallback(() => {
    switch (revealDelay) {
      case 'instant':
        return 'Available now';
      case 'tomorrow':
        return 'Available in 24 hours';
      case 'week':
        return 'Available in 7 days';
      case 'month':
        return 'Available in 30 days';
      default:
        return 'Available tomorrow';
    }
  }, [revealDelay]);

  const triggerHaptic = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [hapticEnabled]);

  const triggerSuccessHaptic = useCallback(() => {
    if (hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [hapticEnabled]);

  const handleShowSentState = useCallback(() => {
    setShowSentState(true);
  }, []);

  const handleComplete = useCallback(() => {
    onAnimationComplete();
  }, [onAnimationComplete]);

  useEffect(() => {
    if (!isAnimating) {
      // Reset all values
      cardCompression.value = 1;
      bubbleScale.value = 0;
      bubbleOpacity.value = 0;
      bubbleFillProgress.value = 0;
      bubblePulse.value = 1;
      bubbleLift.value = 0;
      shimmerOpacity.value = 0;
      contentOpacity.value = 1;
      sentStateOpacity.value = 0;
      setShowSentState(false);
      return;
    }

    if (reduceMotion) {
      // Simple fade animation for reduce motion
      runOnJS(triggerHaptic)();
      contentOpacity.value = withTiming(0, { duration: 300 });
      sentStateOpacity.value = withDelay(
        300,
        withTiming(1, { duration: 300 }, () => {
          runOnJS(triggerSuccessHaptic)();
          runOnJS(handleShowSentState)();
          runOnJS(handleComplete)();
        })
      );
      return;
    }

    // Full animation sequence
    // Step 1: Card compression + haptic
    runOnJS(triggerHaptic)();
    cardCompression.value = withSequence(
      withTiming(0.97, { duration: 150 }),
      withSpring(1, { damping: 22 })
    );

    // Step 2: Bubble appears and starts charging
    bubbleScale.value = withDelay(
      200,
      withSpring(1, { damping: 22 })
    );
    bubbleOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 200 })
    );

    // Step 3: Fill progress (charging effect)
    bubbleFillProgress.value = withDelay(
      300,
      withTiming(1, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1) })
    );

    // Step 4: Gentle pulse while charging
    const startPulse = () => {
      bubblePulse.value = withSequence(
        withTiming(1.05, { duration: 400 }),
        withTiming(0.98, { duration: 400 }),
        withTiming(1.02, { duration: 300 })
      );
    };
    setTimeout(startPulse, 400);

    // Step 5: Lift and dissolve
    bubbleLift.value = withDelay(
      1500,
      withTiming(-30, { duration: 300, easing: Easing.out(Easing.ease) })
    );

    // Step 6: Shimmer effect
    shimmerOpacity.value = withDelay(
      1600,
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 250 })
      )
    );

    // Step 7: Bubble fades out
    bubbleOpacity.value = withDelay(
      1650,
      withTiming(0, { duration: 200 })
    );

    // Step 8: Content fades out
    contentOpacity.value = withDelay(
      1700,
      withTiming(0, { duration: 200 })
    );

    // Step 9: Sent state appears
    sentStateOpacity.value = withDelay(
      1850,
      withTiming(1, { duration: 200 }, () => {
        runOnJS(triggerSuccessHaptic)();
        runOnJS(handleShowSentState)();
        runOnJS(handleComplete)();
      })
    );
  }, [isAnimating, reduceMotion]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardCompression.value }],
  }));

  const bubbleContainerStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [
      { scale: bubbleScale.value * bubblePulse.value },
      { translateY: bubbleLift.value },
    ],
  }));

  const bubbleFillStyle = useAnimatedStyle(() => ({
    height: `${bubbleFillProgress.value * 100}%`,
    backgroundColor: interpolateColor(
      bubbleFillProgress.value,
      [0, 0.5, 1],
      [theme.accentLight, theme.accent, theme.accent]
    ),
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const sentStateAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sentStateOpacity.value,
  }));

  if (!isAnimating && !showSentState) {
    return null;
  }

  return (
    <View className="absolute inset-0 items-center justify-center">
      {/* Energy Bubble */}
      {isAnimating && !showSentState && (
        <Animated.View
          style={[
            bubbleContainerStyle,
            {
              position: 'absolute',
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: theme.accent,
            },
          ]}
        >
          {/* Fill progress */}
          <Animated.View
            style={[
              bubbleFillStyle,
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                borderRadius: 40,
              },
            ]}
          />

          {/* Icon */}
          <Send size={28} color={theme.accent} />

          {/* Shimmer effect */}
          <Animated.View
            style={[
              shimmerStyle,
              {
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(255,255,255,0.6)',
                borderRadius: 40,
              },
            ]}
          />
        </Animated.View>
      )}

      {/* Sent State */}
      <Animated.View
        style={[
          sentStateAnimatedStyle,
          {
            alignItems: 'center',
            paddingVertical: 32,
          },
        ]}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: theme.accentLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Lock size={28} color={theme.accent} />
        </View>
        <Text
          className="font-semibold text-xl mb-2"
          style={{ color: theme.text }}
        >
          Sent.
        </Text>
        <Text
          className="font-sans text-base text-center"
          style={{ color: theme.textSecondary }}
        >
          {getRevealText()}
        </Text>
      </Animated.View>
    </View>
  );
}
