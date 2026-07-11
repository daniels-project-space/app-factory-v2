import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import { useJournalStore } from '@/lib/state/journal-store';
import {
  buildWeeklyTrend,
  buildWordFrequency,
  buildStreakInfo,
  buildMonthlySummary,
  buildMoodCalendar,
  getMoodColor,
  getMoodLabel,
} from '@/lib/mood-analytics';
import ParticleBackground from '@/components/ParticleBackground';
import { PremiumCard, SectionHeader } from '@/components/PremiumUI';

export default function MoodInsightsScreen() {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const entries = useJournalStore((s) => s.entries);
  const moodHistory = useJournalStore((s) => s.moodHistory);
  const currentStreak = useJournalStore((s) => s.currentStreak);
  const longestStreak = useJournalStore((s) => s.longestStreak);

  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const handleClose = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [hapticEnabled]);

  // Compute analytics
  const weeklyTrend = useMemo(() => buildWeeklyTrend(moodHistory, 4), [moodHistory]);
  const wordCloud = useMemo(() => buildWordFrequency(entries, 15), [entries]);
  const streakInfo = useMemo(
    () => buildStreakInfo(currentStreak, longestStreak, entries, moodHistory),
    [currentStreak, longestStreak, entries, moodHistory]
  );
  const monthlySummary = useMemo(() => {
    const now = new Date();
    return buildMonthlySummary(now.getFullYear(), now.getMonth(), entries, moodHistory);
  }, [entries, moodHistory]);

  const moodCalendar = useMemo(
    () =>
      buildMoodCalendar(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        moodHistory,
        entries
      ),
    [calendarMonth, moodHistory, entries]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _maxTrendScore = useMemo(
    () => Math.max(...weeklyTrend.map((w) => w.averageScore), 1),
    [weeklyTrend]
  );

  const calendarMonthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const grid: { day: number | null; data?: typeof moodCalendar[0] }[] = [];
    for (let i = 0; i < firstDay; i++) grid.push({ day: null });
    for (let d = 0; d < moodCalendar.length; d++) {
      grid.push({ day: d + 1, data: moodCalendar[d] });
    }
    return grid;
  }, [calendarMonth, moodCalendar]);

  return (
    <View className="flex-1">
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <ParticleBackground />
        <SafeAreaView className="flex-1" edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-4">
            <View>
              <Text
                className="font-bold text-2xl tracking-tight"
                style={{ color: theme.text }}
              >
                Mood Insights
              </Text>
              <Text
                className="font-sans text-sm mt-0.5"
                style={{ color: theme.textSecondary }}
              >
                Your emotional landscape
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center rounded-full active:scale-95"
              style={{
                backgroundColor: theme.isDark
                  ? 'rgba(42,42,40,0.6)'
                  : 'rgba(232,235,228,0.6)',
              }}
              accessibilityLabel="Close mood insights"
              accessibilityRole="button"
            >
              <X size={20} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Stats Row */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              className="flex-row px-6 mb-5 gap-3"
            >
              <View className="flex-1">
                <PremiumCard padding="sm">
                  <View className="items-center py-2">
                    <Text
                      className="font-bold text-2xl"
                      style={{ color: theme.text }}
                    >
                      {streakInfo.currentStreak}
                    </Text>
                    <Text
                      className="font-sans text-xs mt-1"
                      style={{ color: theme.textSecondary }}
                    >
                      Current Streak
                    </Text>
                  </View>
                </PremiumCard>
              </View>
              <View className="flex-1">
                <PremiumCard padding="sm">
                  <View className="items-center py-2">
                    <Text
                      className="font-bold text-2xl"
                      style={{ color: theme.text }}
                    >
                      {streakInfo.longestStreak}
                    </Text>
                    <Text
                      className="font-sans text-xs mt-1"
                      style={{ color: theme.textSecondary }}
                    >
                      Best Streak
                    </Text>
                  </View>
                </PremiumCard>
              </View>
              <View className="flex-1">
                <PremiumCard padding="sm">
                  <View className="items-center py-2">
                    <Text
                      className="font-bold text-2xl"
                      style={{ color: theme.text }}
                    >
                      {streakInfo.totalEntries}
                    </Text>
                    <Text
                      className="font-sans text-xs mt-1"
                      style={{ color: theme.textSecondary }}
                    >
                      Total Entries
                    </Text>
                  </View>
                </PremiumCard>
              </View>
            </Animated.View>

            {/* Mood Calendar */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              className="px-6 mb-5"
            >
              <SectionHeader title="Mood Calendar" />
              <PremiumCard>
                {/* Month navigation */}
                <View className="flex-row items-center justify-between mb-4">
                  <Pressable
                    accessibilityLabel="Prev"
                    onPress={() => {
                      const prev = new Date(calendarMonth);
                      prev.setMonth(prev.getMonth() - 1);
                      setCalendarMonth(prev);
                    }}
                    className="px-3 py-1 rounded-lg active:opacity-70"
                    style={{
                      backgroundColor: theme.isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)',
                    }}
                  >
                    <Text
                      className="font-medium text-sm"
                      style={{ color: theme.textSecondary }}
                    >
                      Prev
                    </Text>
                  </Pressable>
                  <Text
                    className="font-semibold text-base"
                    style={{ color: theme.text }}
                  >
                    {calendarMonthLabel}
                  </Text>
                  <Pressable
                    accessibilityLabel="Next"
                    onPress={() => {
                      const next = new Date(calendarMonth);
                      next.setMonth(next.getMonth() + 1);
                      setCalendarMonth(next);
                    }}
                    className="px-3 py-1 rounded-lg active:opacity-70"
                    style={{
                      backgroundColor: theme.isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)',
                    }}
                  >
                    <Text
                      className="font-medium text-sm"
                      style={{ color: theme.textSecondary }}
                    >
                      Next
                    </Text>
                  </Pressable>
                </View>

                {/* Weekday headers */}
                <View className="flex-row mb-2">
                  {WEEKDAYS.map((d, i) => (
                    <View key={i} className="flex-1 items-center">
                      <Text
                        className="font-semibold text-xs"
                        style={{ color: theme.textMuted }}
                      >
                        {d}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Calendar grid with mood dots */}
                <View className="flex-row flex-wrap">
                  {calendarGrid.map((cell, idx) => (
                    <View
                      key={idx}
                      className="items-center justify-center"
                      style={{ width: '14.28%', aspectRatio: 1 }}
                    >
                      {cell.day !== null && (
                        <View className="items-center">
                          <Text
                            className="text-xs"
                            style={{
                              color: cell.data?.hasEntry
                                ? theme.text
                                : theme.textMuted,
                              fontWeight: cell.data?.hasEntry ? '600' : '400',
                            }}
                          >
                            {cell.day}
                          </Text>
                          {cell.data && cell.data.score > 0 && (
                            <View
                              className="w-2.5 h-2.5 rounded-full mt-0.5"
                              style={{
                                backgroundColor: cell.data.color,
                                shadowColor: cell.data.color,
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.5,
                                shadowRadius: 2,
                              }}
                            />
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {/* Legend */}
                <View className="flex-row items-center justify-center mt-3 gap-4">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <View key={score} className="flex-row items-center">
                      <View
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: getMoodColor(score) }}
                      />
                      <Text
                        className="text-[10px]"
                        style={{ color: theme.textMuted }}
                      >
                        {getMoodLabel(score)}
                      </Text>
                    </View>
                  ))}
                </View>
              </PremiumCard>
            </Animated.View>

            {/* Weekly Mood Trend */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(400)}
              className="px-6 mb-5"
            >
              <SectionHeader title="Weekly Trend" />
              <PremiumCard>
                {weeklyTrend.some((w) => w.averageScore > 0) ? (
                  <View>
                    {/* Simple bar chart */}
                    <View className="flex-row items-end justify-between" style={{ height: 100 }}>
                      {weeklyTrend.map((week, idx) => {
                        const barHeight =
                          week.averageScore > 0
                            ? (week.averageScore / 5) * 80
                            : 4;
                        const color =
                          week.averageScore > 0
                            ? getMoodColor(Math.round(week.averageScore))
                            : theme.textMuted;
                        return (
                          <View
                            key={idx}
                            className="flex-1 items-center mx-1"
                          >
                            <View
                              className="w-full rounded-lg"
                              style={{
                                height: barHeight,
                                backgroundColor: color,
                                opacity: week.averageScore > 0 ? 0.8 : 0.2,
                                maxWidth: 40,
                              }}
                            />
                          </View>
                        );
                      })}
                    </View>
                    {/* Labels */}
                    <View className="flex-row justify-between mt-2">
                      {weeklyTrend.map((week, idx) => (
                        <View key={idx} className="flex-1 items-center">
                          <Text
                            className="text-[10px]"
                            style={{ color: theme.textMuted }}
                          >
                            {week.weekLabel}
                          </Text>
                          {week.averageScore > 0 && (
                            <Text
                              className="text-[10px] font-semibold mt-0.5"
                              style={{
                                color: getMoodColor(
                                  Math.round(week.averageScore)
                                ),
                              }}
                            >
                              {week.averageScore.toFixed(1)}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View className="items-center py-4">
                    <Text
                      className="font-sans text-sm"
                      style={{ color: theme.textSecondary }}
                    >
                      Track your mood to see weekly trends
                    </Text>
                  </View>
                )}
              </PremiumCard>
            </Animated.View>

            {/* Word Cloud */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(400)}
              className="px-6 mb-5"
            >
              <SectionHeader title="Your Words" />
              <PremiumCard>
                {wordCloud.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {wordCloud.map((item, idx) => {
                      const fontSize = 11 + item.size * 3;
                      const opacity = 0.4 + item.size * 0.12;
                      return (
                        <Animated.View
                          key={item.word}
                          entering={FadeIn.delay(450 + idx * 30).duration(300)}
                        >
                          <View
                            className="px-3 py-1.5 rounded-full"
                            style={{
                              backgroundColor: `${theme.accent}${Math.round(
                                opacity * 30
                              )
                                .toString(16)
                                .padStart(2, '0')}`,
                            }}
                          >
                            <Text
                              style={{
                                fontSize,
                                color: theme.text,
                                fontWeight: item.size >= 4 ? '600' : '400',
                                opacity,
                              }}
                            >
                              {item.word}
                            </Text>
                          </View>
                        </Animated.View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="items-center py-4">
                    <Text
                      className="font-sans text-sm"
                      style={{ color: theme.textSecondary }}
                    >
                      Write more entries to see your most used words
                    </Text>
                  </View>
                )}
              </PremiumCard>
            </Animated.View>

            {/* Monthly Summary */}
            <Animated.View
              entering={FadeInDown.delay(500).duration(400)}
              className="px-6 mb-5"
            >
              <SectionHeader title="This Month" />
              <PremiumCard>
                {monthlySummary.entryCount > 0 ? (
                  <View>
                    <Text
                      className="font-semibold text-base mb-1"
                      style={{ color: theme.text }}
                    >
                      {monthlySummary.theme}
                    </Text>
                    <Text
                      className="font-sans text-sm mb-3"
                      style={{ color: theme.textSecondary }}
                    >
                      {monthlySummary.entryCount} entries {'\u00B7'}{' '}
                      {monthlySummary.averageMood > 0
                        ? `Average mood: ${getMoodLabel(monthlySummary.averageMood)}`
                        : 'No mood data yet'}
                    </Text>

                    {monthlySummary.topMoods.length > 0 && (
                      <View className="mb-2">
                        <Text
                          className="font-sans text-xs uppercase tracking-wide mb-1"
                          style={{ color: theme.textMuted }}
                        >
                          Top moods
                        </Text>
                        <View className="flex-row gap-2">
                          {monthlySummary.topMoods.map((mood) => (
                            <View
                              key={mood}
                              className="px-2.5 py-1 rounded-full"
                              style={{
                                backgroundColor: `${theme.accent}15`,
                              }}
                            >
                              <Text
                                className="font-medium text-xs"
                                style={{ color: theme.accent }}
                              >
                                {mood}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {monthlySummary.topWords.length > 0 && (
                      <View>
                        <Text
                          className="font-sans text-xs uppercase tracking-wide mb-1"
                          style={{ color: theme.textMuted }}
                        >
                          Key words
                        </Text>
                        <Text
                          className="font-sans text-sm"
                          style={{ color: theme.textSecondary }}
                        >
                          {monthlySummary.topWords.join(' \u00B7 ')}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View className="items-center py-4">
                    <Text
                      className="font-sans text-sm"
                      style={{ color: theme.textSecondary }}
                    >
                      Start journaling this month to see your summary
                    </Text>
                  </View>
                )}
              </PremiumCard>
            </Animated.View>

            {/* Average Mood Card */}
            {streakInfo.averageMood > 0 && (
              <Animated.View
                entering={FadeInDown.delay(600).duration(400)}
                className="px-6 mb-5"
              >
                <PremiumCard variant="elevated" glowColor={getMoodColor(Math.round(streakInfo.averageMood))}>
                  <View className="items-center py-2">
                    <Text
                      className="font-sans text-xs uppercase tracking-wide mb-1"
                      style={{ color: theme.textSecondary }}
                    >
                      Your overall mood
                    </Text>
                    <Text
                      className="font-bold text-3xl"
                      style={{
                        color: getMoodColor(Math.round(streakInfo.averageMood)),
                      }}
                    >
                      {getMoodLabel(streakInfo.averageMood)}
                    </Text>
                    <Text
                      className="font-sans text-sm mt-1"
                      style={{ color: theme.textSecondary }}
                    >
                      {streakInfo.averageMood.toFixed(1)} / 5.0 average
                    </Text>
                  </View>
                </PremiumCard>
              </Animated.View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
