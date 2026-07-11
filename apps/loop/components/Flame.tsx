import { useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/useTheme';

export interface FlameProps {
  /** Streak strength, 0–1. Never fully extinguishes — floor is a live ember. */
  heat: number;
  /** Outer diameter in px. */
  size?: number;
  testID?: string;
}

// Unit tongue path (viewBox 0 0 100 140) — see DESIGN.md §4.
const TONGUE_PATH =
  'M50 138 C18 120 8 92 8 66 C8 40 30 22 42 2 C40 30 60 40 60 64 C60 40 78 44 88 72 C96 96 82 122 50 138 Z';

/**
 * Loop's signature living flame — a hand-built SVG ember whose size tracks
 * streak strength and which flickers with a gentle looped animation. Built
 * from react-native-svg + the RN Animated API so it renders identically
 * under `expo export --platform web`.
 */
export function Flame({ heat, size = 140, testID }: FlameProps) {
  const theme = useTheme();
  const gradientId = useId().replace(/[:]/g, '');
  const clampedHeat = Math.min(1, Math.max(0.12, heat));

  const [reduceMotion, setReduceMotion] = useState(false);
  const heatAnim = useRef(new Animated.Value(clampedHeat * 0.45)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const heartLick = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduceMotion(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduceMotion(value);
    });
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    // Growth/shrink transitions spring — growth feels alive, shrink settles.
    Animated.spring(heatAnim, {
      toValue: clampedHeat,
      useNativeDriver: false,
      friction: 8,
      tension: 32,
    }).start();
  }, [clampedHeat, heatAnim]);

  useEffect(() => {
    if (reduceMotion) {
      breathe.stopAnimation();
      heartLick.stopAnimation();
      breathe.setValue(0.5);
      heartLick.setValue(0.5);
      return;
    }
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    const heartLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartLick, {
          toValue: 1,
          duration: 350,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(heartLick, {
          toValue: 0,
          duration: 350,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    breatheLoop.start();
    heartLoop.start();
    return () => {
      breatheLoop.stop();
      heartLoop.stop();
    };
  }, [reduceMotion, breathe, heartLick]);

  const scale = heatAnim.interpolate({ inputRange: [0.12, 1], outputRange: [0.55, 1.15] });
  const scaleY = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.03] });
  const rotate = breathe.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] });
  const haloOpacity = heatAnim.interpolate({ inputRange: [0.12, 1], outputRange: [0.22, 0.5] });
  const innerScale = heartLick.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

  const tongueWidth = size * 0.6;
  const tongueHeight = tongueWidth * 1.4;
  const heartWidth = size * 0.28;
  const heartHeight = heartWidth * 1.4;

  return (
    <View testID={testID} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          opacity: haloOpacity,
          transform: [{ scale }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`halo-${gradientId}`} cx="50%" cy="55%" r="55%">
              <Stop offset="0%" stopColor={theme.flame.core} stopOpacity={0.55} />
              <Stop offset="100%" stopColor={theme.flame.smoke} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={52} r={48} fill={`url(#halo-${gradientId})`} />
        </Svg>
      </Animated.View>

      <Animated.View
        style={{
          width: tongueWidth,
          height: tongueHeight,
          transform: [{ scale }, { scaleY }, { rotate }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 140">
          <Defs>
            <LinearGradient id={`tongue-${gradientId}`} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0%" stopColor={theme.flame.tip} />
              <Stop offset="55%" stopColor={theme.flame.mid} />
              <Stop offset="100%" stopColor={theme.flame.core} />
            </LinearGradient>
          </Defs>
          <Path d={TONGUE_PATH} fill={`url(#tongue-${gradientId})`} />
        </Svg>
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          width: heartWidth,
          height: heartHeight,
          top: size * 0.32,
          transform: [{ scale: innerScale }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 140">
          <Path d={TONGUE_PATH} fill={theme.flame.core} />
        </Svg>
      </Animated.View>
    </View>
  );
}
