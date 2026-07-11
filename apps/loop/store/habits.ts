import { ANCHORS, ANCHOR_ORDER, HABIT_LIBRARY, type AnchorKey } from '@/constants/anchors';
import { keyMinusDays, todayKey } from '@/lib/date';
import { reconcileStreak, FLAME_FLOOR } from '@/lib/reconcile';
import { createPersistedStore } from '@/lib/store';

/** Per-day, per-habit completion ledger. Keyed by `YYYY-MM-DD` then habit id. */
export type CompletionHistory = Record<string, Record<string, boolean>>;

export interface HabitsState {
  /** Habit ids committed to each anchor — at most three per anchor. */
  anchorHabits: Record<AnchorKey, string[]>;
  /** Every day's habit completions, keyed by local date. The source of truth
   *  for "today", the streak, and the weekly reflection card. */
  history: CompletionHistory;
  /** User-set (or default) check-in windows per anchor. */
  anchorTimes: Record<AnchorKey, string>;
  /** The flame's magnitude, 0–1. Grows with kept anchors, dims (never to 0)
   *  on a fully missed day. See lib/reconcile.ts. */
  flameHeat: number;
  /** Consecutive fully-kept days, ending yesterday or today. Unlike the
   *  flame, this traditional counter *can* hit zero on a missed day — the
   *  flame staying lit through it is the whole point. */
  streak: number;
  /** `YYYY-MM-DD` the app last reconciled/recorded activity on. */
  lastActiveDate: string;
  /** True once the persisted state has been loaded from AsyncStorage. */
  hasHydrated: boolean;
  toggleHabit: (habitId: string) => void;
  /** Onboarding writes the user's exactly-three picks here. */
  setHabitSelection: (picks: Record<AnchorKey, string[]>) => void;
  setAnchorTime: (anchor: AnchorKey, time: string) => void;
  setHasHydrated: (value: boolean) => void;
  /** Compares `lastActiveDate` to today and dims the flame for any fully
   *  missed day in between. Call once per app open, after hydration.
   *  Returns the number of fully missed days found. */
  reconcile: () => number;
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

/** Whether every habit in `habitIds` is marked true in a given day's record. */
export function isAnchorComplete(habitIds: string[], record: Record<string, boolean> | undefined): boolean {
  if (habitIds.length === 0) return false;
  if (!record) return false;
  return habitIds.every((id) => record[id] === true);
}

/** How much one completed (or un-completed) anchor moves the flame. */
const ANCHOR_HEAT_NOTCH = 0.12;

// Demo-mode seed: a returning user partway through the current week,
// matching the example copy in DESIGN.md §7 ("Twelve days. The room is
// warm."). Seeded days stop the day before "today" — today always starts
// fresh so the user's own taps are what fill it in.
const DEMO_STREAK = 12;
const DEMO_FLAME_HEAT = 0.78;

function buildDemoHistory(): CompletionHistory {
  const today = todayKey();

  // Days before today, most recent first: a full day, a full day, an
  // evening slip, a full day, a midday slip. Anything older than that
  // (or before this calendar week) is left unrecorded — a brand-new
  // account's history simply starts here, which reads as honest rather
  // than fabricated.
  const pattern: Array<'full' | 'slip-evening' | 'slip-midday'> = [
    'full',
    'slip-midday',
    'full',
    'slip-evening',
    'full',
  ];

  // Marks every candidate habit in the library, not just the pre-onboarding
  // defaults, so this history reads correctly regardless of which three the
  // user ends up picking in onboarding — the check is "was this anchor kept
  // that day", and every habit that could ever belong to it is seeded true
  // on a kept day.
  const history: CompletionHistory = {};
  pattern.forEach((day, i) => {
    const key = keyMinusDays(today, pattern.length - i);
    const record: Record<string, boolean> = {};
    ANCHOR_ORDER.forEach((anchorKey) => {
      const anchorSlipped = (day as string) === `slip-${anchorKey}`;
      HABIT_LIBRARY[anchorKey].forEach((habit) => {
        record[habit.id] = !anchorSlipped;
      });
    });
    history[key] = record;
  });
  return history;
}

interface PersistedHabits {
  anchorHabits: Record<AnchorKey, string[]>;
  history: CompletionHistory;
  anchorTimes: Record<AnchorKey, string>;
  flameHeat: number;
  streak: number;
  lastActiveDate: string;
}

export const useHabits = createPersistedStore<HabitsState, PersistedHabits>(
  'habits',
  (set, get) => ({
    anchorHabits: DEFAULT_ANCHOR_HABITS,
    history: buildDemoHistory(),
    anchorTimes: DEFAULT_ANCHOR_TIMES,
    flameHeat: DEMO_FLAME_HEAT,
    streak: DEMO_STREAK,
    lastActiveDate: todayKey(),
    hasHydrated: false,

    toggleHabit: (habitId) =>
      set((state) => {
        const today = todayKey();
        const todayRecord = { ...(state.history[today] ?? {}) };
        const anchorKey = ANCHOR_ORDER.find((key) => state.anchorHabits[key].includes(habitId));

        const wasAnchorComplete = anchorKey
          ? isAnchorComplete(state.anchorHabits[anchorKey], todayRecord)
          : false;

        todayRecord[habitId] = !todayRecord[habitId];

        const isNowAnchorComplete = anchorKey
          ? isAnchorComplete(state.anchorHabits[anchorKey], todayRecord)
          : false;

        let flameHeat = state.flameHeat;
        if (!wasAnchorComplete && isNowAnchorComplete) {
          flameHeat = Math.min(1, flameHeat + ANCHOR_HEAT_NOTCH);
        } else if (wasAnchorComplete && !isNowAnchorComplete) {
          flameHeat = Math.max(FLAME_FLOOR, flameHeat - ANCHOR_HEAT_NOTCH);
        }

        return {
          history: { ...state.history, [today]: todayRecord },
          flameHeat,
        };
      }),

    setHabitSelection: (picks) =>
      set((state) => ({
        anchorHabits: picks,
        // A fresh selection starts with a clean slate for today; prior
        // days' history is untouched.
        history: { ...state.history, [todayKey()]: {} },
      })),

    setAnchorTime: (anchor, time) =>
      set((state) => ({
        anchorTimes: { ...state.anchorTimes, [anchor]: time },
      })),

    setHasHydrated: (value) => set({ hasHydrated: value }),

    reconcile: () => {
      const state = get();
      const today = todayKey();
      if (state.lastActiveDate === today) return 0;

      const result = reconcileStreak({
        lastActiveDate: state.lastActiveDate,
        today,
        flameHeat: state.flameHeat,
      });

      const yesterdayKey = keyMinusDays(today, 1);
      const allHabitIds = ANCHOR_ORDER.flatMap((key) => state.anchorHabits[key]);
      const yesterdayFullyKept =
        allHabitIds.length > 0 && isAnchorComplete(allHabitIds, state.history[yesterdayKey]);

      set({
        flameHeat: result.flameHeat,
        lastActiveDate: result.reconciledDate,
        streak: yesterdayFullyKept ? state.streak + 1 : 0,
      });

      return result.missedDays;
    },
  }),
  {
    partialize: (state) => ({
      anchorHabits: state.anchorHabits,
      history: state.history,
      anchorTimes: state.anchorTimes,
      flameHeat: state.flameHeat,
      streak: state.streak,
      lastActiveDate: state.lastActiveDate,
    }),
    onRehydrateStorage: () => (state) => {
      state?.setHasHydrated(true);
    },
  },
);
