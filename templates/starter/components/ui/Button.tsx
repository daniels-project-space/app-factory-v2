import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

export interface ButtonProps {
  /** Button label. */
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Shows a spinner and blocks presses. */
  loading?: boolean;
  disabled?: boolean;
  /** Stable id for e2e tests — every interactive element gets one. */
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const blocked = disabled || loading;

  const containerStyle: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: theme.colors.primary }
      : variant === 'secondary'
        ? {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }
        : { backgroundColor: 'transparent' };

  const labelColor = variant === 'primary' ? 'onPrimary' : 'primary';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      onPress={blocked ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: theme.radius.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          opacity: blocked ? 0.55 : pressed ? 0.85 : 1,
        },
        containerStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.colors.onPrimary : theme.colors.primary}
        />
      ) : (
        <Text variant="body" color={labelColor} style={styles.label}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 48,
  },
  label: {
    fontWeight: '700',
  },
});
