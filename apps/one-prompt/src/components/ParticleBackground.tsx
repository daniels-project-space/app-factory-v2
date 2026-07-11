import { useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import { Canvas, Circle, RadialGradient, vec, Group } from '@shopify/react-native-skia';
import { useSettingsStore } from '@/lib/state/settings-store';
import { useAppTheme } from '@/lib/useAppTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  y: number;
  radius: number;
  duration: number;
  delay: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    y: Math.random() * SCREEN_HEIGHT,
    radius: Math.random() * 4 + 3,
    duration: Math.random() * 3000 + 2500,
    delay: Math.random() * 1500,
  }));
}

function SkiaParticle({ particle, isDark, accentColor }: { particle: Particle; isDark: boolean; accentColor: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1, { duration: particle.duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, [particle.delay, particle.duration]);

  const opacity = useDerivedValue(() => {
    const p = progress.value;
    if (p < 0.3) return p / 0.3 * 0.7;
    if (p < 0.7) return 0.7;
    return (1 - p) / 0.3 * 0.7;
  });

  const baseColor = isDark ? '#FFFFFF' : accentColor;
  const center = vec(particle.x, particle.y);

  return (
    <Group opacity={opacity}>
      <Circle cx={particle.x} cy={particle.y} r={particle.radius}>
        <RadialGradient
          c={center}
          r={particle.radius}
          colors={[`${baseColor}CC`, `${baseColor}00`]}
        />
      </Circle>
    </Group>
  );
}

export default function ParticleBackground() {
  const particleEnabled = useSettingsStore((s) => s.particleBackgroundEnabled);
  const theme = useAppTheme();
  const particles = useMemo(() => generateParticles(30), []);

  if (!particleEnabled) {
    return null;
  }

  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        pointerEvents: 'none',
      }}
    >
      {particles.map((particle) => (
        <SkiaParticle
          key={particle.id}
          particle={particle}
          isDark={theme.isDark}
          accentColor={theme.accent}
        />
      ))}
    </Canvas>
  );
}
