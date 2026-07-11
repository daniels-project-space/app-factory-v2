import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = 200;
const CENTER = CANVAS_SIZE / 2;

type Props = {
  glowR: SharedValue<number>;
  accentColor: string;
  variant: 'background' | 'hero';
};

export default function SkiaBloom({ glowR, accentColor, variant }: Props) {
  if (variant === 'background') {
    return (
      <Canvas style={{ position: 'absolute', width: SCREEN_WIDTH, height: CANVAS_SIZE * 2, top: 0 }}>
        <Circle cx={SCREEN_WIDTH / 2} cy={120} r={glowR}>
          <RadialGradient
            c={vec(SCREEN_WIDTH / 2, 120)}
            r={220}
            colors={[`${accentColor}28`, `${accentColor}10`, `${accentColor}00`]}
          />
        </Circle>
      </Canvas>
    );
  }

  return (
    <Canvas style={{ position: 'absolute', width: CANVAS_SIZE, height: CANVAS_SIZE }}>
      <Circle cx={CENTER} cy={CENTER} r={glowR}>
        <RadialGradient
          c={vec(CENTER, CENTER)}
          r={80}
          colors={[`${accentColor}66`, `${accentColor}28`, `${accentColor}00`]}
        />
      </Circle>
    </Canvas>
  );
}
