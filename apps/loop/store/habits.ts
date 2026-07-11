import { ANCHORS, ANCHOR_ORDER, type AnchorKey } from '@/constants/anchors';
import { createPersistedStore } from '@/lib/store';

export interface HabitsState {
  /** Habit ids committed to each anchor — at most three per anchor. */
  anchorHabits: Record<AnchorKey, string[]>;
  /** Per-habit checked state for the current session. */
  completed: Record<string, boolean>;
  /** User-set (or default) check-in windows per anchor. */
  anchorTimes: Record<AnchorKey, string>;
  /** Consecutive days the flame has been kept lit. */
  streak: number;
  /** True once the persisted state has been loaded from AsyncStorage. */
  hasHydrated: boolean;
  toggleHabit: (habitId: string) => void;
  /** Onboarding writes the user's exactly-three picks here. */
  setHabitSelection: (picks: Record<AnchorKey, string[]>) => void;
  setAnchorTime: (anchor: AnchorKey, time: string) => void;
  setHasHydrated: (value: boolean) => void;
}

const DEFAULT_ANCHOR_HABITS: Record<AnchorKey, string[]> = ANCHOR_ORDER.reduce(
  (acc, key) => {
    acc[key] = ANCHORS[key].habits.map((h) => h.id);
    return acc;
  },
  {} as Record<AnchorKey, string[]>,
);

const DEFAULT_ANCHOR_TIMES: Record<AnchorKey, string> = ANCHOR_ORDER.reduce(
  (acc, key) => {
    acc[key] = ANCHORS[key].defaultWindow;
    return acc;
  },
  {} as Record<AnchorKey, string>,
);

// Demo-mode seed: a returning user twelve days into the habit, matching the
// example copy in DESIGN.md §7 ("Twelve days. The room is warm.").
const DEMO_STREAK = 12;

interface PersistedHabits {
  anchorHabits: Record<AnchorKey, string[]>;
  completed: Record<string, boolean>;
  anchorTimes: Record<AnchorKey, string>;
  streak: number;
}

export const useHabits = createPersistedStore<HabitsState, PersistedHabits>(
  'habits',
  (set) => ({
    anchorHabits: DEFAULT_ANCHOR_HABITS,
    completed: {},
    anchorTimes: DEFAULT_ANCHOR_TIMES,
    streak: DEMO_STREAK,
    hasHydrated: false,

    toggleHabit: (habitId) =>
      set((state) => ({
        completed: { ...state.completed, [habitId]: !state.completed[habitId] },
      })),

    setHabitSelection: (picks) =>
      set(() => ({
        anchorHabits: picks,
        // A fresh selection starts with a clean slate for today.
        completed: {},
      })),

    setAnchorTime: (anchor, time) =>
      set((state) => ({
        anchorTimes: { ...state.anchorTimes, [anchor]: time },
      })),

    setHasHydrated: (value) => set({ hasHydrated: value }),
  }),
  {
    partialize: (state) => ({
      anchorHabits: state.anchorHabits,
      completed: state.completed,
      anchorTimes: state.anchorTimes,
      streak: state.streak,
    }),
    onRehydrateStorage: () => (state) => {
      state?.setHasHydrated(true);
    },
  },
);
