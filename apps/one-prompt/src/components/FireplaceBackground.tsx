import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Blue fire color palette
const EMBER_COLORS = [
  '#4FB0E5', // Bright blue
  '#3A9BD9', // Medium blue
  '#2D88CC', // Deep blue
  '#60C0F5', // Light blue
  '#1E6FB0', // Dark blue
  '#80D0FF', // Very light blue glow
];

interface Ember {
  id: number;
  startX: number;
  size: number;
  duration: number;
  delay: number;
  maxHeight: number;
  swayAmount: number;
  colorIndex: number;
}

// Generate embers that rise from the bottom
const generateEmbers = (count: number): Ember[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    startX: Math.random() * SCREEN_WIDTH, // Random horizontal position
    size: Math.random() * 6 + 3, // 3-9px
    duration: Math.random() * 8000 + 10000, // 10-18 seconds for slow rise
    delay: Math.random() * 6000, // Stagger start
    maxHeight: Math.random() * SCREEN_HEIGHT * 0.8 + SCREEN_HEIGHT * 0.5, // Rise 50-130% of screen
    swayAmount: Math.random() * 40 + 20, // 20-60px horizontal sway
    colorIndex: Math.floor(Math.random() * EMBER_COLORS.length),
  }));
};

interface FlameFlicker {
  id: number;
  x: number;
  width: number;
  height: number;
  delay: number;
}

// Generate flame flicker elements
const generateFlames = (count: number): FlameFlicker[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (SCREEN_WIDTH / count) * i + Math.random() * 20,
    width: Math.random() * 40 + 30,
    height: Math.random() * 80 + 60,
    delay: Math.random() * 1000,
  }));
};

function SingleEmber({ ember }: { ember: Ember }) {
  const progress = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    // Main rising animation
    progress.value = withDelay(
      ember.delay,
      withRepeat(
        withTiming(1, {
          duration: ember.duration,
          easing: Easing.inOut(Easing.sin),
        }),
        -1, // Infinite
        false // Don't reverse
      )
    );

    // Glow pulsing
    glow.value = withDelay(
      ember.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [ember.delay, ember.duration]);

  const animatedStyle = useAnimatedStyle(() => {
    // Rise from bottom
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [0, -ember.maxHeight]
    );

    // Gentle horizontal sway
    const swayProgress = (progress.value * 4) % 1; // Multiple sways during rise
    const translateX = interpolate(
      swayProgress,
      [0, 0.25, 0.5, 0.75, 1],
      [0, ember.swayAmount / 2, 0, -ember.swayAmount / 2, 0]
    );

    // Fade in at bottom, stay visible, fade out at top
    const opacity = interpolate(
      progress.value,
      [0, 0.05, 0.7, 1],
      [0, 0.8, 0.6, 0]
    );

    // Shrink as it rises
    const scale = interpolate(
      progress.value,
      [0, 0.5, 1],
      [1, 0.8, 0.4]
    );

    // Glow effect
    const glowOpacity = interpolate(glow.value, [0, 1], [0.3, 0.7]);

    return {
      opacity: opacity * glowOpacity,
      transform: [
        { translateY },
        { translateX },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: ember.startX,
          bottom: 20,
          width: ember.size,
          height: ember.size,
          borderRadius: ember.size / 2,
          backgroundColor: EMBER_COLORS[ember.colorIndex],
          shadowColor: EMBER_COLORS[ember.colorIndex],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: ember.size * 2,
        },
        animatedStyle,
      ]}
    />
  );
}

function FlameElement({ flame }: { flame: FlameFlicker }) {
  const flicker = useSharedValue(0);

  useEffect(() => {
    flicker.value = withDelay(
      flame.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 + Math.random() * 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.4, { duration: 300 + Math.random() * 200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.8, { duration: 350 + Math.random() * 250, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [flame.delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(flicker.value, [0, 1], [0.3, 0.7]);
    const scaleY = interpolate(flicker.value, [0, 0.5, 1], [0.8, 1.1, 0.95]);
    const scaleX = interpolate(flicker.value, [0, 1], [0.9, 1.05]);

    return {
      opacity,
      transform: [
        { scaleY },
        { scaleX },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: flame.x,
          bottom: 0,
          width: flame.width,
          height: flame.height,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(79, 176, 229, 0.4)', 'rgba(58, 155, 217, 0.6)', 'rgba(45, 136, 204, 0.3)']}
        locations={[0, 0.3, 0.6, 1]}
        style={{
          flex: 1,
          borderTopLeftRadius: flame.width / 2,
          borderTopRightRadius: flame.width / 2,
        }}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
      />
    </Animated.View>
  );
}

export default function FireplaceBackground() {
  const fireplaceEnabled = useSettingsStore((s) => s.fireplaceBackgroundEnabled);

  // Generate embers and flames once
  const embers = useMemo(() => generateEmbers(15), []);
  const flames = useMemo(() => generateFlames(8), []);

  if (!fireplaceEnabled) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base glow at bottom */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(79, 176, 229, 0.15)', 'rgba(58, 155, 217, 0.25)']}
        locations={[0, 0.5, 0.8, 1]}
        style={[StyleSheet.absoluteFill]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Flame elements */}
      {flames.map((flame) => (
        <FlameElement key={flame.id} flame={flame} />
      ))}

      {/* Rising embers */}
      {embers.map((ember) => (
        <SingleEmber key={ember.id} ember={ember} />
      ))}
    </View>
  );
}
