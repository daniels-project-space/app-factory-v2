import {
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/hooks/useTheme';

export interface CardProps {
  children: ReactNode;
  /** When provided the card becomes pressable. */
  onPress?: () => void;
  /** Remove default inner padding (e.g. for list rows). */
  unpadded?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, onPress, unpadded = false, testID, style }: CardProps) {
  const theme = useTheme();

  const baseStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: unpadded ? 0 : theme.spacing.lg,
    overflow: 'hidden',
  };

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [baseStyle, { opacity: pressed ? 0.9 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={[baseStyle, style]}>
      {children}
    </View>
  );
}
