import { useEffect, useMemo, useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { EmberStrip } from '@/components/EmberStrip';
import { Flame } from '@/components/Flame';
import { Button, Card, EmptyState, Screen, Text } from '@/components/ui';
import { ANCHORS, ANCHOR_ORDER } from '@/constants/anchors';
import { useTheme } from '@/hooks/useTheme';
import { todayKey, weekKeys } from '@/lib/date';
import { isAnchorComplete, useHabits } from '@/store/habits';

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ANCHORS_PER_DAY = 3;
const SLIP_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];

function weekRangeLabel(days: string[]): string {
  const fmt = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  return `${fmt(days[0]!)} – ${fmt(days[6]!)}`;
}

function summaryLine(slips: number, fullDays: number): string {
  const word = SLIP_WORDS[Math.min(slips, SLIP_WORDS.length - 1)];
  if (slips === 0) return fullDays >= 3 ? 'No slips this week. The flame is roaring.' : 'Every anchor kept so far.';
  return `${word} slip${slips === 1 ? '' : 's'}. The flame held.`;
}

export default function ReflectScreen() {
  const theme = useTheme();
  const anchorHabits = useHabits((s) => s.anchorHabits);
  const history = useHabits((s) => s.history);
  const flameHeat = useHabits((s) => s.flameHeat);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const today = todayKey();
  const days = useMemo(() => weekKeys(today), [today]);

  const { keptPerDay, fullDaysCount, totalKept, totalPossible, bestAnchorLabel, bestAnchorRate } =
    useMemo(() => {
      // "Full" days are calendar days strictly before today — the current
      // day is still in progress, so it's shown on the ember strip but
      // never counted as a slip before it's actually over.
      const fullDays = days.filter((d) => d < today);
      const kept = days.map((day) => {
        if (day > today) return 0;
        const record = history[day] ?? {};
        return ANCHOR_ORDER.filter((key) => isAnchorComplete(anchorHabits[key], record)).length;
      });

      const rates = ANCHOR_ORDER.map((key) => {
        const keptDays = fullDays.filter((day) => isAnchorComplete(anchorHabits[key], history[day] ?? {})).length;
        return { key, rate: fullDays.length > 0 ? keptDays / fullDays.length : 0 };
      });
      const best = rates.reduce((a, b) => (b.rate > a.rate ? b : a), rates[0]!);

      return {
        keptPerDay: kept,
        fullDaysCount: fullDays.length,
        totalKept: kept.reduce((sum, n, i) => (days[i]! < today ? sum + n : sum), 0),
        totalPossible: fullDays.length * ANCHORS_PER_DAY,
        bestAnchorLabel: ANCHORS[best.key].label,
        bestAnchorRate: best.rate,
      };
    }, [days, today, history, anchorHabits]);

  const slips = keptPerDay.reduce(
    (count, n, i) => (days[i]! < today && n < ANCHORS_PER_DAY ? count + 1 : count),
    0,
  );

  const hasHistory = fullDaysCount > 0;
  const summary = summaryLine(slips, fullDaysCount);
  const pullQuote =
    bestAnchorRate >= 1
      ? `You showed up ${bestAnchorLabel.toLowerCase()} every single day.`
      : bestAnchorRate > 0
        ? `${bestAnchorLabel} was your steadiest anchor this week.`
        : 'Every anchor kept is a log on the fire.';

  const shareMessage = `This week on Loop: ${totalKept} / ${totalPossible} anchors kept. ${summary}`;
  const dateRange = useMemo(() => weekRangeLabel(days), [days]);

  const shareCard = async () => {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as Navigator & {
        share?: (data: { title?: string; text?: string }) => Promise<void>;
      };
      if (typeof nav.share === 'function') {
        try {
          await nav.share({ title: 'Loop · keep the flame', text: shareMessage });
        } catch {
          // User cancelled the share sheet — no error state needed.
        }
        return;
      }
      try {
        await navigator.clipboard.writeText(shareMessage);
        setToast('Link copied.');
      } catch {
        setToast('Link copied.');
      }
      return;
    }
    try {
      await Share.share({ message: shareMessage });
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

      {hasHistory ? (
        <Card style={{ marginTop: theme.spacing.xl, alignItems: 'center' }} testID="reflect-card">
          <Flame heat={flameHeat} size={120} testID="reflect-flame" />

          <Text variant="display" center style={{ marginTop: theme.spacing.lg }}>
            {totalKept} / {totalPossible} anchors kept
          </Text>
          <Text variant="body" color="textMuted" center style={{ marginTop: 4 }}>
            {summary}
          </Text>

          <View style={{ marginTop: theme.spacing.xl, alignSelf: 'stretch' }}>
            <EmberStrip
              values={keptPerDay}
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
            {pullQuote}
          </Text>

          <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xxl }}>
            Loop · keep the flame
          </Text>
        </Card>
      ) : (
        <Card style={{ marginTop: theme.spacing.xl }} testID="reflect-card">
          <EmptyState
            icon="flame-outline"
            title="Your first week is still burning."
            message="Come back after a day or two for your reflection card."
            testID="reflect-empty"
          />
        </Card>
      )}

      <Button
        title="Share card"
        onPress={() => void shareCard()}
        disabled={!hasHistory}
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
