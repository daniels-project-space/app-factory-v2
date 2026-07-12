import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { EmberStrip } from '@/components/EmberStrip';
import { Flame } from '@/components/Flame';
import { Badge, Button, Card, EmptyState, ListRow, Screen, Text } from '@/components/ui';
import { ANCHORS, ANCHOR_ORDER } from '@/constants/anchors';
import { useTheme } from '@/hooks/useTheme';
import { keyMinusDays, todayKey, weekKeys } from '@/lib/date';
import { isAnchorComplete, useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';
import { useSubscription } from '@/store/subscription';

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ANCHORS_PER_DAY = 3;
const SLIP_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];
const ARCHIVE_WEEKS = 4;

type NavigatorWithShare = Navigator & {
  share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
  canShare?: (data: { files?: File[] }) => boolean;
};

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
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const anchorHabits = useHabits((s) => s.anchorHabits);
  const history = useHabits((s) => s.history);
  const flameHeat = useHabits((s) => s.flameHeat);
  const isPro = useSubscription((s) => s.isPro);
  const reflectionSeen = useSettings((s) => s.reflectionSeen);
  const markReflectionSeen = useSettings((s) => s.markReflectionSeen);
  const hardPaywallTriggered = useSettings((s) => s.hardPaywallTriggered);
  const markHardPaywallTriggered = useSettings((s) => s.markHardPaywallTriggered);
  const [toast, setToast] = useState<string | null>(null);
  const cardRef = useRef<View>(null);

  // Hard-paywall trigger: the first time a free user ever opens the weekly
  // reflection, with no active entitlement, pushes the paywall automatically
  // — the other half of "3rd anchor completion or first reflection,
  // whichever comes first" (see index.tsx for the completion-count half).
  // The shared `hardPaywallTriggered` flag keeps whichever fires first from
  // being immediately followed by the other.
  useEffect(() => {
    const firstVisit = !reflectionSeen;
    if (firstVisit) markReflectionSeen();
    if (firstVisit && !isPro && !hardPaywallTriggered) {
      markHardPaywallTriggered();
      router.push('/paywall');
    }
    // Intentionally runs once, on mount, against the persisted flags read
    // at that moment — not on every re-render as isPro/flags change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const shareLink = useMemo(() => Linking.createURL('reflect'), []);

  const pastWeeks = useMemo(
    () =>
      Array.from({ length: ARCHIVE_WEEKS }, (_, i) => {
        const anchorDay = keyMinusDays(today, 7 * (i + 1));
        const weekDays = weekKeys(anchorDay);
        const hasData = weekDays.some((d) => history[d]);
        const kept = weekDays.reduce((sum, d) => {
          const record = history[d];
          if (!record) return sum;
          return sum + ANCHOR_ORDER.filter((key) => isAnchorComplete(anchorHabits[key], record)).length;
        }, 0);
        return {
          range: weekRangeLabel(weekDays),
          hasData,
          kept,
          possible: weekDays.length * ANCHORS_PER_DAY,
        };
      }),
    [today, history, anchorHabits],
  );

  const captureCardImage = async (): Promise<string | null> => {
    try {
      return await captureRef(cardRef, {
        format: 'png',
        quality: 0.92,
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
      });
    } catch {
      return null;
    }
  };

  const shareCard = async () => {
    const imageUri = await captureCardImage();
    const fullMessage = `${shareMessage}\n${shareLink}`;

    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as NavigatorWithShare;
      if (imageUri && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
        try {
          const blob = await (await fetch(imageUri)).blob();
          const file = new File([blob], 'loop-this-week.png', { type: 'image/png' });
          if (nav.canShare({ files: [file] })) {
            await nav.share({ title: 'Loop · keep the flame', text: fullMessage, files: [file] });
            return;
          }
        } catch {
          // Fall through to a text-only share below.
        }
      }
      if (typeof nav.share === 'function') {
        try {
          await nav.share({ title: 'Loop · keep the flame', text: fullMessage });
          return;
        } catch {
          // User cancelled the share sheet — no error state needed.
        }
      }
      try {
        await navigator.clipboard.writeText(fullMessage);
        setToast('Link copied.');
      } catch {
        setToast('Link copied.');
      }
      return;
    }

    try {
      if (imageUri) {
        await Share.share({ url: imageUri, message: fullMessage });
      } else {
        await Share.share({ message: fullMessage });
      }
    } catch {
      // Native share sheet dismissal — nothing to surface.
    }
  };

  const saveImage = async () => {
    const imageUri = await captureCardImage();
    if (!imageUri) {
      setToast("Couldn't create the image. Try again.");
      return;
    }
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = imageUri;
      link.download = 'loop-this-week.png';
      link.click();
      setToast('Image saved.');
      return;
    }
    try {
      await Share.share({ url: imageUri });
    } catch {
      // Native share sheet dismissal — nothing to surface.
    }
  };

  return (
    <Screen scroll extraBottomInset={tabBarHeight} testID="reflect-screen">
      <Text variant="display" style={{ marginTop: theme.spacing.lg }}>
        This week
      </Text>
      <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
        {dateRange}
      </Text>

      {hasHistory ? (
        <View ref={cardRef} collapsable={false} style={{ marginTop: theme.spacing.xl }}>
          <Card style={{ alignItems: 'center' }} testID="reflect-card">
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
        </View>
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

      <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
        <Button
          title="Share card"
          onPress={() => void shareCard()}
          disabled={!hasHistory}
          testID="reflect-share"
          style={{ flex: 1 }}
        />
        <Button
          title="Save image"
          variant="secondary"
          onPress={() => void saveImage()}
          disabled={!hasHistory}
          testID="reflect-save-image"
          style={{ flex: 1 }}
        />
      </View>

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

      <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xxl }}>
        PAST WEEKS
      </Text>
      <Card unpadded style={{ marginTop: theme.spacing.sm }} testID="reflect-archive">
        {pastWeeks.map((week, i) => (
          <ListRow
            key={i}
            testID={`reflect-archive-week-${i}`}
            title={week.range}
            subtitle={
              isPro
                ? week.hasData
                  ? `${week.kept} / ${week.possible} anchors kept`
                  : 'No activity recorded'
                : 'Unlock to view'
            }
            divider={i < pastWeeks.length - 1}
            onPress={isPro ? undefined : () => router.push('/paywall')}
            left={
              <Ionicons
                name={isPro ? 'calendar-outline' : 'lock-closed-outline'}
                size={20}
                color={isPro ? theme.colors.primary : theme.colors.textMuted}
              />
            }
            right={isPro ? null : <Badge label="Pro" tone="accent" />}
          />
        ))}
      </Card>
    </Screen>
  );
}
