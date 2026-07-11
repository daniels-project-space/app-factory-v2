import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  category: 'milestone' | 'streak' | 'path' | 'habit' | 'explorer';
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number; // timestamp
  unlockedDate: string; // YYYY-MM-DD
}

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  // Milestone achievements
  {
    id: 'first-entry',
    title: 'First Thought',
    description: 'Write your very first journal entry',
    icon: '\uD83C\uDF31',
    category: 'milestone',
  },
  {
    id: '100-entries',
    title: 'Century of Thoughts',
    description: 'Write 100 journal entries',
    icon: '\uD83C\uDFC6',
    category: 'milestone',
  },

  // Streak achievements
  {
    id: '3-day-streak',
    title: '3-Day Streak',
    description: 'Journal 3 days in a row',
    icon: '\uD83D\uDD25',
    category: 'streak',
  },
  {
    id: '7-day-streak',
    title: 'One Week Strong',
    description: 'Journal 7 days in a row',
    icon: '\u2B50',
    category: 'streak',
  },
  {
    id: '30-day-streak',
    title: 'Monthly Warrior',
    description: 'Journal 30 days in a row',
    icon: '\uD83D\uDC8E',
    category: 'streak',
  },

  // Path achievements
  {
    id: 'path-completer',
    title: 'Path Completer',
    description: 'Finish a guided journaling path',
    icon: '\uD83D\uDEE4\uFE0F',
    category: 'path',
  },
  {
    id: 'path-gratitude',
    title: 'Grateful Heart',
    description: 'Complete the Gratitude Journey path',
    icon: '\u2728',
    category: 'path',
  },
  {
    id: 'path-discovery',
    title: 'Self-Explorer',
    description: 'Complete the Self-Discovery path',
    icon: '\uD83D\uDD2E',
    category: 'path',
  },
  {
    id: 'path-stress',
    title: 'Inner Peace',
    description: 'Complete the Stress Relief path',
    icon: '\uD83C\uDF3F',
    category: 'path',
  },
  {
    id: 'path-future',
    title: 'Visionary',
    description: 'Complete the Future Vision path',
    icon: '\uD83C\uDF1F',
    category: 'path',
  },
  {
    id: 'path-relationships',
    title: 'Connection Keeper',
    description: 'Complete the Relationship Reflection path',
    icon: '\uD83D\uDC9C',
    category: 'path',
  },

  // Habit achievements
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Write an entry after midnight',
    icon: '\uD83C\uDF19',
    category: 'habit',
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Write an entry before 7am',
    icon: '\uD83C\uDF05',
    category: 'habit',
  },
  {
    id: 'deep-thinker',
    title: 'Deep Thinker',
    description: 'Write an entry over 100 characters',
    icon: '\uD83E\uDDE0',
    category: 'habit',
  },

  // Explorer achievements
  {
    id: 'mood-explorer',
    title: 'Mood Explorer',
    description: 'Use all 5 mood options',
    icon: '\uD83C\uDF08',
    category: 'explorer',
  },
];

// Helper to get achievement by ID
export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find((a) => a.id === id);
};

// ============================================================================
// ACHIEVEMENTS STORE
// ============================================================================

interface AchievementsState {
  unlocked: UnlockedAchievement[];
  pendingCelebration: string | null; // ID of achievement to celebrate

  // Actions
  unlock: (id: string) => boolean; // returns true if newly unlocked
  isUnlocked: (id: string) => boolean;
  getUnlockedForDate: (date: string) => UnlockedAchievement[];
  clearCelebration: () => void;
  checkAndUnlock: (context: AchievementContext) => void;
}

// Context passed when checking for achievements
export interface AchievementContext {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  entryContent?: string;
  entryCreatedAt?: number; // timestamp
  completedPaths: string[];
  moodScoresUsed: number[]; // unique scores used (1-5)
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlocked: [],
      pendingCelebration: null,

      unlock: (id: string) => {
        const state = get();
        if (state.unlocked.some((u) => u.id === id)) return false;

        const now = Date.now();
        const today = new Date().toISOString().split('T')[0];

        set({
          unlocked: [
            ...state.unlocked,
            { id, unlockedAt: now, unlockedDate: today },
          ],
          pendingCelebration: id,
        });
        return true;
      },

      isUnlocked: (id: string) => {
        return get().unlocked.some((u) => u.id === id);
      },

      getUnlockedForDate: (date: string) => {
        return get().unlocked.filter((u) => u.unlockedDate === date);
      },

      clearCelebration: () => {
        set({ pendingCelebration: null });
      },

      checkAndUnlock: (context: AchievementContext) => {
        const { unlock, isUnlocked } = get();

        // First Entry
        if (context.totalEntries >= 1 && !isUnlocked('first-entry')) {
          unlock('first-entry');
          return; // Only one celebration at a time
        }

        // 100 Entries
        if (context.totalEntries >= 100 && !isUnlocked('100-entries')) {
          unlock('100-entries');
          return;
        }

        // Streaks
        if (context.currentStreak >= 3 && !isUnlocked('3-day-streak')) {
          unlock('3-day-streak');
          return;
        }
        if (context.currentStreak >= 7 && !isUnlocked('7-day-streak')) {
          unlock('7-day-streak');
          return;
        }
        if (context.currentStreak >= 30 && !isUnlocked('30-day-streak')) {
          unlock('30-day-streak');
          return;
        }

        // Night Owl (after midnight, before 5am)
        if (context.entryCreatedAt && !isUnlocked('night-owl')) {
          const hour = new Date(context.entryCreatedAt).getHours();
          if (hour >= 0 && hour < 5) {
            unlock('night-owl');
            return;
          }
        }

        // Early Bird (before 7am, after 5am)
        if (context.entryCreatedAt && !isUnlocked('early-bird')) {
          const hour = new Date(context.entryCreatedAt).getHours();
          if (hour >= 5 && hour < 7) {
            unlock('early-bird');
            return;
          }
        }

        // Deep Thinker
        if (context.entryContent && context.entryContent.length > 100 && !isUnlocked('deep-thinker')) {
          unlock('deep-thinker');
          return;
        }

        // Path Completer (any path)
        if (context.completedPaths.length > 0 && !isUnlocked('path-completer')) {
          unlock('path-completer');
          return;
        }

        // Specific path achievements
        for (const pathId of context.completedPaths) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _achievementId = `path-${pathId.replace('-journey', '').replace('-reflection', '').replace('-vision', '')}`;
          // Map path IDs to achievement IDs
          const pathAchievementMap: Record<string, string> = {
            'gratitude-journey': 'path-gratitude',
            'self-discovery': 'path-discovery',
            'stress-relief': 'path-stress',
            'future-vision': 'path-future',
            'relationship-reflection': 'path-relationships',
          };
          const achId = pathAchievementMap[pathId];
          if (achId && !isUnlocked(achId)) {
            unlock(achId);
            return;
          }
        }

        // Mood Explorer
        if (context.moodScoresUsed.length >= 5 && !isUnlocked('mood-explorer')) {
          unlock('mood-explorer');
          return;
        }
      },
    }),
    {
      name: 'achievements-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
