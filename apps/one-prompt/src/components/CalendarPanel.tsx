import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, Lock, Camera, Sparkles, Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CalendarView } from '@/components/CalendarView';
import { useJournalStore, JournalEntry } from '@/lib/state/journal-store';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import { usePremiumStatus } from '@/lib/usePremium';
import {
  PremiumCard,
  StatTile,
  FlameIcon,
  BookOpenIcon,
  SectionHeader,
  Badge,
} from '@/components/PremiumUI';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

function analyzeMoodFromContent(content: string): { score: number; label: string } {
  const text = content.toLowerCase();
  const words = text.split(/\s+/);
  const wordCount = words.length;

  if (wordCount < 3) {
    return { score: 3, label: 'Brief' };
  }

  const positiveWords = ['happy', 'good', 'great', 'love', 'joy', 'excited', 'wonderful', 'amazing', 'grateful', 'blessed', 'thankful', 'peaceful', 'calm'];
  const negativeWords = ['sad', 'hard', 'difficult', 'stress', 'worry', 'tired', 'anxious', 'frustrated', 'angry', 'scared', 'lonely', 'overwhelmed'];

  const positiveCount = positiveWords.filter((w) => text.includes(w)).length;
  const negativeCount = negativeWords.filter((w) => text.includes(w)).length;

  let score = 3;
  if (positiveCount > negativeCount + 1) score = 4.5;
  else if (positiveCount > negativeCount) score = 3.8;
  else if (negativeCount > positiveCount + 1) score = 1.8;
  else if (negativeCount > positiveCount) score = 2.5;

  let label = 'Balanced';
  if (score >= 4) label = 'Uplifted';
  else if (score >= 3.5) label = 'Content';
  else if (score <= 2) label = 'Struggling';
  else if (score <= 2.5) label = 'Reflective';

  return { score, label };
}

interface DailyMood {
  date: string;
  dayLabel: string;
  score: number;
  moodLabel: string;
  hasEntry: boolean;
}

function generateWeeklyMoodData(entries: JournalEntry[], weekStart: Date): DailyMood[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const moods: DailyMood[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(weekStart);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    const entry = entries.find(e => e.date === dateStr);

    if (entry) {
      const { score, label } = analyzeMoodFromContent(entry.content);
      moods.push({
        date: dateStr,
        dayLabel: dayNames[currentDate.getDay()],
        score,
        moodLabel: label,
        hasEntry: true,
      });
    } else {
      moods.push({
        date: dateStr,
        dayLabel: dayNames[currentDate.getDay()],
        score: 0,
        moodLabel: 'No entry',
        hasEntry: false,
      });
    }
  }

  return moods;
}

