import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useCallback, useMemo } from 'react';
import { X, Lock, Camera, BarChart3, Map } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { CalendarView } from '@/components/CalendarView';
import { useJournalStore, JournalEntry } from '@/lib/state/journal-store';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import { usePremiumStatus } from '@/lib/usePremium';
import ParticleBackground from '@/components/ParticleBackground';
import {
  PremiumCard,
  StatTile,
  ActionTile,
  FlameIcon,
  BookOpenIcon,
  SparklesIcon,
  SectionHeader,
  Badge,
} from '@/components/PremiumUI';

export default function HistoryScreen() {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const showCountdownLabels = useSettingsStore((s) => s.showCountdownLabels);
  const { isPremium } = usePremiumStatus();

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const entries = useJournalStore((s) => s.entries);
  const currentStreak = useJournalStore((s) => s.currentStreak);
  const longestStreak = useJournalStore((s) => s.longestStreak);
  const getRecentEntries = useJournalStore((s) => s.getRecentEntries);
  const isEntryRevealed = useJournalStore((s) => s.isEntryRevealed);
  const getTimeUntilReveal = useJournalStore((s) => s.getTimeUntilReveal);
  const getNewlyRevealedEntries = useJournalStore((s) => s.getNewlyRevealedEntries);

  const recentEntries = getRecentEntries(7);
  const newlyRevealed = useMemo(() => getNewlyRevealedEntries(), [entries]);

  // Helper to format countdown text
  const formatCountdown = useCallback((entry: JournalEntry): string => {
    const time = getTimeUntilReveal(entry);
    if (!time) return '';

    if (time.days > 0) {
      return `Available in ${time.days}d`;
    } else if (time.hours > 0) {
      return `Available in ${time.hours}h`;
    } else {
      return `Available in ${time.minutes}m`;
    }
  }, [getTimeUntilReveal]);

  // Check if an entry was just revealed (within the last 24 hours)
  const isNewlyRevealed = useCallback((entry: JournalEntry): boolean => {
    return newlyRevealed.some((e) => e.id === entry.id);
  }, [newlyRevealed]);

  const handleClose = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [hapticEnabled]);

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

  const handleOpenMoodInsights = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/mood-insights');
  }, [hapticEnabled]);

  const handleOpenPaths = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/paths');
  }, [hapticEnabled]);

  return (
    <View className="flex-1">
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <ParticleBackground />
        <SafeAreaView className="flex-1" edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-4">
            <View>
              <Text className="font-bold text-2xl tracking-tight" style={{ color: theme.text }}>
                Your Thoughts
              </Text>
              <Text className="font-sans text-sm mt-0.5" style={{ color: theme.textSecondary }}>
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} captured
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
              className="w-10 h-10 items-center justify-center rounded-full active:scale-95"
              style={{
                backgroundColor: theme.isDark ? 'rgba(42,42,40,0.6)' : 'rgba(232,235,228,0.6)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <X size={20} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Stats Row - Using new StatTile components */}
            <View className="flex-row px-6 mb-5 gap-3">
              <StatTile
                icon={<FlameIcon size={22} color={theme.accent} />}
                value={currentStreak}
                label="Current"
                entering={FadeInDown.delay(100).duration(400)}
              />
              <View style={{ width: 12 }} />
              <StatTile
                icon={<BookOpenIcon size={22} color={theme.accent} />}
                value={longestStreak}
                label="Best"
                entering={FadeInDown.delay(150).duration(400)}
              />
            </View>

            {/* Action Tiles */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} className="px-6 mb-3">
              <ActionTile
                icon={<SparklesIcon size={22} color={theme.accent} />}
                title="Weekly Reflection"
                subtitle={isPremium ? 'View your AI insights' : 'Upgrade to unlock'}
                onPress={handleOpenWeeklyReflection}
                badge={!isPremium ? 'PRO' : undefined}
                badgeColor={theme.accent}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(225).duration(400)} className="px-6 mb-3">
              <ActionTile
                icon={<BarChart3 size={22} color={theme.accent} />}
                title="Mood Insights"
                subtitle="Your emotional landscape"
                onPress={handleOpenMoodInsights}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(400)} className="px-6 mb-5">
              <ActionTile
                icon={<Map size={22} color={theme.accent} />}
                title="Journaling Paths"
                subtitle="Guided multi-day journeys"
                onPress={handleOpenPaths}
              />
            </Animated.View>

            {/* Calendar */}
            <Animated.View entering={FadeInDown.delay(250).duration(400)} className="px-6 mb-5">
              <CalendarView
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                onDayPress={handleDayPress}
              />
            </Animated.View>

            {/* Recent Entries */}
            {recentEntries.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).duration(400)} className="px-6">
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
                    <Animated.View key={entry.id} entering={FadeIn.delay(350 + index * 50).duration(300)}>
                      <PremiumCard
                        onPress={() => handleDayPress(entry.date, entry)}
                        variant={justRevealed ? 'elevated' : 'default'}
                        glowColor={justRevealed ? theme.accent : undefined}
                        padding="md"
                        borderRadius={20}
                        style={{ marginBottom: 12 }}
                      >
                        {/* Date row with badges */}
                        <View className="flex-row items-center justify-between mb-2">
                          <Text
                            className="font-medium text-xs uppercase tracking-wider"
                            style={{ color: theme.textSecondary }}
                          >
                            {formattedDate}
                          </Text>
                          <View className="flex-row items-center">
                            {justRevealed && (
                              <Badge label="Revealed" variant="accent" />
                            )}
                            {!revealed && (
                              <View
                                className="flex-row items-center px-2 py-1 rounded-full"
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

                        {/* Content */}
                        {revealed ? (
                          <View className="flex-row items-start">
                            <Text
                              className="font-sans text-base leading-relaxed flex-1"
                              style={{ color: theme.text }}
                              numberOfLines={2}
                            >
                              "{entry.content}"
                            </Text>
                            {entry.photoUri && (
                              <View
                                className="ml-3 w-8 h-8 rounded-lg items-center justify-center"
                                style={{
                                  backgroundColor: `${theme.accent}15`,
                                  shadowColor: theme.accent,
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.15,
                                  shadowRadius: 4,
                                }}
                              >
                                <Camera size={14} color={theme.accent} />
                              </View>
                            )}
                          </View>
                        ) : (
                          <View className="flex-row items-center">
                            <View
                              className="w-6 h-6 rounded-lg items-center justify-center mr-2"
                              style={{ backgroundColor: `${theme.accent}10` }}
                            >
                              <Lock size={12} color={theme.textMuted} />
                            </View>
                            <Text
                              className="font-sans text-sm italic"
                              style={{ color: theme.textMuted }}
                            >
                              Sealed thought
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
              <Animated.View entering={FadeIn.delay(300).duration(400)} className="px-6 items-center pt-8">
                <View
                  className="w-20 h-20 rounded-3xl items-center justify-center mb-5"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(42,42,40,0.5)' : 'rgba(232,235,228,0.5)',
                    shadowColor: theme.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                  }}
                >
                  <BookOpenIcon size={36} color={theme.textSecondary} />
                </View>
                <Text className="font-semibold text-xl mb-2" style={{ color: theme.text }}>
                  No thoughts yet
                </Text>
                <Text className="font-sans text-sm text-center leading-relaxed" style={{ color: theme.textSecondary }}>
                  Start capturing your daily thoughts.{'\n'}One sentence at a time.
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
