import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';

import { Flame } from '@/components/Flame';
import { Badge, Card, ListRow, ProgressRing, Screen, Text } from '@/components/ui';
import { ANCHORS, ANCHOR_ORDER, HABIT_BY_ID, anchorForHour, type AnchorKey } from '@/constants/anchors';
import { FLAME_DIMMED_MESSAGE, REASSURANCE_COPY } from '@/constants/copy';
import { useTheme } from '@/hooks/useTheme';
import { todayKey } from '@/lib/date';
import { isAnchorComplete, useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';
import { useSubscription } from '@/store/subscription';

const GREETINGS: Record<AnchorKey, string> = {
  morning: 'Morning, Maya.',
  midday: 'Midday.',
  evening: 'Winding down.',
};

// Free tier: exactly one anchor accepts habits, capped at two habits in it —
// the paywall trigger everything else routes to. See DESIGN.md §3.2. Which
// anchor is "the" free one is picked dynamically (the first, in anchor
// order, that actually has habits assigned) because onboarding lets the
// user's three picks land on any anchor — a hardcoded morning-only free
// anchor could leave a free user with zero completable habits if they
// picked all three into midday/evening.
const FREE_HABIT_LIMIT = 2;

// The number of anchor-complete events (cumulative this session) that opens
// the hard paywall automatically — see DESIGN.md pricing and roadmap item 1.
const HARD_PAYWALL_ANCHOR_THRESHOLD = 3;

function reassuranceLine(fraction: number, streak: number): string {
  if (fraction >= 1) return streak >= 10 ? REASSURANCE_COPY.roaringLong : REASSURANCE_COPY.roaringShort;
  if (fraction <= 0) {
    return streak === 0 ? REASSURANCE_COPY.fresh : REASSURANCE_COPY.emptyToday;
  }
  return REASSURANCE_COPY.slipped;
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const isPro = useSubscription((s) => s.isPro);
  const anchorHabits = useHabits((s) => s.anchorHabits);
  const anchorTimes = useHabits((s) => s.anchorTimes);
  const history = useHabits((s) => s.history);
  const flameHeat = useHabits((s) => s.flameHeat);
  const streak = useHabits((s) => s.streak);
  const toggleHabit = useHabits((s) => s.toggleHabit);
  const anchorCompletionEvents = useHabits((s) => s.anchorCompletionEvents);
  const flameJustDimmed = useHabits((s) => s.flameJustDimmed);
  const acknowledgeFlameDimmed = useHabits((s) => s.acknowledgeFlameDimmed);
  const hardPaywallTriggered = useSettings((s) => s.hardPaywallTriggered);
  const markHardPaywallTriggered = useSettings((s) => s.markHardPaywallTriggered);

  const freeAnchor: AnchorKey =
    ANCHOR_ORDER.find((key) => anchorHabits[key].length > 0) ?? ANCHOR_ORDER[0]!;

  // Hard-paywall trigger: the 3rd anchor-complete event this session, for a
  // free user, pushes the paywall automatically. Fires once — the shared
  // `hardPaywallTriggered` flag also guards the first-reflection-open
  // trigger on the Reflect tab, so whichever condition is met first wins.
  useEffect(() => {
    if (!isPro && !hardPaywallTriggered && anchorCompletionEvents >= HARD_PAYWALL_ANCHOR_THRESHOLD) {
      markHardPaywallTriggered();
      router.push('/paywall');
    }
  }, [anchorCompletionEvents, isPro, hardPaywallTriggered, markHardPaywallTriggered, router]);

  const now = useMemo(() => new Date(), []);
  const activeAnchor = anchorForHour(now.getHours());
  const dateLabel = useMemo(
    () =>
      `${now.toLocaleDateString('en-US', { weekday: 'long' })} · ${now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`,
    [now],
  );

  const today = todayKey();
  const completed = history[today] ?? {};

  const allHabitIds = ANCHOR_ORDER.flatMap((key) => anchorHabits[key]);
  const keptToday = allHabitIds.filter((id) => completed[id]).length;
  const todayFraction = allHabitIds.length > 0 ? keptToday / allHabitIds.length : 0;

  const goToPaywall = () => router.push('/paywall');

  return (
    <Screen scroll testID="home-screen">
      <View style={[styles.headerRow, { marginTop: theme.spacing.lg }]}>
        <View>
          <Text variant="caption" color="textMuted">
            {dateLabel}
          </Text>
          <Text variant="display">{GREETINGS[activeAnchor]}</Text>
        </View>
        <Badge label={isPro ? 'Pro' : 'Free'} tone={isPro ? 'accent' : 'neutral'} />
      </View>

      <Card style={{ marginTop: theme.spacing.xl, alignItems: 'center' }} testID="home-flame-card">
        <Flame heat={flameHeat} size={140} testID="home-flame" />
        <Text variant="display" color="accent" style={{ marginTop: theme.spacing.sm }}>
          {streak}
        </Text>
        <Text variant="caption" color="textMuted">
          day streak
        </Text>
        <Text variant="body" color="textMuted" center style={{ marginTop: theme.spacing.sm }}>
          {reassuranceLine(todayFraction, streak)}
        </Text>
      </Card>

      {flameJustDimmed ? (
        <View
          testID="home-flame-dimmed-banner"
          style={[
            styles.dimmedBanner,
            {
              marginTop: theme.spacing.lg,
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.spacing.md,
            },
          ]}
        >
          <Ionicons name="flame-outline" size={18} color={theme.colors.accent} />
          <Text variant="caption" color="textMuted" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
            {FLAME_DIMMED_MESSAGE}
          </Text>
          <Pressable
            testID="home-flame-dimmed-dismiss"
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={acknowledgeFlameDimmed}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.lg }}>
        {ANCHOR_ORDER.map((key) => {
          const anchor = ANCHORS[key];
          const habitIds = anchorHabits[key];
          const habits = habitIds
            .map((id) => HABIT_BY_ID[id])
            .filter((h): h is NonNullable<typeof h> => !!h);
          const anchorKept = habits.filter((h) => completed[h.id]).length;
          const isActive = key === activeAnchor;
          const anchorComplete = isAnchorComplete(habitIds, completed);

          // Free tier: only the free anchor accepts habits at all.
          const anchorLocked = !isPro && key !== freeAnchor;

          return (
            <Card
              key={key}
              testID={`anchor-${key}`}
              unpadded
              style={{
                borderWidth: anchorComplete || isActive ? 1.5 : 1,
                borderColor: anchorComplete
                  ? theme.colors.success
                  : isActive
                    ? theme.colors.primary
                    : theme.colors.border,
              }}
            >
              <View style={[styles.anchorHeader, { padding: theme.spacing.lg }]}>
                <View
                  style={[
                    styles.glyphWrap,
                    {
                      backgroundColor: anchorComplete ? `${theme.colors.success}22` : theme.colors.surfaceAlt,
                      borderRadius: theme.radius.md,
                      marginRight: theme.spacing.md,
                    },
                  ]}
                >
                  <Ionicons
                    name={anchorLocked ? 'lock-closed-outline' : anchor.glyph}
                    size={22}
                    color={anchorComplete ? theme.colors.success : theme.colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text variant="title">{anchor.label}</Text>
                    {anchorComplete ? (
                      <Badge
                        label="Kept"
                        tone="success"
                        testID={`anchor-${key}-kept-badge`}
                        style={{ marginLeft: theme.spacing.sm }}
                      />
                    ) : null}
                  </View>
                  <Text variant="caption" color="textMuted">
                    {anchorTimes[key]}
                  </Text>
                </View>
                {anchorLocked ? (
                  <Badge label="Pro" tone="accent" testID={`anchor-${key}-locked-badge`} />
                ) : (
                  <ProgressRing
                    progress={habits.length > 0 ? anchorKept / habits.length : 0}
                    size={40}
                    strokeWidth={4}
                    color={anchorComplete ? theme.colors.success : undefined}
                    testID={`anchor-${key}-ring`}
                  >
                    <Text variant="caption" color="textMuted">
                      {anchorKept}/{habits.length}
                    </Text>
                  </ProgressRing>
                )}
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                {habits.map((habit, i) => {
                  const isChecked = !!completed[habit.id];
                  const habitLocked = anchorLocked || (!isPro && i >= FREE_HABIT_LIMIT);

                  if (habitLocked) {
                    return (
                      <ListRow
                        key={habit.id}
                        testID={`habit-${habit.id}`}
                        title={habit.title}
                        divider={i < habits.length - 1}
                        onPress={goToPaywall}
                        titleColor="textMuted"
                        left={<Ionicons name="lock-closed-outline" size={22} color={theme.colors.textMuted} />}
                        right={<Badge label="Pro" tone="accent" />}
                      />
                    );
                  }

                  return (
                    <ListRow
                      key={habit.id}
                      testID={`habit-${habit.id}`}
                      title={habit.title}
                      divider={i < habits.length - 1}
                      checked={isChecked}
                      onPress={() => toggleHabit(habit.id)}
                      titleColor={isChecked ? 'textMuted' : 'text'}
                      titleStyle={{ opacity: isChecked ? 0.6 : 1 }}
                      left={
                        <Ionicons
                          name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={isChecked ? theme.colors.success : theme.colors.textMuted}
                        />
                      }
                      right={null}
                    />
                  );
                })}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  dimmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anchorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glyphWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
