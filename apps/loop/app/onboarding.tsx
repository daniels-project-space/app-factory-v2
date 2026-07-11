import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';

import { Flame } from '@/components/Flame';
import { Button, ListRow, Screen, Text } from '@/components/ui';
import {
  ANCHORS,
  ANCHOR_ORDER,
  HABIT_LIBRARY,
  TIME_PRESETS,
  type AnchorKey,
} from '@/constants/anchors';
import { useTheme } from '@/hooks/useTheme';
import { requestNotificationPermission, scheduleAnchorNotifications } from '@/lib/notifications';
import { useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';

const TOTAL_PICKS = 3;

const DEFAULT_PICKS: Record<AnchorKey, string[]> = ANCHOR_ORDER.reduce(
  (acc, key) => {
    acc[key] = ANCHORS[key].habits.map((h) => h.id);
    return acc;
  },
  {} as Record<AnchorKey, string[]>,
);

const DEFAULT_TIMES: Record<AnchorKey, string> = ANCHOR_ORDER.reduce(
  (acc, key) => {
    acc[key] = ANCHORS[key].defaultWindow;
    return acc;
  },
  {} as Record<AnchorKey, string>,
);

export default function OnboardingScreen() {
  const theme = useTheme();
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const setHabitSelection = useHabits((s) => s.setHabitSelection);
  const setAnchorTime = useHabits((s) => s.setAnchorTime);

  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Record<AnchorKey, string[]>>({
    morning: [],
    midday: [],
    evening: [],
  });
  const [times, setTimes] = useState<Record<AnchorKey, string>>(DEFAULT_TIMES);

  const totalPicked = ANCHOR_ORDER.reduce((n, key) => n + picks[key].length, 0);

  const toggleHabit = (anchor: AnchorKey, habitId: string) => {
    setPicks((prev) => {
      const current = prev[anchor];
      if (current.includes(habitId)) {
        return { ...prev, [anchor]: current.filter((id) => id !== habitId) };
      }
      const total = ANCHOR_ORDER.reduce((n, key) => n + prev[key].length, 0);
      if (total >= TOTAL_PICKS) return prev;
      return { ...prev, [anchor]: [...current, habitId] };
    });
  };

  const cycleTime = (anchor: AnchorKey) => {
    setTimes((prev) => {
      const options = TIME_PRESETS[anchor];
      const idx = options.indexOf(prev[anchor]);
      const next = options[(idx + 1) % options.length]!;
      return { ...prev, [anchor]: next };
    });
  };

  const finish = (finalPicks: Record<AnchorKey, string[]>, finalTimes: Record<AnchorKey, string>) => {
    setHabitSelection(finalPicks);
    ANCHOR_ORDER.forEach((key) => setAnchorTime(key, finalTimes[key]));
    completeOnboarding();
    void requestNotificationPermission().then((granted) => {
      if (granted) void scheduleAnchorNotifications(finalTimes);
    });
  };

  const skip = () => finish(DEFAULT_PICKS, DEFAULT_TIMES);

  const next = () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      if (totalPicked !== TOTAL_PICKS) return;
      setStep(2);
      return;
    }
    finish(picks, times);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <Pressable testID="onboarding-skip" accessibilityRole="button" onPress={skip} hitSlop={12}>
          <Text variant="caption" color="textMuted">
            Skip
          </Text>
        </Pressable>
      </View>

      {step === 0 ? (
        <View style={styles.centeredContent}>
          <Flame heat={0.18} size={88} testID="onboarding-flame" />
          <Text variant="display" center style={{ marginTop: theme.spacing.xxl }}>
            Tend a small fire.
          </Text>
          <Text
            variant="body"
            color="textMuted"
            center
            style={{ marginTop: theme.spacing.lg, maxWidth: 300 }}
          >
            Three moments a day. One or two tiny things each. A flame that dims when you slip —
            never resets.
          </Text>
        </View>
      ) : null}

      {step === 1 ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <Text variant="title" style={{ marginTop: theme.spacing.md }}>
            Pick your three.
          </Text>
          <Text variant="body" color="textMuted" style={{ marginTop: theme.spacing.xs }}>
            Tiny, real things. Exactly three, spread across your day however you like.
          </Text>

          {ANCHOR_ORDER.map((anchorKey) => (
            <View key={anchorKey} style={{ marginTop: theme.spacing.xl }}>
              <Text variant="caption" color="textMuted">
                {anchorKey.toUpperCase()}
              </Text>
              <View
                style={{
                  marginTop: theme.spacing.sm,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  overflow: 'hidden',
                }}
              >
                {HABIT_LIBRARY[anchorKey].map((habit, i) => {
                  const isPicked = picks[anchorKey].includes(habit.id);
                  const disabled = !isPicked && totalPicked >= TOTAL_PICKS;
                  return (
                    <ListRow
                      key={habit.id}
                      testID={`onboarding-habit-${habit.id}`}
                      title={habit.title}
                      divider={i < HABIT_LIBRARY[anchorKey].length - 1}
                      disabled={disabled}
                      checked={isPicked}
                      onPress={() => toggleHabit(anchorKey, habit.id)}
                      left={
                        <Ionicons
                          name={habit.icon}
                          size={20}
                          color={isPicked ? theme.colors.primary : theme.colors.textMuted}
                        />
                      }
                      right={
                        isPicked ? (
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                        ) : null
                      }
                    />
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ height: theme.spacing.xxxl }} />
        </ScrollView>
      ) : null}

      {step === 2 ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.centeredContent}>
            <Flame heat={0.85} size={88} testID="onboarding-flame" />
          </View>
          <Text variant="title" center style={{ marginTop: theme.spacing.lg }}>
            Set your times.
          </Text>
          <Text variant="body" color="textMuted" center style={{ marginTop: theme.spacing.xs }}>
            We'll nudge you at these. Change them anytime.
          </Text>

          <View
            style={{
              marginTop: theme.spacing.xl,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              overflow: 'hidden',
            }}
          >
            {ANCHOR_ORDER.map((anchorKey, i) => (
              <View
                key={anchorKey}
                style={[
                  styles.timeRow,
                  {
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.md,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: theme.colors.border,
                  },
                ]}
              >
                <Text variant="body" style={{ flex: 1 }}>
                  {ANCHORS[anchorKey].label}
                </Text>
                <Pressable
                  testID={`onboarding-time-${anchorKey}`}
                  accessibilityRole="button"
                  onPress={() => cycleTime(anchorKey)}
                  style={({ pressed }) => [
                    styles.timeChip,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderRadius: theme.radius.full,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.xs,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text variant="caption" color="accent">
                    {times[anchorKey]}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={{ height: theme.spacing.xxxl }} />
        </ScrollView>
      ) : null}

      {step === 1 ? (
        <Text variant="caption" color="textMuted" center style={{ marginBottom: theme.spacing.sm }}>
          {totalPicked} of {TOTAL_PICKS} chosen
        </Text>
      ) : null}

      <View style={[styles.dots, { marginBottom: theme.spacing.xl }]}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: i === step ? 20 : 8,
              height: 8,
              borderRadius: theme.radius.full,
              marginHorizontal: theme.spacing.xs,
              backgroundColor: i === step ? theme.colors.primary : theme.colors.border,
            }}
          />
        ))}
      </View>

      <Button
        title={step === 0 ? 'Start' : step === 1 ? 'Light it' : 'Done'}
        onPress={next}
        disabled={step === 1 && totalPicked !== TOTAL_PICKS}
        testID="onboarding-cta"
        style={{ marginBottom: theme.spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 12,
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeChip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
