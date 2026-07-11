import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, Switch, View } from 'react-native';

import { Badge, Card, ListRow, Screen, Sheet, Text } from '@/components/ui';
import { ANCHORS, ANCHOR_ORDER, TIME_PRESETS, type AnchorKey } from '@/constants/anchors';
import { FLAME_EXPLAINER, LEGAL_COPY } from '@/constants/copy';
import { useTheme } from '@/hooks/useTheme';
import { useHabits } from '@/store/habits';
import { useSettings, type ThemeOverride } from '@/store/settings';
import { useSubscription } from '@/store/subscription';

const APPEARANCE_OPTIONS: { value: ThemeOverride; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type SheetKind = 'flame' | 'privacy' | 'terms' | null;

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const themeOverride = useSettings((s) => s.themeOverride);
  const setThemeOverride = useSettings((s) => s.setThemeOverride);
  const notificationsEnabled = useSettings((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettings((s) => s.setNotificationsEnabled);
  const anchorTimes = useHabits((s) => s.anchorTimes);
  const setAnchorTime = useHabits((s) => s.setAnchorTime);
  const { isPro, plan } = useSubscription();
  const [openSheet, setOpenSheet] = useState<SheetKind>(null);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const cycleAnchorTime = (anchor: AnchorKey) => {
    const options = TIME_PRESETS[anchor];
    const idx = options.indexOf(anchorTimes[anchor]);
    const next = options[(idx + 1) % options.length]!;
    setAnchorTime(anchor, next);
  };

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
        ANCHORS
      </Text>
      <Card unpadded style={{ marginTop: theme.spacing.sm }}>
        {ANCHOR_ORDER.map((key) => (
          <ListRow
            key={key}
            testID={`settings-anchor-time-${key}`}
            title={ANCHORS[key].label}
            subtitle={isPro ? 'Tap to change the window' : 'Custom times are a Pro feature'}
            divider
            onPress={isPro ? () => cycleAnchorTime(key) : () => router.push('/paywall')}
            left={
              <Ionicons
                name={isPro ? ANCHORS[key].glyph : 'lock-closed-outline'}
                size={20}
                color={isPro ? theme.colors.primary : theme.colors.textMuted}
              />
            }
            right={
              isPro ? (
                <Text variant="body" color="accent">
                  {anchorTimes[key]}
                </Text>
              ) : (
                <Badge label="Pro" tone="accent" />
              )
            }
          />
        ))}
        <ListRow
          testID="settings-notifications-toggle"
          title="Notifications"
          subtitle={
            Platform.OS === 'web'
              ? 'Not available on web — use the app on your phone'
              : 'Nudges at each anchor window, in-voice'
          }
          right={
            <Switch
              testID="settings-notifications-switch"
              value={Platform.OS === 'web' ? false : notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              disabled={Platform.OS === 'web'}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.onPrimary}
            />
          }
        />
      </Card>

      <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xl }}>
        THE FLAME
      </Text>
      <Card unpadded style={{ marginTop: theme.spacing.sm }}>
        <ListRow
          testID="settings-flame-info"
          title="How the flame works"
          onPress={() => setOpenSheet('flame')}
          left={<Ionicons name="flame-outline" size={20} color={theme.colors.primary} />}
        />
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
        <ListRow
          testID="settings-privacy"
          title="Privacy policy"
          divider
          onPress={() => setOpenSheet('privacy')}
        />
        <ListRow testID="settings-terms" title="Terms of use" onPress={() => setOpenSheet('terms')} />
      </Card>

      <View style={{ marginTop: theme.spacing.xl, alignItems: 'center' }}>
        <Text variant="caption" color="textMuted">
          Version {appVersion}
        </Text>
      </View>

      <Sheet
        visible={openSheet === 'flame'}
        onClose={() => setOpenSheet(null)}
        title={FLAME_EXPLAINER.title}
        testID="settings-flame-sheet"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
          {FLAME_EXPLAINER.paragraphs.map((p, i) => (
            <Text
              key={i}
              variant="body"
              color="textMuted"
              style={{ marginTop: i > 0 ? theme.spacing.md : 0 }}
            >
              {p}
            </Text>
          ))}
        </ScrollView>
      </Sheet>

      <Sheet
        visible={openSheet === 'privacy'}
        onClose={() => setOpenSheet(null)}
        title={LEGAL_COPY.privacy.title}
        testID="settings-privacy-sheet"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
          {LEGAL_COPY.privacy.paragraphs.map((p, i) => (
            <Text
              key={i}
              variant="body"
              color="textMuted"
              style={{ marginTop: i > 0 ? theme.spacing.md : 0 }}
            >
              {p}
            </Text>
          ))}
        </ScrollView>
      </Sheet>

      <Sheet
        visible={openSheet === 'terms'}
        onClose={() => setOpenSheet(null)}
        title={LEGAL_COPY.terms.title}
        testID="settings-terms-sheet"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
          {LEGAL_COPY.terms.paragraphs.map((p, i) => (
            <Text
              key={i}
              variant="body"
              color="textMuted"
              style={{ marginTop: i > 0 ? theme.spacing.md : 0 }}
            >
              {p}
            </Text>
          ))}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}
