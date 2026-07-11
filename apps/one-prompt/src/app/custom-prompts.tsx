import { View, Text, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCallback, useState, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, PenTool, Lightbulb } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, SlideInRight, SlideOutRight, Layout } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import ParticleBackground from '@/components/ParticleBackground';

// Example prompts for inspiration
const EXAMPLE_PROMPTS = [
  "What's one thing I'm avoiding that I should face?",
  "What would my younger self think of where I am now?",
  "What's a fear I'd like to overcome?",
  "What's one habit I want to build?",
  "What brings me energy?",
  "What drains my energy?",
  "What am I overthinking right now?",
  "What would I do if I wasn't afraid?",
  "What's a belief I've outgrown?",
  "What's something I need to forgive myself for?",
];

export default function CustomPromptsScreen() {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const customPrompts = useSettingsStore((s) => s.customPrompts);
  const addCustomPrompt = useSettingsStore((s) => s.addCustomPrompt);
  const removeCustomPrompt = useSettingsStore((s) => s.removeCustomPrompt);

  const [newPrompt, setNewPrompt] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleBack = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [hapticEnabled]);

  const handleAddPrompt = useCallback(() => {
    const trimmed = newPrompt.trim();
    if (!trimmed) {
      Alert.alert('Empty Prompt', 'Please enter a prompt before adding.');
      return;
    }

    if (trimmed.length < 10) {
      Alert.alert('Too Short', 'Your prompt should be at least 10 characters long.');
      return;
    }

    if (customPrompts.includes(trimmed)) {
      Alert.alert('Duplicate', 'You already have this prompt saved.');
      return;
    }

    if (hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    addCustomPrompt(trimmed);
    setNewPrompt('');
    setIsAdding(false);
  }, [newPrompt, customPrompts, addCustomPrompt, hapticEnabled]);

  const handleRemovePrompt = useCallback((index: number) => {
    Alert.alert(
      'Remove Prompt',
      'Are you sure you want to remove this prompt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (hapticEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            removeCustomPrompt(index);
          },
        },
      ]
    );
  }, [removeCustomPrompt, hapticEnabled]);

  const handleUseExample = useCallback((example: string) => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setNewPrompt(example);
    setShowExamples(false);
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [hapticEnabled]);

  const handleStartAdding = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [hapticEnabled]);

  const handleCancelAdding = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsAdding(false);
    setNewPrompt('');
  }, [hapticEnabled]);

  const toggleExamples = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowExamples(prev => !prev);
  }, [hapticEnabled]);

  return (
    <View className="flex-1">
      <LinearGradient colors={theme.gradient as [string, string, string]} style={{ flex: 1 }}>
        <ParticleBackground />
        <SafeAreaView className="flex-1" edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center px-6 pt-4 pb-4">
            <Pressable
              onPress={handleBack}
              className="w-10 h-10 items-center justify-center rounded-full mr-3 active:scale-95"
              style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.5)' : 'rgba(232,235,228,0.5)' }}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <ArrowLeft size={20} color={theme.text} />
            </Pressable>
            <View className="flex-1">
              <Text className="font-bold text-xl tracking-tight" style={{ color: theme.text }}>
                Custom Prompts
              </Text>
              <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                {customPrompts.length} {customPrompts.length === 1 ? 'prompt' : 'prompts'} saved
              </Text>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <ScrollView
              className="flex-1 px-6"
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Info Card */}
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <BlurView
                  intensity={theme.isDark ? 40 : 60}
                  tint={theme.isDark ? 'dark' : 'light'}
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ backgroundColor: theme.card }} className="p-4">
                    <View className="flex-row items-center mb-3">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: theme.accentLight }}
                      >
                        <PenTool size={20} color={theme.accent} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-base" style={{ color: theme.text }}>
                          Your Personal Prompts
                        </Text>
                        <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                          Added to the daily rotation
                        </Text>
                      </View>
                    </View>
                    <Text className="font-sans text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                      Create prompts that resonate with you. They'll appear randomly alongside the default prompts, making your journaling more personal.
                    </Text>
                  </View>
                </BlurView>
              </Animated.View>

              {/* Add New Prompt Section */}
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <BlurView
                  intensity={theme.isDark ? 40 : 60}
                  tint={theme.isDark ? 'dark' : 'light'}
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: isAdding ? theme.accent : theme.cardBorder,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ backgroundColor: theme.card }} className="p-4">
                    {isAdding ? (
                      <View>
                        <Text className="font-semibold text-base mb-3" style={{ color: theme.text }}>
                          Write your prompt
                        </Text>
                        <TextInput
                          ref={inputRef}
                          value={newPrompt}
                          onChangeText={setNewPrompt}
                          placeholder="e.g., What am I grateful for today?"
                          placeholderTextColor={theme.textMuted}
                          multiline
                          maxLength={200}
                          className="font-sans text-base p-4 rounded-xl min-h-[80px]"
                          style={{
                            color: theme.text,
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            textAlignVertical: 'top',
                          }}
                        />
                        <Text className="font-sans text-xs text-right mt-2" style={{ color: theme.textMuted }}>
                          {newPrompt.length}/200
                        </Text>

                        <View className="flex-row gap-3 mt-3">
                          <Pressable
                            onPress={handleCancelAdding}
                            className="flex-1 py-3 rounded-xl items-center"
                            style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                            accessibilityLabel="Cancel adding prompt"
                            accessibilityRole="button"
                          >
                            <Text className="font-medium text-base" style={{ color: theme.textSecondary }}>
                              Cancel
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={handleAddPrompt}
                            className="flex-1 py-3 rounded-xl items-center"
                            style={{ backgroundColor: theme.accent }}
                            accessibilityLabel="Add prompt"
                            accessibilityRole="button"
                          >
                            <Text className="font-semibold text-base text-white">
                              Add Prompt
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        onPress={handleStartAdding}
                        className="flex-row items-center justify-center py-4"
                        accessibilityLabel="Add a new prompt"
                        accessibilityRole="button"
                      >
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: theme.accentLight }}
                        >
                          <Plus size={18} color={theme.accent} />
                        </View>
                        <Text className="font-semibold text-base" style={{ color: theme.accent }}>
                          Add a new prompt
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </BlurView>
              </Animated.View>

              {/* Need Ideas Section */}
              <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                <Pressable
                  onPress={toggleExamples}
                  accessibilityLabel="Toggle example prompts"
                  accessibilityRole="button"
                >
                  <BlurView
                    intensity={theme.isDark ? 40 : 60}
                    tint={theme.isDark ? 'dark' : 'light'}
                    style={{
                      borderRadius: 20,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: showExamples ? theme.accent : theme.cardBorder,
                      marginBottom: 16,
                    }}
                  >
                    <View style={{ backgroundColor: theme.card }} className="p-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <View
                            className="w-8 h-8 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: theme.isDark ? 'rgba(255,200,100,0.15)' : 'rgba(255,180,70,0.15)' }}
                          >
                            <Lightbulb size={16} color="#FFB347" />
                          </View>
                          <Text className="font-medium text-base" style={{ color: theme.text }}>
                            Need inspiration?
                          </Text>
                        </View>
                        <Text className="font-sans text-sm" style={{ color: theme.accent }}>
                          {showExamples ? 'Hide' : 'Show examples'}
                        </Text>
                      </View>

                      {showExamples && (
                        <View className="mt-4">
                          {EXAMPLE_PROMPTS.map((example, index) => (
                            <Animated.View
                              key={example}
                              entering={FadeIn.delay(index * 50).duration(300)}
                            >
                              <Pressable
                                onPress={() => handleUseExample(example)}
                                className="flex-row items-center py-3 border-t"
                                style={{ borderTopColor: theme.cardBorder }}
                                accessibilityLabel={`Use example: ${example}`}
                                accessibilityRole="button"
                              >
                                <Text
                                  className="font-sans text-sm flex-1"
                                  style={{ color: theme.textSecondary }}
                                  numberOfLines={2}
                                >
                                  "{example}"
                                </Text>
                                <Text className="font-sans text-xs ml-2" style={{ color: theme.accent }}>
                                  Use
                                </Text>
                              </Pressable>
                            </Animated.View>
                          ))}
                        </View>
                      )}
                    </View>
                  </BlurView>
                </Pressable>
              </Animated.View>

              {/* Your Prompts List */}
              {customPrompts.length > 0 && (
                <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                  <Text className="font-semibold text-base mb-3" style={{ color: theme.text }}>
                    Your Prompts
                  </Text>

                  {customPrompts.map((prompt, index) => (
                    <Animated.View
                      key={`${prompt}-${index}`}
                      entering={SlideInRight.delay(index * 50).duration(300)}
                      exiting={SlideOutRight.duration(200)}
                      layout={Layout.springify()}
                    >
                      <BlurView
                        intensity={theme.isDark ? 40 : 60}
                        tint={theme.isDark ? 'dark' : 'light'}
                        style={{
                          borderRadius: 16,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: theme.cardBorder,
                          marginBottom: 12,
                        }}
                      >
                        <View
                          style={{ backgroundColor: theme.card }}
                          className="p-4 flex-row items-start"
                        >
                          <Text
                            className="font-sans text-base flex-1 leading-relaxed"
                            style={{ color: theme.text }}
                          >
                            "{prompt}"
                          </Text>
                          <Pressable
                            onPress={() => handleRemovePrompt(index)}
                            className="w-11 h-11 items-center justify-center rounded-full ml-3"
                            style={{ backgroundColor: theme.isDark ? 'rgba(224,122,95,0.15)' : 'rgba(224,122,95,0.1)' }}
                            accessibilityLabel={`Remove prompt: ${prompt}`}
                            accessibilityRole="button"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={16} color="#E07A5F" />
                          </Pressable>
                        </View>
                      </BlurView>
                    </Animated.View>
                  ))}
                </Animated.View>
              )}

              {/* Empty State */}
              {customPrompts.length === 0 && !isAdding && (
                <Animated.View
                  entering={FadeInDown.delay(400).duration(400)}
                  className="items-center py-8"
                >
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                  >
                    <PenTool size={32} color={theme.textSecondary} />
                  </View>
                  <Text className="font-semibold text-base text-center mb-2" style={{ color: theme.text }}>
                    No custom prompts yet
                  </Text>
                  <Text className="font-sans text-sm text-center" style={{ color: theme.textSecondary }}>
                    Add your own prompts to make your{'\n'}journaling experience more personal
                  </Text>
                </Animated.View>
              )}

              {/* Tips */}
              <Animated.View entering={FadeInDown.delay(500).duration(400)} className="mt-4">
                <BlurView
                  intensity={theme.isDark ? 40 : 60}
                  tint={theme.isDark ? 'dark' : 'light'}
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <View style={{ backgroundColor: theme.card }} className="p-4">
                    <Text className="font-semibold text-sm mb-2" style={{ color: theme.text }}>
                      Tips for great prompts
                    </Text>
                    <View className="gap-2">
                      <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                        {'\u2022'} Start with "What", "How", or "Why"
                      </Text>
                      <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                        {'\u2022'} Keep them open-ended
                      </Text>
                      <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                        {'\u2022'} Focus on feelings, growth, or gratitude
                      </Text>
                      <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                        {'\u2022'} Make them personal to your journey
                      </Text>
                    </View>
                  </View>
                </BlurView>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
