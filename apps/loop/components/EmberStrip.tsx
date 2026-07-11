import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

export interface EmberStripProps {
  /** Anchors kept per day, Monday first. Each value 0–3. */
  values: number[];
  /** Day-initial labels under each bar, same length as `values`. */
  labels: string[];
  max?: number;
  testID?: string;
}

/**
 * The flame's fallback form for the weekly reflection card: seven plain
 * `View` bars colored along the same smoke → tip → core ramp as the flame,
 * so it reads as "the flame, over seven days" without SVG — trivially
 * screenshot-safe. See DESIGN.md §4 fallback technique.
 */
export function EmberStrip({ values, labels, max = 3, testID }: EmberStripProps) {
  const theme = useTheme();
  const barHeight = 96;
  const minHeight = 10;

  return (
    <View testID={testID} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      {values.map((value, i) => {
        const ratio = Math.max(0, Math.min(1, value / max));
        const color =
          ratio >= 0.85 ? theme.flame.core : ratio >= 0.5 ? theme.flame.mid : theme.flame.smoke;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ height: barHeight, width: '100%', justifyContent: 'flex-end' }}>
              <View
                testID={`reflect-day-${i}`}
                style={{
                  width: '100%',
                  height: Math.max(minHeight, barHeight * ratio),
                  backgroundColor: color,
                  borderTopLeftRadius: theme.radius.sm,
                  borderTopRightRadius: theme.radius.sm,
                }}
              />
            </View>
            <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xs }}>
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
