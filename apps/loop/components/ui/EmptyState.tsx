import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

export interface EmptyStateProps {
  /** Ionicons icon name, e.g. 'sparkles-outline'. */
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  /** Optional call-to-action below the message. */
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View testID={testID} style={[styles.root, { padding: theme.spacing.xxl }]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            marginBottom: theme.spacing.lg,
          },
        ]}
      >
        <Ionicons name={icon} size={28} color={theme.colors.primary} />
      </View>
      <Text variant="title" center>
        {title}
      </Text>
      {message ? (
        <Text
          variant="body"
          color="textMuted"
          center
          style={{ marginTop: theme.spacing.sm, maxWidth: 280 }}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          testID={testID ? `${testID}-action` : undefined}
          style={{ marginTop: theme.spacing.xl }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
