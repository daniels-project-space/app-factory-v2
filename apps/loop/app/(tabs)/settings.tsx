import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Badge, Card, ListRow, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useSettings, type ThemeOverride } from '@/store/settings';
import { useSubscription } from '@/store/subscription';

const APPEARANCE_OPTIONS: { value: ThemeOverride; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const themeOverride = useSettings((s) => s.themeOverride);
  const setThemeOverride = useSettings((s) => s.setThemeOverride);
  const { isPro, plan } = useSubscription();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll testID="settings-screen">
      <Text variant="display" style={{ marginTop: theme.spacing.lg }}>
        Settings
      </Text>

      <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xl }}>
        APPEARANCE
      </Text>
      <Card unpadded style={{ marginTop: theme.spacing.sm }}>
        {APPEARANCE_OPTIONS.map((option, i) => (
          <ListRow
            key={option.value}
            testID={`settings-appearance-${option.value}`}
            title={option.label}
            divider={i < APPEARANCE_OPTIONS.length - 1}
            onPress={() => setThemeOverride(option.value)}
            right={
              themeOverride === option.value ? (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              ) : null
            }
          />
        ))}
      </Card>

      <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xl }}>
        SUBSCRIPTION
      </Text>
      <Card unpadded style={{ marginTop: theme.spacing.sm }}>
        <ListRow
          title="Current plan"
          subtitle={isPro ? (plan === 'annual' ? 'Pro — Annual' : 'Pro — Weekly') : 'Free'}
          right={<Badge label={isPro ? 'Pro' : 'Free'} tone={isPro ? 'accent' : 'neutral'} />}
          divider
        />
        <ListRow
          testID="settings-manage-subscription"
          title={isPro ? 'Manage subscription' : 'Upgrade to Pro'}
          subtitle={isPro ? 'View or change your plan' : 'Unlock the full experience'}
          onPress={() => router.push('/paywall')}
        />
      </Card>

      <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xl }}>
        LEGAL
      </Text>
      <Card unpadded style={{ marginTop: theme.spacing.sm }}>
        {/* The factory wires these to the generated store/*.md documents. */}
        <ListRow testID="settings-privacy" title="Privacy policy" divider onPress={() => {}} />
        <ListRow testID="settings-terms" title="Terms of use" onPress={() => {}} />
      </Card>

      <View style={{ marginTop: theme.spacing.xl, alignItems: 'center' }}>
        <Text variant="caption" color="textMuted">
          Version {appVersion}
        </Text>
      </View>
    </Screen>
  );
}
