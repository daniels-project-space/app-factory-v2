import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RevealDelay = 'instant' | 'tomorrow' | 'week' | 'month';

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  prompt: string;
  content: string;
  createdAt: number;
  updatedAt: number; // Timestamp of last edit — used for cloud sync conflict resolution
  revealAt: number; // Timestamp when entry becomes readable
  photoUri?: string; // Optional photo taken with photo prompt (may be a cloud signed URL)
  localPhotoUri?: string; // Original local file URI preserved after cloud upload as fallback
  photoPrompt?: string; // The photo challenge prompt used
}

export interface WeeklySummary {
  id: string;
  weekStartDate: string; // YYYY-MM-DD of the week start (Monday)
  weekEndDate: string;
  summary: string;
  theme: string;
  mood: string;
  moodScore: number; // 1-5 scale
  encouragement: string;
  entryIds: string[];
  generatedAt: number;
}

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: string;
  score: number; // 1-5 scale
}

interface JournalState {
  entries: JournalEntry[];
  weeklySummaries: WeeklySummary[];
  moodHistory: MoodEntry[];
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: string | null;
  _hasHydrated: boolean;

  // Actions
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'revealAt'>, revealDelay: RevealDelay) => void;
  getEntryByDate: (date: string) => JournalEntry | undefined;
  hasEntryForToday: () => boolean;
  getTodayEntry: () => JournalEntry | undefined;
  getRecentEntries: (count: number) => JournalEntry[];
  getRevealedEntries: () => JournalEntry[];
  getNewlyRevealedEntries: () => JournalEntry[];
  isEntryRevealed: (entry: JournalEntry) => boolean;
  getTimeUntilReveal: (entry: JournalEntry) => { days: number; hours: number; minutes: number } | null;
  calculateStreak: () => void;
  loadTestData: () => void;
  clearAllData: () => void;
  setHasHydrated: (state: boolean) => void;

  // Weekly summary actions
  addWeeklySummary: (summary: Omit<WeeklySummary, 'id' | 'generatedAt'>) => void;
  getWeeklySummary: (weekStartDate: string) => WeeklySummary | undefined;
  getLatestWeeklySummary: () => WeeklySummary | undefined;

  // Mood actions
  addMoodEntry: (entry: MoodEntry) => void;
  getMoodForDate: (date: string) => MoodEntry | undefined;
  getMoodHistory: (days: number) => MoodEntry[];

  // Photo actions
  addPhotoToEntry: (date: string, photoUri: string, photoPrompt: string) => void;
  addPhotoEntry: (photoUri: string, photoPrompt: string, revealDelay: RevealDelay) => void;
}

// Helper to get today's date in YYYY-MM-DD format
export const getTodayDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Helper to get yesterday's date
const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

// Helper to calculate reveal timestamp based on delay
export const calculateRevealTimestamp = (createdAt: number, delay: RevealDelay): number => {
  switch (delay) {
    case 'instant':
      return createdAt; // Immediately visible
    case 'tomorrow':
      return createdAt + 24 * 60 * 60 * 1000; // 24 hours
    case 'week':
      return createdAt + 7 * 24 * 60 * 60 * 1000; // 7 days
    case 'month':
      return createdAt + 30 * 24 * 60 * 60 * 1000; // 30 days
    default:
      return createdAt + 24 * 60 * 60 * 1000;
  }
};

