import { View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { X, Sparkles, Calendar, TrendingUp, Heart, RefreshCw, Lock, ChevronDown, ChevronLeft, ChevronRight, Camera } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore, PhilosopherId, JournalingGoalId } from '@/lib/state/settings-store';
import { useJournalStore, JournalEntry } from '@/lib/state/journal-store';
import { usePremiumStatus } from '@/lib/usePremium';
import {
  generateLocalReflection,
  LOCAL_REFLECTION_ENGINE_VERSION,
  LocalReflection,
  reflectionInputHash,
} from '@/lib/local-reflection';

const REFLECTION_CACHE_KEY = 'one_prompt_reflection_cache';

interface ReflectionCache {
  engineVersion: number;
  entriesHash: string;
  philosopher: string;
  goals: string[];
  variant: number;
  reflection: LocalReflection;
  cachedAt: number;
}

function hashEntries(entries: JournalEntry[], philosopher: string, goals: string[]): string {
  return reflectionInputHash(entries, philosopher as PhilosopherId, goals as JournalingGoalId[]);
}

async function loadCachedReflection(
  entries: JournalEntry[],
  philosopher: string,
  goals: string[]
): Promise<ReflectionCache | null> {
  try {
    const raw = await AsyncStorage.getItem(REFLECTION_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as ReflectionCache;
    const currentHash = hashEntries(entries, philosopher, goals);
    if (cache.engineVersion !== LOCAL_REFLECTION_ENGINE_VERSION || cache.entriesHash !== currentHash) return null;
    return cache;
  } catch {
    return null;
  }
}

async function saveReflectionCache(
  reflection: LocalReflection,
  entries: JournalEntry[],
  philosopher: string,
  goals: string[],
  variant: number,
): Promise<void> {
  try {
    const cache: ReflectionCache = {
      engineVersion: LOCAL_REFLECTION_ENGINE_VERSION,
      entriesHash: hashEntries(entries, philosopher, goals),
      philosopher,
      goals,
      variant,
      reflection,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(REFLECTION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Non-critical — cache write failure is acceptable
  }
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to get the start of the current week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to format date range
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

interface DailyMood {
  date: string;
  dayLabel: string;
  score: number; // 1-5 scale
  moodLabel: string;
  hasEntry: boolean;
}

// Enhanced mood scoring based on comprehensive content analysis
function analyzeMoodFromContent(content: string): { score: number; label: string } {
  const text = content.toLowerCase();
  const words = text.split(/\s+/);
  const wordCount = words.length;

  // Return neutral for very short or empty entries
  if (wordCount < 3) {
    return { score: 3, label: 'Brief' };
  }

  // Comprehensive sentiment word lists with precise weights
  const sentimentWords: Record<string, { words: string[]; weight: number }> = {
    // Extremely positive (5.0 indicators)
    ecstatic: {
      words: ['ecstatic', 'elated', 'euphoric', 'overjoyed', 'thrilled', 'blissful', 'exhilarated', 'amazing', 'incredible', 'best day', 'perfect day', 'life-changing', 'breakthrough'],
      weight: 2.0
    },
    // Very positive (4.5 indicators)
    joyful: {
      words: ['wonderful', 'fantastic', 'delighted', 'blessed', 'magical', 'extraordinary', 'beautiful', 'loving', 'cherish', 'treasure', 'brilliant', 'spectacular'],
      weight: 1.5
    },
    // Positive (4.0 indicators)
    happy: {
      words: ['happy', 'great', 'excellent', 'grateful', 'thankful', 'joy', 'excited', 'proud', 'accomplished', 'celebrate', 'success', 'achieved', 'won', 'loved', 'enjoyed', 'fun', 'lovely'],
      weight: 1.0
    },
    // Mildly positive (3.5-3.8 indicators)
    content: {
      words: ['good', 'nice', 'pleasant', 'peaceful', 'calm', 'relaxed', 'satisfied', 'comfortable', 'hopeful', 'optimistic', 'confident', 'warm', 'cozy', 'refreshed', 'appreciate', 'glad', 'smile'],
      weight: 0.6
    },
    // Neutral (3.0 indicators)
    neutral: {
      words: ['okay', 'fine', 'alright', 'normal', 'usual', 'ordinary', 'average', 'uneventful', 'routine', 'standard', 'typical'],
      weight: 0
    },
    // Mildly negative (2.5-2.8 indicators)
    uneasy: {
      words: ['uncertain', 'unsure', 'worried', 'concerned', 'nervous', 'uneasy', 'restless', 'confused', 'doubtful', 'hesitant', 'uncomfortable', 'off', 'meh', 'blah'],
      weight: -0.6
    },
    // Negative (2.0-2.5 indicators)
    sad: {
      words: ['sad', 'tired', 'exhausted', 'stressed', 'anxious', 'frustrated', 'disappointed', 'lonely', 'down', 'drained', 'overwhelmed', 'difficult', 'hard', 'challenging', 'tough', 'struggle', 'failed', 'lost', 'hurt', 'upset', 'annoyed'],
      weight: -1.0
    },
    // Very negative (1.5-2.0 indicators)
    distressed: {
      words: ['terrible', 'awful', 'horrible', 'miserable', 'depressed', 'devastated', 'hopeless', 'despairing', 'anguish', 'suffering', 'crying', 'cried', 'worst', 'hate', 'angry', 'furious', 'rage', 'broken', 'shattered'],
      weight: -1.5
    },
    // Extremely negative (1.0-1.5 indicators)
    crisis: {
      words: ['unbearable', 'suicidal', 'worthless', 'helpless', 'trapped', 'nightmare', 'trauma', 'panic', 'terror', 'destroyed', 'ruined'],
      weight: -2.0
    }
  };

  // Intensity modifiers
  const intensifiers: Record<string, number> = {
    'very': 1.3, 'really': 1.3, 'so': 1.25, 'extremely': 1.5, 'incredibly': 1.5,
    'absolutely': 1.4, 'completely': 1.4, 'totally': 1.3, 'truly': 1.2,
    'quite': 1.15, 'pretty': 1.1, 'fairly': 1.05, 'super': 1.4
  };

  const diminishers: Record<string, number> = {
    'slightly': 0.6, 'somewhat': 0.7, 'a bit': 0.7, 'a little': 0.7,
    'kind of': 0.75, 'sort of': 0.75, 'barely': 0.5, 'hardly': 0.5
  };

  // Negation words that flip sentiment
  const negations = ['not', "n't", 'never', 'no', 'without', 'lack', 'lacking', 'absence'];

  // Calculate base sentiment score
  let totalWeight = 0;
  let matchCount = 0;

  // Check for sentiment words
  for (const [, { words: sentimentWordList, weight }] of Object.entries(sentimentWords)) {
    for (const word of sentimentWordList) {
      if (text.includes(word)) {
        // Check for negation before the word
        const wordIndex = text.indexOf(word);
        const precedingText = text.substring(Math.max(0, wordIndex - 20), wordIndex);
        const hasNegation = negations.some(neg => precedingText.includes(neg));

        // Check for intensifiers
        let intensityMult = 1;
        for (const [intensifier, mult] of Object.entries(intensifiers)) {
          if (precedingText.includes(intensifier)) {
            intensityMult = mult;
            break;
          }
        }
        for (const [diminisher, mult] of Object.entries(diminishers)) {
          if (precedingText.includes(diminisher)) {
            intensityMult = mult;
            break;
          }
        }

        // Apply negation (flips the sentiment)
        const effectiveWeight = hasNegation ? -weight * 0.7 : weight;
        totalWeight += effectiveWeight * intensityMult;
        matchCount++;
      }
    }
  }

  // Additional contextual analysis
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _capsRatio = (content.match(/[A-Z]/g) || []).length / Math.max(content.length, 1);

  // Exclamations often indicate stronger emotion (positive or negative)
  if (exclamationCount > 0 && totalWeight !== 0) {
    totalWeight *= 1 + (exclamationCount * 0.1);
  }

  // Lots of questions might indicate uncertainty
  if (questionCount > 2) {
    totalWeight -= 0.2;
  }

  // Check for phrases that indicate specific mood states
  const phraseIndicators: { pattern: RegExp; weight: number }[] = [
    { pattern: /can't wait|looking forward|excited about/i, weight: 0.8 },
    { pattern: /proud of myself|did it|made it|finally/i, weight: 0.9 },
    { pattern: /grateful for|thankful for|appreciate/i, weight: 0.7 },
    { pattern: /best (day|thing|moment)/i, weight: 1.2 },
    { pattern: /worst (day|thing|moment)/i, weight: -1.2 },
    { pattern: /couldn't sleep|can't sleep|insomnia/i, weight: -0.6 },
    { pattern: /feel(ing)? (alone|lonely|isolated)/i, weight: -0.9 },
    { pattern: /feel(ing)? (loved|supported|appreciated)/i, weight: 0.9 },
    { pattern: /want(ed)? to cry|broke down/i, weight: -1.0 },
    { pattern: /made me smile|brought me joy/i, weight: 0.8 },
    { pattern: /gave up|giving up|quit/i, weight: -0.8 },
    { pattern: /keep(ing)? going|push(ing)? through|persever/i, weight: 0.4 },
    { pattern: /no energy|drained|burned out/i, weight: -0.7 },
    { pattern: /full of energy|energized|motivated/i, weight: 0.7 },
  ];

  for (const { pattern, weight } of phraseIndicators) {
    if (pattern.test(text)) {
      totalWeight += weight;
      matchCount++;
    }
  }

  // Calculate final score
  // Base score of 3, then adjust based on weighted sentiment
  // Use logarithmic scaling to prevent extreme swings from multiple keywords
  let baseAdjustment: number;
  if (matchCount === 0) {
    // No sentiment words found - default to neutral
    baseAdjustment = 0;
  } else {
    // Average the weight and apply a scaling factor
    const avgWeight = totalWeight / matchCount;
    // Scale adjustment: max ±2 points from neutral
    baseAdjustment = Math.tanh(avgWeight * 0.8) * 2;
  }

  let score = 3 + baseAdjustment;

  // Ensure score stays within 1-5 bounds
  score = Math.max(1, Math.min(5, score));

  // Round to one decimal place
  score = Math.round(score * 10) / 10;

  // Determine mood label based on score with more granular labels
  let label: string;
  if (score >= 4.5) label = 'Joyful';
  else if (score >= 4.0) label = 'Happy';
  else if (score >= 3.6) label = 'Content';
  else if (score >= 3.3) label = 'Peaceful';
  else if (score >= 2.8) label = 'Reflective';
  else if (score >= 2.4) label = 'Uneasy';
  else if (score >= 2.0) label = 'Struggling';
  else if (score >= 1.5) label = 'Low';
  else label = 'Difficult';

  return { score, label };
}

// Generate daily mood data for the week
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

// Mood Graph Component with swipe navigation
interface MoodGraphProps {
  moodData: DailyMood[];
  theme: ReturnType<typeof useAppTheme>;
  expanded: boolean;
  entries: JournalEntry[];
  onWeekChange?: (weekOffset: number) => void;
}

function MoodGraph({ moodData: initialMoodData, theme, expanded, entries, onWeekChange }: MoodGraphProps) {
  const graphHeight = 120;
  const graphWidth = SCREEN_WIDTH - 96; // Account for padding
  const barWidth = (graphWidth - 48) / 7;

  // Week navigation state
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const translateX = useSharedValue(0);
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  // Calculate the week start for the current offset
  const getWeekStartForOffset = useCallback((offset: number): Date => {
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    const targetWeek = new Date(currentWeekStart);
    targetWeek.setDate(targetWeek.getDate() + (offset * 7));
    return targetWeek;
  }, []);

  // Generate mood data for a specific week
  const getMoodDataForWeek = useCallback((offset: number): DailyMood[] => {
    const weekStart = getWeekStartForOffset(offset);
    return generateWeeklyMoodData(entries, weekStart);
  }, [entries, getWeekStartForOffset]);

  // Current displayed mood data
  const currentMoodData = useMemo(() => {
    return getMoodDataForWeek(weekOffset);
  }, [weekOffset, getMoodDataForWeek]);

  // Format week label
  const weekLabel = useMemo(() => {
    const weekStart = getWeekStartForOffset(weekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (weekOffset === 0) {
      return 'This Week';
    } else if (weekOffset === -1) {
      return 'Last Week';
    } else {
      return formatDateRange(weekStart, weekEnd);
    }
  }, [weekOffset, getWeekStartForOffset]);

  // Check if there are entries in previous weeks
  const hasOlderEntries = useMemo(() => {
    const oldestWeekStart = getWeekStartForOffset(weekOffset - 1);
    const oldestWeekEnd = new Date(oldestWeekStart);
    oldestWeekEnd.setDate(oldestWeekEnd.getDate() + 6);

    return entries.some(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= oldestWeekStart && entryDate <= oldestWeekEnd;
    });
  }, [entries, weekOffset, getWeekStartForOffset]);

  // Navigate weeks
  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'next' && weekOffset >= 0) return; // Can't go to future
    if (direction === 'prev' && !hasOlderEntries) return; // No older data

    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newOffset = direction === 'prev' ? weekOffset - 1 : weekOffset + 1;
    setWeekOffset(newOffset);
    onWeekChange?.(newOffset);
  }, [weekOffset, hasOlderEntries, hapticEnabled, onWeekChange]);

  // Swipe gesture handler
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const threshold = 50;

      if (event.translationX > threshold && hasOlderEntries) {
        // Swipe right - go to previous week
        runOnJS(navigateWeek)('prev');
      } else if (event.translationX < -threshold && weekOffset < 0) {
        // Swipe left - go to next week (toward current)
        runOnJS(navigateWeek)('next');
      }

      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 0.3 }],
  }));

  // Get mood color based on score
  const getMoodColor = (score: number): string => {
    if (score >= 4) return '#22C55E'; // Green
    if (score >= 3.2) return '#84CC16'; // Lime
    if (score >= 2.5) return '#EAB308'; // Yellow
    if (score >= 1.8) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  // Get entries with mood data only
  const entriesWithMood = currentMoodData.filter(d => d.hasEntry);
  const averageMood = entriesWithMood.length > 0
    ? entriesWithMood.reduce((sum, d) => sum + d.score, 0) / entriesWithMood.length
    : 0;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View className="mt-4" style={animatedStyle}>
        {/* Week navigation header */}
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={() => navigateWeek('prev')}
            accessibilityLabel="Previous week"
            disabled={!hasOlderEntries}
            className="p-2 -ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft
              size={20}
              color={hasOlderEntries ? theme.accent : theme.textSecondary}
              style={{ opacity: hasOlderEntries ? 1 : 0.3 }}
            />
          </Pressable>

          <View className="items-center">
            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
              {weekLabel}
            </Text>
            {weekOffset !== 0 && (
              <Text className="text-xs" style={{ color: theme.textSecondary }}>
                Swipe to navigate
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => navigateWeek('next')}
            accessibilityLabel="Next week"
            disabled={weekOffset >= 0}
            className="p-2 -mr-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronRight
              size={20}
              color={weekOffset < 0 ? theme.accent : theme.textSecondary}
              style={{ opacity: weekOffset < 0 ? 1 : 0.3 }}
            />
          </Pressable>
        </View>

        {/* Mood scale labels */}
        <View className="flex-row justify-between mb-2 px-1">
          <Text className="text-xs" style={{ color: theme.textSecondary }}>Low</Text>
          <Text className="text-xs" style={{ color: theme.textSecondary }}>High</Text>
        </View>

        {/* Graph container */}
        <View className="relative" style={{ height: graphHeight }}>
          {/* Horizontal grid lines */}
          {[1, 2, 3, 4, 5].map((line) => (
            <View
              key={line}
              className="absolute left-0 right-0"
              style={{
                top: graphHeight - (line / 5) * graphHeight,
                height: 1,
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }}
            />
          ))}

          {/* Bars */}
          <View className="flex-row justify-between items-end h-full px-1">
            {currentMoodData.map((day, index) => {
              const barHeight = day.hasEntry ? (day.score / 5) * (graphHeight - 20) : 0;

              return (
                <View key={day.date} className="items-center" style={{ width: barWidth }}>
                  {/* Bar */}
                  <View
                    className="rounded-t-lg"
                    style={{
                      width: barWidth - 8,
                      height: day.hasEntry ? Math.max(barHeight, 8) : 4,
                      backgroundColor: day.hasEntry
                        ? getMoodColor(day.score)
                        : theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      opacity: day.hasEntry ? 1 : 0.5,
                    }}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Day labels */}
        <View className="flex-row justify-between mt-2 px-1">
          {currentMoodData.map((day) => (
            <View key={day.date} className="items-center" style={{ width: barWidth }}>
              <Text
                className="text-xs font-medium"
                style={{ color: day.hasEntry ? theme.text : theme.textSecondary }}
              >
                {day.dayLabel}
              </Text>
            </View>
          ))}
        </View>

        {/* Legend / Stats */}
        <View className="flex-row justify-between items-center mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <View>
            <Text className="text-xs" style={{ color: theme.textSecondary }}>Average mood</Text>
            <Text className="text-lg font-semibold" style={{ color: theme.text }}>
              {averageMood > 0 ? averageMood.toFixed(1) : '—'} <Text className="text-sm font-normal" style={{ color: theme.textSecondary }}>/ 5</Text>
            </Text>
          </View>

          <View className="items-end">
            <Text className="text-xs" style={{ color: theme.textSecondary }}>Days logged</Text>
            <Text className="text-lg font-semibold" style={{ color: theme.text }}>
              {entriesWithMood.length} <Text className="text-sm font-normal" style={{ color: theme.textSecondary }}>/ 7</Text>
            </Text>
          </View>
        </View>

        {/* Daily mood details */}
        {entriesWithMood.length > 0 && (
          <View className="mt-4">
            <Text className="text-xs uppercase tracking-wide mb-2" style={{ color: theme.textSecondary }}>Daily breakdown</Text>
            {currentMoodData.filter(d => d.hasEntry).map((day) => (
              <View
                key={day.date}
                className="flex-row items-center justify-between py-2"
                style={{ borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
              >
                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: getMoodColor(day.score) }}
                  />
                  <Text className="text-sm" style={{ color: theme.text }}>
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-sm font-medium mr-2" style={{ color: theme.text }}>
                    {day.moodLabel}
                  </Text>
                  <Text className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: getMoodColor(day.score) + '20', color: getMoodColor(day.score) }}>
                    {day.score.toFixed(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty week state */}
        {entriesWithMood.length === 0 && (
          <View className="items-center py-4">
            <Text className="text-sm" style={{ color: theme.textSecondary }}>
              No entries this week
            </Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default function WeeklyReflectionScreen() {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const moodTrackingEnabled = useSettingsStore((s) => s.moodTrackingEnabled);
  const selectedPhilosopher = useSettingsStore((s) => s.selectedPhilosopher);
  const journalingGoals = useSettingsStore((s) => s.journalingGoals);
  const entries = useJournalStore((s) => s.entries);
  const { isPremium } = usePremiumStatus();

  const [isGenerating, setIsGenerating] = useState(true);
  const [reflection, setReflection] = useState<LocalReflection | null>(null);
  const [canRefresh, setCanRefresh] = useState(false);
  const [moodExpanded, setMoodExpanded] = useState(false);

  // Animation values for mood expansion
  const moodExpandProgress = useSharedValue(0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _moodCardAnimatedStyle = useAnimatedStyle(() => ({
    overflow: 'hidden' as const,
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(moodExpandProgress.value, [0, 1], [0, 180])}deg` }],
  }));

  // Get this week's entries
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

  // Generate mood data for the graph
  const moodData = useMemo(() => {
    return generateWeeklyMoodData(entries, weekData.start);
  }, [entries, weekData.start]);

  // Toggle mood expansion
  const toggleMoodExpanded = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMoodExpanded(prev => !prev);
    moodExpandProgress.value = withSpring(moodExpanded ? 0 : 1, {
      damping: 22,
      stiffness: 150,
    });
  }, [hapticEnabled, moodExpanded, moodExpandProgress]);

  // Generate reflection — serves from cache if entries unchanged, otherwise generates fresh
  const generateReflection = useCallback(async (forceRefresh = false) => {
    setIsGenerating(true);
    setCanRefresh(false);

    const cached = await loadCachedReflection(weekData.entries, selectedPhilosopher, journalingGoals);
    if (!forceRefresh && cached) {
        setReflection(cached.reflection);
        setIsGenerating(false);
        setCanRefresh(true);
        return;
    }

    const variant = forceRefresh ? (cached?.variant ?? -1) + 1 : 0;
    const result = generateLocalReflection(weekData.entries, selectedPhilosopher, journalingGoals, variant);
    setReflection(result);
    setIsGenerating(false);
    setCanRefresh(true);

    // Persist for next visit (fire-and-forget)
    saveReflectionCache(result, weekData.entries, selectedPhilosopher, journalingGoals, variant);

    if (hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [weekData.entries, hapticEnabled, selectedPhilosopher, journalingGoals]);

  useEffect(() => {
    generateReflection();
  }, []);

  const handleRefresh = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    generateReflection(true);
  }, [generateReflection, hapticEnabled]);

  const handleClose = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [hapticEnabled]);

  const handleUpgrade = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/paywall');
  }, [hapticEnabled]);

  // Generate reflection for preview (non-premium users)
  const previewReflection = useMemo(() => {
    if (weekData.entries.length === 0) {
      return {
        summary: 'Start writing daily thoughts to unlock your personalized weekly reflection.',
        theme: 'New beginnings',
        mood: 'Hopeful',
        encouragement: 'Every journey begins with a single thought.',
      };
    }
    return generateLocalReflection(weekData.entries, selectedPhilosopher, journalingGoals);
  }, [weekData.entries, selectedPhilosopher, journalingGoals]);

  // Show blurred preview for non-premium users
  if (!isPremium) {
    return (
      <View className="flex-1">
        <LinearGradient
          colors={theme.gradient}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView className="flex-1">
            {/* Close Button */}
            <Pressable
              onPress={handleClose}
              className="absolute top-14 right-5 z-10 w-10 h-10 items-center justify-center rounded-full active:scale-95"
              style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.6)' : 'rgba(232,235,228,0.6)' }}
              accessibilityLabel="Close weekly reflection"
              accessibilityRole="button"
            >
              <X size={20} color={theme.textSecondary} />
            </Pressable>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <Animated.View entering={FadeInDown.delay(100).duration(400)} className="items-center mb-8">
                <View
                  className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
                  style={{ backgroundColor: theme.accentLight }}
                >
                  <Sparkles size={32} color={theme.accent} />
                </View>

                <Text className="font-bold text-2xl text-center" style={{ color: theme.text }}>
                  Weekly Reflection
                </Text>

                <View className="flex-row items-center mt-2">
                  <Calendar size={14} color={theme.textSecondary} />
                  <Text className="font-sans text-sm ml-1.5" style={{ color: theme.textSecondary }}>
                    {weekData.dateRange}
                  </Text>
                </View>
              </Animated.View>

              {/* Blurred Preview Content */}
              <View className="relative">
                {/* Summary Card - Blurred */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                  <View className="relative overflow-hidden rounded-[20px] mb-4">
                    <BlurView
                      intensity={theme.isDark ? 18 : 45}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        borderRadius: 20,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {/* Side glow accents */}
                      <View
                        style={{
                          position: 'absolute',
                          top: 20,
                          bottom: 20,
                          left: 0,
                          width: 1,
                          backgroundColor: theme.isDark ? 'rgba(120,180,255,0.06)' : 'transparent',
                          zIndex: 10,
                        }}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          top: 20,
                          bottom: 20,
                          right: 0,
                          width: 1,
                          backgroundColor: theme.isDark ? 'rgba(180,120,255,0.06)' : 'transparent',
                          zIndex: 10,
                        }}
                      />
                      <View className="p-5" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.75)' : 'rgba(255,255,255,0.75)' }}>
                        <Text className="font-semibold text-lg mb-3" style={{ color: theme.text }}>
                          This Week's Summary
                        </Text>
                        <Text
                          className="font-sans text-base leading-relaxed"
                          style={{ color: theme.textSecondary }}
                        >
                          {previewReflection.summary}
                        </Text>
                      </View>
                    </BlurView>
                    {/* Blur overlay */}
                    <BlurView
                      intensity={20}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 20,
                      }}
                    />
                  </View>
                </Animated.View>

                {/* Theme & Mood Cards - Blurred */}
                <Animated.View
                  entering={FadeInDown.delay(300).duration(400)}
                  className="mb-4"
                >
                  {/* Theme Card - Blurred */}
                  <View className="relative overflow-hidden rounded-[16px] mb-3">
                    <BlurView
                      intensity={theme.isDark ? 18 : 45}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <View className="p-4" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.75)' : 'rgba(255,255,255,0.75)' }}>
                        <View className="flex-row items-center mb-2">
                          <TrendingUp size={16} color={theme.accent} />
                          <Text
                            className="font-sans text-xs ml-1.5 uppercase tracking-wide"
                            style={{ color: theme.textSecondary }}
                          >
                            Theme
                          </Text>
                        </View>
                        <Text className="font-semibold text-base" style={{ color: theme.text }}>
                          {previewReflection.theme}
                        </Text>
                      </View>
                    </BlurView>
                    <BlurView
                      intensity={20}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 16,
                      }}
                    />
                  </View>

                  {/* Mood Card - Blurred with Graph teaser */}
                  <View className="relative overflow-hidden rounded-[16px]">
                    <BlurView
                      intensity={theme.isDark ? 18 : 45}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <View className="p-4" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.75)' : 'rgba(255,255,255,0.75)' }}>
                        {/* Header row */}
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center">
                            <Heart size={16} color={theme.accent} />
                            <Text
                              className="font-sans text-xs ml-1.5 uppercase tracking-wide"
                              style={{ color: theme.textSecondary }}
                            >
                              Mood
                            </Text>
                          </View>
                          <ChevronDown size={18} color={theme.textSecondary} />
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="font-semibold text-base" style={{ color: theme.text }}>
                            {previewReflection.mood}
                          </Text>
                          <Text className="text-xs" style={{ color: theme.accent }}>
                            Tap to see chart
                          </Text>
                        </View>

                        {/* Teaser Graph Preview */}
                        <View className="mt-4">
                          <View className="flex-row justify-between items-end" style={{ height: 60 }}>
                            {[0.4, 0.6, 0.5, 0.8, 0.3, 0.7, 0.5].map((h, i) => (
                              <View
                                key={i}
                                className="rounded-t"
                                style={{
                                  width: 28,
                                  height: h * 50 + 10,
                                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                                }}
                              />
                            ))}
                          </View>
                          <View className="flex-row justify-between mt-2">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                              <Text key={i} className="text-xs" style={{ color: theme.textSecondary, width: 28, textAlign: 'center' }}>
                                {d}
                              </Text>
                            ))}
                          </View>
                        </View>
                      </View>
                    </BlurView>
                    <BlurView
                      intensity={20}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 16,
                      }}
                    />
                  </View>
                </Animated.View>

                {/* Entries Count - Not blurred */}
                <Animated.View entering={FadeInDown.delay(350).duration(400)}>
                  <BlurView
                    intensity={theme.isDark ? 18 : 45}
                    tint={theme.isDark ? 'dark' : 'light'}
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                      marginBottom: 16,
                    }}
                  >
                    <View className="p-4 flex-row items-center" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.75)' : 'rgba(255,255,255,0.75)' }}>
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center mr-4"
                        style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.accentLight }}
                      >
                        <Text className="font-bold text-xl" style={{ color: theme.accent }}>
                          {weekData.entries.length}
                        </Text>
                      </View>
                      <View>
                        <Text className="font-semibold text-base" style={{ color: theme.text }}>
                          Entries this week
                        </Text>
                        <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                          {7 - weekData.entries.length > 0 ? `${7 - weekData.entries.length} days remaining` : 'Perfect week!'}
                        </Text>
                      </View>
                    </View>
                  </BlurView>
                </Animated.View>

                {/* Encouragement Card - Blurred */}
                <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                  <View className="relative overflow-hidden rounded-[20px]">
                    <BlurView
                      intensity={theme.isDark ? 18 : 45}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        borderRadius: 20,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <View
                        className="p-5"
                        style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.8)' : 'rgba(255,255,255,0.85)' }}
                      >
                        <Text
                          className="font-sans text-xs mb-2 uppercase tracking-wide"
                          style={{ color: theme.accent }}
                        >
                          A thought for you
                        </Text>
                        <Text
                          className="font-semibold text-lg leading-relaxed"
                          style={{ color: theme.text }}
                        >
                          "{previewReflection.encouragement}"
                        </Text>
                      </View>
                    </BlurView>
                    <BlurView
                      intensity={20}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 20,
                      }}
                    />
                  </View>
                </Animated.View>
              </View>

              {/* Unlock CTA */}
              <Animated.View entering={FadeInDown.delay(500).duration(400)} className="mt-8">
                <BlurView
                  intensity={theme.isDark ? 18 : 45}
                  tint={theme.isDark ? 'dark' : 'light'}
                  style={{
                    borderRadius: 24,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: theme.isDark ? `${theme.accent}40` : theme.accent,
                  }}
                >
                  {/* Side glow accents */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 24,
                      bottom: 24,
                      left: 0,
                      width: 1,
                      backgroundColor: theme.isDark ? 'rgba(120,180,255,0.08)' : 'transparent',
                      zIndex: 10,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: 24,
                      bottom: 24,
                      right: 0,
                      width: 1,
                      backgroundColor: theme.isDark ? 'rgba(180,120,255,0.08)' : 'transparent',
                      zIndex: 10,
                    }}
                  />
                  <View className="p-6 items-center" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.8)' : 'rgba(255,255,255,0.8)' }}>
                    <View
                      className="w-14 h-14 rounded-full items-center justify-center mb-4"
                      style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.accentLight }}
                    >
                      <Lock size={24} color={theme.accent} />
                    </View>

                    <Text
                      className="font-bold text-lg text-center mb-2"
                      style={{ color: theme.text }}
                    >
                      Unlock Your Full Insights
                    </Text>

                    <Text
                      className="font-sans text-sm text-center mb-5 leading-relaxed"
                      style={{ color: theme.textSecondary }}
                    >
                      Get an on-device summary of your thoughts, personalized encouragement, and deeper self-understanding.
                    </Text>

                    <Pressable onPress={handleUpgrade} accessibilityLabel="Upgrade to Pro" className="w-full">
                      <LinearGradient
                        colors={[theme.accent, theme.accent]}
                        style={{
                          paddingVertical: 16,
                          borderRadius: 16,
                          alignItems: 'center',
                        }}
                      >
                        <Text className="font-semibold text-base text-white">
                          Upgrade to One Thought+
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </BlurView>
              </Animated.View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <LinearGradient
        colors={theme.gradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView className="flex-1">
          {/* Close Button */}
          <Pressable
            onPress={handleClose}
            className="absolute top-14 right-5 z-10 w-10 h-10 items-center justify-center rounded-full active:scale-95"
            style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.6)' : 'rgba(232,235,228,0.6)' }}
            accessibilityLabel="Close weekly reflection"
            accessibilityRole="button"
          >
            <X size={20} color={theme.textSecondary} />
          </Pressable>

          {/* Refresh Button */}
          {canRefresh && !isGenerating && (
            <Pressable
              onPress={handleRefresh}
              testID="ai-generate"
              className="absolute top-14 left-5 z-10 w-10 h-10 items-center justify-center rounded-full active:scale-95"
              style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.6)' : 'rgba(232,235,228,0.6)' }}
              accessibilityLabel="Regenerate weekly reflection"
              accessibilityRole="button"
            >
              <RefreshCw size={18} color={theme.textSecondary} />
            </Pressable>
          )}

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} className="items-center mb-8">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
                style={{ backgroundColor: theme.accentLight }}
              >
                <Sparkles size={32} color={theme.accent} />
              </View>

              <Text className="font-bold text-2xl text-center" style={{ color: theme.text }}>
                Weekly Reflection
              </Text>

              <View className="flex-row items-center mt-2">
                <Calendar size={14} color={theme.textSecondary} />
                <Text className="font-sans text-sm ml-1.5" style={{ color: theme.textSecondary }}>
                  {weekData.dateRange}
                </Text>
              </View>
            </Animated.View>

            {isGenerating ? (
              <Animated.View entering={FadeIn.duration(300)} className="items-center py-12">
                <ActivityIndicator size="large" color={theme.accent} />
                <Text className="font-sans text-base mt-4" style={{ color: theme.textSecondary }}>
                  {selectedPhilosopher !== 'none'
                    ? 'Applying your guide to a local reflection...'
                    : 'Preparing your local reflection...'}
                </Text>
              </Animated.View>
            ) : reflection ? (
              <>
                {/* Summary Card */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                  <BlurView
                    intensity={theme.isDark ? 18 : 45}
                    tint={theme.isDark ? 'dark' : 'light'}
                    style={{
                      borderRadius: 20,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                      marginBottom: 16,
                    }}
                  >
                    {/* Side glow accents */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 20,
                        bottom: 20,
                        left: 0,
                        width: 1,
                        backgroundColor: theme.isDark ? 'rgba(120,180,255,0.06)' : 'transparent',
                        zIndex: 10,
                      }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        top: 20,
                        bottom: 20,
                        right: 0,
                        width: 1,
                        backgroundColor: theme.isDark ? 'rgba(180,120,255,0.06)' : 'transparent',
                        zIndex: 10,
                      }}
                    />
                    <View className="p-5" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.75)' : 'rgba(255,255,255,0.75)' }}>
                      <Text className="font-semibold text-lg mb-3" style={{ color: theme.text }}>
                        This Week's Summary
                      </Text>
                      <Text
                        className="font-sans text-base leading-relaxed"
                        style={{ color: theme.textSecondary }}
                      >
                        {reflection.summary}
                      </Text>
                      <Text
                        className="font-sans text-xs mt-3 leading-relaxed"
                        style={{ color: theme.textMuted }}
                      >
                        Created on your device from your entries. In a crisis, contact a mental health professional or text HOME to 741741.
                      </Text>
                    </View>
                  </BlurView>
                </Animated.View>

                {/* Theme & Mood Cards */}
                <Animated.View
                  entering={FadeInDown.delay(300).duration(400)}
                  className="mb-4"
                >
                  {/* Theme Card */}
                  <BlurView
                    intensity={theme.isDark ? 18 : 45}
                    tint={theme.isDark ? 'dark' : 'light'}
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                      marginBottom: 12,
                    }}
                  >
                    <View className="p-4" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.75)' : 'rgba(255,255,255,0.75)' }}>
                      <View className="flex-row items-center mb-2">
                        <TrendingUp size={16} color={theme.accent} />
                        <Text
                          className="font-sans text-xs ml-1.5 uppercase tracking-wide"
                          style={{ color: theme.textSecondary }}
                        >
                          Theme
                        </Text>
                      </View>
                      <Text className="font-semibold text-base" style={{ color: theme.text }}>
                        {reflection.theme}
                      </Text>
                    </View>
                  </BlurView>

                  {/* Expandable Mood Card - Only show if mood tracking is enabled AND there are text entries */}
                  {moodTrackingEnabled && !reflection.hasPhotos && (
                    <Pressable onPress={toggleMoodExpanded} accessibilityLabel="Toggle mood details" className="active:opacity-90">
                      <BlurView
                        intensity={theme.isDark ? 18 : 45}
                        tint={theme.isDark ? 'dark' : 'light'}
                        style={{
                          borderRadius: 16,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: moodExpanded ? `${theme.accent}60` : theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        <View className="p-4" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.75)' : 'rgba(255,255,255,0.75)' }}>
                          {/* Header row */}
                          <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                              <Heart size={16} color={theme.accent} />
                              <Text
                                className="font-sans text-xs ml-1.5 uppercase tracking-wide"
                                style={{ color: theme.textSecondary }}
                              >
                                Mood
                              </Text>
                            </View>
                            <Animated.View style={chevronAnimatedStyle}>
                              <ChevronDown size={18} color={theme.textSecondary} />
                            </Animated.View>
                          </View>

                          {/* Mood label */}
                          <View className="flex-row items-center justify-between">
                            <Text className="font-semibold text-base" style={{ color: theme.text }}>
                              {reflection.mood}
                            </Text>
                            <Text className="text-xs" style={{ color: theme.accent }}>
                              Tap to {moodExpanded ? 'collapse' : 'see chart'}
                            </Text>
                          </View>

                          {/* Expandable Graph */}
                          {moodExpanded && (
                            <MoodGraph moodData={moodData} theme={theme} expanded={moodExpanded} entries={entries} />
                          )}
                        </View>
                      </BlurView>
                    </Pressable>
                  )}

                  {/* Photo Insights Card - Show when there are photos */}
                  {reflection.hasPhotos && reflection.photoInsights && (
                    <BlurView
                      intensity={theme.isDark ? 18 : 45}
                      tint={theme.isDark ? 'dark' : 'light'}
                      style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <View className="p-4" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.75)' : 'rgba(255,255,255,0.75)' }}>
                        <View className="flex-row items-center mb-2">
                          <Camera size={16} color={theme.accent} />
                          <Text
                            className="font-sans text-xs ml-1.5 uppercase tracking-wide"
                            style={{ color: theme.textSecondary }}
                          >
                            Photo Insights
                          </Text>
                        </View>
                        <Text className="font-sans text-base leading-relaxed" style={{ color: theme.text }}>
                          {reflection.photoInsights}
                        </Text>
                      </View>
                    </BlurView>
                  )}
                </Animated.View>

                {/* Entries Count */}
                <Animated.View entering={FadeInDown.delay(350).duration(400)}>
                  <BlurView
                    intensity={theme.isDark ? 18 : 45}
                    tint={theme.isDark ? 'dark' : 'light'}
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                      marginBottom: 16,
                    }}
                  >
                    <View className="p-4 flex-row items-center" style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.75)' : 'rgba(255,255,255,0.75)' }}>
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center mr-4"
                        style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.accentLight }}
                      >
                        <Text className="font-bold text-xl" style={{ color: theme.accent }}>
                          {weekData.entries.length}
                        </Text>
                      </View>
                      <View>
                        <Text className="font-semibold text-base" style={{ color: theme.text }}>
                          Entries this week
                        </Text>
                        <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                          {7 - weekData.entries.length > 0 ? `${7 - weekData.entries.length} days remaining` : 'Perfect week!'}
                        </Text>
                      </View>
                    </View>
                  </BlurView>
                </Animated.View>

                {/* Encouragement Card */}
                <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                  <BlurView
                    intensity={theme.isDark ? 18 : 45}
                    tint={theme.isDark ? 'dark' : 'light'}
                    style={{
                      borderRadius: 20,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {/* Side glow accents */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 20,
                        bottom: 20,
                        left: 0,
                        width: 1,
                        backgroundColor: theme.isDark ? 'rgba(120,180,255,0.06)' : 'transparent',
                        zIndex: 10,
                      }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        top: 20,
                        bottom: 20,
                        right: 0,
                        width: 1,
                        backgroundColor: theme.isDark ? 'rgba(180,120,255,0.06)' : 'transparent',
                        zIndex: 10,
                      }}
                    />
                    <View
                      className="p-5"
                      style={{ backgroundColor: theme.isDark ? 'rgba(10,10,12,0.8)' : 'rgba(255,255,255,0.85)' }}
                    >
                      <Text
                        className="font-sans text-xs mb-2 uppercase tracking-wide"
                        style={{ color: theme.accent }}
                      >
                        A thought for you
                      </Text>
                      <Text
                        className="font-semibold text-lg leading-relaxed"
                        style={{ color: theme.text }}
                      >
                        "{reflection.encouragement}"
                      </Text>
                    </View>
                  </BlurView>
                </Animated.View>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