function MiniMoodGraph({ entries, theme }: { entries: JournalEntry[]; theme: ReturnType<typeof useAppTheme> }) {
  const weekStart = getWeekStart(new Date());
  const moodData = useMemo(() => generateWeeklyMoodData(entries, weekStart), [entries]);

  const getMoodColor = (score: number): string => {
    if (score >= 4) return '#22C55E';
    if (score >= 3.2) return '#84CC16';
    if (score >= 2.5) return '#EAB308';
    if (score >= 1.8) return '#F97316';
    return '#EF4444';
  };

  const entriesWithMood = moodData.filter(d => d.hasEntry);
  const averageMood = entriesWithMood.length > 0
    ? entriesWithMood.reduce((sum, d) => sum + d.score, 0) / entriesWithMood.length
    : 0;

  return (
    <View>
      <View className="flex-row justify-between items-end mb-2" style={{ height: 50 }}>
        {moodData.map((day) => {
          const barHeight = day.hasEntry ? (day.score / 5) * 40 + 10 : 6;
          return (
            <View
              key={day.date}
              className="items-center"
              style={{ width: (SCREEN_WIDTH - 96) / 7 }}
            >
              <View
                className="rounded-t"
                style={{
                  width: 20,
                  height: barHeight,
                  backgroundColor: day.hasEntry
                    ? getMoodColor(day.score)
                    : theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                }}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row justify-between">
        {moodData.map((day) => (
          <View
            key={day.date}
            className="items-center"
            style={{ width: (SCREEN_WIDTH - 96) / 7 }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: day.hasEntry ? theme.text : theme.textSecondary }}
            >
              {day.dayLabel}
            </Text>
          </View>
        ))}
      </View>
      <View className="flex-row justify-between items-center mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
        <View>
          <Text className="text-xs" style={{ color: theme.textSecondary }}>Avg mood</Text>
          <Text className="text-base font-semibold" style={{ color: theme.text }}>
            {averageMood > 0 ? averageMood.toFixed(1) : '—'}/5
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs" style={{ color: theme.textSecondary }}>Logged</Text>
          <Text className="text-base font-semibold" style={{ color: theme.text }}>
            {entriesWithMood.length}/7
          </Text>
        </View>
      </View>
    </View>
  );
}

interface CalendarPanelProps {
  onClose: () => void;
}

export function CalendarPanel({ onClose }: CalendarPanelProps) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const showCountdownLabels = useSettingsStore((s) => s.showCountdownLabels);
  const moodTrackingEnabled = useSettingsStore((s) => s.moodTrackingEnabled);
  const { isPremium } = usePremiumStatus();

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const entries = useJournalStore((s) => s.entries);
  const currentStreak = useJournalStore((s) => s.currentStreak);
  const longestStreak = useJournalStore((s) => s.longestStreak);
  const getRecentEntries = useJournalStore((s) => s.getRecentEntries);
  const isEntryRevealed = useJournalStore((s) => s.isEntryRevealed);
  const getTimeUntilReveal = useJournalStore((s) => s.getTimeUntilReveal);
  const getNewlyRevealedEntries = useJournalStore((s) => s.getNewlyRevealedEntries);

  const recentEntries = getRecentEntries(5);
  const newlyRevealed = useMemo(() => getNewlyRevealedEntries(), [entries]);

  const weekData = useMemo(() => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    return {
      start: weekStart,
      end: weekEnd,
      entries: weekEntries,
      dateRange: formatDateRange(weekStart, weekEnd),
    };
  }, [entries]);

  const formatCountdown = useCallback((entry: JournalEntry): string => {
    const time = getTimeUntilReveal(entry);
    if (!time) return '';

    if (time.days > 0) {
      return `${time.days}d`;
    } else if (time.hours > 0) {
      return `${time.hours}h`;
    } else {
      return `${time.minutes}m`;
    }
  }, [getTimeUntilReveal]);

  const isNewlyRevealed = useCallback((entry: JournalEntry): boolean => {
    return newlyRevealed.some((e) => e.id === entry.id);
  }, [newlyRevealed]);

  const handleDayPress = useCallback(
    (date: string, entry?: JournalEntry) => {
      if (entry) {
        router.push(`/entry/${date}`);
      }
    },
    []
  );

  const handleOpenWeeklyReflection = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/weekly-reflection');
  }, [hapticEnabled]);

  const handleUpgrade = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/paywall');
  }, [hapticEnabled]);

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      {/* Pull indicator */}
      <View className="items-center pt-3 pb-2">
        <View
          className="w-10 h-1 rounded-full"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="font-bold text-xl tracking-tight" style={{ color: theme.text }}>
              Your Journey
            </Text>
            <Text className="font-sans text-sm mt-0.5" style={{ color: theme.textSecondary }}>
              {entries.length} {entries.length === 1 ? 'thought' : 'thoughts'} captured
            </Text>
          </View>
          <Pressable
            accessibilityLabel="On close"
            onPress={onClose}
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <ChevronDown size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Stats Row */}
        <View className="flex-row mb-4 gap-3">
          <StatTile
            icon={<FlameIcon size={20} color={theme.accent} />}
            value={currentStreak}
            label="Current"
            entering={FadeInDown.delay(50).duration(300)}
          />
          <View style={{ width: 12 }} />
          <StatTile
            icon={<BookOpenIcon size={20} color={theme.accent} />}
            value={longestStreak}
            label="Best"
            entering={FadeInDown.delay(100).duration(300)}
          />
        </View>

        {/* Calendar */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)} className="mb-4">
          <CalendarView
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onDayPress={handleDayPress}
          />
        </Animated.View>

        {/* Weekly reflection section */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} className="mb-4">
          <BlurView
            intensity={theme.isDark ? 20 : 45}
            tint={theme.isDark ? 'dark' : 'light'}
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
            }}
          >
            <View
              className="p-5"
              style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.7)' : 'rgba(255,255,255,0.75)' }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: theme.accentLight }}
                  >
                    <Sparkles size={20} color={theme.accent} />
                  </View>
                  <View>
                    <Text className="font-semibold text-base" style={{ color: theme.text }}>
                      Weekly Insights
                    </Text>
                    <Text className="font-sans text-xs" style={{ color: theme.textSecondary }}>
                      {weekData.dateRange}
                    </Text>
                  </View>
                </View>
                {!isPremium && (
                  <View
                    className="px-2 py-1 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Text className="font-semibold text-[10px] text-white">PRO</Text>
                  </View>
                )}
              </View>

              {isPremium ? (
                <>
                  <View className="flex-row mb-4">
                    <View className="flex-1 items-center py-3 rounded-xl mr-2" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                      <Text className="font-bold text-2xl" style={{ color: theme.accent }}>
                        {weekData.entries.length}
                      </Text>
                      <Text className="font-sans text-xs" style={{ color: theme.textSecondary }}>
                        entries
                      </Text>
                    </View>
                    <View className="flex-1 items-center py-3 rounded-xl" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                      <Text className="font-bold text-2xl" style={{ color: theme.accent }}>
                        {7 - weekData.entries.length}
                      </Text>
                      <Text className="font-sans text-xs" style={{ color: theme.textSecondary }}>
                        remaining
                      </Text>
                    </View>
                  </View>

                  {moodTrackingEnabled && (
                    <View className="mb-4 p-3 rounded-xl" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                      <View className="flex-row items-center mb-3">
                        <Heart size={14} color={theme.accent} />
                        <Text className="font-medium text-xs ml-1.5" style={{ color: theme.textSecondary }}>
                          Mood This Week
                        </Text>
                      </View>
                      <MiniMoodGraph entries={entries} theme={theme} />
                    </View>
                  )}

                  <Pressable
                    accessibilityLabel="Open weekly reflection"
                    onPress={handleOpenWeeklyReflection}
                    className="py-3 rounded-xl items-center"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Text className="font-semibold text-sm text-white">
                      View Full Reflection
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View className="relative overflow-hidden rounded-xl mb-4">
                    <View className="p-4" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                      <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                        Unlock an on-device reflection of your week, mood patterns, and personalized encouragement...
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityLabel="Upgrade"
                    onPress={handleUpgrade}
                    className="py-3 rounded-xl items-center"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Text className="font-semibold text-sm text-white">
                      Upgrade to Unlock
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </BlurView>
        </Animated.View>

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(300)}>
            <SectionHeader title="Recent thoughts" />

            {recentEntries.map((entry, index) => {
              const entryDate = new Date(entry.date + 'T00:00:00');
              const formattedDate = entryDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const revealed = isEntryRevealed(entry);
              const justRevealed = isNewlyRevealed(entry);
              const countdownText = !revealed && showCountdownLabels ? formatCountdown(entry) : '';

              return (
                <Animated.View key={entry.id} entering={FadeIn.delay(300 + index * 30).duration(200)}>
                  <PremiumCard
                    onPress={() => handleDayPress(entry.date, entry)}
                    variant={justRevealed ? 'elevated' : 'default'}
                    glowColor={justRevealed ? theme.accent : undefined}
                    padding="md"
                    borderRadius={16}
                    style={{ marginBottom: 10 }}
                  >
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text
                        className="font-medium text-xs uppercase tracking-wider"
                        style={{ color: theme.textSecondary }}
                      >
                        {formattedDate}
                      </Text>
                      <View className="flex-row items-center">
                        {justRevealed && (
                          <Badge label="New" variant="accent" />
                        )}
                        {!revealed && (
                          <View
                            className="flex-row items-center px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${theme.accent}15` }}
                          >
                            <Lock size={10} color={theme.accent} />
                            {countdownText && (
                              <Text
                                className="font-medium text-[10px] ml-1"
                                style={{ color: theme.accent }}
                              >
                                {countdownText}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>

                    {revealed ? (
                      <View className="flex-row items-start">
                        <Text
                          className="font-sans text-sm leading-relaxed flex-1"
                          style={{ color: theme.text }}
                          numberOfLines={2}
                        >
                          "{entry.content}"
                        </Text>
                        {entry.photoUri && (
                          <View
                            className="ml-2 w-7 h-7 rounded-lg items-center justify-center"
                            style={{ backgroundColor: `${theme.accent}15` }}
                          >
                            <Camera size={12} color={theme.accent} />
                          </View>
                        )}
                      </View>
                    ) : (
                      <View className="flex-row items-center">
                        <Lock size={12} color={theme.textMuted} />
                        <Text
                          className="font-sans text-sm italic ml-2"
                          style={{ color: theme.textMuted }}
                        >
                          Sealed
                        </Text>
                      </View>
                    )}
                  </PremiumCard>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {/* Empty State */}
        {entries.length === 0 && (
          <Animated.View entering={FadeIn.delay(200).duration(300)} className="items-center pt-6">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
            >
              <BookOpenIcon size={32} color={theme.textSecondary} />
            </View>
            <Text className="font-semibold text-lg mb-1" style={{ color: theme.text }}>
              No thoughts yet
            </Text>
            <Text className="font-sans text-sm text-center" style={{ color: theme.textSecondary }}>
              Start capturing your daily thoughts.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
