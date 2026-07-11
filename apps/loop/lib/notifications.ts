import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ANCHORS, ANCHOR_ORDER, type AnchorKey } from '@/constants/anchors';

/**
 * Anchor-time local notifications.
 *
 * Three fixed daily reminders, one per anchor, in the same calm voice as
 * the rest of the app — never "Don't break your streak!" nagging. Local
 * scheduling has no web equivalent, so every export here no-ops on web;
 * Settings' notifications toggle should treat this as a native-only
 * feature and hide/disable itself accordingly on `Platform.OS === 'web'`.
 */

// A handler is safe to register on every platform (it's a plain JS
// callback registry, not a native call) — foreground notifications should
// still surface as a banner rather than being silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** In-voice copy, verbatim from DESIGN.md §7 — no generic "don't forget!". */
export const ANCHOR_NOTIFICATION_COPY: Record<AnchorKey, string> = {
  morning: 'morning anchor — two small things.',
  midday: 'midday check — step outside, drink some water.',
  evening: 'evening wind-down. phone on the charger, one page.',
};

/** The re-engagement beat for a day the flame dimmed — same forgiving tone. */
export const REENGAGEMENT_COPY = 'your flame dimmed a little. one small thing brings it back.';

const ANCHOR_NOTIFICATION_IDS: Record<AnchorKey, string> = {
  morning: 'loop-anchor-morning',
  midday: 'loop-anchor-midday',
  evening: 'loop-anchor-evening',
};

const REENGAGEMENT_NOTIFICATION_ID = 'loop-reengagement';

function parseWindow(window: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = window.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  return { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 };
}

/** Requests OS notification permission. Resolves `false` (no prompt) on web. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * (Re)schedules the three daily anchor-time notifications at the given
 * windows, cancelling any previously scheduled ones first so changing a
 * time in Settings never leaves a stale duplicate firing alongside it.
 */
export async function scheduleAnchorNotifications(anchorTimes: Record<AnchorKey, string>): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelAnchorNotifications();

  for (const key of ANCHOR_ORDER) {
    const { hour, minute } = parseWindow(anchorTimes[key]);
    await Notifications.scheduleNotificationAsync({
      identifier: ANCHOR_NOTIFICATION_IDS[key],
      content: {
        title: ANCHORS[key].label,
        body: ANCHOR_NOTIFICATION_COPY[key],
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

/** Cancels all three anchor-time notifications, e.g. when a user disables them. */
export async function cancelAnchorNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all(
    ANCHOR_ORDER.map((key) =>
      Notifications.cancelScheduledNotificationAsync(ANCHOR_NOTIFICATION_IDS[key]).catch(() => {}),
    ),
  );
}

/**
 * Fires a few hours after reconciliation dims the flame for a missed day —
 * the re-engagement beat beyond the fixed anchor reminders, in the flame's
 * own forgiving voice rather than streak-anxiety language.
 */
export async function scheduleReengagementNudge(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    identifier: REENGAGEMENT_NOTIFICATION_ID,
    content: {
      title: 'Loop',
      body: REENGAGEMENT_COPY,
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 3,
      repeats: false,
    },
  });
}
