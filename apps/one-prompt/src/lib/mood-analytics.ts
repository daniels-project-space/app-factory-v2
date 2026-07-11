import { MoodEntry, JournalEntry } from './state/journal-store';

// ============================================================================
// MOOD ANALYTICS — Processes journal data into visualization-ready structures
// ============================================================================

export interface MoodCalendarDay {
  date: string; // YYYY-MM-DD
  score: number; // 1-5
  mood: string;
  color: string; // hex color based on mood
  hasEntry: boolean;
}

export interface WeeklyMoodPoint {
  weekLabel: string; // e.g. "Mar 3"
  averageScore: number; // 1-5
  entryCount: number;
}

export interface WordFrequency {
  word: string;
  count: number;
  size: number; // relative size 1-5 for display
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  averageMood: number;
}

export interface MonthSummary {
  monthLabel: string;
  entryCount: number;
  averageMood: number;
  topMoods: string[];
  topWords: string[];
  theme: string;
}

// ============================================================================
// MOOD COLORS
// ============================================================================

const MOOD_COLORS: Record<number, string> = {
  1: '#EF4444', // red — very negative
  2: '#F59E0B', // amber — negative
  3: '#A0A09C', // neutral gray
  4: '#4CAF7C', // green — positive
  5: '#22C55E', // bright green — very positive
};

export function getMoodColor(score: number): string {
  return MOOD_COLORS[Math.round(Math.max(1, Math.min(5, score)))] || MOOD_COLORS[3];
}

export function getMoodLabel(score: number): string {
  if (score >= 4.5) return 'Great';
  if (score >= 3.5) return 'Good';
  if (score >= 2.5) return 'Okay';
  if (score >= 1.5) return 'Low';
  return 'Rough';
}

// ============================================================================
// CALENDAR DATA
// ============================================================================

export function buildMoodCalendar(
  year: number,
  month: number, // 0-indexed
  moodHistory: MoodEntry[],
  entries: JournalEntry[]
): MoodCalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const moodMap = new Map(moodHistory.map((m) => [m.date, m]));
  const entrySet = new Set(entries.map((e) => e.date));
  const days: MoodCalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const mood = moodMap.get(dateStr);
    const hasEntry = entrySet.has(dateStr);

    days.push({
      date: dateStr,
      score: mood?.score ?? 0,
      mood: mood?.mood ?? '',
      color: mood ? getMoodColor(mood.score) : 'transparent',
      hasEntry,
    });
  }

  return days;
}

// ============================================================================
// WEEKLY TREND
// ============================================================================

export function buildWeeklyTrend(moodHistory: MoodEntry[], weeks: number = 4): WeeklyMoodPoint[] {
  const now = new Date();
  const points: WeeklyMoodPoint[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const weekMoods = moodHistory.filter((m) => m.date >= startStr && m.date <= endStr);
    const avg =
      weekMoods.length > 0
        ? weekMoods.reduce((sum, m) => sum + m.score, 0) / weekMoods.length
        : 0;

    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    points.push({
      weekLabel: label,
      averageScore: Math.round(avg * 10) / 10,
      entryCount: weekMoods.length,
    });
  }

  return points;
}

// ============================================================================
// WORD FREQUENCY (simple word cloud data)
// ============================================================================

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'it', 'its', 'i', 'my', 'me',
  'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them', 'their', 'this',
  'that', 'these', 'those', 'not', 'no', 'so', 'if', 'just', 'about',
  'than', 'then', 'also', 'very', 'really', 'much', 'more', 'some', 'all',
  'what', 'when', 'where', 'how', 'who', 'which', 'there', 'here', 'up',
  'out', 'into', 'over', 'after', 'before', 'between', 'each', 'own',
  'same', 'other', 'such', 'only', 'too', 'even', 'most', 'like', 'get',
  'got', 'make', 'made', 'go', 'going', 'went', 'come', 'came', 'take',
  'took', 'know', 'knew', 'think', 'thought', 'see', 'saw', 'want',
  'look', 'use', 'find', 'give', 'tell', 'say', 'said', 'one', 'two',
  "don't", "didn't", "i'm", "it's", "that's", "i've", "can't", "won't",
  'am', 'as', 'because', 'still', 'now', 'back', 'way', 'through',
  'been', 'something', 'things', 'thing', 'today', 'day', 'time',
]);

export function buildWordFrequency(entries: JournalEntry[], limit: number = 20): WordFrequency[] {
  const wordCounts = new Map<string, number>();

  for (const entry of entries) {
    const words = entry.content
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  const sorted = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (sorted.length === 0) return [];

  const maxCount = sorted[0][1];
  return sorted.map(([word, count]) => ({
    word,
    count,
    size: Math.max(1, Math.round((count / maxCount) * 5)),
  }));
}

// ============================================================================
// STREAK INFO
// ============================================================================

export function buildStreakInfo(
  currentStreak: number,
  longestStreak: number,
  entries: JournalEntry[],
  moodHistory: MoodEntry[]
): StreakInfo {
  const avgMood =
    moodHistory.length > 0
      ? moodHistory.reduce((sum, m) => sum + m.score, 0) / moodHistory.length
      : 0;

  return {
    currentStreak,
    longestStreak,
    totalEntries: entries.length,
    averageMood: Math.round(avgMood * 10) / 10,
  };
}

// ============================================================================
// MONTHLY SUMMARY
// ============================================================================

export function buildMonthlySummary(
  year: number,
  month: number,
  entries: JournalEntry[],
  moodHistory: MoodEntry[]
): MonthSummary {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEntries = entries.filter((e) => e.date.startsWith(monthStr));
  const monthMoods = moodHistory.filter((m) => m.date.startsWith(monthStr));

  const avgMood =
    monthMoods.length > 0
      ? monthMoods.reduce((sum, m) => sum + m.score, 0) / monthMoods.length
      : 0;

  // Top moods
  const moodCounts = new Map<string, number>();
  for (const m of monthMoods) {
    moodCounts.set(m.mood, (moodCounts.get(m.mood) ?? 0) + 1);
  }
  const topMoods = [...moodCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mood]) => mood);

  // Top words
  const words = buildWordFrequency(monthEntries, 5);
  const topWords = words.map((w) => w.word);

  // Theme generation
  let theme = 'A month of journaling';
  if (avgMood >= 4) theme = 'A month of positivity and growth';
  else if (avgMood >= 3) theme = 'A balanced month of reflection';
  else if (avgMood >= 2) theme = 'A month of working through challenges';
  else if (monthMoods.length > 0) theme = 'A month of honest self-examination';

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return {
    monthLabel,
    entryCount: monthEntries.length,
    averageMood: Math.round(avgMood * 10) / 10,
    topMoods,
    topWords,
    theme,
  };
}
