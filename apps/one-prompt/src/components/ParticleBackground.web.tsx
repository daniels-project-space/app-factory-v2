import { useEffect, useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/lib/state/settings-store';
import { useAppTheme } from '@/lib/useAppTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    y: Math.random() * SCREEN_HEIGHT,
    size: Math.random() * 6 + 4,
    duration: Math.random() * 3000 + 2500,
    delay: Math.random() * 1500,
  }));
}

function WebParticle({ particle, color }: { particle: Particle; color: string }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(0.6, { duration: particle.duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, [particle.delay, particle.duration]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: particle.x - particle.size / 2,
          top: particle.y - particle.size / 2,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

export default function ParticleBackground() {
  const particleEnabled = useSettingsStore((s) => s.particleBackgroundEnabled);
  const theme = useAppTheme();
  const particles = useMemo(() => generateParticles(20), []);
  const color = theme.isDark ? 'rgba(255,255,255,0.4)' : `${theme.accent}60`;

  if (!particleEnabled) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
    >
      {particles.map((p) => (
        <WebParticle key={p.id} particle={p} color={color} />
      ))}
    </View>
  );
}
