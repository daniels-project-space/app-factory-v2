import { useState } from 'react';
import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Optional label rendered above the field. */
  label?: string;
  /** Error message; also switches the outline to the danger color. */
  error?: string;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({ label, error, testID, containerStyle, ...rest }: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="caption" color="textMuted" style={{ marginBottom: theme.spacing.xs }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        testID={testID}
        placeholderTextColor={theme.colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor,
          color: theme.colors.text,
          fontFamily: theme.fonts.body,
          fontSize: theme.typeScale.body.fontSize,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          minHeight: 48,
        }}
      />
      {error ? (
        <Text variant="caption" color="danger" style={{ marginTop: theme.spacing.xs }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
