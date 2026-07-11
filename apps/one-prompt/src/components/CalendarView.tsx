import { View, Text, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useJournalStore, JournalEntry } from '@/lib/state/journal-store';
import { useMemo, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import Svg, { Path } from 'react-native-svg';

interface CalendarViewProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayPress?: (date: string, entry?: JournalEntry) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Custom chevron icons with subtle styling
function ChevronLeftIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18L15 12L9 6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Animated day cell component
function DayCell({
  day,
  date,
  isToday,
  hasEntry,
  isFuture,
  onPress,
}: {
  day: number | null;
  date: string | null;
  isToday: boolean;
  hasEntry: boolean;
  isFuture: boolean;
  onPress: (date: string) => void;
}) {
  const theme = useAppTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (hasEntry) {
      scale.value = withSpring(0.9, { damping: 22, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (hasEntry) {
      scale.value = withSpring(1, { damping: 22, stiffness: 400 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!day) {
    return <View className="w-[14.28%] aspect-square" />;
  }

  return (
    <Pressable
      onPress={() => date && onPress(date)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!hasEntry}
      className="w-[14.28%] aspect-square items-center justify-center"
      accessibilityLabel={date ? `${date}${hasEntry ? ', has entry' : ''}` : String(day)}
      accessibilityRole="button"
      accessibilityState={{ disabled: !hasEntry }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isToday
              ? `${theme.accent}20`
              : hasEntry
              ? theme.isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.03)'
              : 'transparent',
            borderWidth: isToday ? 1.5 : 0,
            borderColor: isToday ? `${theme.accent}50` : 'transparent',
            shadowColor: hasEntry ? theme.accent : 'transparent',
            shadowOffset: { width: 0, height: hasEntry ? 2 : 0 },
            shadowOpacity: hasEntry ? 0.15 : 0,
            shadowRadius: hasEntry ? 4 : 0,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: hasEntry || isToday ? '600' : '400',
            color: hasEntry
              ? theme.text
              : isFuture
              ? `${theme.textSecondary}40`
              : `${theme.textSecondary}80`,
          }}
        >
          {day}
        </Text>

        {/* Entry indicator dot with glow */}
        {hasEntry && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{
              position: 'absolute',
              bottom: 6,
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: theme.accent,
              shadowColor: theme.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 3,
            }}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

export function CalendarView({ currentMonth, onMonthChange, onDayPress }: CalendarViewProps) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const entries = useJournalStore((s) => s.entries);

  // Get entries as a map for quick lookup
  const entriesMap = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    entries.forEach((entry) => {
      map.set(entry.date, entry);
    });
    return map;
  }, [entries]);

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: { date: string | null; day: number | null; isToday: boolean }[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push({ date: null, day: null, isToday: false });
    }

    // Add the days of the month
    const today = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        day,
        isToday: dateStr === today,
      });
    }

    return days;
  }, [currentMonth]);

  const handlePrevMonth = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    onMonthChange(prevMonth);
  }, [currentMonth, onMonthChange, hapticEnabled]);

  const handleNextMonth = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    onMonthChange(nextMonth);
  }, [currentMonth, onMonthChange, hapticEnabled]);

  const handleDayPress = useCallback(
    (date: string) => {
      const entry = entriesMap.get(date);
      if (entry) {
        if (hapticEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onDayPress?.(date, entry);
      }
    },
    [entriesMap, onDayPress, hapticEnabled]
  );

  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <BlurView
      intensity={theme.isDark ? 25 : 50}
      tint={theme.isDark ? 'dark' : 'light'}
      style={{
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
      }}
    >
      <View
        className="p-5"
        style={{ backgroundColor: theme.isDark ? 'rgba(15,15,18,0.65)' : 'rgba(255,255,255,0.75)' }}
      >
        {/* Inner highlight */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 20,
            right: 20,
            height: 1,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)',
            borderRadius: 1,
          }}
        />
        {/* Side glow accents */}
        <View
          style={{
            position: 'absolute',
            top: 20,
            bottom: 20,
            left: 0,
            width: 1,
            backgroundColor: theme.isDark ? 'rgba(120,180,255,0.08)' : 'transparent',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 20,
            bottom: 20,
            right: 0,
            width: 1,
            backgroundColor: theme.isDark ? 'rgba(180,120,255,0.08)' : 'transparent',
          }}
        />

        {/* Month Header */}
        <View className="flex-row items-center justify-between mb-5 px-1">
          <Pressable
            onPress={handlePrevMonth}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            className="w-10 h-10 items-center justify-center rounded-xl active:opacity-70"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            }}
          >
            <ChevronLeftIcon color={theme.textSecondary} size={18} />
          </Pressable>

          <Text
            className="font-semibold text-lg tracking-tight"
            style={{ color: theme.text }}
          >
            {monthYear}
          </Text>

          <Pressable
            onPress={handleNextMonth}
            accessibilityLabel="Next month"
            accessibilityRole="button"
            className="w-10 h-10 items-center justify-center rounded-xl active:opacity-70"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            }}
          >
            <ChevronRightIcon color={theme.textSecondary} size={18} />
          </Pressable>
        </View>

        {/* Weekday Headers */}
        <View className="flex-row mb-3">
          {WEEKDAYS.map((day, index) => (
            <View key={index} className="flex-1 items-center">
              <Text
                className="font-semibold text-xs"
                style={{ color: theme.textMuted }}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View className="flex-row flex-wrap">
          {calendarDays.map((item, index) => {
            const hasEntry = item.date ? entriesMap.has(item.date) : false;
            const isFuture = item.date ? new Date(item.date) > new Date() : false;

            return (
              <DayCell
                key={index}
                day={item.day}
                date={item.date}
                isToday={item.isToday}
                hasEntry={hasEntry}
                isFuture={isFuture}
                onPress={handleDayPress}
              />
            );
          })}
        </View>
      </View>
    </BlurView>
  );
}
