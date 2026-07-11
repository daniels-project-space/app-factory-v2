import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@/lib/state/settings-store';
import { useAppTheme } from '@/lib/useAppTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// Edge Glow Lines - subtle animated lines along screen edges
// ============================================================================

interface EdgeLine {
  id: number;
  side: 'top' | 'bottom' | 'left' | 'right';
  length: number;
  thickness: number;
  duration: number;
  delay: number;
}

const generateEdgeLines = (count: number): EdgeLine[] => {
  const sides: EdgeLine['side'][] = ['top', 'bottom', 'left', 'right'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    side: sides[i % 4],
    length: Math.random() * 0.25 + 0.1,
    thickness: Math.random() * 2 + 1,
    duration: Math.random() * 6000 + 8000,
    delay: Math.random() * 4000,
  }));
};

function EdgeGlowLine({ line, accentColor }: { line: EdgeLine; accentColor: string }) {
  const travel = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    travel.value = withDelay(
      line.delay,
      withRepeat(
        withTiming(1, { duration: line.duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );

    pulse.value = withDelay(
      line.delay + 500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [line.delay, line.duration]);

  const isHorizontal = line.side === 'top' || line.side === 'bottom';
  const edgeLength = isHorizontal ? SCREEN_WIDTH : SCREEN_HEIGHT;

  const animatedStyle = useAnimatedStyle(() => {
    const travelDistance = edgeLength * (1 - line.length);
    const translateAmount = interpolate(travel.value, [0, 1], [0, travelDistance]);
    const opacity = interpolate(pulse.value, [0, 1], [0.08, 0.35]);

    if (isHorizontal) {
      return { opacity, transform: [{ translateX: translateAmount }] };
    }
    return { opacity, transform: [{ translateY: translateAmount }] };
  });

  const positionStyle: Record<string, number> = {};
  if (line.side === 'top') { positionStyle.top = 0; positionStyle.left = 0; }
  else if (line.side === 'bottom') { positionStyle.bottom = 0; positionStyle.left = 0; }
  else if (line.side === 'left') { positionStyle.left = 0; positionStyle.top = 0; }
  else { positionStyle.right = 0; positionStyle.top = 0; }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          ...positionStyle,
          width: isHorizontal ? edgeLength * line.length : line.thickness,
          height: isHorizontal ? line.thickness : edgeLength * line.length,
          borderRadius: line.thickness / 2,
          backgroundColor: accentColor,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
        },
        animatedStyle,
      ]}
    />
  );
}

// ============================================================================
// Glow Orb - slowly drifting soft light source
// ============================================================================

interface GlowOrb {
  id: number;
  startX: number;
  startY: number;
  radius: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
}

const generateOrbs = (count: number): GlowOrb[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    startX: Math.random() * SCREEN_WIDTH * 0.6 + SCREEN_WIDTH * 0.2,
    startY: Math.random() * SCREEN_HEIGHT * 0.6 + SCREEN_HEIGHT * 0.2,
    radius: Math.random() * 80 + 60,
    duration: Math.random() * 10000 + 12000,
    delay: Math.random() * 5000,
    driftX: (Math.random() - 0.5) * 120,
    driftY: (Math.random() - 0.5) * 120,
  }));
};

function GlowOrbElement({ orb, accentColor }: { orb: GlowOrb; accentColor: string }) {
  const drift = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    drift.value = withDelay(
      orb.delay,
      withRepeat(
        withTiming(1, { duration: orb.duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );

    breathe.value = withDelay(
      orb.delay + 1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [orb.delay, orb.duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(drift.value, [0, 1], [0, orb.driftX]);
    const translateY = interpolate(drift.value, [0, 1], [0, orb.driftY]);
    const scale = interpolate(breathe.value, [0, 1], [0.8, 1.2]);
    const opacity = interpolate(breathe.value, [0, 1], [0.04, 0.12]);

    return {
      opacity,
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: orb.startX - orb.radius,
          top: orb.startY - orb.radius,
          width: orb.radius * 2,
          height: orb.radius * 2,
          borderRadius: orb.radius,
          backgroundColor: accentColor,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: orb.radius * 0.8,
        },
        animatedStyle,
      ]}
    />
  );
}

// ============================================================================
// Ambient Gradient Shift - slowly shifting background gradient overlay
// ============================================================================

function AmbientGradient({ accentColor }: { accentColor: string }) {
  const shift = useSharedValue(0);

  useEffect(() => {
    shift.value = withRepeat(
      withTiming(1, { duration: 20000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shift.value, [0, 0.5, 1], [0.06, 0.12, 0.06]);
    return { opacity };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <LinearGradient
        colors={['transparent', accentColor + '15', accentColor + '08', 'transparent']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

// ============================================================================
// Main NeonBackground Component
// ============================================================================

export default function NeonBackground() {
  const neonEnabled = useSettingsStore((s) => s.neonEffectEnabled);
  const theme = useAppTheme();

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const edgeLines = useMemo(() => generateEdgeLines(12), []);
  const orbs = useMemo(() => generateOrbs(4), []);

  if (!neonEnabled || reduceMotion) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <AmbientGradient accentColor={theme.accent} />

      {orbs.map((orb) => (
        <GlowOrbElement key={orb.id} orb={orb} accentColor={theme.accent} />
      ))}

      {edgeLines.map((line) => (
        <EdgeGlowLine key={line.id} line={line} accentColor={theme.accent} />
      ))}
    </View>
  );
}
