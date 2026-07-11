import { useEffect, useMemo, useRef } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PulseParticleData {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  duration: number;
}

// Generate particles radiating outward from center
const generatePulseParticles = (count: number): PulseParticleData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * Math.PI * 2 + Math.random() * 0.3, // Evenly distributed with some randomness
    distance: Math.random() * 150 + 100, // 100-250px travel distance
    size: Math.random() * 4 + 2, // 2-6px
    delay: Math.random() * 200, // 0-200ms stagger
    duration: Math.random() * 600 + 800, // 800-1400ms
  }));
};

function PulseParticle({
  particle,
  centerX,
  centerY,
  trigger,
  onComplete,
}: {
  particle: PulseParticleData;
  centerX: number;
  centerY: number;
  trigger: boolean;
  onComplete?: () => void;
}) {
  const theme = useAppTheme();
  const progress = useSharedValue(0);
  const hasReported = useRef(false);

  useEffect(() => {
    if (trigger) {
      hasReported.current = false;
      progress.value = 0;
      progress.value = withDelay(
        particle.delay,
        withTiming(1, {
          duration: particle.duration,
          easing: Easing.out(Easing.cubic),
        }, () => {
          if (!hasReported.current && particle.id === 0 && onComplete) {
            hasReported.current = true;
            runOnJS(onComplete)();
          }
        })
      );
    }
  }, [trigger, particle.delay, particle.duration, particle.id, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [0, Math.cos(particle.angle) * particle.distance]
    );

    const translateY = interpolate(
      progress.value,
      [0, 1],
      [0, Math.sin(particle.angle) * particle.distance]
    );

    const opacity = interpolate(
      progress.value,
      [0, 0.1, 0.5, 1],
      [0, 0.8, 0.5, 0]
    );

    const scale = interpolate(
      progress.value,
      [0, 0.3, 1],
      [0.5, 1.2, 0.3]
    );

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: centerX,
          top: centerY,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: theme.accent,
        },
        animatedStyle,
      ]}
    />
  );
}

interface ParticlePulseProps {
  trigger: boolean;
  centerX?: number;
  centerY?: number;
  onComplete?: () => void;
}

export default function ParticlePulse({
  trigger,
  centerX = SCREEN_WIDTH / 2,
  centerY = SCREEN_HEIGHT / 2,
  onComplete,
}: ParticlePulseProps) {
  // Generate particles once
  const particles = useMemo(() => generatePulseParticles(24), []);

  if (!trigger) {
    return null;
  }

  return (
    <>
      {particles.map((particle) => (
        <PulseParticle
          key={particle.id}
          particle={particle}
          centerX={centerX}
          centerY={centerY}
          trigger={trigger}
          onComplete={particle.id === 0 ? onComplete : undefined}
        />
      ))}
    </>
  );
}
