import { View, Text, ScrollView, Pressable, Switch, Alert, Linking, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  User,
  Palette,
  Bell,
  Database,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Cloud,
  CloudOff,
  Trash2,
  Crown,
  FileText,
  TestTube,
  RotateCcw,
  Play,
  Send,
  RefreshCw,
  Flame,
  Zap,
  Lock,
  Scale,
  Shield,
  AlertTriangle,
  Camera,
  Smile,
  PenTool,
  Layers,
  BookOpen,
  Download,
  Star,
  Music,
  Volume2,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolation, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAppTheme } from '@/lib/useAppTheme';
import {
  useSettingsStore,
  COLOR_THEMES,
  ThemeId,
  AppearanceMode,
} from '@/lib/state/settings-store';
import { useJournalStore, RevealDelay } from '@/lib/state/journal-store';
import { useOnboardingStore } from '@/lib/state/onboarding-store';
import { usePremiumStatus, useRestorePurchases, useResetPurchases } from '@/lib/usePremium';
import { useAchievementsStore, ACHIEVEMENTS } from '@/lib/achievements';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  scheduleEveningNudge,
  cancelEveningNudge,
  areNotificationsEnabled,
} from '@/lib/notifications';
import ParticleBackground from '@/components/ParticleBackground';
import NeonBackground from '@/components/NeonBackground';
import { useAuthStore } from '@/lib/state/auth-store';
import { fullSync, onSyncStatusChange, SyncStatus } from '@/lib/cloud-sync';

const SWIPE_THRESHOLD = 80;

// Glass Card Component with enhanced styling
function GlassCard({
  children,
  title,
  icon: Icon,
  delay = 0,
}: {
  children: React.ReactNode;
  title?: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  delay?: number;
}) {
  const theme = useAppTheme();

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} className="mb-4">
      {/* Outer shadow for depth */}
      <View
        style={{
          borderRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: theme.isDark ? 0.35 : 0.12,
          shadowRadius: 20,
          elevation: 8,
        }}
      >
        <BlurView
          intensity={theme.isDark ? 20 : 45}
          tint={theme.isDark ? 'dark' : 'light'}
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)',
          }}
        >
          {/* Inner top highlight */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 24,
              right: 24,
              height: 1,
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
              zIndex: 10,
            }}
          />
          {/* Side glow accents */}
          <View
            style={{
              position: 'absolute',
              top: 24,
              bottom: 24,
              left: 0,
              width: 1,
              backgroundColor: theme.isDark ? 'rgba(120,180,255,0.06)' : 'transparent',
              zIndex: 10,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 24,
              bottom: 24,
              right: 0,
              width: 1,
              backgroundColor: theme.isDark ? 'rgba(180,120,255,0.06)' : 'transparent',
              zIndex: 10,
            }}
          />
          <View
            className="p-5"
            style={{
              backgroundColor: theme.isDark ? 'rgba(12,12,14,0.7)' : 'rgba(255,255,255,0.8)',
            }}
          >
            {title && (
              <View className="flex-row items-center mb-4">
                {Icon && (
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : `${theme.accent}12`,
                      borderWidth: 1,
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'transparent',
                    }}
                  >
                    <Icon size={18} color={theme.accent} />
                  </View>
                )}
                <Text className="font-semibold text-base" style={{ color: theme.text }}>
                  {title}
                </Text>
              </View>
            )}
            {children}
          </View>
        </BlurView>
      </View>
    </Animated.View>
  );
}

// Toggle Row Component
function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
  isHapticToggle = false,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isHapticToggle?: boolean;
}) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const handleChange = useCallback(
    (newValue: boolean) => {
      // Special handling for the haptic toggle itself
      if (isHapticToggle) {
        // Always give feedback when interacting with the haptic toggle
        // This helps users understand the effect immediately
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onValueChange(newValue);
    },
    [onValueChange, hapticEnabled, isHapticToggle]
  );

  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 mr-4">
        <Text className="font-medium text-base" style={{ color: theme.text }}>
          {label}
        </Text>
        {subtitle && (
          <Text className="font-sans text-sm mt-0.5" style={{ color: theme.textSecondary }}>
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={handleChange}
        trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// Segmented Control Component with enhanced styling
function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  labels,
}: {
  options: T[];
  selected: T;
  onSelect: (option: T) => void;
  labels: Record<T, string>;
}) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const handleSelect = useCallback(
    (option: T) => {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onSelect(option);
    },
    [onSelect, hapticEnabled]
  );

  return (
    <View
      className="flex-row rounded-2xl p-1.5"
      style={{
        backgroundColor: theme.isDark ? 'rgba(42,42,40,0.6)' : 'rgba(232,235,228,0.6)',
        borderWidth: 1,
        borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      }}
    >
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityLabel={String(labels[option] ?? option)}
          onPress={() => handleSelect(option)}
          className="flex-1 py-3 rounded-xl items-center active:scale-95"
          style={{
            backgroundColor: selected === option
              ? theme.isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF'
              : 'transparent',
            shadowColor: selected === option ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: selected === option ? 2 : 0 },
            shadowOpacity: selected === option ? 0.08 : 0,
            shadowRadius: selected === option ? 4 : 0,
          }}
        >
          <Text
            className="font-semibold text-sm"
            style={{
              color: selected === option ? theme.text : theme.textMuted,
            }}
          >
            {labels[option]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Theme Pill Component with enhanced styling
function ThemePill({
  themeId,
  isSelected,
  onSelect,
  previewColors,
  name,
}: {
  themeId: ThemeId;
  isSelected: boolean;
  onSelect: () => void;
  previewColors: [string, string];
  name: string;
}) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const handlePress = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSelect();
  }, [onSelect, hapticEnabled]);

  return (
    <Pressable onPress={handlePress} accessibilityLabel={name} className="items-center mr-4 active:scale-95">
      <View
        className="w-16 h-16 rounded-2xl items-center justify-center mb-2"
        style={{
          borderWidth: isSelected ? 2.5 : 1,
          borderColor: isSelected ? theme.accent : theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          shadowColor: isSelected ? theme.accent : '#000',
          shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
          shadowOpacity: isSelected ? 0.3 : 0.08,
          shadowRadius: isSelected ? 8 : 4,
          elevation: isSelected ? 6 : 2,
        }}
      >
        <LinearGradient
          colors={[previewColors[0], previewColors[1]]}
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Inner highlight */}
          <View
            style={{
              position: 'absolute',
              top: 2,
              left: 8,
              right: 8,
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.4)',
              borderRadius: 1,
            }}
          />
          {isSelected && <Check size={22} color="#FFFFFF" strokeWidth={3} />}
        </LinearGradient>
      </View>
      <Text
        className="font-medium text-xs text-center"
        style={{ color: isSelected ? theme.text : theme.textSecondary }}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Pressable>
  );
}

