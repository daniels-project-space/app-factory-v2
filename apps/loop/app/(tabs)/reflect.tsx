import { useEffect, useMemo, useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { EmberStrip } from '@/components/EmberStrip';
import { Flame } from '@/components/Flame';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

// This week's demo shape, matching DESIGN.md §7's shipped copy exactly:
// "18 / 21 anchors kept", "Three slips. The flame held." Three days below
// a full 3-anchor day (the three slips), midday kept every single day.
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_ANCHORS_KEPT = [3, 3, 2, 3, 2, 3, 2];
const ANCHORS_PER_DAY = 3;

const SHARE_MESSAGE =
  'This week on Loop: 18 / 21 anchors kept. Three slips. The flame held.';

function weekRangeLabel(): string {
  const now = new Date();
  const day = now.getDay();
  // Week starts Monday.
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export default function ReflectScreen() {
  const theme = useTheme();
  const totalKept = WEEK_ANCHORS_KEPT.reduce((sum, n) => sum + n, 0);
  const totalPossible = WEEK_ANCHORS_KEPT.length * ANCHORS_PER_DAY;
  const weekEndHeat = Math.min(1, Math.max(0.12, totalKept / totalPossible + 0.1));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const dateRange = useMemo(weekRangeLabel, []);

  const shareCard = async () => {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as Navigator & {
        share?: (data: { title?: string; text?: string }) => Promise<void>;
      };
      if (typeof nav.share === 'function') {
        try {
          await nav.share({ title: 'Loop · keep the flame', text: SHARE_MESSAGE });
        } catch {
          // User cancelled the share sheet — no error state needed.
        }
        return;
      }
      try {
        await navigator.clipboard.writeText(SHARE_MESSAGE);
        setToast('Link copied.');
      } catch {
        setToast('Link copied.');
      }
      return;
    }
    try {
      await Share.share({ message: SHARE_MESSAGE });
    } catch {
      // Native share sheet dismissal — nothing to surface.
    }
  };

  return (
    <Screen scroll testID="reflect-screen">
      <Text variant="display" style={{ marginTop: theme.spacing.lg }}>
        This week
      </Text>
      <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
        {dateRange}
      </Text>

      <Card style={{ marginTop: theme.spacing.xl, alignItems: 'center' }} testID="reflect-card">
        <Flame heat={weekEndHeat} size={120} testID="reflect-flame" />

        <Text variant="display" center style={{ marginTop: theme.spacing.lg }}>
          {totalKept} / {totalPossible} anchors kept
        </Text>
        <Text variant="body" color="textMuted" center style={{ marginTop: 4 }}>
          Three slips. The flame held.
        </Text>

        <View style={{ marginTop: theme.spacing.xl, alignSelf: 'stretch' }}>
          <EmberStrip
            values={WEEK_ANCHORS_KEPT}
            labels={WEEK_LABELS}
            max={ANCHORS_PER_DAY}
            testID="reflect-ember-strip"
          />
        </View>

        <Text
          variant="body"
          color="accent"
          center
          style={{ marginTop: theme.spacing.xl, maxWidth: 260 }}
        >
          You showed up midday every single day.
        </Text>

        <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xxl }}>
          Loop · keep the flame
        </Text>
      </Card>

      <Button
        title="Share card"
        onPress={() => void shareCard()}
        testID="reflect-share"
        style={{ marginTop: theme.spacing.xl }}
      />

      {toast ? (
        <View
          testID="reflect-toast"
          style={{
            marginTop: theme.spacing.md,
            alignSelf: 'center',
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radius.full,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
          }}
        >
          <Text variant="caption">{toast}</Text>
        </View>
      ) : null}
    </Screen>
  );
}
