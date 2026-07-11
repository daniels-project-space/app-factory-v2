import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { Flame } from '@/components/Flame';
import { Badge, Card, ListRow, ProgressRing, Screen, Text } from '@/components/ui';
import { ANCHORS, ANCHOR_ORDER, HABIT_BY_ID, anchorForHour, type AnchorKey } from '@/constants/anchors';
import { useTheme } from '@/hooks/useTheme';
import { useHabits } from '@/store/habits';
import { useSubscription } from '@/store/subscription';

const GREETINGS: Record<AnchorKey, string> = {
  morning: 'Morning, Maya.',
  midday: 'Midday.',
  evening: 'Winding down.',
};

function reassuranceLine(fraction: number): string {
  if (fraction >= 1) return 'Roaring. Don’t look down.';
  if (fraction <= 0) return 'Nothing kept yet. Start with the easy one.';
  return 'Small fire, real fire.';
}

export default function HomeScreen() {
  const theme = useTheme();
  const isPro = useSubscription((s) => s.isPro);
  const anchorHabits = useHabits((s) => s.anchorHabits);
  const anchorTimes = useHabits((s) => s.anchorTimes);
  const completed = useHabits((s) => s.completed);
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

  const allHabitIds = ANCHOR_ORDER.flatMap((key) => anchorHabits[key]);
  const keptToday = allHabitIds.filter((id) => completed[id]).length;
  const todayFraction = allHabitIds.length > 0 ? keptToday / allHabitIds.length : 0;
  const heat = Math.min(1, Math.max(0.12, streak / 16 + todayFraction * 0.15));

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
        <Flame heat={heat} size={140} testID="home-flame" />
        <Text variant="display" color="accent" style={{ marginTop: theme.spacing.sm }}>
          {streak}
        </Text>
        <Text variant="caption" color="textMuted">
          day streak
        </Text>
        <Text variant="body" color="textMuted" center style={{ marginTop: theme.spacing.sm }}>
          {reassuranceLine(todayFraction)}
        </Text>
      </Card>

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.lg }}>
        {ANCHOR_ORDER.map((key) => {
          const anchor = ANCHORS[key];
          const habitIds = anchorHabits[key];
          const habits = habitIds.map((id) => HABIT_BY_ID[id]).filter((h): h is NonNullable<typeof h> => !!h);
          const anchorKept = habits.filter((h) => completed[h.id]).length;
          const isActive = key === activeAnchor;

          return (
            <Card
              key={key}
              testID={`anchor-${key}`}
              unpadded
              style={{
                borderWidth: isActive ? 1.5 : 1,
                borderColor: isActive ? theme.colors.primary : theme.colors.border,
              }}
            >
              <View style={[styles.anchorHeader, { padding: theme.spacing.lg }]}>
                <View
                  style={[
                    styles.glyphWrap,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderRadius: theme.radius.md,
                      marginRight: theme.spacing.md,
                    },
                  ]}
                >
                  <Ionicons name={anchor.glyph} size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="title">{anchor.label}</Text>
                  <Text variant="caption" color="textMuted">
                    {anchorTimes[key]}
                  </Text>
                </View>
                <ProgressRing
                  progress={habits.length > 0 ? anchorKept / habits.length : 0}
                  size={40}
                  strokeWidth={4}
                  testID={`anchor-${key}-ring`}
                >
                  <Text variant="caption" color="textMuted">
                    {anchorKept}/{habits.length}
                  </Text>
                </ProgressRing>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                {habits.map((habit, i) => {
                  const isChecked = !!completed[habit.id];
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
  glyphWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