// Helper to get week start date (Monday)
export const getWeekStartDate = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      weeklySummaries: [],
      moodHistory: [],
      currentStreak: 0,
      longestStreak: 0,
      lastEntryDate: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      addEntry: (entry, revealDelay) => {
        const createdAt = Date.now();
        const newEntry: JournalEntry = {
          ...entry,
          id: `${entry.date}-${createdAt}`,
          createdAt,
          updatedAt: createdAt,
          revealAt: calculateRevealTimestamp(createdAt, revealDelay),
        };

        set((state) => {
          const updatedEntries = [...state.entries, newEntry];
          return {
            entries: updatedEntries,
            lastEntryDate: entry.date,
          };
        });

        // Recalculate streak after adding
        get().calculateStreak();
      },

      getEntryByDate: (date) => {
        return get().entries.find((e) => e.date === date);
      },

      hasEntryForToday: () => {
        const today = getTodayDate();
        return get().entries.some((e) => e.date === today);
      },

      getTodayEntry: () => {
        const today = getTodayDate();
        return get().entries.find((e) => e.date === today);
      },

      getRecentEntries: (count) => {
        const entries = get().entries;
        return [...entries]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, count);
      },

      getRevealedEntries: () => {
        const now = Date.now();
        return get().entries.filter((e) => e.revealAt <= now);
      },

      getNewlyRevealedEntries: () => {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        return get().entries.filter(
          (e) => e.revealAt <= now && e.revealAt > oneDayAgo
        );
      },

      isEntryRevealed: (entry) => {
        return Date.now() >= entry.revealAt;
      },

      getTimeUntilReveal: (entry) => {
        const now = Date.now();
        if (now >= entry.revealAt) return null;

        const diff = entry.revealAt - now;
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

        return { days, hours, minutes };
      },

      calculateStreak: () => {
        const entries = get().entries;
        if (entries.length === 0) {
          set({ currentStreak: 0, longestStreak: 0 });
          return;
        }

        // Get all unique dates sorted descending
        const dates = [...new Set(entries.map((e) => e.date))].sort().reverse();

        const today = getTodayDate();
        const yesterday = getYesterdayDate();

        // Check if we have entry for today or yesterday to continue streak
        const hasToday = dates.includes(today);
        const hasYesterday = dates.includes(yesterday);

        if (!hasToday && !hasYesterday) {
          // Streak broken
          set({ currentStreak: 0 });
          return;
        }

        // Count consecutive days
        let streak = 0;
        let checkDate = hasToday ? today : yesterday;

        for (const date of dates) {
          if (date === checkDate) {
            streak++;
            // Move to previous day
            const prevDate = new Date(checkDate);
            prevDate.setDate(prevDate.getDate() - 1);
            checkDate = prevDate.toISOString().split('T')[0];
          } else if (date < checkDate) {
            // Gap found, streak ends
            break;
          }
        }

        set((state) => ({
          currentStreak: streak,
          longestStreak: Math.max(state.longestStreak, streak),
        }));
      },

      loadTestData: () => {
        // Generate test entries for the past week with varied emotional content for mood graph demonstration
        const testEntries: JournalEntry[] = [];
        const testQuotes = [
          { prompt: "How are you really feeling?", content: "Absolutely incredible day! I'm so thrilled and grateful - everything clicked into place. Best day I've had in months!" },
          { prompt: "What's on your mind right now?", content: "Feeling stressed and overwhelmed with everything going on. Hard to focus, exhausted from lack of sleep." },
          { prompt: "What small moment brought you joy recently?", content: "Had a nice walk today. The weather was pleasant and I felt calm." },
          { prompt: "What did you learn today?", content: "Struggled through a difficult meeting. Frustrated that my ideas weren't heard. Feeling a bit down about it." },
          { prompt: "What's one thing you're grateful for today?", content: "Really happy and excited about the progress I made! Proud of myself for pushing through." },
          { prompt: "How was your day?", content: "Pretty okay day. Nothing special happened, just the usual routine." },
          { prompt: "What made you smile today?", content: "Wonderful surprise from a friend! Feeling loved and so thankful for the people in my life. Made me smile all day!" },
        ];

        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const quote = testQuotes[6 - i];
          const createdAt = date.getTime();

          testEntries.push({
            id: `${dateStr}-test`,
            date: dateStr,
            prompt: quote.prompt,
            content: quote.content,
            createdAt,
            updatedAt: createdAt,
            // All test entries are already revealed (past entries)
            revealAt: createdAt,
          });
        }

        // Generate test mood data
        const testMoods: MoodEntry[] = testEntries.map((entry, index) => ({
          date: entry.date,
          mood: ['hopeful', 'peaceful', 'thoughtful', 'content', 'tired', 'accomplished', 'joyful'][index],
          score: [4, 4, 3, 4, 2, 5, 5][index],
        }));

        set({
          entries: testEntries,
          moodHistory: testMoods,
          lastEntryDate: testEntries[testEntries.length - 1].date,
        });

        // Recalculate streak
        get().calculateStreak();
      },

      clearAllData: () => {
        set({
          entries: [],
          weeklySummaries: [],
          moodHistory: [],
          currentStreak: 0,
          longestStreak: 0,
          lastEntryDate: null,
        });
      },

      // Weekly summary actions
      addWeeklySummary: (summary) => {
        const newSummary: WeeklySummary = {
          ...summary,
          id: `week-${summary.weekStartDate}`,
          generatedAt: Date.now(),
        };

        set((state) => {
          // Replace existing summary for the same week or add new
          const filtered = state.weeklySummaries.filter(
            (s) => s.weekStartDate !== summary.weekStartDate
          );
          return {
            weeklySummaries: [...filtered, newSummary],
          };
        });
      },

      getWeeklySummary: (weekStartDate) => {
        return get().weeklySummaries.find((s) => s.weekStartDate === weekStartDate);
      },

      getLatestWeeklySummary: () => {
        const summaries = get().weeklySummaries;
        if (summaries.length === 0) return undefined;
        return [...summaries].sort((a, b) => b.generatedAt - a.generatedAt)[0];
      },

      // Mood actions
      addMoodEntry: (entry) => {
        set((state) => {
          // Replace existing mood for the same date or add new
          const filtered = state.moodHistory.filter((m) => m.date !== entry.date);
          return {
            moodHistory: [...filtered, entry],
          };
        });
      },

      getMoodForDate: (date) => {
        return get().moodHistory.find((m) => m.date === date);
      },

      getMoodHistory: (days) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        return get()
          .moodHistory.filter((m) => m.date >= cutoffStr)
          .sort((a, b) => a.date.localeCompare(b.date));
      },

      // Photo actions
      addPhotoToEntry: (date, photoUri, photoPrompt) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.date === date
              ? { ...entry, photoUri, photoPrompt, updatedAt: Date.now() }
              : entry
          ),
        }));
      },

      addPhotoEntry: (photoUri, photoPrompt, revealDelay) => {
        const today = getTodayDate();
        const createdAt = Date.now();
        const revealAt = calculateRevealTimestamp(createdAt, revealDelay);

        const newEntry: JournalEntry = {
          id: `${today}-${createdAt}`,
          date: today,
          prompt: photoPrompt,
          content: '', // Photo-only entry has no text content
          createdAt,
          updatedAt: createdAt,
          revealAt,
          photoUri,
          photoPrompt,
        };

        set((state) => {
          // Check if entry already exists for today
          const existingEntry = state.entries.find((e) => e.date === today);
          if (existingEntry) {
            // Update existing entry with photo
            return {
              entries: state.entries.map((entry) =>
                entry.date === today
                  ? { ...entry, photoUri, photoPrompt, updatedAt: Date.now() }
                  : entry
              ),
            };
          }

          // Add new photo-only entry
          return {
            entries: [...state.entries, newEntry],
            lastEntryDate: today,
          };
        });

        // Recalculate streak after adding
        get().calculateStreak();
      },
    }),
    {
      name: 'journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Always mark hydrated — even on first install when state is undefined
        if (state) {
          state.setHasHydrated(true);
        } else {
          useJournalStore.getState().setHasHydrated(true);
        }
      },
    }
  )
);

