import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCallback } from 'react';
import { X, Check, BookOpen } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import {
  useSettingsStore,
  PHILOSOPHERS,
  PhilosopherId,
} from '@/lib/state/settings-store';

export default function PhilosopherGuideScreen() {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const selectedPhilosopher = useSettingsStore((s) => s.selectedPhilosopher);
  const setSelectedPhilosopher = useSettingsStore((s) => s.setSelectedPhilosopher);

  const handleClose = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [hapticEnabled]);

  const handleSelectPhilosopher = useCallback(
    (id: PhilosopherId) => {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setSelectedPhilosopher(id);
    },
    [hapticEnabled, setSelectedPhilosopher]
  );

  return (
    <View className="flex-1">
      <LinearGradient
        colors={theme.gradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4">
            <Pressable
              onPress={handleClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
              className="w-10 h-10 items-center justify-center rounded-full active:scale-95"
              style={{
                backgroundColor: theme.isDark ? 'rgba(42,42,40,0.6)' : 'rgba(232,235,228,0.6)',
              }}
            >
              <X size={20} color={theme.textSecondary} />
            </Pressable>

            <Text className="font-semibold text-lg" style={{ color: theme.text }}>
              Philosopher Guide
            </Text>

            <View className="w-10" />
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Intro Card */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <BlurView
                intensity={theme.isDark ? 40 : 60}
                tint={theme.isDark ? 'dark' : 'light'}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  marginBottom: 20,
                }}
              >
                <View className="p-5" style={{ backgroundColor: theme.card }}>
                  <View className="flex-row items-center mb-3">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: theme.accentLight }}
                    >
                      <BookOpen size={20} color={theme.accent} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-base" style={{ color: theme.text }}>
                        Choose Your Guide
                      </Text>
                      <Text
                        className="font-sans text-sm mt-0.5"
                        style={{ color: theme.textSecondary }}
                      >
                        A philosopher will shape your weekly AI insights
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="font-sans text-sm leading-relaxed"
                    style={{ color: theme.textSecondary }}
                  >
                    Each philosopher brings a unique perspective to help you reflect on your entries.
                    They will challenge your thinking and help you grow in different ways.
                  </Text>
                </View>
              </BlurView>
            </Animated.View>

            {/* Philosopher Cards */}
            {PHILOSOPHERS.map((philosopher, index) => {
              const isSelected = selectedPhilosopher === philosopher.id;

              return (
                <Animated.View
                  key={philosopher.id}
                  entering={FadeInDown.delay(150 + index * 50).duration(400)}
                >
                  <Pressable
                    accessibilityLabel="Pressable button"
                    onPress={() => handleSelectPhilosopher(philosopher.id)}
                    className="mb-3 active:scale-[0.98]"
                  >
                    <BlurView
                      intensity={theme.isDark ? 40 : 60}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? theme.accent : theme.cardBorder,
                      }}
                    >
                      <View className="p-4" style={{ backgroundColor: theme.card }}>
                        <View className="flex-row items-start">
                          {/* Emoji Avatar */}
                          <View
                            className="w-12 h-12 rounded-full items-center justify-center mr-3"
                            style={{
                              backgroundColor: isSelected
                                ? theme.accent
                                : theme.accentLight,
                            }}
                          >
                            <Text className="text-2xl">{philosopher.emoji}</Text>
                          </View>

                          {/* Info */}
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between">
                              <View>
                                <Text
                                  className="font-semibold text-base"
                                  style={{ color: theme.text }}
                                >
                                  {philosopher.name}
                                </Text>
                                <Text
                                  className="font-sans text-sm"
                                  style={{ color: theme.accent }}
                                >
                                  {philosopher.title}
                                </Text>
                              </View>

                              {isSelected && (
                                <View
                                  className="w-6 h-6 rounded-full items-center justify-center"
                                  style={{ backgroundColor: theme.accent }}
                                >
                                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              )}
                            </View>

                            <View
                              className="mt-2 px-2 py-1 rounded-full self-start"
                              style={{ backgroundColor: theme.accentLight }}
                            >
                              <Text
                                className="font-medium text-xs"
                                style={{ color: theme.accent }}
                              >
                                {philosopher.style}
                              </Text>
                            </View>

                            {/* Description based on id */}
                            <Text
                              className="font-sans text-sm mt-3 leading-relaxed"
                              style={{ color: theme.textSecondary }}
                            >
                              {philosopher.id === 'none' &&
                                'A gentle, supportive companion who offers warm encouragement and kind reflections on your journey.'}
                              {philosopher.id === 'nietzsche' &&
                                'Challenges you to overcome obstacles and create your own values. Sees struggles as the path to greatness.'}
                              {philosopher.id === 'aurelius' &&
                                'Teaches calm acceptance of what you cannot control. Finds tranquility through rational self-examination.'}
                              {philosopher.id === 'plato' &&
                                'Guides you through questions to discover deeper truths. Encourages the examined life.'}
                              {philosopher.id === 'schiller' &&
                                'Sees life as a work of art. Helps you find harmony between reason and emotion, duty and desire.'}
                              {philosopher.id === 'camus' &&
                                'Confronts life\'s absurdity with defiant joy. Creates meaning through living fully and refusing despair.'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </BlurView>
                  </Pressable>
                </Animated.View>
              );
            })}

            {/* Tip Card */}
            <Animated.View entering={FadeInDown.delay(500).duration(400)}>
              <BlurView
                intensity={theme.isDark ? 40 : 60}
                tint={theme.isDark ? 'dark' : 'light'}
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  marginTop: 12,
                }}
              >
                <View className="p-4" style={{ backgroundColor: theme.card }}>
                  <Text
                    className="font-semibold text-sm mb-2"
                    style={{ color: theme.text }}
                  >
                    How it works
                  </Text>
                  <Text
                    className="font-sans text-sm leading-relaxed"
                    style={{ color: theme.textSecondary }}
                  >
                    Your chosen philosopher will speak through your Weekly AI Reflection.
                    They'll analyze your entries and offer insights in their unique voice
                    and philosophical perspective, helping you see your thoughts in new ways.
                  </Text>
                </View>
              </BlurView>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
