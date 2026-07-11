import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback } from 'react';
import { X, Check, Play, RotateCcw } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import { JOURNALING_PATHS, usePathsStore, getPathById } from '@/lib/journaling-paths';
import { useAchievementsStore } from '@/lib/achievements';
import { useJournalStore } from '@/lib/state/journal-store';
import ParticleBackground from '@/components/ParticleBackground';
import { PremiumCard, SectionHeader } from '@/components/PremiumUI';

export default function PathsScreen() {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const activePath = usePathsStore((s) => s.activePath);
  const completedPaths = usePathsStore((s) => s.completedPaths);
  const startPath = usePathsStore((s) => s.startPath);
  const abandonPath = usePathsStore((s) => s.abandonPath);
  const completePath = usePathsStore((s) => s.completePath);
  const checkAndUnlock = useAchievementsStore((s) => s.checkAndUnlock);

  const handleClose = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [hapticEnabled]);

  const handleStartPath = useCallback(
    (pathId: string) => {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      startPath(pathId);
      router.back();
    },
    [hapticEnabled, startPath]
  );

  const handleAbandonPath = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    abandonPath();
  }, [hapticEnabled, abandonPath]);

  const handleCompletePath = useCallback(() => {
    if (hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    completePath();

    // Trigger achievement check after path completion
    setTimeout(() => {
      const journalState = useJournalStore.getState();
      const pathsState = usePathsStore.getState();
      const moodScores = [...new Set(journalState.moodHistory.map((m) => m.score))];
      checkAndUnlock({
        totalEntries: journalState.entries.length,
        currentStreak: journalState.currentStreak,
        longestStreak: journalState.longestStreak,
        completedPaths: pathsState.completedPaths,
        moodScoresUsed: moodScores,
      });
    }, 300);
  }, [hapticEnabled, completePath, checkAndUnlock]);

  const activePathData = activePath ? getPathById(activePath.pathId) : null;

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
                Journaling Paths
              </Text>
              <Text
                className="font-sans text-sm mt-0.5"
                style={{ color: theme.textSecondary }}
              >
                Guided multi-day journaling journeys
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
              className="w-10 h-10 items-center justify-center rounded-full active:scale-95"
              style={{
                backgroundColor: theme.isDark
                  ? 'rgba(42,42,40,0.6)'
                  : 'rgba(232,235,228,0.6)',
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
            {/* Active Path */}
            {activePath && activePathData && (
              <Animated.View
                entering={FadeInDown.delay(100).duration(400)}
                className="px-6 mb-6"
              >
                <SectionHeader title="Active Path" />
                <PremiumCard variant="elevated" glowColor={activePathData.theme}>
                  <View>
                    <View className="flex-row items-center mb-3">
                      <Text style={{ fontSize: 28 }}>{activePathData.icon}</Text>
                      <View className="ml-3 flex-1">
                        <Text
                          className="font-bold text-lg"
                          style={{ color: theme.text }}
                        >
                          {activePathData.title}
                        </Text>
                        <Text
                          className="font-sans text-sm"
                          style={{ color: theme.textSecondary }}
                        >
                          Day {activePath.currentDay} of {activePathData.duration}
                        </Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View
                      className="h-2 rounded-full overflow-hidden mb-3"
                      style={{
                        backgroundColor: theme.isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.06)',
                      }}
                    >
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${(activePath.completedDays.length / activePathData.duration) * 100}%`,
                          backgroundColor: activePathData.theme,
                        }}
                      />
                    </View>

                    <Text
                      className="font-sans text-xs mb-4"
                      style={{ color: theme.textSecondary }}
                    >
                      {activePath.completedDays.length} of {activePathData.duration} days
                      completed
                    </Text>

                    {/* Day dots */}
                    <View className="flex-row flex-wrap gap-2 mb-4">
                      {activePathData.days.map((day) => {
                        const isCompleted = activePath.completedDays.includes(day.day);
                        const isCurrent = day.day === activePath.currentDay;
                        return (
                          <View
                            key={day.day}
                            className="w-8 h-8 rounded-full items-center justify-center"
                            style={{
                              backgroundColor: isCompleted
                                ? activePathData.theme
                                : isCurrent
                                ? `${activePathData.theme}30`
                                : theme.isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.04)',
                              borderWidth: isCurrent ? 1.5 : 0,
                              borderColor: isCurrent ? activePathData.theme : 'transparent',
                            }}
                          >
                            {isCompleted ? (
                              <Check size={14} color="#FFFFFF" />
                            ) : (
                              <Text
                                className="font-semibold text-xs"
                                style={{
                                  color: isCurrent ? activePathData.theme : theme.textMuted,
                                }}
                              >
                                {day.day}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-3">
                      {activePath.isComplete ? (
                        <Pressable
                          accessibilityLabel="Complete path"
                          onPress={handleCompletePath}
                          className="flex-1 py-3 rounded-xl items-center active:scale-95"
                          style={{ backgroundColor: activePathData.theme }}
                        >
                          <Text className="font-semibold text-sm text-white">
                            Complete Path
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          accessibilityLabel="Close"
                          onPress={handleClose}
                          className="flex-1 py-3 rounded-xl items-center active:scale-95"
                          style={{ backgroundColor: activePathData.theme }}
                        >
                          <Text className="font-semibold text-sm text-white">
                            Continue Writing
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        accessibilityLabel="Abandon path"
                        onPress={handleAbandonPath}
                        className="py-3 px-4 rounded-xl items-center active:scale-95"
                        style={{
                          backgroundColor: theme.isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)',
                        }}
                      >
                        <RotateCcw size={16} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                </PremiumCard>
              </Animated.View>
            )}

            {/* Available Paths */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              className="px-6"
            >
              <SectionHeader
                title={activePath ? 'Other Paths' : 'Choose a Path'}
              />

              {JOURNALING_PATHS.map((path, index) => {
                const isActive = activePath?.pathId === path.id;
                const isCompleted = completedPaths.includes(path.id);

                if (isActive) return null;

                return (
                  <Animated.View
                    key={path.id}
                    entering={FadeIn.delay(250 + index * 50).duration(300)}
                  >
                    <PremiumCard
                      style={{ marginBottom: 12 }}
                      onPress={
                        activePath
                          ? undefined
                          : () => handleStartPath(path.id)
                      }
                    >
                      <View className="flex-row items-center">
                        <View
                          className="w-12 h-12 rounded-2xl items-center justify-center"
                          style={{
                            backgroundColor: `${path.theme}20`,
                          }}
                        >
                          <Text style={{ fontSize: 24 }}>{path.icon}</Text>
                        </View>

                        <View className="flex-1 ml-4">
                          <View className="flex-row items-center">
                            <Text
                              className="font-semibold text-base"
                              style={{ color: theme.text }}
                            >
                              {path.title}
                            </Text>
                            {isCompleted && (
                              <View
                                className="ml-2 px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${path.theme}20` }}
                              >
                                <Text
                                  className="font-semibold text-[10px]"
                                  style={{ color: path.theme }}
                                >
                                  Done
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            className="font-sans text-sm mt-0.5"
                            style={{ color: theme.textSecondary }}
                          >
                            {path.description}
                          </Text>
                          <Text
                            className="font-sans text-xs mt-1"
                            style={{ color: theme.textMuted }}
                          >
                            {path.duration} days
                          </Text>
                        </View>

                        {!activePath && (
                          <View
                            className="w-9 h-9 rounded-xl items-center justify-center"
                            style={{ backgroundColor: `${path.theme}15` }}
                          >
                            <Play
                              size={16}
                              color={path.theme}
                              fill={path.theme}
                            />
                          </View>
                        )}
                      </View>
                    </PremiumCard>
                  </Animated.View>
                );
              })}

              {activePath && (
                <Text
                  className="font-sans text-xs text-center mt-2"
                  style={{ color: theme.textMuted }}
                >
                  Complete or abandon your current path to start a new one
                </Text>
              )}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
