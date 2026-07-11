/**
 * Anchor data model — THE single source of truth for Loop's three fixed
 * daily anchors and the tiny-habit fixtures that fill them.
 *
 * Loop's whole thesis is exactly three moments a day, so this file defines
 * exactly three anchors (never more, never fewer) keyed by `AnchorKey`.
 * `HABIT_LIBRARY` is the candidate pool onboarding picks from (see
 * DESIGN.md §7); `ANCHORS[key].habits` is the default committed list for
 * that anchor — at most three tiny habits, same cap the product enforces
 * everywhere a user assigns habits to an anchor.
 */

import type { Ionicons } from '@expo/vector-icons';

export type AnchorKey = 'morning' | 'midday' | 'evening';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface HabitDefinition {
  id: string;
  title: string;
  icon: IconName;
}

export interface AnchorDefinition {
  key: AnchorKey;
  label: string;
  glyph: IconName;
  /** Default notification/check-in window, e.g. "7:00". */
  defaultWindow: string;
  /** This anchor's committed tiny habits — at most three. */
  habits: HabitDefinition[];
}

export const ANCHOR_ORDER: AnchorKey[] = ['morning', 'midday', 'evening'];

/** The full candidate pool onboarding's "pick your three" step selects from. */
export const HABIT_LIBRARY: Record<AnchorKey, HabitDefinition[]> = {
  morning: [
    { id: 'morning-water', title: 'Drink a full glass of water', icon: 'water-outline' },
    { id: 'morning-bed', title: 'Make the bed', icon: 'bed-outline' },
    { id: 'morning-stretch', title: 'Two minutes of stretching', icon: 'body-outline' },
    { id: 'morning-journal', title: 'Write one line in a journal', icon: 'pencil-outline' },
  ],
  midday: [
    { id: 'midday-outside', title: 'Step outside for five minutes', icon: 'walk-outline' },
    { id: 'midday-green', title: 'Eat something green', icon: 'nutrition-outline' },
    { id: 'midday-shoulders', title: 'Stand up and roll your shoulders', icon: 'sync-outline' },
    { id: 'midday-text', title: 'Text someone you love', icon: 'heart-outline' },
  ],
  evening: [
    {
      id: 'evening-charger',
      title: 'Phone on the charger, across the room',
      icon: 'phone-portrait-outline',
    },
    { id: 'evening-read', title: 'Read one page', icon: 'book-outline' },
    { id: 'evening-breathe', title: 'Three slow breaths', icon: 'leaf-outline' },
    { id: 'evening-clothes', title: "Lay out tomorrow's clothes", icon: 'shirt-outline' },
  ],
};

/** Flat lookup from habit id to its definition, for cheap rendering by id. */
export const HABIT_BY_ID: Record<string, HabitDefinition> = Object.values(HABIT_LIBRARY)
  .flat()
  .reduce<Record<string, HabitDefinition>>((acc, habit) => {
    acc[habit.id] = habit;
    return acc;
  }, {});

/**
 * The three fixed anchors. `habits` here is the default committed list a
 * fresh demo account starts from before onboarding overwrites it with the
 * user's own picks.
 */
export const ANCHORS: Record<AnchorKey, AnchorDefinition> = {
  morning: {
    key: 'morning',
    label: 'Morning',
    glyph: 'sunny-outline',
    defaultWindow: '7:00',
    habits: [HABIT_LIBRARY.morning[0]!],
  },
  midday: {
    key: 'midday',
    label: 'Midday',
    glyph: 'partly-sunny-outline',
    defaultWindow: '12:30',
    habits: [HABIT_LIBRARY.midday[0]!],
  },
  evening: {
    key: 'evening',
    label: 'Evening',
    glyph: 'moon-outline',
    defaultWindow: '21:00',
    habits: [HABIT_LIBRARY.evening[0]!],
  },
};

/** Cycling time-window presets used by onboarding's "set your times" step. */
export const TIME_PRESETS: Record<AnchorKey, string[]> = {
  morning: ['6:30', '7:00', '7:30', '8:00'],
  midday: ['12:00', '12:30', '13:00'],
  evening: ['20:30', '21:00', '21:30', '22:00'],
};

/** Which anchor "owns" the current moment, for the active-anchor highlight. */
export function anchorForHour(hour: number): AnchorKey {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'midday';
  return 'evening';
}
