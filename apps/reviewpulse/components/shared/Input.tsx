// ReviewPulse — Input Component
// Variants: text (standard), search (with icon), phone (formatted E.164)
// Teal focus ring, inline error messaging, dark/light mode aware

import React, { useState, useRef, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TextInputProps,
  ViewStyle,
  Animated,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { Search, X, Phone } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Layout,
  Radius,
  Spacing,
} from '@/constants';

type InputVariant = 'text' | 'search' | 'phone';

interface InputProps extends Omit<TextInputProps, 'style'> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  hint?: string;
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      variant = 'text',
      label,
      error,
      hint,
      value,
      onChangeText,
      onClear,
      containerStyle,
      leftIcon,
      rightIcon,
      placeholder,
      ...rest
    },
    ref
  ) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [, setIsFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
      setIsFocused(true);
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
      rest.onFocus?.({} as NativeSyntheticEvent<TextInputFocusEventData>);
    };

    const handleBlur = () => {
      setIsFocused(false);
      Animated.timing(borderAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
      rest.onBlur?.({} as NativeSyntheticEvent<TextInputFocusEventData>);
    };

    const borderColor = borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        error
          ? Colors.error[500]
          : (isDark ? DarkTheme.borderDefault : LightTheme.borderDefault),
        error
          ? Colors.error[500]
          : (isDark ? DarkTheme.borderFocus : LightTheme.borderFocus),
      ],
    });

    const height =
      variant === 'search' ? Layout.searchInputHeight : Layout.inputHeight;

    // Left icon based on variant
    const resolvedLeftIcon =
      leftIcon ??
      (variant === 'search' ? (
        <Search
          size={18}
          color={isDark ? DarkTheme.textTertiary : LightTheme.textTertiary}
          strokeWidth={2}
        />
      ) : variant === 'phone' ? (
        <Phone
          size={18}
          color={isDark ? DarkTheme.textTertiary : LightTheme.textTertiary}
          strokeWidth={2}
        />
      ) : null);

    return (
      <View style={[{ width: '100%' }, containerStyle]}>
        {/* Label */}
        {label && (
          <Text
            style={[
              Typography.label,
              {
                color: error
                  ? Colors.error[500]
                  : (isDark ? DarkTheme.textSecondary : LightTheme.textSecondary),
                marginBottom: Spacing.xs,
              },
            ]}
          >
            {label}
          </Text>
        )}

        {/* Input container */}
        <Animated.View
          style={{
            height,
            borderRadius: variant === 'search' ? Radius.full : Radius.xs,
            borderWidth: 1.5,
            borderColor,
            backgroundColor: isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.md,
            gap: Spacing.sm,
          }}
        >
          {resolvedLeftIcon}

          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={isDark ? DarkTheme.textTertiary : LightTheme.textTertiary}
            style={{
              flex: 1,
              ...Typography.body,
              color: isDark ? DarkTheme.textPrimary : LightTheme.textPrimary,
              // Remove default Android underline
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}
            keyboardType={variant === 'phone' ? 'phone-pad' : 'default'}
            autoCapitalize={variant === 'search' ? 'none' : 'words'}
            autoCorrect={variant === 'search' ? false : undefined}
            {...rest}
          />

          {/* Clear button (search / when value non-empty) */}
          {value.length > 0 && (variant === 'search' || onClear) && (
            <Pressable
              onPress={() => {
                onChangeText('');
                onClear?.();
              }}
              hitSlop={8}
            >
              <X
                size={16}
                color={isDark ? DarkTheme.textTertiary : LightTheme.textTertiary}
                strokeWidth={2}
              />
            </Pressable>
          )}

          {rightIcon && !value.length && rightIcon}
        </Animated.View>

        {/* Error message */}
        {error && (
          <Text
            style={[
              Typography.caption,
              { color: Colors.error[500], marginTop: Spacing.xs },
            ]}
          >
            {error}
          </Text>
        )}

        {/* Hint (shown when no error) */}
        {!error && hint && (
          <Text
            style={[
              Typography.caption,
              {
                color: isDark ? DarkTheme.textTertiary : LightTheme.textTertiary,
                marginTop: Spacing.xs,
              },
            ]}
          >
            {hint}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
