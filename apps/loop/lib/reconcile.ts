import { daysBetween } from '@/lib/date';

/**
 * Streak reconciliation — the flame's honesty check.
 *
 * Loop's whole pitch is that the flame *shrinks, never resets* when a day
 * is missed entirely (see DESIGN.md §4). This is the one file that runs
 * that math: on every app open we compare the last day the app was active
 * to today, and for every full calendar day in between with zero recorded
 * activity, the flame dims a notch. It never touches zero once it has ever
 * been lit — a bad week costs you warmth, not the fire itself.
 */

/** How much heat one fully missed day costs. */
export const MISS_PENALTY = 0.12;

/** The flame is a live ember at minimum — it never truly goes out. */
export const FLAME_FLOOR = 0.12;

export interface ReconcileInput {
  /** `YYYY-MM-DD` the app last recorded activity on. */
  lastActiveDate: string;
  /** `YYYY-MM-DD` for "now". */
  today: string;
  /** Current stored flame magnitude, 0–1. */
  flameHeat: number;
}

export interface ReconcileResult {
  /** The (possibly dimmed) flame magnitude after reconciliation. */
  flameHeat: number;
  /** Full calendar days between last activity and today with no activity. */
  missedDays: number;
  /** Always `today` — the caller persists this as the new `lastActiveDate`. */
  reconciledDate: string;
}

/**
 * Pure reconciliation: no side effects, no storage access. Callers (see
 * `store/habits.ts#reconcile`) read the persisted state, run this, and
 * write the result back.
 */
export function reconcileStreak({ lastActiveDate, today, flameHeat }: ReconcileInput): ReconcileResult {
  const gap = daysBetween(lastActiveDate, today);

  // Same day (gap 0) or a clock that moved backwards: nothing to reconcile.
  if (gap <= 0) {
    return { flameHeat, missedDays: 0, reconciledDate: today };
  }

  // gap === 1 means "today" is simply the day after last activity — no full
  // day was skipped. gap === 2 means yesterday was skipped entirely, etc.
  const missedDays = gap - 1;

  let nextHeat = flameHeat;
  const wasPositive = flameHeat > 0;
  for (let i = 0; i < missedDays; i++) {
    nextHeat -= MISS_PENALTY;
  }
  if (wasPositive) {
    nextHeat = Math.max(FLAME_FLOOR, nextHeat);
  } else {
    nextHeat = Math.max(0, nextHeat);
  }

  return { flameHeat: nextHeat, missedDays, reconciledDate: today };
}
