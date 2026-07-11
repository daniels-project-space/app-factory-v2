import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/lib/useColorScheme';
import { useSettingsStore, getThemeById } from '@/lib/state/settings-store';
import { PROMPT_CATEGORIES } from '@/lib/prompt-categories';
import { usePremiumStatus } from '@/lib/usePremium';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Heart,
  Search,
  Users,
  TrendingUp,
  Leaf,
  Sparkles,
  Clock,
  Check,
  Crown,
} from 'lucide-react-native';

// Map category icon strings to components
const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Heart,
  Search,
  Users,
  TrendingUp,
  Leaf,
  Sparkles,
  Clock,
};

export default function PromptCategoriesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isPremium } = usePremiumStatus();

  const themeId = useSettingsStore((s) => s.themeId);
  const selectedCategories = useSettingsStore((s) => s.selectedPromptCategories);
  const togglePromptCategory = useSettingsStore((s) => s.togglePromptCategory);
  const hapticFeedbackEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const theme = getThemeById(themeId);
  const colors = isDark ? theme.dark : theme.light;

  const handleBack = () => {
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleToggleCategory = (categoryId: string) => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    togglePromptCategory(categoryId);
  };

  const handleSelectAll = () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const allIds = PROMPT_CATEGORIES.map((c) => c.id);
    if (selectedCategories.length === allIds.length) {
      // Deselect all
      useSettingsStore.getState().setSelectedPromptCategories([]);
    } else {
      // Select all
      useSettingsStore.getState().setSelectedPromptCategories(allIds);
    }
  };

  const totalPrompts = selectedCategories.length > 0
    ? PROMPT_CATEGORIES.filter((c) => selectedCategories.includes(c.id))
        .reduce((sum, c) => sum + c.prompts.length, 0)
    : PROMPT_CATEGORIES.reduce((sum, c) => sum + c.prompts.length, 0);

  const allSelected = selectedCategories.length === PROMPT_CATEGORIES.length;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.gradient[0] }}>
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(300)}
          className="flex-row items-center justify-between px-6 pt-2 pb-4"
        >
          <Pressable
            onPress={handleBack}
            className="flex-row items-center active:opacity-70"
            accessibilityLabel="Back to settings"
            accessibilityRole="button"
          >
            <ChevronLeft size={24} color={isDark ? '#FAFAF8' : '#1A1A18'} />
            <Text
              className="text-base ml-1"
              style={{
                fontFamily: 'DMSans_500Medium',
                color: isDark ? '#FAFAF8' : '#1A1A18',
              }}
            >
              Settings
            </Text>
          </Pressable>

          {isPremium && (
            <Pressable
              onPress={handleSelectAll}
              className="px-3 py-1.5 rounded-full active:opacity-70"
              style={{ backgroundColor: colors.accentLight }}
              accessibilityLabel={allSelected ? 'Clear all categories' : 'Select all categories'}
              accessibilityRole="button"
            >
              <Text
                className="text-sm"
                style={{
                  fontFamily: 'DMSans_500Medium',
                  color: colors.accent,
                }}
              >
                {allSelected ? 'Clear All' : 'Select All'}
              </Text>
            </Pressable>
          )}
        </Animated.View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Title */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Text
              className="text-2xl mb-2"
              style={{
                fontFamily: 'DMSans_700Bold',
                color: isDark ? '#FAFAF8' : '#1A1A18',
              }}
            >
              Prompt Categories
            </Text>
            <Text
              className="text-base mb-6"
              style={{
                fontFamily: 'DMSans_400Regular',
                color: isDark ? 'rgba(250, 250, 248, 0.6)' : 'rgba(26, 26, 24, 0.6)',
              }}
            >
              Choose which types of prompts you'd like to receive. Each category has 200 unique prompts.
            </Text>
          </Animated.View>

          {/* Premium Badge */}
          {!isPremium && (
            <Animated.View entering={FadeInDown.duration(400).delay(150)}>
              <Pressable
                accessibilityLabel="Paywall"
                onPress={() => router.push('/paywall')}
                className="mb-6 overflow-hidden rounded-2xl active:opacity-90"
              >
                <BlurView
                  intensity={isDark ? 30 : 50}
                  tint={isDark ? 'dark' : 'light'}
                  className="p-4 flex-row items-center"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: colors.accentLight }}
                  >
                    <Crown size={20} color={colors.accent} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base"
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        color: isDark ? '#FAFAF8' : '#1A1A18',
                      }}
                    >
                      Premium Feature
                    </Text>
                    <Text
                      className="text-sm"
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        color: isDark ? 'rgba(250, 250, 248, 0.6)' : 'rgba(26, 26, 24, 0.6)',
                      }}
                    >
                      Upgrade to unlock 1,400 category prompts
                    </Text>
                  </View>
                  <ChevronLeft
                    size={20}
                    color={isDark ? 'rgba(250, 250, 248, 0.4)' : 'rgba(26, 26, 24, 0.4)'}
                    style={{ transform: [{ rotate: '180deg' }] }}
                  />
                </BlurView>
              </Pressable>
            </Animated.View>
          )}

          {/* Stats */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <BlurView
              intensity={isDark ? 30 : 50}
              tint={isDark ? 'dark' : 'light'}
              className="rounded-2xl overflow-hidden mb-6"
            >
              <View className="p-4 flex-row justify-between">
                <View className="items-center flex-1">
                  <Text
                    className="text-2xl"
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      color: colors.accent,
                    }}
                  >
                    {selectedCategories.length || 7}
                  </Text>
                  <Text
                    className="text-xs"
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      color: isDark ? 'rgba(250, 250, 248, 0.6)' : 'rgba(26, 26, 24, 0.6)',
                    }}
                  >
                    Categories
                  </Text>
                </View>
                <View className="items-center flex-1">
                  <Text
                    className="text-2xl"
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      color: colors.accent,
                    }}
                  >
                    {totalPrompts.toLocaleString()}
                  </Text>
                  <Text
                    className="text-xs"
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      color: isDark ? 'rgba(250, 250, 248, 0.6)' : 'rgba(26, 26, 24, 0.6)',
                    }}
                  >
                    Prompts Available
                  </Text>
                </View>
              </View>
            </BlurView>
          </Animated.View>

          {/* Category Cards */}
          <View className="gap-3">
            {PROMPT_CATEGORIES.map((category, index) => {
              const IconComponent = iconMap[category.icon] || Heart;
              const isSelected = selectedCategories.includes(category.id);

              return (
                <Animated.View
                  key={category.id}
                  entering={FadeInDown.duration(400).delay(250 + index * 50)}
                >
                  <Pressable
                    onPress={() => handleToggleCategory(category.id)}
                    className="overflow-hidden rounded-2xl active:opacity-90"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${category.name}: ${isSelected ? 'selected' : 'not selected'}`}
                  >
                    <BlurView
                      intensity={isDark ? 30 : 50}
                      tint={isDark ? 'dark' : 'light'}
                      className="p-4"
                    >
                      <View className="flex-row items-center">
                        {/* Icon */}
                        <View
                          className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                          style={{
                            backgroundColor: isSelected
                              ? colors.accent
                              : colors.accentLight,
                          }}
                        >
                          <IconComponent
                            size={24}
                            color={isSelected ? '#FFFFFF' : colors.accent}
                          />
                        </View>

                        {/* Content */}
                        <View className="flex-1">
                          <Text
                            className="text-base"
                            style={{
                              fontFamily: 'DMSans_600SemiBold',
                              color: isDark ? '#FAFAF8' : '#1A1A18',
                            }}
                          >
                            {category.name}
                          </Text>
                          <Text
                            className="text-sm"
                            style={{
                              fontFamily: 'DMSans_400Regular',
                              color: isDark
                                ? 'rgba(250, 250, 248, 0.6)'
                                : 'rgba(26, 26, 24, 0.6)',
                            }}
                          >
                            {category.description}
                          </Text>
                          <Text
                            className="text-xs mt-1"
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              color: colors.accent,
                            }}
                          >
                            {category.prompts.length} prompts
                          </Text>
                        </View>

                        {/* Checkbox */}
                        <View
                          className="w-6 h-6 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: isSelected
                              ? colors.accent
                              : 'transparent',
                            borderWidth: isSelected ? 0 : 2,
                            borderColor: isDark
                              ? 'rgba(250, 250, 248, 0.3)'
                              : 'rgba(26, 26, 24, 0.2)',
                          }}
                        >
                          {isSelected && <Check size={14} color="#FFFFFF" />}
                        </View>
                      </View>
                    </BlurView>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* Tips */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(600)}
            className="mt-6"
          >
            <BlurView
              intensity={isDark ? 20 : 40}
              tint={isDark ? 'dark' : 'light'}
              className="rounded-2xl overflow-hidden p-4"
            >
              <Text
                className="text-sm mb-2"
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  color: isDark ? '#FAFAF8' : '#1A1A18',
                }}
              >
                How it works
              </Text>
              <Text
                className="text-sm leading-5"
                style={{
                  fontFamily: 'DMSans_400Regular',
                  color: isDark ? 'rgba(250, 250, 248, 0.7)' : 'rgba(26, 26, 24, 0.7)',
                }}
              >
                • Select categories that resonate with you{'\n'}
                • Your daily prompt will come from your chosen categories{'\n'}
                • If no categories are selected, all prompts are used{'\n'}
                • Custom prompts are always included in the rotation
              </Text>
            </BlurView>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
