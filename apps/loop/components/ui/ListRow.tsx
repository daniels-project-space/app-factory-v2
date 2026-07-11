import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View, StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { Text, type TextProps } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Leading element, e.g. an icon. */
  left?: ReactNode;
  /** Trailing element; defaults to a chevron when `onPress` is set. */
  right?: ReactNode;
  onPress?: () => void;
  /** Draw a hairline under the row (for stacked lists). */
  divider?: boolean;
  /** Override the title's semantic color, e.g. to mute a "kept" habit. */
  titleColor?: TextProps['color'];
  /** Extra style merged onto the title, e.g. to soften opacity when kept. */
  titleStyle?: StyleProp<TextStyle>;
  /** Dims the row and blocks presses, e.g. at a selection cap. */
  disabled?: boolean;
  /** Marks the row as toggled-on for accessibility (checkboxes, pickers). */
  checked?: boolean;
  testID?: string;
}

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  divider = false,
  titleColor = 'text',
  titleStyle,
  disabled = false,
  checked,
  testID,
}: ListRowProps) {
  const theme = useTheme();

  const trailing =
    right !== undefined ? (
      right
    ) : onPress ? (
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    ) : null;

  const content = (
    <>
      {left ? <View style={{ marginRight: theme.spacing.md }}>{left}</View> : null}
      <View style={styles.textBlock}>
        <Text variant="body" color={titleColor} style={titleStyle}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={{ marginLeft: theme.spacing.md }}>{trailing}</View> : null}
    </>
  );

  const rowStyle = {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
    borderBottomColor: theme.colors.border,
  };

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled, checked }}
        onPress={disabled ? undefined : onPress}
        style={({ pressed }) => [
          styles.row,
          rowStyle,
          { opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={[styles.row, rowStyle]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  textBlock: {
    flex: 1,
  },
});
