import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { RevealDelay } from './state/journal-store';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Notification channel for Android
const CHANNEL_ID = 'one-thought-notifications';

// Initialize notification channel for Android
export async function initializeNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'One Thought Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
    });
  }
}

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Check if notifications are enabled
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Cancel a specific notification by identifier
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// Schedule a notification for when an entry is revealed (time capsule mode)
export async function scheduleRevealNotification(
  revealAt: number,
  entryDate: string
): Promise<string | null> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return null;

  const now = Date.now();
  const secondsUntilReveal = Math.floor((revealAt - now) / 1000);

  // Don't schedule if already past or less than 1 minute away
  if (secondsUntilReveal < 60) return null;

  const formattedDate = new Date(entryDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your thought has been revealed ✨',
      body: `Your entry from ${formattedDate} is now available to read.`,
      data: { type: 'reveal', entryDate },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilReveal,
    },
  });

  return identifier;
}

// Get the notification message based on reveal delay
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getRevealDelayMessage(delay: RevealDelay): string {
  switch (delay) {
    case 'tomorrow':
      return 'tomorrow';
    case 'week':
      return 'next week';
    case 'month':
      return 'next month';
    default:
      return 'soon';
  }
}

// Schedule daily reminder notification (only for instant mode)
export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<string | null> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return null;

  // Cancel existing daily reminders first
  await cancelDailyReminder();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to reflect 🌱',
      body: "Take a moment to capture today's thought.",
      data: { type: 'daily_reminder' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return identifier;
}

// Cancel daily reminder
export async function cancelDailyReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'daily_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Schedule evening nudge notification (only for instant mode)
export async function scheduleEveningNudge(
  hour: number = 20,
  minute: number = 0
): Promise<string | null> {
  const hasPermission = await areNotificationsEnabled();
  if (!hasPermission) return null;

  // Cancel existing evening nudges first
  await cancelEveningNudge();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Don't forget to journal 📝",
      body: "You haven't written today's thought yet. A few words can make a difference.",
      data: { type: 'evening_nudge' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return identifier;
}

// Cancel evening nudge
export async function cancelEveningNudge(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'evening_nudge') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Update notifications based on reveal delay setting
// - For instant mode: schedule daily reminders and evening nudges
// - For time capsule modes: cancel daily reminders (will schedule reveal notifications instead)
export async function updateNotificationsForRevealDelay(
  revealDelay: RevealDelay,
  dailyReminderEnabled: boolean,
  reminderTime: string,
  eveningNudgeEnabled: boolean
): Promise<void> {
  if (revealDelay === 'instant') {
    // Instant mode: use traditional daily reminders
    if (dailyReminderEnabled) {
      const [hours, minutes] = reminderTime.split(':').map(Number);
      await scheduleDailyReminder(hours, minutes);
    } else {
      await cancelDailyReminder();
    }

    if (eveningNudgeEnabled) {
      await scheduleEveningNudge();
    } else {
      await cancelEveningNudge();
    }
  } else {
    // Time capsule mode: cancel daily reminders (reveal notifications will be scheduled per entry)
    await cancelDailyReminder();
    await cancelEveningNudge();
  }
}

// Get all scheduled notifications (for debugging)
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}
