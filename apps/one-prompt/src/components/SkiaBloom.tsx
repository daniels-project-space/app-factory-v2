// Platform-specific implementation: SkiaBloom.native.tsx (native) / SkiaBloom.web.tsx (web)
// This file exists only for TypeScript resolution — Metro picks the platform file at bundle time.
import type { SharedValue } from 'react-native-reanimated';

type Props = {
  glowR: SharedValue<number>;
  accentColor: string;
  variant: 'background' | 'hero';
};

export default function SkiaBloom(_props: Props): null {
  return null;
}
