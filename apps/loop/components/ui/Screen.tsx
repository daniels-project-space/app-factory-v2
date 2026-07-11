import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /** Apply default horizontal padding. Defaults to true. */
  padded?: boolean;
  /** Safe-area edges to respect. Defaults to top only (tab bar handles bottom). */
  edges?: Edge[];
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** SafeArea + themed background wrapper — the outermost element of every screen. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  testID,
  style,
}: ScreenProps) {
  const theme = useTheme();
  const padding = padded ? { paddingHorizontal: theme.spacing.lg } : null;

  return (
    <SafeAreaView
      testID={testID}
      edges={edges}
      style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}
    >
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[padding, { paddingBottom: theme.spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
