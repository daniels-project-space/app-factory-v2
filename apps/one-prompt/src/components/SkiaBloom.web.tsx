import { useEffect, useRef } from 'react';
import { View } from 'react-native';

type Props = {
  glowR: { value: number };
  accentColor: string;
  variant: 'background' | 'hero';
};

/**
 * Web-platform bloom effect that mirrors the native Skia radial-gradient bloom.
 * Uses an absolutely-positioned <canvas> element painted with a radial gradient so
 * the glow renders correctly in the Expo web preview and App Store screenshots.
 */
export default function SkiaBloom({ glowR, accentColor, variant }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const size = variant === 'hero' ? 240 : 320;
  const alpha = variant === 'hero' ? 0.55 : 0.35;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const r = Math.max(size * 0.3, glowR.value || size * 0.4);
      const cx = size / 2;
      const cy = size / 2;

      ctx.clearRect(0, 0, size, size);

      // Outer soft halo
      const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      outerGrad.addColorStop(0, `${accentColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
      outerGrad.addColorStop(0.5, `${accentColor}${Math.round(alpha * 0.35 * 255).toString(16).padStart(2, '0')}`);
      outerGrad.addColorStop(1, `${accentColor}00`);
      ctx.fillStyle = outerGrad;
      ctx.fillRect(0, 0, size, size);

      // Inner bright core
      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.35);
      innerGrad.addColorStop(0, `${accentColor}CC`);
      innerGrad.addColorStop(1, `${accentColor}00`);
      ctx.fillStyle = innerGrad;
      ctx.fillRect(0, 0, size, size);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [accentColor, alpha, size, glowR]);

  return (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        // @ts-ignore — web-only transform
        transform: [{ translateX: -size / 2 }, { translateY: -size / 2 }],
        pointerEvents: 'none',
      }}
    >
      {/* @ts-ignore — canvas is valid on web */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
    </View>
  );
}