// Ensure hydration happens even if store is empty
useJournalStore.persist.onFinishHydration(() => {
  useJournalStore.getState().setHasHydrated(true);
});

// Daily prompts - refined for deeper reflection
export const DAILY_PROMPTS: string[] = [
  "What moment today deserves to be remembered?",
  "What truth did you discover about yourself today?",
  "What are you carrying that you could set down?",
  "What made you feel most alive today?",
  "What would you tell your past self about today?",
  "What small thing made a big difference today?",
  "What are you grateful for that you usually overlook?",
  "What emotion surprised you today?",
  "What did today teach you about what matters?",
  "What conversation changed how you see something?",
  "What choice are you proud of making today?",
  "What did you notice that others might have missed?",
  "What part of today would you want to relive?",
  "What are you ready to let go of?",
  "What brought you unexpected comfort today?",
  "What did you do today just for yourself?",
  "What assumption did today challenge?",
  "What are you curious about right now?",
  "What made today feel meaningful?",
  "What would you do differently if you could replay today?",
  "What are you holding onto that no longer serves you?",
  "What simple pleasure grounded you today?",
  "What are you learning about the person you're becoming?",
  "What did you create or contribute today?",
  "What connection mattered most today?",
  "What are you looking forward to tomorrow?",
  "What boundary did you honor today?",
  "What fear did you face, even slightly?",
  "What do you want to remember feeling right now?",
  "What would make tomorrow better than today?",
];

// Get today's prompt (deterministic based on date)
// Can optionally include custom prompts from user settings
export const getTodayPrompt = (customPrompts: string[] = []): string => {
  const today = getTodayDate();
  // Combine default prompts with custom prompts
  const allPrompts = [...DAILY_PROMPTS, ...customPrompts];
  // Use the date to generate a consistent index for the day
  const dateNum = parseInt(today.replace(/-/g, ''), 10);
  const index = dateNum % allPrompts.length;
  return allPrompts[index];
};

// Get multiple prompts for today (up to 5 different options)
// Uses date-based seeding to ensure consistency across app restarts
export const getTodayPrompts = (customPrompts: string[] = [], count: number = 5): string[] => {
  const today = getTodayDate();
  const allPrompts = [...DAILY_PROMPTS, ...customPrompts];
  const dateNum = parseInt(today.replace(/-/g, ''), 10);

  // Generate multiple unique prompts for the day
  const prompts: string[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < count && prompts.length < allPrompts.length; i++) {
    // Use different seeds for each prompt slot to get variety
    const seed = (dateNum * 31 + i * 17) % allPrompts.length;
    let index = seed;

    // Find next unused index
    let attempts = 0;
    while (usedIndices.has(index) && attempts < allPrompts.length) {
      index = (index + 1) % allPrompts.length;
      attempts++;
    }

    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      prompts.push(allPrompts[index]);
    }
  }

  return prompts;
};
