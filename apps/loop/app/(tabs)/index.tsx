import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { Flame } from '@/components/Flame';
import { Badge, Card, ListRow, ProgressRing, Screen, Text } from '@/components/ui';
import { ANCHORS, ANCHOR_ORDER, HABIT_BY_ID, anchorForHour, type AnchorKey } from '@/constants/anchors';
import { useTheme } from '@/hooks/useTheme';
import { todayKey } from '@/lib/date';
import { isAnchorComplete, useHabits } from '@/store/habits';
import { useSubscription } from '@/store/subscription';

const GREETINGS: Record<AnchorKey, string> = {
  morning: 'Morning, Maya.',
  midday: 'Midday.',
  evening: 'Winding down.',
};

// Free tier: exactly one anchor accepts habits, capped at two habits in it —
// the paywall trigger everything else routes to. See DESIGN.md §3.2.
const FREE_ANCHOR: AnchorKey = ANCHOR_ORDER[0]!;
const FREE_HABIT_LIMIT = 2;

function reassuranceLine(fraction: number, streak: number): string {
  if (fraction >= 1) return streak >= 10 ? 'Roaring. Don’t look down.' : 'Small fire, real fire.';
  if (fraction <= 0) {
    return streak === 0 ? 'Day one. This is the hard part — you’re past it.' : 'Nothing kept yet. Start with the easy one.';
  }
  return 'A little smaller today. It comes back.';
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

          // Free tier: only the first anchor accepts habits at all.
          const anchorLocked = !isPro && key !== FREE_ANCHOR;

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
