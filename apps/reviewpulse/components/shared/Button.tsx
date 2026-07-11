// ReviewPulse — Button Component
// Variants: primary, secondary, ghost, destructive
// Barlow Condensed uppercase labels, spring press animation, haptic feedback

import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'default' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  style,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  testID,
}: ButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();

    if (variant === 'destructive') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 5,
    }).start();
  };

  const height =
    size === 'sm' ? Layout.buttonHeightSm : size === 'lg' ? 64 : Layout.buttonHeight;

  const containerStyle: ViewStyle = {
    height,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: size === 'sm' ? Spacing.md : Spacing.lg,
    alignSelf: fullWidth ? undefined : 'auto',
    ...(fullWidth && { width: '100%' }),
    ...(variant === 'primary' && {
      backgroundColor: disabled ? Colors.primary[300] : Colors.primary[500],
    }),
    ...(variant === 'secondary' && {
      backgroundColor: isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface,
      borderWidth: 1.5,
      borderColor: isDark ? DarkTheme.borderStrong : LightTheme.borderDefault,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: 'transparent',
    }),
    ...(variant === 'destructive' && {
      backgroundColor: disabled ? Colors.error[300] : Colors.error[500],
    }),
    ...((disabled || loading) && { opacity: 0.6 }),
  };

  const textStyle: TextStyle = {
    ...(size === 'sm' ? Typography.buttonSm : Typography.button),
    ...(variant === 'primary' && { color: '#FFFFFF' }),
    ...(variant === 'secondary' && {
      color: isDark ? DarkTheme.textPrimary : LightTheme.textPrimary,
    }),
    ...(variant === 'ghost' && { color: Colors.primary[isDark ? 300 : 500] }),
    ...(variant === 'destructive' && { color: '#FFFFFF' }),
  };

  const spinnerColor =
    variant === 'primary' || variant === 'destructive'
      ? '#FFFFFF'
      : Colors.primary[500];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { width: '100%' }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={containerStyle}
        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
      >
        {loading ? (
          <ActivityIndicator color={spinnerColor} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            <Text style={textStyle}>{label}</Text>
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
