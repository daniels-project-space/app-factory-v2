import { View, Text, ScrollView, Pressable, Switch, Alert, Linking, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCallback, useState } from 'react';
import {
  ChevronRight,
  User,
  Palette,
  Bell,
  Database,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Trash2,
  Crown,
  FileText,
  TestTube,
  RotateCcw,
  Play,
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
  Send,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import {
  useSettingsStore,
  COLOR_THEMES,
  ThemeId,
  AppearanceMode,
} from '@/lib/state/settings-store';
import { useJournalStore, RevealDelay } from '@/lib/state/journal-store';
import { useOnboardingStore } from '@/lib/state/onboarding-store';
import { useAuthStore } from '@/lib/state/auth-store';
import { fullSync } from '@/lib/cloud-sync';
import { usePremiumStatus, useRestorePurchases, useResetPurchases } from '@/lib/usePremium';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  scheduleEveningNudge,
  cancelEveningNudge,
  areNotificationsEnabled,
} from '@/lib/notifications';


// Glass Card Component
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
      if (isHapticToggle) {
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
        accessibilityLabel="Value"
        value={value}
        onValueChange={handleChange}
        trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// Segmented Control Component
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
          accessibilityLabel="Pressable button"
          key={option}
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

// Theme Pill Component
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
    <Pressable onPress={handlePress} className="items-center mr-4 active:scale-95" accessibilityLabel="Press">
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

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
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
  // Cloud sync + account
  const authUser = useAuthStore((s) => s.user);
  const authSignOut = useAuthStore((s) => s.signOut);
  const isSignedIn = !!authUser;
  const userEmail = authUser?.email ?? null;
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

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

  // Journal state
  const entries = useJournalStore((s) => s.entries);
  const currentStreak = useJournalStore((s) => s.currentStreak);
  const longestStreak = useJournalStore((s) => s.longestStreak);
  const loadTestData = useJournalStore((s) => s.loadTestData);
  const clearAllData = useJournalStore((s) => s.clearAllData);

  // Onboarding state
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

  // Local state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [proFeaturesExpanded, setProFeaturesExpanded] = useState(false);

  // Handlers
  const handleOpenPaywall = useCallback(() => {
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/paywall');
  }, [hapticFeedbackEnabled]);

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

  const handleAppleSignIn = useCallback(() => {
    Alert.alert('Sign in with Apple', 'Apple Sign In will be available after app publish.');
  }, []);

  const handleGoogleSignIn = useCallback(() => {
    Alert.alert('Google Sign In', 'Google Sign In coming soon.');
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          authSignOut();
          if (hapticFeedbackEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
    ]);
  }, [authSignOut, hapticFeedbackEnabled]);

  const handleTimeChange = useCallback(
    async (_event: unknown, selectedDate?: Date) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (selectedDate) {
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        setReminderTime(`${hours}:${minutes}`);

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
              'Please enable notifications in your device settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
            return;
          }
        }

        if (revealDelay === 'instant') {
          const [h, m] = reminderTime.split(':').map(Number);
          await scheduleDailyReminder(h, m);
        }
      } else {
        await cancelDailyReminder();
      }
      setDailyReminderEnabled(enabled);
    },
    [setDailyReminderEnabled, checkNotificationPermission, revealDelay, reminderTime]
  );

  const handleEveningReminderToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled && revealDelay === 'instant') {
        await scheduleEveningNudge();
      } else {
        await cancelEveningNudge();
      }
      setEveningReminderEnabled(enabled);
    },
    [setEveningReminderEnabled, revealDelay]
  );

  const handleRevealDelayChange = useCallback(
    async (delay: RevealDelay) => {
      setRevealDelay(delay);

      if (dailyReminderEnabled) {
        if (delay === 'instant') {
          const [h, m] = reminderTime.split(':').map(Number);
          await scheduleDailyReminder(h, m);
          if (eveningReminderEnabled) {
            await scheduleEveningNudge();
          }
        } else {
          await cancelDailyReminder();
          await cancelEveningNudge();
        }
      }
    },
    [setRevealDelay, dailyReminderEnabled, reminderTime, eveningReminderEnabled]
  );

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
      const sortedEntries = [...entries].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const totalEntries = entries.length;
      const firstEntry = sortedEntries[0];
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      const journeyDays = Math.ceil(
        (new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

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

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; color: #1A1A18; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 2px solid #E8EBE4; }
            .title { font-size: 28px; font-weight: 700; color: #1A1A18; margin-bottom: 8px; }
            .subtitle { font-size: 14px; color: #6B6B69; }
            .insights { background: #F5F5F3; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
            .insights-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
            .stats-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
            .stat { flex: 1; min-width: 120px; text-align: center; padding: 16px; background: white; border-radius: 12px; }
            .stat-value { font-size: 24px; font-weight: 700; color: #A3B899; }
            .stat-label { font-size: 12px; color: #6B6B69; margin-top: 4px; }
            .entry { margin-bottom: 24px; padding: 20px; background: #FAFAF8; border-radius: 12px; border-left: 4px solid #A3B899; }
            .entry-date { font-size: 12px; color: #A3B899; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; }
            .entry-prompt { font-size: 13px; color: #6B6B69; font-style: italic; margin-bottom: 12px; }
            .entry-content { font-size: 16px; color: #1A1A18; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">One Thought a Day</div>
            <div class="subtitle">Journal Export • ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <div class="insights">
            <div class="insights-title">Your Journey Insights</div>
            <div class="stats-grid">
              <div class="stat"><div class="stat-value">${totalEntries}</div><div class="stat-label">Total Entries</div></div>
              <div class="stat"><div class="stat-value">${currentStreak}</div><div class="stat-label">Current Streak</div></div>
              <div class="stat"><div class="stat-value">${longestStreak}</div><div class="stat-label">Longest Streak</div></div>
              <div class="stat"><div class="stat-value">${journeyDays}</div><div class="stat-label">Days Journaling</div></div>
            </div>
            ${detectedThemes.length > 0 ? `<div>Themes: ${detectedThemes.join(', ')}</div>` : ''}
          </div>
          ${sortedEntries.map(entry => {
            const date = new Date(entry.date + 'T00:00:00');
            return `<div class="entry">
              <div class="entry-date">${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
              <div class="entry-prompt">${entry.prompt}</div>
              <div class="entry-content">"${entry.content}"</div>
            </div>`;
          }).join('')}
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent, width: 612, height: 792 });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share your journal', UTI: 'com.adobe.pdf' });
      }
    } catch {
      Alert.alert('Error', 'Failed to generate PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [entries, currentStreak, longestStreak, hapticFeedbackEnabled]);

  const handleLoadTestData = useCallback(() => {
    Alert.alert('Load Test Data', 'This will replace your entries with sample data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Load Data',
        onPress: () => {
          loadTestData();
          if (hapticFeedbackEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
    ]);
  }, [loadTestData, hapticFeedbackEnabled]);

  const handleResetPurchases = useCallback(() => {
    Alert.alert('Reset Purchases', 'This will reset your local premium status.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          resetPurchases();
          if (hapticFeedbackEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
    ]);
  }, [resetPurchases, hapticFeedbackEnabled]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert('Delete All Data', 'This cannot be undone. Are you sure?', [
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
        },
      },
    ]);
  }, [clearAllData, resetOnboarding, hapticFeedbackEnabled]);

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      {/* Pull indicator */}
      <View className="items-center pt-3 pb-2">
        <View
          className="w-10 h-1 rounded-full"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }}
        />
      </View>

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
        <Text className="font-bold text-xl tracking-tight" style={{ color: theme.text }}>
          Settings
        </Text>
        <Pressable
          accessibilityLabel="On close"
          onPress={onClose}
          className="px-4 py-2 rounded-full"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
        >
          <ChevronRight size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Section */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} className="mb-4">
          {isPremium ? (
            <View
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: theme.isDark ? 'rgba(212, 175, 55, 0.4)' : 'rgba(180, 140, 50, 0.3)',
              }}
            >
              <LinearGradient
                colors={theme.isDark ? ['#2A2520', '#1F1B18', '#2A2520'] : ['#FDF8F0', '#F5EEE0', '#FDF8F0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20 }}
              >
                <View style={{ position: 'absolute', top: 12, left: 12, opacity: 0.3 }}>
                  <Star size={12} color={theme.isDark ? '#D4AF37' : '#B48C32'} fill={theme.isDark ? '#D4AF37' : '#B48C32'} />
                </View>
                <View style={{ position: 'absolute', top: 12, right: 12, opacity: 0.3 }}>
                  <Star size={12} color={theme.isDark ? '#D4AF37' : '#B48C32'} fill={theme.isDark ? '#D4AF37' : '#B48C32'} />
                </View>
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
                  <Text className="font-bold text-lg tracking-wide" style={{ color: theme.isDark ? '#D4AF37' : '#8B7028' }}>
                    ONE THOUGHT+
                  </Text>
                  <Text className="font-medium text-sm mt-1" style={{ color: theme.isDark ? 'rgba(212, 175, 55, 0.7)' : 'rgba(139, 112, 40, 0.7)' }}>
                    Premium Member
                  </Text>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <BlurView
              intensity={theme.isDark ? 40 : 60}
              tint={theme.isDark ? 'dark' : 'light'}
              style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder }}
            >
              <View style={{ backgroundColor: theme.card }} className="p-4">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: theme.accentLight }}>
                    <Crown size={20} color={theme.accent} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-base" style={{ color: theme.text }}>One Thought+</Text>
                    <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>Weekly insights, full history & more</Text>
                  </View>
                </View>
                <Pressable
                  onPress={handleOpenPaywall}
                  testID="upgrade-button"
                  accessibilityLabel="Upgrade to One Thought+ – see subscription plans"
                  accessibilityRole="button"
                  className="mt-2"
                >
                  <LinearGradient
                    colors={[theme.accent, theme.accent]}
                    style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
                  >
                    <Text className="font-semibold text-base text-white">See plans</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable onPress={handleRestorePurchases} disabled={restoreMutation.isPending} className="mt-3 py-2" accessibilityLabel="Restore purchases">
                  <Text className="font-medium text-sm text-center" style={{ color: theme.textSecondary, opacity: restoreMutation.isPending ? 0.5 : 1 }}>
                    {restoreMutation.isPending ? 'Restoring...' : 'Restore purchases'}
                  </Text>
                </Pressable>
              </View>
            </BlurView>
          )}
        </Animated.View>

        {/* Account */}
        <GlassCard title="Account" icon={User} delay={100}>
          {isSignedIn ? (
            <View>
              <View className="flex-row items-center justify-between py-2">
                <View>
                  <Text className="font-medium text-base" style={{ color: theme.text }}>Signed in as</Text>
                  <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>{userEmail}</Text>
                </View>
                <Pressable onPress={handleSignOut} className="px-4 py-2 rounded-full" style={{ backgroundColor: theme.isDark ? '#3A3A38' : '#E8EBE4' }} accessibilityLabel="Sign out">
                  <Text className="font-medium text-sm" style={{ color: theme.text }}>Sign Out</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View>
              {Platform.OS === 'ios' && (
                <Pressable onPress={handleAppleSignIn} className="flex-row items-center justify-center py-3.5 rounded-xl mb-3" style={{ backgroundColor: theme.isDark ? '#FFFFFF' : '#000000' }} accessibilityLabel="Sign in with Apple">
                  <Text className="font-semibold text-base" style={{ color: theme.isDark ? '#000000' : '#FFFFFF' }}> Sign in with Apple</Text>
                </Pressable>
              )}
              <Pressable onPress={handleGoogleSignIn} className="flex-row items-center justify-center py-3 rounded-xl" style={{ backgroundColor: theme.isDark ? '#3A3A38' : '#FFFFFF', borderWidth: 1, borderColor: theme.cardBorder }} accessibilityLabel="Sign in with Google">
                <Text className="font-medium text-base" style={{ color: theme.text }}>Sign in with Google</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/sign-in')}
                testID="settings-sign-in-link"
                accessibilityLabel="Sign in with email"
                accessibilityRole="button"
                className="flex-row items-center justify-center py-3 rounded-xl mt-2"
              >
                <Text className="font-medium text-sm" style={{ color: theme.textSecondary }}>Sign in with email</Text>
              </Pressable>
            </View>
          )}
        </GlassCard>

        {/* Appearance */}
        <GlassCard title="Appearance" icon={Palette} delay={150}>
          <Text className="font-medium text-sm mb-3" style={{ color: theme.textSecondary }}>Color Theme</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16, marginBottom: 20, flexGrow: 0 }}>
            {COLOR_THEMES.map((t) => (
              <ThemePill key={t.id} themeId={t.id} isSelected={themeId === t.id} onSelect={() => setTheme(t.id)} previewColors={t.previewColors} name={t.name} />
            ))}
          </ScrollView>

          <Text className="font-medium text-sm mb-3" style={{ color: theme.textSecondary }}>Appearance Mode</Text>
          <SegmentedControl<AppearanceMode>
            options={['system', 'light', 'dark']}
            selected={appearanceMode}
            onSelect={setAppearanceMode}
            labels={{ system: 'System', light: 'Light', dark: 'Dark' }}
          />

          <View className="mt-4">
            <ToggleRow label="Particle background" subtitle="Subtle floating stars" value={particleBackgroundEnabled} onValueChange={setParticleBackgroundEnabled} />
            <ToggleRow label="Haptic feedback" value={hapticFeedbackEnabled} onValueChange={setHapticFeedbackEnabled} isHapticToggle={true} />
          </View>

          {/* Pro Features */}
          <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
            <Pressable
              accessibilityLabel="Paywall"
              onPress={() => {
                if (hapticFeedbackEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setProFeaturesExpanded(!proFeaturesExpanded);
              }}
              className="flex-row items-center justify-between py-1"
            >
              <View className="flex-row items-center">
                <Text className="font-medium text-sm" style={{ color: theme.textSecondary }}>Pro Features</Text>
                {!isPremium && <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.accent }}><Text className="font-semibold text-[10px] text-white">PRO</Text></View>}
              </View>
              <ChevronDown size={18} color={theme.textSecondary} style={{ transform: [{ rotate: proFeaturesExpanded ? '180deg' : '0deg' }] }} />
            </Pressable>

            {proFeaturesExpanded && (
              <View className="mt-2">
                <Pressable
                  accessibilityLabel="Paywall"
                  onPress={() => {
                    if (!isPremium) { router.push('/paywall'); return; }
                    setFireplaceBackgroundEnabled(!fireplaceBackgroundEnabled);
                  }}
                  className="flex-row items-center justify-between py-3"
                >
                  <View className="flex-row items-center flex-1 mr-4">
                    <Flame size={18} color={theme.accent} />
                    <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Fireplace glow</Text>
                  </View>
                  {isPremium ? (
                    <Switch value={fireplaceBackgroundEnabled} onValueChange={setFireplaceBackgroundEnabled} trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }} thumbColor="#FFFFFF"  accessibilityLabel="Paywall" />
                  ) : (
                    <Lock size={16} color={theme.textSecondary} />
                  )}
                </Pressable>

                <Pressable
                  accessibilityLabel="Paywall"
                  onPress={() => {
                    if (!isPremium) { router.push('/paywall'); return; }
                    setNeonEffectEnabled(!neonEffectEnabled);
                  }}
                  className="flex-row items-center justify-between py-3 border-t"
                  style={{ borderTopColor: theme.cardBorder }}
                >
                  <View className="flex-row items-center flex-1 mr-4">
                    <Zap size={18} color={theme.accent} />
                    <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Neon glow</Text>
                  </View>
                  {isPremium ? (
                    <Switch value={neonEffectEnabled} onValueChange={setNeonEffectEnabled} trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }} thumbColor="#FFFFFF"  accessibilityLabel="Paywall" />
                  ) : (
                    <Lock size={16} color={theme.textSecondary} />
                  )}
                </Pressable>

                <Pressable
                  accessibilityLabel="Paywall"
                  onPress={() => {
                    if (!isPremium) { router.push('/paywall'); return; }
                    setBackgroundMusicEnabled(!backgroundMusicEnabled);
                  }}
                  className="flex-row items-center justify-between py-3 border-t"
                  style={{ borderTopColor: theme.cardBorder }}
                >
                  <View className="flex-row items-center flex-1 mr-4">
                    <Music size={18} color={theme.accent} />
                    <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Background music</Text>
                  </View>
                  {isPremium ? (
                    <Switch value={backgroundMusicEnabled} onValueChange={setBackgroundMusicEnabled} trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }} thumbColor="#FFFFFF"  accessibilityLabel="Paywall" />
                  ) : (
                    <Lock size={16} color={theme.textSecondary} />
                  )}
                </Pressable>

                {isPremium && backgroundMusicEnabled && (
                  <View className="pb-3 pl-8">
                    <View className="flex-row items-center">
                      <Volume2 size={14} color={theme.textSecondary} />
                      <View className="flex-1 mx-3">
                        <Slider value={backgroundMusicVolume} onValueChange={setBackgroundMusicVolume} minimumValue={0.05} maximumValue={1} step={0.05} minimumTrackTintColor={theme.accent} maximumTrackTintColor={theme.isDark ? '#3A3A38' : '#E5E5E3'} thumbTintColor={theme.accent} />
                      </View>
                      <Text className="font-medium text-xs w-10 text-right" style={{ color: theme.textSecondary }}>{Math.round(backgroundMusicVolume * 100)}%</Text>
                    </View>
                  </View>
                )}

                <Pressable
                  accessibilityLabel="Paywall"
                  onPress={() => {
                    if (!isPremium) { router.push('/paywall'); return; }
                    setPhotoPromptsEnabled(!photoPromptsEnabled);
                  }}
                  className="flex-row items-center justify-between py-3 border-t"
                  style={{ borderTopColor: theme.cardBorder }}
                >
                  <View className="flex-row items-center flex-1 mr-4">
                    <Camera size={18} color={theme.accent} />
                    <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Photo prompts</Text>
                  </View>
                  {isPremium ? (
                    <Switch value={photoPromptsEnabled} onValueChange={setPhotoPromptsEnabled} trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }} thumbColor="#FFFFFF"  accessibilityLabel="Paywall" />
                  ) : (
                    <Lock size={16} color={theme.textSecondary} />
                  )}
                </Pressable>

                <Pressable
                  accessibilityLabel="Paywall"
                  onPress={() => {
                    if (!isPremium) { router.push('/paywall'); return; }
                    setMoodTrackingEnabled(!moodTrackingEnabled);
                  }}
                  className="flex-row items-center justify-between py-3 border-t"
                  style={{ borderTopColor: theme.cardBorder }}
                >
                  <View className="flex-row items-center flex-1 mr-4">
                    <Smile size={18} color={theme.accent} />
                    <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Mood tracking</Text>
                  </View>
                  {isPremium ? (
                    <Switch value={moodTrackingEnabled} onValueChange={setMoodTrackingEnabled} trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }} thumbColor="#FFFFFF"  accessibilityLabel="Paywall" />
                  ) : (
                    <Lock size={16} color={theme.textSecondary} />
                  )}
                </Pressable>

                <Pressable
                  accessibilityLabel="Paywall"
                  onPress={() => {
                    if (!isPremium) { router.push('/paywall'); return; }
                    router.push('/custom-prompts');
                  }}
                  className="flex-row items-center justify-between py-3 border-t"
                  style={{ borderTopColor: theme.cardBorder }}
                >
                  <View className="flex-row items-center flex-1 mr-4">
                    <PenTool size={18} color={theme.accent} />
                    <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Custom prompts</Text>
                  </View>
                  {isPremium ? <ChevronRight size={16} color={theme.textSecondary} /> : <Lock size={16} color={theme.textSecondary} />}
                </Pressable>

                <Pressable
                  accessibilityLabel="Paywall"
                  onPress={() => {
                    if (!isPremium) { router.push('/paywall'); return; }
                    router.push('/prompt-categories');
                  }}
                  className="flex-row items-center justify-between py-3 border-t"
                  style={{ borderTopColor: theme.cardBorder }}
                >
                  <View className="flex-row items-center flex-1 mr-4">
                    <Layers size={18} color={theme.accent} />
                    <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Prompt categories</Text>
                  </View>
                  {isPremium ? <ChevronRight size={16} color={theme.textSecondary} /> : <Lock size={16} color={theme.textSecondary} />}
                </Pressable>

                <Pressable
                  accessibilityLabel="Paywall"
                  onPress={() => {
                    if (!isPremium) { router.push('/paywall'); return; }
                    router.push('/philosopher-guide');
                  }}
                  className="flex-row items-center justify-between py-3 border-t"
                  style={{ borderTopColor: theme.cardBorder }}
                >
                  <View className="flex-row items-center flex-1 mr-4">
                    <BookOpen size={18} color={theme.accent} />
                    <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Philosopher guide</Text>
                  </View>
                  {isPremium ? <ChevronRight size={16} color={theme.textSecondary} /> : <Lock size={16} color={theme.textSecondary} />}
                </Pressable>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Daily Reminder */}
        <GlassCard title="Daily Reminder" icon={Bell} delay={200}>
          <ToggleRow label="Daily reminder" value={dailyReminderEnabled} onValueChange={handleDailyReminderToggle} />
          {dailyReminderEnabled && (
            <>
              <Pressable onPress={() => setShowTimePicker(true)} className="flex-row items-center justify-between py-3" accessibilityLabel="Reminder time">
                <Text className="font-medium text-base" style={{ color: theme.text }}>Reminder time</Text>
                <View className="flex-row items-center">
                  <Text className="font-medium text-base mr-2" style={{ color: theme.accent }}>{formatTime(reminderTime)}</Text>
                  <ChevronRight size={18} color={theme.textSecondary} />
                </View>
              </Pressable>
              {showTimePicker && <DateTimePicker value={reminderDate} mode="time" display="spinner" onChange={handleTimeChange} textColor={theme.text} />}
              <ToggleRow label="Evening reminder" subtitle="Gentle nudge if not completed" value={eveningReminderEnabled} onValueChange={handleEveningReminderToggle} />
            </>
          )}
        </GlassCard>

        {/* Time Capsule */}
        <GlassCard title="Time Capsule" icon={Send} delay={250}>
          <Text className="font-sans text-sm mb-4" style={{ color: theme.textSecondary }}>
            Choose when your thoughts become readable again.
          </Text>
          {([
            { delay: 'tomorrow' as RevealDelay, label: 'Tomorrow', desc: '24 hours' },
            { delay: 'week' as RevealDelay, label: 'Next week', desc: '7 days' },
            { delay: 'month' as RevealDelay, label: 'Next month', desc: '30 days' },
            { delay: 'instant' as RevealDelay, label: 'Right away', desc: 'No delay' },
          ]).map((option, index) => (
            <Pressable
              accessibilityLabel="Show countdown labels"
              key={option.delay}
              onPress={() => {
                if (hapticFeedbackEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleRevealDelayChange(option.delay);
              }}
              className="flex-row items-center justify-between py-3"
              style={index > 0 ? { borderTopWidth: 1, borderTopColor: theme.cardBorder } : {}}
            >
              <View>
                <Text className="font-medium text-base" style={{ color: theme.text }}>{option.label}</Text>
                <Text className="font-sans text-sm" style={{ color: theme.textSecondary }}>{option.desc}</Text>
              </View>
              {revealDelay === option.delay && (
                <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: theme.accent }}>
                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </Pressable>
          ))}
          <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
            <ToggleRow label="Show countdown labels" subtitle="Display time remaining" value={showCountdownLabels} onValueChange={setShowCountdownLabels} />
          </View>
        </GlassCard>

        {/* Data */}
        <GlassCard title="Data" icon={Database} delay={300}>
          <View className="flex-row items-center justify-between py-2 mb-3">
            <View className="flex-row items-center">
              {cloudSyncEnabled ? <Cloud size={18} color={theme.accent} /> : <CloudOff size={18} color={theme.textSecondary} />}
              <Text className="font-medium text-base ml-2" style={{ color: theme.text }}>Cloud Sync</Text>
            </View>
            <Switch
              accessibilityLabel="Sync now"
              value={cloudSyncEnabled}
              onValueChange={(value) => {
                if (value && !authUser) { Alert.alert('Sign In Required', 'Please sign in to enable cloud sync.'); return; }
                setCloudSyncEnabled(value);
                if (value && authUser) { handleSyncNow(); }
              }}
              trackColor={{ false: theme.isDark ? '#3A3A38' : '#E5E5E3', true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          {cloudSyncEnabled && (
            <Pressable onPress={handleSyncNow} disabled={isSyncingNow} className="flex-row items-center py-3 border-t" style={{ borderTopColor: theme.cardBorder, opacity: isSyncingNow ? 0.6 : 1 }} accessibilityLabel="Sync now">
              <RefreshCw size={18} color={theme.accent} />
              <View className="ml-3 flex-1">
                <Text className="font-medium text-base" style={{ color: theme.text }}>Sync Now</Text>
                {lastSyncResult && <Text className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>{lastSyncResult}</Text>}
              </View>
              {isSyncingNow && <ActivityIndicator size="small" color={theme.accent} />}
            </Pressable>
          )}
          <Pressable onPress={handleExportPdf} disabled={isExportingPdf} className="flex-row items-center py-3 border-t" style={{ borderTopColor: theme.cardBorder, opacity: isExportingPdf ? 0.6 : 1 }} accessibilityLabel="Export journal as PDF">
            <FileText size={18} color={theme.accent} />
            <Text className="font-medium text-base ml-3 flex-1" style={{ color: theme.text }}>Export PDF with insights</Text>
            {isExportingPdf && <ActivityIndicator size="small" color={theme.accent} />}
          </Pressable>
          <Pressable onPress={handleDeleteAll} className="flex-row items-center py-3 border-t" style={{ borderTopColor: theme.cardBorder }} accessibilityLabel="Delete all">
            <Trash2 size={18} color="#E07A5F" />
            <Text className="font-medium text-base ml-3" style={{ color: '#E07A5F' }}>Delete all data</Text>
          </Pressable>
        </GlassCard>

        {/* Legal */}
        <GlassCard title="Legal & About" icon={Scale} delay={350}>
          <Pressable onPress={() => router.push('/legal?type=terms')} className="flex-row items-center justify-between py-3" accessibilityLabel="Terms of Service">
            <View className="flex-row items-center">
              <FileText size={18} color={theme.accent} />
              <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Terms of Service</Text>
            </View>
            <ChevronRight size={18} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => router.push('/legal?type=privacy')} className="flex-row items-center justify-between py-3 border-t" style={{ borderTopColor: theme.cardBorder }} accessibilityLabel="Privacy Policy">
            <View className="flex-row items-center">
              <Shield size={18} color={theme.accent} />
              <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => router.push('/legal?type=disclaimer')} className="flex-row items-center justify-between py-3 border-t" style={{ borderTopColor: theme.cardBorder }} accessibilityLabel="Disclaimer">
            <View className="flex-row items-center">
              <AlertTriangle size={18} color={theme.accent} />
              <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Disclaimer</Text>
            </View>
            <ChevronRight size={18} color={theme.textSecondary} />
          </Pressable>
          <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
            <Text className="font-sans text-xs text-center" style={{ color: theme.textMuted }}>One Thought a Day v1.0.0</Text>
          </View>
        </GlassCard>

        {/* Testing */}
        {__DEV__ && (
          <GlassCard title="Testing" icon={TestTube} delay={400}>
            <Pressable onPress={handleLoadTestData} className="flex-row items-center py-3" accessibilityLabel="Load test data">
              <Download size={18} color={theme.accent} />
              <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Load test data</Text>
            </Pressable>
            <Pressable onPress={handleResetPurchases} className="flex-row items-center py-3 border-t" style={{ borderTopColor: theme.cardBorder }} accessibilityLabel="Reset purchases">
              <RefreshCw size={18} color={theme.accent} />
              <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Reset purchases</Text>
            </Pressable>
            <Pressable onPress={() => { resetOnboarding(); onClose(); }} className="flex-row items-center py-3 border-t" style={{ borderTopColor: theme.cardBorder }} accessibilityLabel="Delete all">
              <Play size={18} color={theme.accent} />
              <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Replay onboarding</Text>
            </Pressable>
            <Pressable onPress={handleDeleteAll} className="flex-row items-center py-3 border-t" style={{ borderTopColor: theme.cardBorder }} accessibilityLabel="Delete all">
              <RotateCcw size={18} color={theme.textSecondary} />
              <Text className="font-medium text-base ml-3" style={{ color: theme.text }}>Reset app</Text>
            </Pressable>
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
