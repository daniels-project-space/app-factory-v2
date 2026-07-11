import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCallback, useMemo } from 'react';
import { X, Quote, Lock, Unlock, Camera } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useJournalStore } from '@/lib/state/journal-store';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import { useAchievementsStore, getAchievementById } from '@/lib/achievements';
import { getMoodColor, getMoodLabel } from '@/lib/mood-analytics';
import ParticleBackground from '@/components/ParticleBackground';

export default function EntryDetailScreen() {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const showCountdownLabels = useSettingsStore((s) => s.showCountdownLabels);

  const { date } = useLocalSearchParams<{ date: string }>();
  const getEntryByDate = useJournalStore((s) => s.getEntryByDate);
  const isEntryRevealed = useJournalStore((s) => s.isEntryRevealed);
  const getTimeUntilReveal = useJournalStore((s) => s.getTimeUntilReveal);
  const getNewlyRevealedEntries = useJournalStore((s) => s.getNewlyRevealedEntries);
  const getMoodForDate = useJournalStore((s) => s.getMoodForDate);
  const entries = useJournalStore((s) => s.entries);

  // Achievements for this date
  const getUnlockedForDate = useAchievementsStore((s) => s.getUnlockedForDate);
  const dateAchievements = useMemo(
    () => (date ? getUnlockedForDate(date) : []),
    [date, getUnlockedForDate]
  );

  // Mood for this date
  const dateMood = useMemo(
    () => (date ? getMoodForDate(date) : undefined),
    [date, getMoodForDate]
  );

  // "This day last year" feature
  const thisDayLastYear = useMemo(() => {
    if (!date) return undefined;
    const parts = date.split('-');
    const lastYearDate = `${parseInt(parts[0]) - 1}-${parts[1]}-${parts[2]}`;
    return entries.find((e) => e.date === lastYearDate);
  }, [date, entries]);

  const entry = date ? getEntryByDate(date) : undefined;
  const revealed = entry ? isEntryRevealed(entry) : false;
  const newlyRevealed = useMemo(() => getNewlyRevealedEntries(), [entries]);
  const justRevealed = entry ? newlyRevealed.some((e) => e.id === entry.id) : false;

  // Format countdown text
  const countdownText = useMemo(() => {
    if (!entry || revealed) return '';
    const time = getTimeUntilReveal(entry);
    if (!time) return '';

    if (time.days > 0) {
      return `Available in ${time.days} day${time.days !== 1 ? 's' : ''}`;
    } else if (time.hours > 0) {
      return `Available in ${time.hours} hour${time.hours !== 1 ? 's' : ''}`;
    } else {
      return `Available in ${time.minutes} minute${time.minutes !== 1 ? 's' : ''}`;
    }
  }, [entry, revealed, getTimeUntilReveal]);

  const handleClose = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [hapticEnabled]);

  if (!entry) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <Text className="font-sans text-base" style={{ color: theme.textSecondary }}>
          Entry not found
        </Text>
      </View>
    );
  }

  const entryDate = new Date(entry.date + 'T00:00:00');
  const formattedDate = entryDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View className="flex-1">
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <ParticleBackground />
        <SafeAreaView className="flex-1" edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-4">
            <View className="flex-1">
              <Text className="font-bold text-xl tracking-tight" style={{ color: theme.text }}>
                {formattedDate}
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              accessibilityLabel="Close entry"
              accessibilityRole="button"
              className="w-10 h-10 items-center justify-center rounded-full active:scale-95"
              style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.5)' : 'rgba(232,235,228,0.5)' }}
            >
              <X size={20} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Mood Badge */}
            {dateMood && (
              <Animated.View entering={FadeIn.delay(50).duration(300)} className="px-6 mb-3">
                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor: getMoodColor(dateMood.score),
                      shadowColor: getMoodColor(dateMood.score),
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 3,
                    }}
                  />
                  <Text
                    className="font-medium text-sm"
                    style={{ color: theme.textSecondary }}
                  >
                    Feeling {dateMood.mood} {'\u00B7'} {getMoodLabel(dateMood.score)}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Main Content Card */}
            <View className="px-6 pt-4">
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <BlurView
                  intensity={theme.isDark ? 40 : 60}
                  tint={theme.isDark ? 'dark' : 'light'}
                  style={{
                    borderRadius: 28,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: revealed ? theme.cardBorder : theme.accentLight,
                  }}
                >
                  <View className="p-8" style={{ backgroundColor: theme.card }}>
                    {/* Icon - Lock for sealed, Quote for revealed */}
                    <Animated.View
                      entering={FadeIn.delay(200).duration(300)}
                      className="w-12 h-12 rounded-full items-center justify-center mb-6"
                      style={{ backgroundColor: theme.accentLight }}
                    >
                      {revealed ? (
                        <Quote size={24} color={theme.accent} />
                      ) : (
                        <Lock size={24} color={theme.accent} />
                      )}
                    </Animated.View>

                    {/* Revealed badge */}
                    {justRevealed && (
                      <Animated.View
                        entering={FadeIn.delay(250).duration(300)}
                        className="flex-row items-center self-start px-3 py-1 rounded-full mb-4"
                        style={{ backgroundColor: theme.accentLight }}
                      >
                        <Unlock size={12} color={theme.accent} />
                        <Text
                          className="font-semibold text-xs ml-1.5"
                          style={{ color: theme.accent }}
                        >
                          Just revealed
                        </Text>
                      </Animated.View>
                    )}

                    {/* Prompt */}
                    <Animated.View entering={FadeIn.delay(300).duration(300)}>
                      <Text
                        className="font-sans text-xs mb-2 uppercase tracking-wide"
                        style={{ color: theme.textSecondary }}
                      >
                        The prompt
                      </Text>
                      <Text
                        className="font-medium text-base mb-8 leading-relaxed"
                        style={{ color: theme.textSecondary }}
                      >
                        {entry.prompt}
                      </Text>
                    </Animated.View>

                    {/* Entry content or sealed state */}
                    <Animated.View entering={FadeIn.delay(400).duration(300)}>
                      {revealed ? (
                        <>
                          <Text
                            className="font-sans text-xs mb-2 uppercase tracking-wide"
                            style={{ color: theme.textSecondary }}
                          >
                            Your thought
                          </Text>
                          <Text className="font-semibold text-2xl leading-relaxed" style={{ color: theme.text }}>
                            "{entry.content}"
                          </Text>

                          {/* Photo if present */}
                          {entry.photoUri && (
                            <Animated.View entering={FadeIn.delay(500).duration(300)} className="mt-6">
                              <View className="flex-row items-center mb-2">
                                <Camera size={12} color={theme.textSecondary} />
                                <Text
                                  className="font-sans text-xs uppercase tracking-wide ml-1.5"
                                  style={{ color: theme.textSecondary }}
                                >
                                  Photo
                                </Text>
                              </View>
                              <View
                                className="rounded-2xl overflow-hidden"
                                style={{ borderWidth: 1, borderColor: theme.cardBorder }}
                              >
                                <Image
                                  source={{ uri: entry.photoUri }}
                                  style={{ width: '100%', aspectRatio: 4 / 3 }}
                                  resizeMode="cover"
                                />
                              </View>
                              {entry.photoPrompt && (
                                <Text
                                  className="font-sans text-xs italic mt-2"
                                  style={{ color: theme.textMuted }}
                                >
                                  "{entry.photoPrompt}"
                                </Text>
                              )}
                            </Animated.View>
                          )}
                        </>
                      ) : (
                        <View className="items-center py-4">
                          <Text
                            className="font-semibold text-lg mb-2"
                            style={{ color: theme.text }}
                          >
                            Sealed
                          </Text>
                          {showCountdownLabels && countdownText && (
                            <Text
                              className="font-sans text-sm text-center"
                              style={{ color: theme.textSecondary }}
                            >
                              {countdownText}
                            </Text>
                          )}
                          <Text
                            className="font-sans text-xs text-center mt-4"
                            style={{ color: theme.textSecondary }}
                          >
                            Your thought is waiting for you in the future.
                          </Text>
                        </View>
                      )}
                    </Animated.View>
                  </View>
                </BlurView>
              </Animated.View>
            </View>

            {/* Achievements unlocked on this day */}
            {dateAchievements.length > 0 && (
              <Animated.View entering={FadeInDown.delay(500).duration(400)} className="px-6 mt-4">
                <Text
                  className="font-sans text-xs uppercase tracking-wide mb-2"
                  style={{ color: theme.textSecondary }}
                >
                  Achievements unlocked this day
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {dateAchievements.map((ua) => {
                    const ach = getAchievementById(ua.id);
                    if (!ach) return null;
                    return (
                      <View
                        key={ua.id}
                        className="flex-row items-center px-3 py-1.5 rounded-full"
                        style={{
                          backgroundColor: `${theme.accent}15`,
                          borderWidth: 1,
                          borderColor: `${theme.accent}20`,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>{ach.icon}</Text>
                        <Text
                          className="font-medium text-xs ml-1.5"
                          style={{ color: theme.accent }}
                        >
                          {ach.title}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* This Day Last Year */}
            {thisDayLastYear && revealed && (
              <Animated.View entering={FadeInDown.delay(600).duration(400)} className="px-6 mt-4">
                <BlurView
                  intensity={theme.isDark ? 25 : 45}
                  tint={theme.isDark ? 'dark' : 'light'}
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                  }}
                >
                  <View
                    className="p-5"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(15,15,18,0.5)' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    <Text
                      className="font-sans text-xs uppercase tracking-wide mb-2"
                      style={{ color: theme.textMuted }}
                    >
                      This day last year
                    </Text>
                    <Text
                      className="font-sans text-xs italic mb-2"
                      style={{ color: theme.textSecondary }}
                    >
                      "{thisDayLastYear.prompt}"
                    </Text>
                    <Text
                      className="font-medium text-base leading-relaxed"
                      style={{ color: theme.text }}
                    >
                      "{thisDayLastYear.content}"
                    </Text>
                  </View>
                </BlurView>
              </Animated.View>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="px-6 pb-8">
            <Text className="font-sans text-xs text-center" style={{ color: theme.textSecondary }}>
              {revealed
                ? 'This thought is locked and cannot be edited.'
                : 'Your past self sent this forward.'}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