// Achievements Section Component
function AchievementsSection() {
  const theme = useAppTheme();
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const unlockedIds = new Set(unlocked.map((u) => u.id));

  return (
    <View>
      <Text className="font-sans text-sm mb-3" style={{ color: theme.textSecondary }}>
        {unlocked.length} of {ACHIEVEMENTS.length} unlocked
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = unlockedIds.has(ach.id);
          return (
            <View
              key={ach.id}
              className="items-center px-2 py-2 rounded-2xl"
              style={{
                width: '30%',
                backgroundColor: isUnlocked
                  ? `${theme.accent}12`
                  : theme.isDark
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(0,0,0,0.02)',
                borderWidth: 1,
                borderColor: isUnlocked
                  ? `${theme.accent}20`
                  : theme.isDark
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.03)',
                opacity: isUnlocked ? 1 : 0.4,
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>
                {isUnlocked ? ach.icon : '\uD83D\uDD12'}
              </Text>
              <Text
                className="font-medium text-[10px] text-center"
                style={{ color: isUnlocked ? theme.text : theme.textMuted }}
                numberOfLines={1}
              >
                {ach.title}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useAppTheme();

  // Premium status
  const { isPremium } = usePremiumStatus();
  const restoreMutation = useRestorePurchases();
  const resetPurchases = useResetPurchases();

  // Settings state
  const themeId = useSettingsStore((s) => s.themeId);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const appearanceMode = useSettingsStore((s) => s.appearanceMode);
  const setAppearanceMode = useSettingsStore((s) => s.setAppearanceMode);
  const particleBackgroundEnabled = useSettingsStore((s) => s.particleBackgroundEnabled);
  const setParticleBackgroundEnabled = useSettingsStore((s) => s.setParticleBackgroundEnabled);
  const fireplaceBackgroundEnabled = useSettingsStore((s) => s.fireplaceBackgroundEnabled);
  const setFireplaceBackgroundEnabled = useSettingsStore((s) => s.setFireplaceBackgroundEnabled);
  const neonEffectEnabled = useSettingsStore((s) => s.neonEffectEnabled);
  const setNeonEffectEnabled = useSettingsStore((s) => s.setNeonEffectEnabled);
  const backgroundMusicEnabled = useSettingsStore((s) => s.backgroundMusicEnabled);
  const setBackgroundMusicEnabled = useSettingsStore((s) => s.setBackgroundMusicEnabled);
  const backgroundMusicVolume = useSettingsStore((s) => s.backgroundMusicVolume);
  const setBackgroundMusicVolume = useSettingsStore((s) => s.setBackgroundMusicVolume);
  const dailyReminderEnabled = useSettingsStore((s) => s.dailyReminderEnabled);
  const setDailyReminderEnabled = useSettingsStore((s) => s.setDailyReminderEnabled);
  const reminderTime = useSettingsStore((s) => s.reminderTime);
  const setReminderTime = useSettingsStore((s) => s.setReminderTime);
  const eveningReminderEnabled = useSettingsStore((s) => s.eveningReminderEnabled);
  const setEveningReminderEnabled = useSettingsStore((s) => s.setEveningReminderEnabled);
  const hapticFeedbackEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const setHapticFeedbackEnabled = useSettingsStore((s) => s.setHapticFeedbackEnabled);
  const revealDelay = useSettingsStore((s) => s.revealDelay);
  const setRevealDelay = useSettingsStore((s) => s.setRevealDelay);
  const showCountdownLabels = useSettingsStore((s) => s.showCountdownLabels);
  const setShowCountdownLabels = useSettingsStore((s) => s.setShowCountdownLabels);
  const cloudSyncEnabled = useSettingsStore((s) => s.cloudSyncEnabled);
  const setCloudSyncEnabled = useSettingsStore((s) => s.setCloudSyncEnabled);

  // Real auth state from Supabase auth store
  const authUser = useAuthStore((s) => s.user);
  const authSignOut = useAuthStore((s) => s.signOut);
  const isSignedIn = !!authUser;
  const userEmail = authUser?.email ?? null;

  // Cloud sync state
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);
  const [liveSyncStatus, setLiveSyncStatus] = useState<SyncStatus>({ state: 'idle' });

  // Subscribe to live sync status for photo upload progress feedback
  useEffect(() => {
    const unsub = onSyncStatusChange(setLiveSyncStatus);
    return unsub;
  }, []);

  const syncStatusLabel = useMemo(() => {
    if (liveSyncStatus.state === 'uploading_photo') {
      return 'Uploading photo…';
    }
    if (liveSyncStatus.state === 'syncing') {
      return 'Syncing…';
    }
    return null;
  }, [liveSyncStatus]);

  const handleSyncNow = useCallback(async () => {
    if (!authUser) {
      Alert.alert('Sign In Required', 'Please sign in with your account to sync.');
      return;
    }
    setIsSyncingNow(true);
    setLastSyncResult(null);
    try {
      const count = await fullSync();
      setLastSyncResult(count > 0 ? count + ' entries synced' : 'Already up to date');
    } catch {
      setLastSyncResult('Sync failed');
    } finally {
      setIsSyncingNow(false);
    }
  }, [authUser]);

  // Premium features
  const photoPromptsEnabled = useSettingsStore((s) => s.photoPromptsEnabled);
  const setPhotoPromptsEnabled = useSettingsStore((s) => s.setPhotoPromptsEnabled);
  const moodTrackingEnabled = useSettingsStore((s) => s.moodTrackingEnabled);
  const setMoodTrackingEnabled = useSettingsStore((s) => s.setMoodTrackingEnabled);
  // Journal state for export/delete
  const entries = useJournalStore((s) => s.entries);
  const currentStreak = useJournalStore((s) => s.currentStreak);
  const longestStreak = useJournalStore((s) => s.longestStreak);
  const moodHistory = useJournalStore((s) => s.moodHistory);
  const loadTestData = useJournalStore((s) => s.loadTestData);
  const clearAllData = useJournalStore((s) => s.clearAllData);

  // Onboarding state
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

  // Local state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [proFeaturesExpanded, setProFeaturesExpanded] = useState(false);

  // Swipe gesture for going back
  const translateX = useSharedValue(0);

  const navigateBack = useCallback(() => {
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.back();
  }, [hapticFeedbackEnabled]);

  // Swipe right gesture to go back
  const swipeBackGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow rightward swipes (positive translationX)
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, 150);
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD && event.velocityX > 0) {
        // Trigger navigation back
        runOnJS(navigateBack)();
      }
      // Spring back
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  // Animated style for swipe feedback
  const swipeContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [0, 100],
      [1, 0.96],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value * 0.3 },
        { scale },
      ],
    };
  });

  // Back indicator style (shows when swiping right)
  const backIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    const translateXVal = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [-30, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateX: translateXVal }],
    };
  });

  const handleClose = useCallback(() => {
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [hapticFeedbackEnabled]);

  // Open paywall
  const handleOpenPaywall = useCallback(() => {
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/paywall');
  }, [hapticFeedbackEnabled]);

  // Restore purchases
  const handleRestorePurchases = useCallback(async () => {
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await restoreMutation.mutateAsync();
      Alert.alert('Restored', 'Your purchases have been restored successfully.');
    } catch {
      Alert.alert('Error', 'Unable to restore purchases. Please try again.');
    }
  }, [hapticFeedbackEnabled, restoreMutation]);

  // Apple Sign In — routes to the dedicated sign-in screen
  const handleAppleSignIn = useCallback(() => {
    router.push('/sign-in');
  }, []);

  // Google Sign In — routes to the dedicated sign-in screen
  const handleGoogleSignIn = useCallback(() => {
    router.push('/sign-in');
  }, []);

  // OTA update check
  const handleCheckForUpdates = useCallback(async () => {
    if (__DEV__) {
      Alert.alert('Updates', 'Update checks are disabled in development mode.');
      return;
    }
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert('Update Ready', 'Restart the app to apply the latest update.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart', onPress: () => Updates.reloadAsync() },
        ]);
      } else {
        Alert.alert('Up to Date', 'You are on the latest version.');
      }
    } catch {
      Alert.alert('Update Check Failed', 'Could not check for updates. Try again later.');
    }
  }, []);

  // Sign Out
  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authSignOut();
          if (hapticFeedbackEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
    ]);
  }, [authSignOut, hapticFeedbackEnabled]);

  // Delete Account — two-step confirmation required by Apple App Store Guidelines 5.1.1(v)
  const authDeleteAccount = useAuthStore((s) => s.deleteAccount);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account, all journal entries, and backups. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your account and all data will be permanently deleted from our servers.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeletingAccount(true);
                    try {
                      await authDeleteAccount();
                      if (hapticFeedbackEnabled) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      }
                    } catch (err) {
                      const message = err instanceof Error ? err.message : 'Unknown error';
                      Alert.alert('Error', `Could not delete account: ${message}`);
                    } finally {
                      setIsDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [authDeleteAccount, hapticFeedbackEnabled]);

  // Time picker - update notifications when reminder time changes
  const handleTimeChange = useCallback(
    async (_event: any, selectedDate?: Date) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (selectedDate) {
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        setReminderTime(`${hours}:${minutes}`);

        // Reschedule notification if daily reminder is enabled and in instant mode
        if (dailyReminderEnabled && revealDelay === 'instant') {
          await scheduleDailyReminder(selectedDate.getHours(), selectedDate.getMinutes());
        }
      }
    },
    [setReminderTime, dailyReminderEnabled, revealDelay]
  );

  const reminderDate = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  reminderDate.setHours(hours, minutes, 0, 0);

  // Check notification permissions
  const checkNotificationPermission = useCallback(async () => {
    return await areNotificationsEnabled();
  }, []);

  const handleDailyReminderToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const hasPermission = await checkNotificationPermission();
        if (!hasPermission) {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Notifications Disabled',
              'Please enable notifications in your device settings to receive daily reminders.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
            return;
          }
        }

        // Only schedule daily reminders for instant mode
        // Time capsule modes get reveal notifications instead
        if (revealDelay === 'instant') {
          const [hours, minutes] = reminderTime.split(':').map(Number);
          await scheduleDailyReminder(hours, minutes);
        }
      } else {
        // Cancel daily reminders when disabled
        await cancelDailyReminder();
      }
      setDailyReminderEnabled(enabled);
    },
    [setDailyReminderEnabled, checkNotificationPermission, revealDelay, reminderTime]
  );

  // Handle evening reminder toggle
  const handleEveningReminderToggle = useCallback(
    async (enabled: boolean) => {
      // Evening nudge only works in instant mode
      if (enabled && revealDelay === 'instant') {
        await scheduleEveningNudge();
      } else {
        await cancelEveningNudge();
      }
      setEveningReminderEnabled(enabled);
    },
    [setEveningReminderEnabled, revealDelay]
  );

  // Handle reveal delay changes - update notification behavior
  const handleRevealDelayChange = useCallback(
    async (delay: RevealDelay) => {
      setRevealDelay(delay);

      if (dailyReminderEnabled) {
        if (delay === 'instant') {
          // Switching to instant mode: schedule daily reminders
          const [hours, minutes] = reminderTime.split(':').map(Number);
          await scheduleDailyReminder(hours, minutes);
          if (eveningReminderEnabled) {
            await scheduleEveningNudge();
          }
        } else {
          // Switching to time capsule mode: cancel daily reminders
          // (reveal notifications are scheduled per entry)
          await cancelDailyReminder();
          await cancelEveningNudge();
        }
      }
    },
    [setRevealDelay, dailyReminderEnabled, reminderTime, eveningReminderEnabled]
  );

  // Generate PDF with insights
  const handleExportPdf = useCallback(async () => {
    if (entries.length === 0) {
      Alert.alert('No Data', 'You have no entries to export.');
      return;
    }

    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsExportingPdf(true);

    try {
      // Sort entries by date
      const sortedEntries = [...entries].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Generate insights
      const totalEntries = entries.length;
      const firstEntry = sortedEntries[0];
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      const journeyDays = Math.ceil(
        (new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      // Analyze content for common themes
      const allContent = entries.map(e => e.content.toLowerCase()).join(' ');
      const themes: { name: string; keywords: string[] }[] = [
        { name: 'Gratitude', keywords: ['grateful', 'thankful', 'appreciate', 'blessed'] },
        { name: 'Growth', keywords: ['learn', 'grow', 'improve', 'better', 'change'] },
        { name: 'Relationships', keywords: ['friend', 'family', 'love', 'together', 'people'] },
        { name: 'Peace', keywords: ['peace', 'calm', 'quiet', 'rest', 'relax'] },
        { name: 'Achievement', keywords: ['accomplish', 'finish', 'complete', 'success', 'proud'] },
      ];

      const detectedThemes = themes
        .filter(t => t.keywords.some(k => allContent.includes(k)))
        .map(t => t.name);

      // Build mood chart HTML from last 30 days of mood data
      const recentMoods = [...moodHistory]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      const moodChartHtml = recentMoods.length > 0 ? `
        <div class="mood-section">
          <div class="section-title" style="margin-bottom: 16px;">Mood Overview</div>
          <div class="mood-chart">
            ${recentMoods.map(m => {
              const pct = (m.score / 5) * 100;
              const moodColors: Record<number, string> = {
                5: '#4CAF50', 4: '#8BC34A', 3: '#FFC107', 2: '#FF9800', 1: '#F44336',
              };
              const barColor = moodColors[Math.round(m.score)] ?? theme.accent;
              const day = new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
              return `
                <div class="mood-bar-wrap">
                  <div class="mood-bar-outer">
                    <div class="mood-bar-inner" style="height:${pct}%; background:${barColor};"></div>
                  </div>
                  <div class="mood-label">${day}</div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="mood-legend">
            <span style="color:#4CAF50">● Great</span>&nbsp;&nbsp;
            <span style="color:#8BC34A">● Good</span>&nbsp;&nbsp;
            <span style="color:#FFC107">● Okay</span>&nbsp;&nbsp;
            <span style="color:#FF9800">● Low</span>&nbsp;&nbsp;
            <span style="color:#F44336">● Hard</span>
          </div>
        </div>
      ` : '';

      const accentColor = theme.accent;

      // Generate HTML for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1A1A18;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 30px;
              border-bottom: 2px solid ${accentColor};
            }
            .title {
              font-size: 28px;
              font-weight: 700;
              color: ${accentColor};
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 14px;
              color: #6B6B69;
            }
            .insights {
              background: #F5F5F3;
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 32px;
            }
            .insights-title {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 16px;
              color: #1A1A18;
            }
            .stats-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 16px;
              margin-bottom: 20px;
            }
            .stat {
              flex: 1;
              min-width: 120px;
              text-align: center;
              padding: 16px;
              background: white;
              border-radius: 12px;
              border-top: 3px solid ${accentColor};
            }
            .stat-value {
              font-size: 24px;
              font-weight: 700;
              color: ${accentColor};
            }
            .stat-label {
              font-size: 12px;
              color: #6B6B69;
              margin-top: 4px;
            }
            .themes {
              margin-top: 16px;
            }
            .themes-label {
              font-size: 12px;
              color: #6B6B69;
              margin-bottom: 8px;
            }
            .theme-tag {
              display: inline-block;
              background: ${accentColor};
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              margin-right: 8px;
              margin-bottom: 8px;
            }
            .mood-section {
              background: #F5F5F3;
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 32px;
            }
            .mood-chart {
              display: flex;
              align-items: flex-end;
              gap: 3px;
              height: 80px;
              margin-bottom: 8px;
              overflow: hidden;
            }
            .mood-bar-wrap {
              display: flex;
              flex-direction: column;
              align-items: center;
              flex: 1;
            }
            .mood-bar-outer {
              width: 100%;
              height: 64px;
              background: #E8EBE4;
              border-radius: 3px;
              display: flex;
              align-items: flex-end;
            }
            .mood-bar-inner {
              width: 100%;
              border-radius: 3px;
              min-height: 4px;
            }
            .mood-label {
              font-size: 7px;
              color: #9A9A98;
              margin-top: 2px;
              text-align: center;
            }
            .mood-legend {
              font-size: 10px;
              color: #6B6B69;
              margin-top: 8px;
            }
            .entries-section {
              margin-top: 20px;
            }
            .section-title {
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 20px;
              color: #1A1A18;
            }
            .entry {
              margin-bottom: 24px;
              padding: 20px;
              background: #FAFAF8;
              border-radius: 12px;
              border-left: 4px solid ${accentColor};
            }
            .entry-date {
              font-size: 12px;
              color: ${accentColor};
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            .entry-prompt {
              font-size: 13px;
              color: #6B6B69;
              font-style: italic;
              margin-bottom: 12px;
            }
            .entry-content {
              font-size: 16px;
              color: #1A1A18;
              line-height: 1.5;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid ${accentColor};
              text-align: center;
              font-size: 11px;
              color: #9A9A98;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">One Thought a Day</div>
            <div class="subtitle">Your Journal Export • ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>

          <div class="insights">
            <div class="insights-title">Your Journey Insights</div>
            <div class="stats-grid">
              <div class="stat">
                <div class="stat-value">${totalEntries}</div>
                <div class="stat-label">Total Entries</div>
              </div>
              <div class="stat">
                <div class="stat-value">${currentStreak}</div>
                <div class="stat-label">Current Streak</div>
              </div>
              <div class="stat">
                <div class="stat-value">${longestStreak}</div>
                <div class="stat-label">Longest Streak</div>
              </div>
              <div class="stat">
                <div class="stat-value">${journeyDays}</div>
                <div class="stat-label">Days Journaling</div>
              </div>
            </div>
            ${detectedThemes.length > 0 ? `
              <div class="themes">
                <div class="themes-label">Themes in your writing:</div>
                ${detectedThemes.map(t => `<span class="theme-tag">${t}</span>`).join('')}
              </div>
            ` : ''}
          </div>

          ${moodChartHtml}

          <div class="entries-section">
            <div class="section-title">Your Thoughts</div>
            ${sortedEntries.map(entry => {
              const date = new Date(entry.date + 'T00:00:00');
              const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              });
              return `
                <div class="entry">
                  <div class="entry-date">${formattedDate}</div>
                  <div class="entry-prompt">${entry.prompt}</div>
                  <div class="entry-content">"${entry.content}"</div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="footer">
            Generated with One Thought a Day • ${new Date().toLocaleDateString()}
          </div>
        </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 612,
        height: 792,
      });

      // Share PDF
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share your journal',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', 'PDF created successfully but sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [entries, currentStreak, longestStreak, moodHistory, hapticFeedbackEnabled, theme]);

  // Load test data
  const handleLoadTestData = useCallback(() => {
    Alert.alert(
      'Load Test Data',
      'This will replace your current entries with sample data for the past week. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Data',
          onPress: () => {
            loadTestData();
            if (hapticFeedbackEnabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Alert.alert('Success', 'Test data loaded! Check your history.');
          },
        },
      ]
    );
  }, [loadTestData, hapticFeedbackEnabled]);

  // Reset purchases (for testing)
  const handleResetPurchases = useCallback(() => {
    Alert.alert(
      'Reset Purchases',
      'This will reset your local premium status for testing. This only affects the local app state.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            resetPurchases();
            if (hapticFeedbackEnabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Alert.alert('Success', 'Premium status has been reset.');
          },
        },
      ]
    );
  }, [resetPurchases, hapticFeedbackEnabled]);

  // Delete all data
  const handleDeleteAll = useCallback(() => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your entries and cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            resetOnboarding();
            if (hapticFeedbackEnabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            Alert.alert('Data Deleted', 'All your entries have been deleted.');
          },
        },
      ]
    );
  }, [clearAllData, resetOnboarding, hapticFeedbackEnabled]);

  // Format time for display
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View className="flex-1">
      <LinearGradient colors={theme.gradient as [string, string, string]} style={{ flex: 1 }}>
        <ParticleBackground />
        <NeonBackground />

        {/* Swipe right indicator to go back */}
        <Animated.View
          style={[
            backIndicatorStyle,
            {
              position: 'absolute',
              left: 20,
              top: '45%',
              zIndex: 100,
            },
          ]}
          pointerEvents="none"
        >
          <BlurView
            intensity={theme.isDark ? 30 : 50}
            tint={theme.isDark ? 'dark' : 'light'}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 20,
              overflow: 'hidden',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={18} color={theme.accent} />
            <Text className="font-medium text-sm ml-1" style={{ color: theme.text }}>
              Back
            </Text>
          </BlurView>
        </Animated.View>

        <GestureDetector gesture={swipeBackGesture}>
          <Animated.View style={[{ flex: 1 }, swipeContainerStyle]}>
            <SafeAreaView className="flex-1" edges={['top']}>
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 pt-4 pb-4">
                <Text className="font-bold text-2xl tracking-tight" style={{ color: theme.text }}>
                  Settings
                </Text>
                <Pressable
                  onPress={handleClose}
                  accessibilityLabel="Close"
                  className="w-10 h-10 items-center justify-center rounded-full active:scale-95"
                  style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.5)' : 'rgba(232,235,228,0.5)' }}
                >
                  <X size={20} color={theme.text} />
                </Pressable>
              </View>

              <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
            {/* Premium Section - One Thought+ */}
            <Animated.View entering={FadeInDown.delay(50).duration(400)} className="mb-4">
              {isPremium ? (
                // Premium Active - Luxurious embossed card
                <View
                  style={{
                    borderRadius: 24,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: theme.isDark ? 'rgba(212, 175, 55, 0.4)' : 'rgba(180, 140, 50, 0.3)',
                  }}
                >
                  <LinearGradient
                    colors={theme.isDark
                      ? ['#2A2520', '#1F1B18', '#2A2520']
                      : ['#FDF8F0', '#F5EEE0', '#FDF8F0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 20 }}
                  >
                    {/* Decorative corner accents */}
                    <View style={{ position: 'absolute', top: 12, left: 12, opacity: 0.3 }}>
                      <Star size={12} color={theme.isDark ? '#D4AF37' : '#B48C32'} fill={theme.isDark ? '#D4AF37' : '#B48C32'} />
                    </View>
                    <View style={{ position: 'absolute', top: 12, right: 12, opacity: 0.3 }}>
                      <Star size={12} color={theme.isDark ? '#D4AF37' : '#B48C32'} fill={theme.isDark ? '#D4AF37' : '#B48C32'} />
                    </View>
                    <View style={{ position: 'absolute', bottom: 12, left: 12, opacity: 0.3 }}>
                      <Star size={12} color={theme.isDark ? '#D4AF37' : '#B48C32'} fill={theme.isDark ? '#D4AF37' : '#B48C32'} />
                    </View>
                    <View style={{ position: 'absolute', bottom: 12, right: 12, opacity: 0.3 }}>
                      <Star size={12} color={theme.isDark ? '#D4AF37' : '#B48C32'} fill={theme.isDark ? '#D4AF37' : '#B48C32'} />
                    </View>

                    {/* Main content */}
                    <View className="items-center py-2">
                      <View
                        className="w-16 h-16 rounded-full items-center justify-center mb-3"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(180, 140, 50, 0.1)',
                          borderWidth: 2,
                          borderColor: theme.isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(180, 140, 50, 0.2)',
                        }}
                      >
                        <Crown size={28} color={theme.isDark ? '#D4AF37' : '#B48C32'} />
                      </View>
                      <Text
                        className="font-bold text-lg tracking-wide"
                        style={{ color: theme.isDark ? '#D4AF37' : '#8B7028' }}
                      >
                        ONE THOUGHT+
                      </Text>
                      <Text
                        className="font-medium text-sm mt-1"
                        style={{ color: theme.isDark ? 'rgba(212, 175, 55, 0.7)' : 'rgba(139, 112, 40, 0.7)' }}
                      >
                        Premium Member
                      </Text>

                      {/* Divider line */}
                      <View
                        className="w-24 h-px my-4"
                        style={{ backgroundColor: theme.isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(180, 140, 50, 0.2)' }}
                      />

                      <Text
                        className="font-sans text-xs text-center leading-5"
                        style={{ color: theme.textSecondary }}
                      >
                        Thank you for your support.{'\n'}All premium features are unlocked.
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              ) : (
                // Not Premium - Standard upgrade card
                <BlurView
                  intensity={theme.isDark ? 40 : 60}
                  tint={theme.isDark ? 'dark' : 'light'}
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <View style={{ backgroundColor: theme.card }} className="p-4">
                    <View className="flex-row items-center mb-3">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: theme.accentLight }}
                      >
                        <Crown size={20} color={theme.accent} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-base" style={{ color: theme.text }}>
                          One Thought+
                        </Text>
                        <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                          Weekly insights, full history & more
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={handleOpenPaywall}
                      testID="upgrade-button"
                      accessibilityLabel="Upgrade to One Thought+"
                      accessibilityRole="button"
                      className="mt-2"
                    >
                      <View
                        style={{
                          backgroundColor: theme.accent,
                          paddingVertical: 14,
                          borderRadius: 14,
                          alignItems: 'center',
                        }}
                      >
                        <Text className="font-semibold text-base text-white">Upgrade to Premium</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={handleRestorePurchases}
                      accessibilityLabel="Restore purchases"
                      disabled={restoreMutation.isPending}
                      className="mt-3 py-2"
                    >
                      <Text
                        className="font-medium text-sm text-center"
                        style={{ color: theme.textSecondary, opacity: restoreMutation.isPending ? 0.5 : 1 }}
                      >
                        {restoreMutation.isPending ? 'Restoring...' : 'Restore purchases'}
                      </Text>
                    </Pressable>
                  </View>
                </BlurView>
              )}
            </Animated.View>

            {/* Section: Achievements */}
            <GlassCard title="Achievements" icon={Star} delay={90}>
              <AchievementsSection />
            </GlassCard>

            {/* Section 1: Account */}
            <GlassCard title="Account" icon={User} delay={100}>
              {isSignedIn ? (
                <View>
                  <View className="flex-row items-center justify-between py-2">
                    <View>
                      <Text className="font-medium text-base" style={{ color: theme.text }}>
                        Signed in as
                      </Text>
                      <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                        {userEmail}
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleSignOut}
                      accessibilityLabel="Sign out"
                      className="px-4 py-2 rounded-full"
                      style={{ backgroundColor: theme.isDark ? '#3A3A38' : '#E8EBE4' }}
                    >
                      <Text className="font-medium text-sm" style={{ color: theme.text }}>
                        Sign Out
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="font-sans text-xs mt-2" style={{ color: theme.textMuted }}>
                    Used for backup & sync only
                  </Text>

                  {/* Delete Account — Apple App Store Guideline 5.1.1(v) */}
                  <Pressable
                    onPress={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    accessibilityLabel="Delete account"
                    accessibilityRole="button"
                    accessibilityHint="Permanently deletes your account and all data"
                    className="flex-row items-center py-3 mt-2 border-t"
                    style={{ borderTopColor: theme.cardBorder, opacity: isDeletingAccount ? 0.6 : 1 }}
                  >
                    <Trash2 size={16} color="#E07A5F" />
                    <Text className="font-medium text-sm ml-2" style={{ color: '#E07A5F' }}>
                      {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  {Platform.OS === 'ios' && (
                    <Pressable
                      accessibilityLabel="Sign in with Apple"
                      onPress={handleAppleSignIn}
                      className="flex-row items-center justify-center py-3.5 rounded-xl mb-3"
                      style={{ backgroundColor: theme.isDark ? '#FFFFFF' : '#000000' }}
                    >
                      <Text
                        className="font-semibold text-base"
                        style={{ color: theme.isDark ? '#000000' : '#FFFFFF' }}
                      >
                         Sign in with Apple
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityLabel="Sign in with Google"
                    onPress={handleGoogleSignIn}
                    className="flex-row items-center justify-center py-3 rounded-xl"
                    style={{ backgroundColor: theme.isDark ? '#3A3A38' : '#FFFFFF', borderWidth: 1, borderColor: theme.cardBorder }}
                  >
                    <Text className="font-medium text-base" style={{ color: theme.text }}>
                      Sign in with Google
                    </Text>
                  </Pressable>
                  <Text className="font-sans text-xs text-center mt-3" style={{ color: theme.textMuted }}>
                    Used for backup & sync only
                  </Text>
                </View>
              )}
            </GlassCard>

            {/* Section 2: Appearance */}
            <GlassCard title="Appearance" icon={Palette} delay={150}>
              {/* Color Theme */}
              <Text className="font-medium text-sm mb-3" style={{ color: theme.textSecondary }}>
                Color Theme
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -16, paddingHorizontal: 16, marginBottom: 20, flexGrow: 0 }}
              >
                {COLOR_THEMES.map((t) => (
                  <ThemePill
                    key={t.id}
                    themeId={t.id}
                    isSelected={themeId === t.id}
                    onSelect={() => setTheme(t.id)}
                    previewColors={t.previewColors}
                    name={t.name}
                  />
                ))}
              </ScrollView>

              {/* System Mode */}
              <Text className="font-medium text-sm mb-3" style={{ color: theme.textSecondary }}>
                Appearance Mode
              </Text>
              <SegmentedControl<AppearanceMode>
                options={['system', 'light', 'dark']}
                selected={appearanceMode}
                onSelect={setAppearanceMode}
                labels={{ system: 'System', light: 'Light', dark: 'Dark' }}
              />

              {/* Particle Background & Haptics */}
              <View className="mt-4">
                <ToggleRow
                  label="Particle background"
                  subtitle="Subtle floating stars"
                  value={particleBackgroundEnabled}
                  onValueChange={setParticleBackgroundEnabled}
                />
                <ToggleRow
                  label="Haptic feedback"
                  value={hapticFeedbackEnabled}
                  onValueChange={setHapticFeedbackEnabled}
                  isHapticToggle={true}
                />
              </View>

              {/* Pro Features - Collapsible */}
              <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                <Pressable
                  accessibilityLabel="Pro features"
                  onPress={() => {
                    if (hapticFeedbackEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setProFeaturesExpanded(!proFeaturesExpanded);
                  }}
                  className="flex-row items-center justify-between py-1"
                >
                  <View className="flex-row items-center">
                    <Text className="font-medium text-sm" style={{ color: theme.textSecondary }}>
                      Pro Features
                    </Text>
                    {!isPremium && (
                      <View
                        className="ml-2 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Text className="font-semibold text-[10px] text-white">PRO</Text>
                      </View>
                    )}
                  </View>
                  <Animated.View
                    style={{
                      transform: [{ rotate: proFeaturesExpanded ? '180deg' : '0deg' }],
                    }}
                  >
                    <ChevronDown size={18} color={theme.textSecondary} />
                  </Animated.View>
                </Pressable>

                {proFeaturesExpanded && (
                  <View className="mt-2">
                    {/* Fireplace Background */}
                    <Pressable
                      accessibilityLabel="Fireplace background"
                      onPress={() => {
                        if (!isPremium) {
                          if (hapticFeedbackEnabled) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          router.push('/paywall');
                          return;
                        }
                        if (hapticFeedbackEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setFireplaceBackgroundEnabled(!fireplaceBackgroundEnabled);
                      }}
                      className="flex-row items-center justify-between py-3"
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <Flame size={18} color={theme.accent} />
                        <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                          Fireplace glow
                        </Text>
                      </View>
                      {isPremium ? (
                        <Switch
                          accessibilityLabel="Fireplace background toggle"
                          value={fireplaceBackgroundEnabled}
                          onValueChange={setFireplaceBackgroundEnabled}
                          trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }}
                          thumbColor="#FFFFFF"
                        />
                      ) : (
                        <Lock size={16} color={theme.textSecondary} />
                      )}
                    </Pressable>

                    {/* Neon Glow */}
                    <Pressable
                      accessibilityLabel="Neon effect"
                      onPress={() => {
                        if (!isPremium) {
                          if (hapticFeedbackEnabled) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          router.push('/paywall');
                          return;
                        }
                        if (hapticFeedbackEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setNeonEffectEnabled(!neonEffectEnabled);
                      }}
                      className="flex-row items-center justify-between py-3"
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <Zap size={18} color={theme.accent} />
                        <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                          Neon glow
                        </Text>
                      </View>
                      {isPremium ? (
                        <Switch
                          accessibilityLabel="Neon effect toggle"
                          value={neonEffectEnabled}
                          onValueChange={setNeonEffectEnabled}
                          trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }}
                          thumbColor="#FFFFFF"
                        />
                      ) : (
                        <Lock size={16} color={theme.textSecondary} />
                      )}
                    </Pressable>

                    {/* Background Music */}
                    <Pressable
                      accessibilityLabel="Background music"
                      onPress={() => {
                        if (!isPremium) {
                          if (hapticFeedbackEnabled) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          router.push('/paywall');
                          return;
                        }
                        if (hapticFeedbackEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setBackgroundMusicEnabled(!backgroundMusicEnabled);
                      }}
                      className="flex-row items-center justify-between py-3 border-t"
                      style={{ borderTopColor: theme.cardBorder }}
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <Music size={18} color={theme.accent} />
                        <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                          Background music
                        </Text>
                      </View>
                      {isPremium ? (
                        <Switch
                          accessibilityLabel="Background music toggle"
                          value={backgroundMusicEnabled}
                          onValueChange={setBackgroundMusicEnabled}
                          trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }}
                          thumbColor="#FFFFFF"
                        />
                      ) : (
                        <Lock size={16} color={theme.textSecondary} />
                      )}
                    </Pressable>

                    {/* Volume Slider - Shows when music is enabled */}
                    {isPremium && backgroundMusicEnabled && (
                      <Animated.View
                        entering={FadeInDown.duration(200)}
                        className="pb-3 pl-8"
                      >
                        <View className="flex-row items-center">
                          <Volume2 size={14} color={theme.textSecondary} />
                          <View className="flex-1 mx-3">
                            <Slider
                              value={backgroundMusicVolume}
                              onValueChange={setBackgroundMusicVolume}
                              minimumValue={0.05}
                              maximumValue={1}
                              step={0.05}
                              minimumTrackTintColor={theme.accent}
                              maximumTrackTintColor={theme.isDark ? '#3A3A38' : '#E5E5E3'}
                              thumbTintColor={theme.accent}
                            />
                          </View>
                          <Text
                            className="font-medium text-xs w-10 text-right"
                            style={{ color: theme.textSecondary }}
                          >
                            {Math.round(backgroundMusicVolume * 100)}%
                          </Text>
                        </View>
                      </Animated.View>
                    )}

                    {/* Photo Prompts */}
                    <Pressable
                      accessibilityLabel="Toggle photo prompts"
                      onPress={() => {
                        if (!isPremium) {
                          if (hapticFeedbackEnabled) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          router.push('/paywall');
                          return;
                        }
                        if (hapticFeedbackEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setPhotoPromptsEnabled(!photoPromptsEnabled);
                      }}
                      className="flex-row items-center justify-between py-3 border-t"
                      style={{ borderTopColor: theme.cardBorder }}
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <Camera size={18} color={theme.accent} />
                        <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                          Photo prompts
                        </Text>
                      </View>
                      {isPremium ? (
                        <Switch
                          accessibilityLabel="Photo prompts"
                          value={photoPromptsEnabled}
                          onValueChange={setPhotoPromptsEnabled}
                          trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }}
                          thumbColor="#FFFFFF"
                        />
                      ) : (
                        <Lock size={16} color={theme.textSecondary} />
                      )}
                    </Pressable>

                    {/* Mood Tracking */}
                    <Pressable
                      accessibilityLabel="Toggle mood tracking"
                      onPress={() => {
                        if (!isPremium) {
                          if (hapticFeedbackEnabled) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          router.push('/paywall');
                          return;
                        }
                        if (hapticFeedbackEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setMoodTrackingEnabled(!moodTrackingEnabled);
                      }}
                      className="flex-row items-center justify-between py-3 border-t"
                      style={{ borderTopColor: theme.cardBorder }}
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <Smile size={18} color={theme.accent} />
                        <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                          Mood tracking
                        </Text>
                      </View>
                      {isPremium ? (
                        <Switch
                          accessibilityLabel="Mood tracking"
                          value={moodTrackingEnabled}
                          onValueChange={setMoodTrackingEnabled}
                          trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }}
                          thumbColor="#FFFFFF"
                        />
                      ) : (
                        <Lock size={16} color={theme.textSecondary} />
                      )}
                    </Pressable>

                    {/* Custom Prompts */}
                    <Pressable
                      accessibilityLabel="Custom prompts settings"
                      onPress={() => {
                        if (!isPremium) {
                          if (hapticFeedbackEnabled) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          router.push('/paywall');
                          return;
                        }
                        if (hapticFeedbackEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        router.push('/custom-prompts');
                      }}
                      className="flex-row items-center justify-between py-3 border-t"
                      style={{ borderTopColor: theme.cardBorder }}
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <PenTool size={18} color={theme.accent} />
                        <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                          Custom prompts
                        </Text>
                      </View>
                      {isPremium ? (
                        <ChevronRight size={16} color={theme.textSecondary} />
                      ) : (
                        <Lock size={16} color={theme.textSecondary} />
                      )}
                    </Pressable>

                    {/* Prompt Categories */}
                    <Pressable
                      accessibilityLabel="Prompt categories settings"
                      onPress={() => {
                        if (!isPremium) {
                          if (hapticFeedbackEnabled) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          router.push('/paywall');
                          return;
                        }
                        if (hapticFeedbackEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        router.push('/prompt-categories');
                      }}
                      className="flex-row items-center justify-between py-3 border-t"
                      style={{ borderTopColor: theme.cardBorder }}
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <Layers size={18} color={theme.accent} />
                        <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                          Prompt categories
                        </Text>
                      </View>
                      {isPremium ? (
                        <ChevronRight size={16} color={theme.textSecondary} />
                      ) : (
                        <Lock size={16} color={theme.textSecondary} />
                      )}
                    </Pressable>

                    {/* Philosopher Guide */}
                    <Pressable
                      accessibilityLabel="Philosopher guide settings"
                      onPress={() => {
                        if (!isPremium) {
                          if (hapticFeedbackEnabled) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          router.push('/paywall');
                          return;
                        }
                        if (hapticFeedbackEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        router.push('/philosopher-guide');
                      }}
                      className="flex-row items-center justify-between py-3 border-t"
                      style={{ borderTopColor: theme.cardBorder }}
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <BookOpen size={18} color={theme.accent} />
                        <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                          Philosopher guide
                        </Text>
                      </View>
                      {isPremium ? (
                        <ChevronRight size={16} color={theme.textSecondary} />
                      ) : (
                        <Lock size={16} color={theme.textSecondary} />
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            </GlassCard>

            {/* Section 3: Notifications */}
            <GlassCard title="Daily Reminder" icon={Bell} delay={200}>
              <ToggleRow
                label="Daily reminder"
                value={dailyReminderEnabled}
                onValueChange={handleDailyReminderToggle}
              />

              {dailyReminderEnabled && (
                <>
                  <Pressable
                    accessibilityLabel="Set reminder time"
                    onPress={() => setShowTimePicker(true)}
                    className="flex-row items-center justify-between py-3"
                  >
                    <Text className="font-medium text-base" style={{ color: theme.text }}>
                      Reminder time
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="font-medium text-base mr-2" style={{ color: theme.accent }}>
                        {formatTime(reminderTime)}
                      </Text>
                      <ChevronRight size={18} color={theme.textSecondary} />
                    </View>
                  </Pressable>

                  {showTimePicker && (
                    <DateTimePicker
                      value={reminderDate}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      textColor={theme.text}
                    />
                  )}

                  <ToggleRow
                    label="Evening reminder"
                    subtitle="Gentle nudge if not completed"
                    value={eveningReminderEnabled}
                    onValueChange={handleEveningReminderToggle}
                  />

                  <View
                    className="mt-2 p-3 rounded-xl"
                    style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                  >
                    <Text className="font-sans text-xs" style={{ color: theme.textMuted }}>
                      Notification preview: "One sentence. That's all."
                    </Text>
                  </View>
                </>
              )}
            </GlassCard>

            {/* Section 4: Time Capsule */}
            <GlassCard title="Time Capsule" icon={Send} delay={325}>
              <Text className="font-sans text-sm mb-4" style={{ color: theme.textSecondary }}>
                Choose when your thoughts become readable again.
              </Text>

              {/* Reveal Delay Options */}
              {([
                { delay: 'tomorrow' as RevealDelay, label: 'Tomorrow', desc: '24 hours' },
                { delay: 'week' as RevealDelay, label: 'Next week', desc: '7 days' },
                { delay: 'month' as RevealDelay, label: 'Next month', desc: '30 days' },
                { delay: 'instant' as RevealDelay, label: 'Right away', desc: 'No delay' },
              ]).map((option, index) => (
                <Pressable
                  accessibilityLabel="Select reveal delay"
                  key={option.delay}
                  onPress={() => {
                    if (hapticFeedbackEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    handleRevealDelayChange(option.delay);
                  }}
                  className="flex-row items-center justify-between py-3"
                  style={index > 0 ? { borderTopWidth: 1, borderTopColor: theme.cardBorder } : {}}
                >
                  <View>
                    <Text className="font-medium text-base" style={{ color: theme.text }}>
                      {option.label}
                    </Text>
                    <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>
                      {option.desc}
                    </Text>
                  </View>
                  {revealDelay === option.delay && (
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              ))}

              <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                <ToggleRow
                  label="Show countdown labels"
                  subtitle="Display time remaining on sealed entries"
                  value={showCountdownLabels}
                  onValueChange={setShowCountdownLabels}
                />
              </View>
            </GlassCard>

            {/* Section 7: Data & Privacy */}
            <GlassCard title="Data" icon={Database} delay={375}>
              <View className="flex-row items-center justify-between py-2 mb-3">
                <View className="flex-row items-center">
                  {cloudSyncEnabled ? (
                    <Cloud size={18} color={theme.accent} />
                  ) : (
                    <CloudOff size={18} color={theme.textSecondary} />
                  )}
                  <Text className="font-medium text-base ml-2" style={{ color: theme.text }}>
                    Cloud Sync
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Cloud sync"
                  value={cloudSyncEnabled}
                  onValueChange={(value) => {
                    if (value && !authUser) {
                      Alert.alert('Sign In Required', 'Please sign in to enable cloud sync.');
                      return;
                    }
                    setCloudSyncEnabled(value);
                    if (value && authUser) {
                      handleSyncNow();
                    }
                  }}
                  trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {cloudSyncEnabled && (
                <Pressable
                  accessibilityLabel="Sync now"
                  onPress={handleSyncNow}
                  disabled={isSyncingNow}
                  className="flex-row items-center py-3 border-t"
                  style={{ borderTopColor: theme.cardBorder, opacity: isSyncingNow ? 0.6 : 1 }}
                >
                  <RefreshCw size={18} color={theme.accent} />
                  <View className="ml-3 flex-1">
                    <Text className="font-medium text-base" style={{ color: theme.text }}>
                      Sync Now
                    </Text>
                    {isSyncingNow && syncStatusLabel ? (
                      <Text className="text-xs mt-0.5" style={{ color: theme.accent }}>
                        {syncStatusLabel}
                      </Text>
                    ) : lastSyncResult ? (
                      <Text className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
                        {lastSyncResult}
                      </Text>
                    ) : null}
                  </View>
                  {isSyncingNow && (
                    <ActivityIndicator size="small" color={theme.accent} />
                  )}
                </Pressable>
              )}

              <Pressable
                accessibilityLabel="Export journal as PDF"
                onPress={handleExportPdf}
                disabled={isExportingPdf}
                className="flex-row items-center py-3 border-t"
                style={{ borderTopColor: theme.cardBorder, opacity: isExportingPdf ? 0.6 : 1 }}
              >
                <FileText size={18} color={theme.accent} />
                <Text className="font-medium text-base ml-3 flex-1" style={{ color: theme.text }}>
                  Export PDF with insights
                </Text>
                {isExportingPdf && (
                  <ActivityIndicator size="small" color={theme.accent} />
                )}
              </Pressable>

              <Pressable
                accessibilityLabel="Delete all entries"
                onPress={handleDeleteAll}
                className="flex-row items-center py-3 border-t"
                style={{ borderTopColor: theme.cardBorder }}
              >
                <Trash2 size={18} color="#E07A5F" />
                <Text className="font-medium text-base ml-3" style={{ color: '#E07A5F' }}>
                  Delete all data
                </Text>
              </Pressable>
            </GlassCard>

            {/* Section 8: Legal & About */}
            <GlassCard title="Legal & About" icon={Scale} delay={400}>
              <Pressable
                accessibilityLabel="Terms of Service"
                onPress={() => {
                  if (hapticFeedbackEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push('/legal?type=terms');
                }}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center">
                  <FileText size={18} color={theme.accent} />
                  <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                    Terms of Service
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textSecondary} />
              </Pressable>

              <Pressable
                accessibilityLabel="Privacy Policy"
                onPress={() => {
                  if (hapticFeedbackEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push('/legal?type=privacy');
                }}
                className="flex-row items-center justify-between py-3 border-t"
                style={{ borderTopColor: theme.cardBorder }}
              >
                <View className="flex-row items-center">
                  <Shield size={18} color={theme.accent} />
                  <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                    Privacy Policy
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textSecondary} />
              </Pressable>

              <Pressable
                accessibilityLabel="Disclaimer"
                onPress={() => {
                  if (hapticFeedbackEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push('/legal?type=disclaimer');
                }}
                className="flex-row items-center justify-between py-3 border-t"
                style={{ borderTopColor: theme.cardBorder }}
              >
                <View className="flex-row items-center">
                  <AlertTriangle size={18} color={theme.accent} />
                  <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                    Disclaimer
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textSecondary} />
              </Pressable>

              {/* App Version */}
              <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                <Text className="font-sans text-xs text-center" style={{ color: theme.textMuted }}>
                  One Thought a Day v1.0.0
                </Text>
                <Pressable
                  testID="check-for-updates"
                  onPress={handleCheckForUpdates}
                  className="mt-2 py-2 items-center"
                  accessibilityLabel="Check for updates"
                  accessibilityRole="button"
                >
                  <Text className="font-sans text-xs" style={{ color: theme.accent }}>
                    Check for Updates
                  </Text>
                </Pressable>
              </View>
            </GlassCard>

            {/* Section 9: Developer/Testing - Only visible in development mode */}
            {__DEV__ && (
            <GlassCard title="Testing" icon={TestTube} delay={425}>
              <Pressable
                accessibilityLabel="Load test data"
                onPress={handleLoadTestData}
                className="flex-row items-center py-3"
              >
                <Download size={18} color={theme.accent} />
                <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                  Load test data (past week)
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Reset purchases"
                onPress={handleResetPurchases}
                className="flex-row items-center py-3 border-t"
                style={{ borderTopColor: theme.cardBorder }}
              >
                <RefreshCw size={18} color={theme.accent} />
                <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                  Reset purchases
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Reset onboarding"
                onPress={() => {
                  resetOnboarding();
                  if (hapticFeedbackEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  router.back();
                }}
                className="flex-row items-center py-3 border-t"
                style={{ borderTopColor: theme.cardBorder }}
              >
                <Play size={18} color={theme.accent} />
                <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                  Replay onboarding
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Delete all entries in development"
                onPress={handleDeleteAll}
                className="flex-row items-center py-3 border-t"
                style={{ borderTopColor: theme.cardBorder }}
              >
                <RotateCcw size={18} color={theme.textSecondary} />
                <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>
                  Reset app (clear all data)
                </Text>
              </Pressable>

              <Text className="font-sans text-xs mt-2" style={{ color: theme.textMuted }}>
                These options are for testing purposes.
              </Text>
            </GlassCard>
            )}
          </ScrollView>
        </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      </LinearGradient>
    </View>
  );
}
