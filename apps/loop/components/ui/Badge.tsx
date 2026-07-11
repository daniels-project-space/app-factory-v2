import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

export interface BadgeProps {
  label: string;
  tone?: 'primary' | 'accent' | 'danger' | 'success' | 'neutral';
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Small pill for statuses ("PRO", "NEW", "3 left"). */
export function Badge({ label, tone = 'neutral', testID, style }: BadgeProps) {
  const theme = useTheme();

  const toneColor =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'accent'
        ? theme.colors.accent
        : tone === 'danger'
          ? theme.colors.danger
          : tone === 'success'
            ? theme.colors.success
            : theme.colors.textMuted;

  return (
    <View
      testID={testID}
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: `${toneColor}22`,
          borderRadius: theme.radius.full,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
        },
        style,
      ]}
    >
      <Text variant="caption" style={{ color: toneColor }}>
        {label}
      </Text>
    </View>
  );
}
