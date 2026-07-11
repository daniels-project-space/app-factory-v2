// ReviewPulse Haptic Feedback Map
// Every meaningful interaction has a haptic response

import * as Haptics from 'expo-haptics';

export const HapticMap = {
  // Light — standard taps, selections
  buttonPress:       () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  listItemTap:       () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  tabSwitch:         () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  toggleSwitch:      () => Haptics.selectionAsync(),
  starRatingChange:  () => Haptics.selectionAsync(),
  chipSelect:        () => Haptics.selectionAsync(),
  segmentSwitch:     () => Haptics.selectionAsync(),

  // Medium — meaningful actions
  sendReviewRequest: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  submitReply:       () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  connectPlatform:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  pullToRefresh:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  modalOpen:         () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  fabTap:            () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Heavy — destructive, serious
  deleteAction:      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  flagReview:        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  swipeDeleteThreshold: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Success notification — completions
  reviewSent:        () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  replySaved:        () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  platformConnected: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  subscriptionPro:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  signUpComplete:    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  // Warning — destructive confirmation
  deleteConfirm:     () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  cancelSubscription: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  // Error — failed actions
  requestFailed:     () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  authError:         () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  networkError:      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
} as const;
