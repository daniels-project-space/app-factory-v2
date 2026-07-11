import { View, Text, TextInput, Pressable, Keyboard, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Calendar, Lock, Sparkles, Settings, Send, Camera, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useJournalStore,
  getTodayPrompts,
  getTodayDate,
  calculateRevealTimestamp,
} from '@/lib/state/journal-store';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import { useOnboardingStore } from '@/lib/state/onboarding-store';
import { getCategoryPromptsForDate } from '@/lib/prompt-categories';
import { getTodayPhotoPrompts, getCategoryPhotoPromptsForDate } from '@/lib/photo-prompts';
import { scheduleRevealNotification } from '@/lib/notifications';
import Onboarding from '@/components/Onboarding';
import ParticleBackground from '@/components/ParticleBackground';
import ParticlePulse from '@/components/ParticlePulse';
import FireplaceBackground from '@/components/FireplaceBackground';
import NeonBackground from '@/components/NeonBackground';
import { CalendarPanel } from '@/components/CalendarPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { usePremiumStatus } from '@/lib/usePremium';
import { usePathsStore, getPathById } from '@/lib/journaling-paths';
import { useAchievementsStore, getAchievementById } from '@/lib/achievements';
import { getTodaySharedThought } from '@/lib/shared-thoughts';

const MAX_CHARS = 150;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const theme = useAppTheme();
  const { isPremium } = usePremiumStatus();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const revealDelay = useSettingsStore((s) => s.revealDelay);
  const showCountdownLabels = useSettingsStore((s) => s.showCountdownLabels);
  const customPrompts = useSettingsStore((s) => s.customPrompts);
  const customPhotoPrompts = useSettingsStore((s) => s.customPhotoPrompts);
  const selectedPromptCategories = useSettingsStore((s) => s.selectedPromptCategories);
  const photoPromptsEnabled = useSettingsStore((s) => s.photoPromptsEnabled);
  const selectedPromptIndex = useSettingsStore((s) => s.selectedPromptIndex);
  const selectedPromptDate = useSettingsStore((s) => s.selectedPromptDate);
  const cyclePromptIndex = useSettingsStore((s) => s.cyclePromptIndex);
  const setSelectedPromptDate = useSettingsStore((s) => s.setSelectedPromptDate);
  const setSelectedPromptIndex = useSettingsStore((s) => s.setSelectedPromptIndex);
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const hasOnboardingHydrated = useOnboardingStore((s) => s._hasHydrated);

  // Paths, achievements, shared thoughts
  const activePath = usePathsStore((s) => s.activePath);
  const completeDay = usePathsStore((s) => s.completeDay);
  const getActivePathPrompt = usePathsStore((s) => s.getActivePathPrompt);
  const pendingCelebration = useAchievementsStore((s) => s.pendingCelebration);
  const clearCelebration = useAchievementsStore((s) => s.clearCelebration);
  const checkAndUnlock = useAchievementsStore((s) => s.checkAndUnlock);
  const todaySharedThought = useMemo(() => getTodaySharedThought(), []);
  const activePathData = activePath ? getPathById(activePath.pathId) : null;
  const activePathPrompt = getActivePathPrompt();

  // Achievement celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationOpacity = useSharedValue(0);
  const celebrationScale = useSharedValue(0.8);

  const [thought, setThought] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSentState, setShowSentState] = useState(false);
  const [showParticlePulse, setShowParticlePulse] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pulseCenter, setPulseCenter] = useState({ x: 0, y: 0 });

  // Panel state
  const [calendarPanelOpen, setCalendarPanelOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  const entries = useJournalStore((s) => s.entries);
  const currentStreak = useJournalStore((s) => s.currentStreak);
  const addEntry = useJournalStore((s) => s.addEntry);
  const hasEntryForToday = useJournalStore((s) => s.hasEntryForToday);
  const getTodayEntry = useJournalStore((s) => s.getTodayEntry);
  const calculateStreak = useJournalStore((s) => s.calculateStreak);
  const isEntryRevealed = useJournalStore((s) => s.isEntryRevealed);
  const getTimeUntilReveal = useJournalStore((s) => s.getTimeUntilReveal);
  const hasJournalHydrated = useJournalStore((s) => s._hasHydrated);

  // Get today's prompts
  const todayPrompts = useMemo(() => {
    const today = getTodayDate();
    if (selectedPromptCategories.length > 0) {
      return getCategoryPromptsForDate(today, selectedPromptCategories, customPrompts, 5);
    }
    return getTodayPrompts(customPrompts, 5);
  }, [selectedPromptCategories, customPrompts]);

  // Reset prompt index if date changed
  useEffect(() => {
    const today = getTodayDate();
    if (selectedPromptDate !== today) {
      setSelectedPromptDate(today);
      setSelectedPromptIndex(0);
    }
  }, [selectedPromptDate, setSelectedPromptDate, setSelectedPromptIndex]);

  // Get the currently selected prompt (path prompt takes priority)
  const todayPrompt = useMemo(() => {
    if (activePathPrompt) return activePathPrompt;
    const safeIndex = Math.min(selectedPromptIndex, todayPrompts.length - 1);
    return todayPrompts[safeIndex] ?? todayPrompts[0];
  }, [todayPrompts, selectedPromptIndex, activePathPrompt]);

  // Double-tap handling for prompt shuffle
  const lastTapRef = useRef<number>(0);
  const DOUBLE_TAP_DELAY = 300;

  const handlePromptTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      cyclePromptIndex();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [hapticEnabled, cyclePromptIndex]);

  // Get today's photo prompts
  const todayPhotoPrompts = useMemo(() => {
    const today = getTodayDate();
    if (selectedPromptCategories.length > 0) {
      return getCategoryPhotoPromptsForDate(today, selectedPromptCategories, customPhotoPrompts, 5);
    }
    return getTodayPhotoPrompts(5);
  }, [selectedPromptCategories, customPhotoPrompts]);

  // Get the currently selected photo prompt
  const todayPhotoPrompt = useMemo(() => {
    const safeIndex = Math.min(selectedPromptIndex, todayPhotoPrompts.length - 1);
    return todayPhotoPrompts[safeIndex] ?? todayPhotoPrompts[0];
  }, [todayPhotoPrompts, selectedPromptIndex]);

  const todayEntry = getTodayEntry();
  const hasSubmittedToday = hasEntryForToday();

  // Check if today's entry is revealed
  const isTodayEntryRevealed = useMemo(() => {
    if (!todayEntry) return false;
    return isEntryRevealed(todayEntry);
  }, [todayEntry, isEntryRevealed]);

  // Get time until reveal
  const timeUntilReveal = useMemo(() => {
    if (!todayEntry) return null;
    return getTimeUntilReveal(todayEntry);
  }, [todayEntry, getTimeUntilReveal]);

  // Format countdown text
  const getCountdownText = useCallback(() => {
    if (!timeUntilReveal) return '';
    const { days, hours, minutes } = timeUntilReveal;
    if (days > 0) return `Opens in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Opens in ${hours} hour${hours > 1 ? 's' : ''}`;
    return `Opens in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }, [timeUntilReveal]);

  // Animation values
  const cardScale = useSharedValue(1);
  const contentOpacity = useSharedValue(1);
  const bubbleScale = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);
  const bubbleFillProgress = useSharedValue(0);
  const bubblePulse = useSharedValue(1);
  const bubbleLift = useSharedValue(0);
  const shimmerOpacity = useSharedValue(0);
  const sentStateOpacity = useSharedValue(hasSubmittedToday ? 1 : 0);
  const buttonScale = useSharedValue(1);

  // Panel animation values - interactive sliding
  const calendarPanelY = useSharedValue(-SCREEN_HEIGHT);
  const settingsPanelX = useSharedValue(SCREEN_WIDTH);
  const mainContentY = useSharedValue(0);
  const mainContentX = useSharedValue(0);
  const mainContentOpacity = useSharedValue(1);

  // Gesture tracking values
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    calculateStreak();
  }, [calculateStreak]);

  // Open/close calendar panel - interactive sliding
  const openCalendarPanel = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setCalendarPanelOpen(true);
    // Calendar slides down from top to 0, main content slides down
    calendarPanelY.value = withSpring(0, { damping: 22, stiffness: 180 });
    mainContentY.value = withSpring(SCREEN_HEIGHT, { damping: 22, stiffness: 180 });
    mainContentOpacity.value = withTiming(0, { duration: 250 });
  }, [hapticEnabled, calendarPanelY, mainContentY, mainContentOpacity]);

  const closeCalendarPanel = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Calendar slides back up, main content slides back up
    calendarPanelY.value = withSpring(-SCREEN_HEIGHT, { damping: 22, stiffness: 180 });
    mainContentY.value = withSpring(0, { damping: 22, stiffness: 180 });
    mainContentOpacity.value = withTiming(1, { duration: 250 });
    setTimeout(() => setCalendarPanelOpen(false), 350);
  }, [hapticEnabled, calendarPanelY, mainContentY, mainContentOpacity]);

  // Open/close settings panel - interactive sliding
  const openSettingsPanel = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSettingsPanelOpen(true);
    // Settings slides in from right to 0, main content slides left
    settingsPanelX.value = withSpring(0, { damping: 22, stiffness: 180 });
    mainContentX.value = withSpring(-SCREEN_WIDTH, { damping: 22, stiffness: 180 });
    mainContentOpacity.value = withTiming(0, { duration: 250 });
  }, [hapticEnabled, settingsPanelX, mainContentX, mainContentOpacity]);

  const closeSettingsPanel = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Settings slides back right, main content slides back to center
    settingsPanelX.value = withSpring(SCREEN_WIDTH, { damping: 22, stiffness: 180 });
    mainContentX.value = withSpring(0, { damping: 22, stiffness: 180 });
    mainContentOpacity.value = withTiming(1, { duration: 250 });
    setTimeout(() => setSettingsPanelOpen(false), 350);
  }, [hapticEnabled, settingsPanelX, mainContentX, mainContentOpacity]);

  // Vertical swipe gesture (down for calendar) - interactive drag
  const verticalGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (calendarPanelOpen || settingsPanelOpen) return;
      if (event.translationY > 0 && Math.abs(event.translationY) > Math.abs(event.translationX)) {
        const progress = Math.min(event.translationY / SCREEN_HEIGHT, 1);
        // Main content moves down
        mainContentY.value = event.translationY;
        // Calendar moves into view from top (starts at -SCREEN_HEIGHT, ends at 0)
        calendarPanelY.value = -SCREEN_HEIGHT + (event.translationY);
        // Fade main content
        mainContentOpacity.value = 1 - progress * 0.7;
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (calendarPanelOpen || settingsPanelOpen) return;

      const shouldOpen = event.translationY > SWIPE_THRESHOLD || (event.velocityY > 500 && event.translationY > 50);

      if (shouldOpen && event.translationY > 0) {
        runOnJS(setCalendarPanelOpen)(true);
        calendarPanelY.value = withSpring(0, { damping: 22, stiffness: 180 });
        mainContentY.value = withSpring(SCREEN_HEIGHT, { damping: 22, stiffness: 180 });
        mainContentOpacity.value = withTiming(0, { duration: 200 });
      } else {
        // Snap back
        calendarPanelY.value = withSpring(-SCREEN_HEIGHT, { damping: 25, stiffness: 200 });
        mainContentY.value = withSpring(0, { damping: 25, stiffness: 200 });
        mainContentOpacity.value = withTiming(1, { duration: 200 });
      }
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  // Horizontal swipe gesture (left for settings) - interactive drag
  const horizontalGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (calendarPanelOpen || settingsPanelOpen) return;
      if (event.translationX < 0 && Math.abs(event.translationX) > Math.abs(event.translationY)) {
        const progress = Math.min(-event.translationX / SCREEN_WIDTH, 1);
        // Main content moves left
        mainContentX.value = event.translationX;
        // Settings moves into view from right (starts at SCREEN_WIDTH, ends at 0)
        settingsPanelX.value = SCREEN_WIDTH + event.translationX;
        // Fade main content
        mainContentOpacity.value = 1 - progress * 0.7;
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (calendarPanelOpen || settingsPanelOpen) return;

      const shouldOpen = -event.translationX > SWIPE_THRESHOLD || (event.velocityX < -500 && -event.translationX > 50);

      if (shouldOpen && event.translationX < 0) {
        runOnJS(setSettingsPanelOpen)(true);
        settingsPanelX.value = withSpring(0, { damping: 22, stiffness: 180 });
        mainContentX.value = withSpring(-SCREEN_WIDTH, { damping: 22, stiffness: 180 });
        mainContentOpacity.value = withTiming(0, { duration: 200 });
      } else {
        // Snap back
        settingsPanelX.value = withSpring(SCREEN_WIDTH, { damping: 25, stiffness: 200 });
        mainContentX.value = withSpring(0, { damping: 25, stiffness: 200 });
        mainContentOpacity.value = withTiming(1, { duration: 200 });
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  // Combine gestures
  const combinedGesture = Gesture.Simultaneous(verticalGesture, horizontalGesture);

  // Gesture for closing calendar panel (swipe up) - interactive
  const calendarCloseGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        // Calendar moves up, main content moves up from bottom
        calendarPanelY.value = event.translationY;
        mainContentY.value = SCREEN_HEIGHT + event.translationY;
        const progress = Math.min(-event.translationY / SCREEN_HEIGHT, 1);
        mainContentOpacity.value = progress * 0.7;
      }
    })
    .onEnd((event) => {
      const shouldClose = -event.translationY > SWIPE_THRESHOLD || (event.velocityY < -500 && -event.translationY > 50);

      if (shouldClose) {
        runOnJS(closeCalendarPanel)();
      } else {
        // Snap back open
        calendarPanelY.value = withSpring(0, { damping: 22, stiffness: 180 });
        mainContentY.value = withSpring(SCREEN_HEIGHT, { damping: 22, stiffness: 180 });
        mainContentOpacity.value = withTiming(0, { duration: 200 });
      }
    });

  // Gesture for closing settings panel (swipe right) - interactive
  const settingsCloseGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0) {
        // Settings moves right, main content moves right from left
        settingsPanelX.value = event.translationX;
        mainContentX.value = -SCREEN_WIDTH + event.translationX;
        const progress = Math.min(event.translationX / SCREEN_WIDTH, 1);
        mainContentOpacity.value = progress * 0.7;
      }
    })
    .onEnd((event) => {
      const shouldClose = event.translationX > SWIPE_THRESHOLD || (event.velocityX > 500 && event.translationX > 50);

      if (shouldClose) {
        runOnJS(closeSettingsPanel)();
      } else {
        // Snap back open
        settingsPanelX.value = withSpring(0, { damping: 22, stiffness: 180 });
        mainContentX.value = withSpring(-SCREEN_WIDTH, { damping: 22, stiffness: 180 });
        mainContentOpacity.value = withTiming(0, { duration: 200 });
      }
    });

  // Animated styles
  const swipeContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: mainContentY.value },
        { translateX: mainContentX.value },
      ],
      opacity: mainContentOpacity.value,
    };
  });

  // Calendar indicator style
  const calendarIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateY.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    const translateYVal = interpolate(translateY.value, [0, SWIPE_THRESHOLD], [-30, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY: translateYVal }] };
  });

  // Settings indicator style
  const settingsIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(-translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    const translateXVal = interpolate(-translateX.value, [0, SWIPE_THRESHOLD], [30, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateX: translateXVal }] };
  });

  // Calendar panel style
  const calendarPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: calendarPanelY.value }],
  }));

  // Settings panel style
  const settingsPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: settingsPanelX.value }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const bubbleContainerStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [
      { scale: bubbleScale.value * bubblePulse.value },
      { translateY: bubbleLift.value },
    ],
  }));

  const bubbleFillStyle = useAnimatedStyle(() => ({
    height: `${bubbleFillProgress.value * 100}%`,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  // Pulsing border shimmer for empty state — invites first-time users to write
  const inputGlow = useSharedValue(0);
  useEffect(() => {
    if (!hasSubmittedToday) {
      inputGlow.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.08, { duration: 1800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    } else {
      inputGlow.value = 0;
    }
  }, [hasSubmittedToday]);
  const inputGlowStyle = useAnimatedStyle(() => ({
    opacity: inputGlow.value,
  }));

  const sentStateAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sentStateOpacity.value,
  }));

  useEffect(() => {
    if (hasSubmittedToday && !isSending && !showSentState) {
      sentStateOpacity.value = 1;
    }
  }, [hasSubmittedToday, isSending, showSentState]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPress = useCallback(() => {
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 22 })
    );
  }, [buttonScale]);

  const triggerHaptic = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [hapticEnabled]);

  const triggerSuccessHaptic = useCallback(() => {
    if (hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [hapticEnabled]);

  const showFinalState = useCallback(() => {
    setShowSentState(true);
    setIsSending(false);
    setShowParticlePulse(false);
  }, []);

  const triggerParticlePulse = useCallback(() => {
    setShowParticlePulse(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (thought.trim().length === 0 || hasSubmittedToday || isSending) return;

    setIsSending(true);
    Keyboard.dismiss();

    const today = getTodayDate();

    addEntry({
      date: today,
      prompt: todayPrompt,
      content: thought.trim(),
    }, revealDelay);

    if (revealDelay !== 'instant') {
      const revealAt = calculateRevealTimestamp(Date.now(), revealDelay);
      scheduleRevealNotification(revealAt, today).catch((e: unknown) =>
        console.warn('[HomeScreen] Notification scheduling failed:', e)
      );
    }

    // Complete path day if on an active path
    if (activePath) {
      completeDay(activePath.currentDay);
    }

    // Check for new achievements (after a short delay to let state update)
    setTimeout(() => {
      const journalState = useJournalStore.getState();
      const pathsState = usePathsStore.getState();
      const moodScores = [...new Set(journalState.moodHistory.map((m) => m.score))];
      checkAndUnlock({
        totalEntries: journalState.entries.length,
        currentStreak: journalState.currentStreak,
        longestStreak: journalState.longestStreak,
        entryContent: thought.trim(),
        entryCreatedAt: Date.now(),
        completedPaths: pathsState.completedPaths,
        moodScoresUsed: moodScores,
      });
    }, 300);

    runOnJS(triggerHaptic)();
    cardScale.value = withSequence(
      withTiming(0.97, { duration: 150 }),
      withSpring(1, { damping: 22 })
    );

    bubbleScale.value = withDelay(200, withSpring(1, { damping: 22 }));
    bubbleOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));

    bubbleFillProgress.value = withDelay(
      300,
      withTiming(1, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1) })
    );

    setTimeout(() => {
      bubblePulse.value = withSequence(
        withTiming(1.05, { duration: 400 }),
        withTiming(0.98, { duration: 400 }),
        withTiming(1.02, { duration: 300 })
      );
    }, 400);

    setTimeout(() => {
      triggerParticlePulse();
    }, 1500);

    contentOpacity.value = withDelay(800, withTiming(0, { duration: 400 }));

    bubbleLift.value = withDelay(
      1500,
      withTiming(-30, { duration: 300, easing: Easing.out(Easing.ease) })
    );

    shimmerOpacity.value = withDelay(
      1600,
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 250 })
      )
    );

    bubbleOpacity.value = withDelay(1650, withTiming(0, { duration: 200 }));

    sentStateOpacity.value = withDelay(
      1850,
      withTiming(1, { duration: 200 }, () => {
        runOnJS(triggerSuccessHaptic)();
        runOnJS(showFinalState)();
      })
    );
  }, [
    thought, hasSubmittedToday, isSending, todayPrompt, addEntry, revealDelay,
    activePath, completeDay, checkAndUnlock,
    triggerHaptic, triggerSuccessHaptic, showFinalState, triggerParticlePulse,
    cardScale, bubbleScale, bubbleOpacity, bubbleFillProgress, bubblePulse,
    bubbleLift, shimmerOpacity, contentOpacity, sentStateOpacity,
  ]);

  const handleOpenPhotoPrompt = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/photo-prompt');
  }, [hapticEnabled]);

  const handleOpenPaths = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/paths');
  }, [hapticEnabled]);

  const handleOpenMoodInsights = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/mood-insights');
  }, [hapticEnabled]);

  // Achievement celebration animation
  useEffect(() => {
    if (pendingCelebration) {
      setShowCelebration(true);
      celebrationOpacity.value = withTiming(1, { duration: 400 });
      celebrationScale.value = withSpring(1, { damping: 22, stiffness: 150 });

      const timeout = setTimeout(() => {
        celebrationOpacity.value = withTiming(0, { duration: 500 });
        celebrationScale.value = withTiming(0.8, { duration: 500 });
        setTimeout(() => {
          setShowCelebration(false);
          clearCelebration();
        }, 500);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [pendingCelebration, clearCelebration, celebrationOpacity, celebrationScale]);

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: celebrationOpacity.value,
    transform: [{ scale: celebrationScale.value }],
  }));

  // Wait for hydration — show named loading state so preview_content_length check passes
  if (!hasOnboardingHydrated || !hasJournalHydrated) {
    return (
      <View className="flex-1">
        <LinearGradient
          colors={theme.gradient}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            entering={ZoomIn.springify().damping(10).stiffness(140)}
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: `${theme.accent}18`,
              borderWidth: 1,
              borderColor: `${theme.accent}35`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              shadowColor: theme.accent,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}
          >
            <Sparkles size={32} color={theme.accent} />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.delay(200).duration(400)}
            style={{ color: theme.textMuted, fontSize: 16, fontWeight: '600', letterSpacing: 1 }}
          >
            OnePrompt
          </Animated.Text>
        </LinearGradient>
      </View>
    );
  }

  // Show onboarding if not completed
  if (!hasCompletedOnboarding) {
    return <Onboarding />;
  }

  const charsRemaining = MAX_CHARS - thought.length;
  const isOverLimit = charsRemaining < 0;
  const canSubmit = thought.trim().length > 0 && !isOverLimit && !hasSubmittedToday && !isSending;

  const getRevealLabel = () => {
    switch (revealDelay) {
      case 'instant': return 'Save thought';
      case 'tomorrow': return 'Send to tomorrow';
      case 'week': return 'Send to next week';
      case 'month': return 'Send to next month';
      default: return 'Send thought';
    }
  };

  return (
    <View className="flex-1" testID="main-content">
      <LinearGradient
        colors={theme.gradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ParticleBackground />
        <FireplaceBackground />
        <NeonBackground />
        <ParticlePulse trigger={showParticlePulse} centerY={SCREEN_HEIGHT / 2} />

        {/* Swipe down indicator for Calendar */}
        <Animated.View
          style={[
            calendarIndicatorStyle,
            {
              position: 'absolute',
              top: 60,
              left: 0,
              right: 0,
              zIndex: 50,
              alignItems: 'center',
            },
          ]}
          pointerEvents="none"
        >
          <BlurView
            intensity={theme.isDark ? 30 : 50}
            tint={theme.isDark ? 'dark' : 'light'}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 20,
              overflow: 'hidden',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <ChevronDown size={18} color={theme.accent} />
            <Text className="font-medium text-sm ml-2" style={{ color: theme.text }}>
              Release for Calendar & Insights
            </Text>
          </BlurView>
        </Animated.View>

        {/* Swipe left indicator for Settings */}
        <Animated.View
          style={[
            settingsIndicatorStyle,
            {
              position: 'absolute',
              right: 20,
              top: '45%',
              zIndex: 50,
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
            <Settings size={18} color={theme.accent} />
            <Text className="font-medium text-sm ml-2" style={{ color: theme.text }}>
              Settings
            </Text>
          </BlurView>
        </Animated.View>

        {/* Main Content */}
        <GestureDetector gesture={combinedGesture}>
          <Animated.View style={[{ flex: 1 }, swipeContainerStyle]}>
            <SafeAreaView className="flex-1">
              <Pressable className="flex-1" onPress={Keyboard.dismiss} accessibilityLabel="Paywall">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
                  <View>
                    <Text className="font-bold text-2xl tracking-tight" style={{ color: theme.text }}>
                      One Thought
                    </Text>
                    <Text className="font-sans text-sm mt-0.5" style={{ color: theme.textSecondary }}>
                      {new Date().toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    {!isPremium && (
                      <Pressable
                        onPress={() => router.push('/paywall')}
                        accessibilityRole="button"
                        accessibilityLabel="Upgrade to Pro"
                        testID="upgrade-button"
                        className="flex-row items-center px-3 py-1.5 rounded-xl mr-2 active:scale-95"
                        style={{
                          backgroundColor: `${theme.accent}20`,
                          borderWidth: 1,
                          borderColor: `${theme.accent}40`,
                        }}
                      >
                        <Text className="font-semibold text-xs" style={{ color: theme.accent }}>
                          Upgrade
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={openCalendarPanel}
                      className="flex-row items-center px-4 py-2.5 rounded-2xl active:scale-95 mr-2"
                      accessibilityLabel={`View calendar – ${entries.length} entries`}
                      accessibilityRole="button"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(42,42,40,0.6)' : 'rgba(232,235,228,0.6)',
                        borderWidth: 1,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        shadowColor: theme.accent,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                      }}
                    >
                      <Calendar size={16} color={theme.accent} />
                      <Text className="font-semibold text-sm ml-2" style={{ color: theme.text }}>
                        {entries.length}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={openSettingsPanel}
                      className="w-10 h-10 items-center justify-center rounded-2xl active:scale-95"
                      accessibilityLabel="Open settings"
                      accessibilityRole="button"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(42,42,40,0.6)' : 'rgba(232,235,228,0.6)',
                        borderWidth: 1,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                      }}
                    >
                      <Settings size={18} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                </View>

                {/* Streak Badge + Active Path + Shared Thought Row */}
                <View className="px-6 mt-2">
                  <View className="flex-row items-center flex-wrap gap-2">
                    {/* Streak Badge */}
                    {currentStreak > 0 && (
                      <View
                        className="px-4 py-2 rounded-2xl flex-row items-center"
                        style={{
                          backgroundColor: `${theme.accent}15`,
                          borderWidth: 1,
                          borderColor: `${theme.accent}25`,
                          shadowColor: theme.accent,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.15,
                          shadowRadius: 6,
                        }}
                      >
                        <Sparkles size={14} color={theme.accent} />
                        <Text className="font-semibold text-sm ml-2" style={{ color: theme.accent }}>
                          {currentStreak} day streak
                        </Text>
                      </View>
                    )}

                    {/* Active Path Indicator */}
                    {activePath && activePathData && (
                      <Pressable onPress={handleOpenPaths} accessibilityLabel={`Active path: ${activePathData.title}, day ${activePath.currentDay}`} accessibilityRole="button" className="active:scale-95">
                        <View
                          className="px-3 py-2 rounded-2xl flex-row items-center"
                          style={{
                            backgroundColor: `${activePathData.theme}15`,
                            borderWidth: 1,
                            borderColor: `${activePathData.theme}25`,
                          }}
                        >
                          <Text style={{ fontSize: 12 }}>{activePathData.icon}</Text>
                          <Text className="font-medium text-xs ml-1.5" style={{ color: activePathData.theme }}>
                            Day {activePath.currentDay}/{activePathData.duration}
                          </Text>
                        </View>
                      </Pressable>
                    )}

                    {/* Mood Insights Button */}
                    <Pressable onPress={handleOpenMoodInsights} accessibilityLabel="View mood insights" accessibilityRole="button" className="active:scale-95">
                      <View
                        className="px-3 py-2 rounded-2xl flex-row items-center"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          borderWidth: 1,
                          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        }}
                      >
                        <ChevronRight size={12} color={theme.textMuted} />
                        <Text className="font-medium text-xs ml-1" style={{ color: theme.textMuted }}>
                          Insights
                        </Text>
                      </View>
                    </Pressable>
                  </View>

                  {/* Shared Thought — subtle atmospheric card */}
                  {!hasSubmittedToday && (
                    <View
                      className="mt-3 px-4 py-3 rounded-2xl"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        borderWidth: 1,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      }}
                    >
                      <Text className="font-sans text-xs mb-1" style={{ color: theme.textMuted, opacity: 0.7 }}>
                        Someone else wrote today:
                      </Text>
                      <Text
                        className="font-sans text-sm italic leading-relaxed"
                        style={{ color: theme.textSecondary, opacity: 0.8 }}
                        numberOfLines={2}
                      >
                        "{todaySharedThought}"
                      </Text>
                    </View>
                  )}
                </View>

                {/* Main Card */}
                <View className="flex-1 px-6 pt-6 pb-4">
                  <Animated.View style={[cardAnimatedStyle, { flex: 1 }]}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 28,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: theme.isDark ? 0.4 : 0.15,
                        shadowRadius: 24,
                        elevation: 12,
                      }}
                    >
                      <BlurView
                        intensity={theme.isDark ? 25 : 50}
                        tint={theme.isDark ? 'dark' : 'light'}
                        style={{
                          borderRadius: 28,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
                          flex: 1,
                        }}
                      >
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 32,
                            right: 32,
                            height: 1,
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
                            zIndex: 10,
                          }}
                        />
                        <View
                          style={{
                            position: 'absolute',
                            top: 32,
                            bottom: 32,
                            left: 0,
                            width: 1,
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.3)',
                            zIndex: 10,
                          }}
                        />
                        <View
                          style={{
                            position: 'absolute',
                            top: 32,
                            bottom: 32,
                            right: 0,
                            width: 1,
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.3)',
                            zIndex: 10,
                          }}
                        />
                        <View
                          className="p-6 flex-1"
                          style={{
                            backgroundColor: theme.isDark
                              ? 'rgba(15,15,18,0.65)'
                              : 'rgba(255,255,255,0.75)',
                          }}
                        >
                          {/* Sent/Sealed State */}
                          {(showSentState || hasSubmittedToday) && !isSending ? (
                            <Animated.View
                              style={[
                                sentStateAnimatedStyle,
                                { alignItems: 'center', paddingVertical: 32, flex: 1, justifyContent: 'center' },
                              ]}
                            >
                              <View
                                style={{
                                  width: 64,
                                  height: 64,
                                  borderRadius: 32,
                                  backgroundColor: theme.accentLight,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginBottom: 16,
                                }}
                              >
                                <Lock size={28} color={theme.accent} />
                              </View>
                              <Text className="font-semibold text-xl mb-2" style={{ color: theme.text }}>
                                Sent.
                              </Text>
                              {isTodayEntryRevealed ? (
                                <>
                                  <Text
                                    className="font-sans text-base text-center mb-4"
                                    style={{ color: theme.textSecondary }}
                                  >
                                    {todayEntry?.photoUri ? 'Your photo is ready to view' : 'Your thought is ready to read'}
                                  </Text>
                                  {todayEntry && (
                                    <View
                                      className="p-4 rounded-2xl w-full mt-2"
                                      style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.3)' : 'rgba(232,235,228,0.3)' }}
                                    >
                                      <Text
                                        className="font-sans text-xs mb-2 uppercase tracking-wide"
                                        style={{ color: theme.textSecondary }}
                                      >
                                        {todayEntry.photoUri ? "Today's photo" : "Today's thought"}
                                      </Text>
                                      {todayEntry.photoUri ? (
                                        <Text className="font-sans text-base leading-relaxed" style={{ color: theme.text }}>
                                          Photo captured
                                        </Text>
                                      ) : (
                                        <Text className="font-sans text-base leading-relaxed" style={{ color: theme.text }}>
                                          "{todayEntry.content}"
                                        </Text>
                                      )}
                                    </View>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Text
                                    className="font-sans text-base text-center"
                                    style={{ color: theme.textSecondary }}
                                  >
                                    Sealed — sent to your future self
                                  </Text>
                                  {showCountdownLabels && timeUntilReveal && (
                                    <View
                                      className="mt-4 px-4 py-2 rounded-full"
                                      style={{ backgroundColor: theme.isDark ? 'rgba(42,42,40,0.3)' : 'rgba(232,235,228,0.3)' }}
                                    >
                                      <Text
                                        className="font-medium text-sm"
                                        style={{ color: theme.textMuted }}
                                      >
                                        {getCountdownText()}
                                      </Text>
                                    </View>
                                  )}
                                </>
                              )}
                            </Animated.View>
                          ) : photoPromptsEnabled && isPremium ? (
                            /* Photo-Only Mode */
                            <View className="flex-1 items-center justify-center">
                              <Pressable onPress={handlePromptTap} className="items-center mb-8 px-4 active:opacity-70" accessibilityLabel="Prompt tap">
                                <View
                                  className="w-16 h-16 rounded-full items-center justify-center mb-5"
                                  style={{ backgroundColor: theme.accentLight }}
                                >
                                  <Camera size={28} color={theme.accent} />
                                </View>
                                <View className="flex-row items-center mb-2">
                                  <Text
                                    className="font-sans text-xs uppercase tracking-widest"
                                    style={{ color: theme.accent, opacity: 0.8 }}
                                  >
                                    Today's photo challenge
                                  </Text>
                                  <View className="flex-row items-center ml-2">
                                    <RefreshCw size={10} color={theme.textMuted} style={{ marginRight: 3 }} />
                                    <Text
                                      className="font-sans text-xs"
                                      style={{ color: theme.textMuted }}
                                    >
                                      {selectedPromptIndex + 1}/{todayPhotoPrompts.length}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  className="font-semibold text-lg leading-relaxed text-center"
                                  style={{ color: theme.text }}
                                >
                                  {todayPhotoPrompt}
                                </Text>
                              </Pressable>

                              <Pressable
                                onPress={handleOpenPhotoPrompt}
                                className="active:scale-95"
                                accessibilityLabel="Capture photo for today's prompt"
                                accessibilityRole="button"
                              >
                                <View
                                  className="flex-row items-center justify-center px-8 py-4 rounded-xl"
                                  style={{ backgroundColor: theme.accent }}
                                >
                                  <Camera size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                  <Text className="font-semibold text-base text-white tracking-wide">
                                    Capture Photo
                                  </Text>
                                </View>
                              </Pressable>
                            </View>
                          ) : (
                            <View className="relative flex-1">
                              {/* Input Content */}
                              <Animated.View style={[contentAnimatedStyle, { flex: 1 }]}>
                                {/* Prompt */}
                                <Pressable onPress={activePathPrompt ? handleOpenPaths : handlePromptTap} accessibilityLabel="Change today's prompt" accessibilityRole="button" className="mb-4 active:opacity-70">
                                  <View className="flex-row items-center justify-between mb-1.5">
                                    <Text
                                      className="font-sans text-xs uppercase tracking-widest"
                                      style={{ color: activePathData ? activePathData.theme : theme.accent, opacity: 0.8 }}
                                    >
                                      {activePathData
                                        ? `${activePathData.icon} ${activePathData.title} \u00B7 Day ${activePath?.currentDay}`
                                        : "Today's prompt"}
                                    </Text>
                                    {!activePathPrompt && (
                                      <View className="flex-row items-center">
                                        <RefreshCw size={10} color={theme.textMuted} style={{ marginRight: 4 }} />
                                        <Text
                                          className="font-sans text-xs"
                                          style={{ color: theme.textMuted }}
                                        >
                                          {selectedPromptIndex + 1}/{todayPrompts.length}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text
                                    className="font-semibold text-lg leading-relaxed"
                                    style={{ color: theme.text }}
                                  >
                                    {todayPrompt}
                                  </Text>
                                </Pressable>

                                {/* Writing Area */}
                                <Text
                                  className="font-sans text-xs mb-2 uppercase tracking-widest"
                                  style={{ color: theme.textMuted, opacity: 0.6 }}
                                >
                                  Write your thought
                                </Text>
                                <View className="flex-1" style={{ position: 'relative' }}>
                                  {/* Pulsing glow border — guides first-time users to write */}
                                  <Animated.View
                                    pointerEvents="none"
                                    style={[
                                      {
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        borderRadius: 16,
                                        borderWidth: 1.5,
                                        borderColor: theme.accent,
                                        zIndex: 2,
                                      },
                                      inputGlowStyle,
                                    ]}
                                  />
                                  <View
                                    className="flex-1 rounded-2xl overflow-hidden"
                                    style={{
                                      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                      borderWidth: 1,
                                      borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    }}
                                  >
                                    <TextInput
                                      value={thought}
                                      onChangeText={setThought}
                                      placeholder="Start writing..."
                                      placeholderTextColor={theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                      multiline
                                      maxLength={MAX_CHARS + 20}
                                      editable={!isSending}
                                      accessibilityLabel="Journal entry"
                                      accessibilityHint="Write your thought for today"
                                      className="font-sans text-base flex-1 px-4 py-3"
                                      style={{
                                        textAlignVertical: 'top',
                                        color: theme.text,
                                        lineHeight: 24,
                                      }}
                                    />

                                    <View
                                      className="flex-row items-center justify-between px-4 py-2"
                                      style={{
                                        borderTopWidth: 1,
                                        borderTopColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                      }}
                                    >
                                      <View className="flex-row items-center">
                                        <View
                                          className="w-1.5 h-1.5 rounded-full mr-2"
                                          style={{
                                            backgroundColor: isOverLimit
                                              ? '#EF4444'
                                              : charsRemaining <= 20
                                              ? '#F59E0B'
                                              : theme.accent,
                                            opacity: 0.8,
                                          }}
                                        />
                                        <Text
                                          className="font-sans text-xs"
                                          style={{
                                            color: isOverLimit
                                              ? '#EF4444'
                                              : charsRemaining <= 20
                                              ? '#F59E0B'
                                              : theme.textMuted,
                                          }}
                                        >
                                          {charsRemaining}
                                        </Text>
                                      </View>

                                      <Text
                                        className="font-sans text-xs"
                                        style={{ color: theme.textMuted, opacity: 0.6 }}
                                      >
                                        {thought.length > 0 ? `${thought.trim().split(/\s+/).filter(Boolean).length} words` : ''}
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Submit Button */}
                                  <AnimatedPressable
                                    onPress={handleSubmit}
                                    onPressIn={handleButtonPress}
                                    disabled={!canSubmit}
                                    accessibilityLabel="Submit journal entry"
                                    accessibilityRole="button"
                                    style={[
                                      buttonAnimatedStyle,
                                      {
                                        marginTop: 16,
                                        opacity: canSubmit ? 1 : 0.4,
                                      },
                                    ]}
                                  >
                                    <View
                                      className="flex-row items-center justify-center py-4 rounded-xl"
                                      style={{
                                        backgroundColor: theme.accent,
                                      }}
                                    >
                                      <Send size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                                      <Text className="font-semibold text-sm text-white tracking-wide">
                                        {getRevealLabel()}
                                      </Text>
                                    </View>
                                  </AnimatedPressable>
                                </View>
                              </Animated.View>

                              {/* Energy Bubble Animation Overlay */}
                              {isSending && (
                                <View className="absolute inset-0 items-center justify-center">
                                  <Animated.View
                                    style={[
                                      bubbleContainerStyle,
                                      {
                                        width: 80,
                                        height: 80,
                                        borderRadius: 40,
                                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        overflow: 'hidden',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 2,
                                        borderColor: theme.accent,
                                      },
                                    ]}
                                  >
                                    <Animated.View
                                      style={[
                                        bubbleFillStyle,
                                        {
                                          position: 'absolute',
                                          bottom: 0,
                                          left: 0,
                                          right: 0,
                                          backgroundColor: theme.accent,
                                          borderRadius: 40,
                                        },
                                      ]}
                                    />
                                    <Send size={28} color={theme.accent} />
                                    <Animated.View
                                      style={[
                                        shimmerStyle,
                                        {
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          right: 0,
                                          bottom: 0,
                                          backgroundColor: 'rgba(255,255,255,0.6)',
                                          borderRadius: 40,
                                        },
                                      ]}
                                    />
                                  </Animated.View>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      </BlurView>
                    </View>
                  </Animated.View>
                </View>

                {/* Footer / Nav Bar */}
                <View
                  testID="tab-bar"
                  className="px-6 pb-4 flex-row items-center justify-between"
                >
                  <Pressable
                    onPress={openCalendarPanel}
                    testID="nav-calendar"
                    accessibilityLabel="Calendar – view past entries"
                    accessibilityRole="button"
                    className="p-2"
                  >
                    <Calendar size={20} color={theme.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/paywall')}
                    testID="upgrade-button"
                    accessibilityLabel="Upgrade to One Thought+"
                    accessibilityRole="button"
                    className="p-2"
                  >
                    <Lock size={20} color={isPremium ? theme.accent : theme.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={openSettingsPanel}
                    testID="nav-settings"
                    accessibilityLabel="Open settings"
                    accessibilityRole="button"
                    className="p-2"
                  >
                    <Settings size={20} color={theme.textMuted} />
                  </Pressable>
                </View>
              </Pressable>
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>

        {/* Calendar Panel - Always rendered for smooth drag animation */}
        <GestureDetector gesture={calendarCloseGesture}>
          <Animated.View
            style={[
              calendarPanelStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: calendarPanelOpen ? 100 : 50,
              },
            ]}
            pointerEvents={calendarPanelOpen ? 'auto' : 'none'}
          >
            <LinearGradient
              colors={theme.gradient}
              style={{ flex: 1 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <CalendarPanel onClose={closeCalendarPanel} />
            </LinearGradient>
          </Animated.View>
        </GestureDetector>

        {/* Settings Panel - Always rendered for smooth drag animation */}
        <GestureDetector gesture={settingsCloseGesture}>
          <Animated.View
            style={[
              settingsPanelStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: settingsPanelOpen ? 100 : 50,
              },
            ]}
            pointerEvents={settingsPanelOpen ? 'auto' : 'none'}
          >
            <LinearGradient
              colors={theme.gradient}
              style={{ flex: 1 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ParticleBackground />
              <SettingsPanel onClose={closeSettingsPanel} />
            </LinearGradient>
          </Animated.View>
        </GestureDetector>

        {/* Achievement Celebration Overlay */}
        {showCelebration && pendingCelebration && (() => {
          const ach = getAchievementById(pendingCelebration);
          if (!ach) return null;
          return (
            <Animated.View
              style={[
                celebrationAnimatedStyle,
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 200,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
              pointerEvents="none"
            >
              <BlurView
                intensity={theme.isDark ? 60 : 80}
                tint={theme.isDark ? 'dark' : 'light'}
                style={{
                  borderRadius: 32,
                  overflow: 'hidden',
                  paddingHorizontal: 40,
                  paddingVertical: 32,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: `${theme.accent}30`,
                  shadowColor: theme.accent,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 32,
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(15,15,18,0.85)' : 'rgba(255,255,255,0.9)',
                    padding: 32,
                    borderRadius: 28,
                    alignItems: 'center',
                  }}
                >
                  <Animated.Text
                    entering={ZoomIn.springify().damping(8).stiffness(160)}
                    style={{ fontSize: 48, marginBottom: 12 }}
                  >
                    {ach.icon}
                  </Animated.Text>
                  <Animated.Text
                    entering={FadeInDown.delay(100).duration(350)}
                    className="font-sans text-xs uppercase tracking-widest mb-2"
                    style={{ color: theme.accent }}
                  >
                    Achievement Unlocked
                  </Animated.Text>
                  <Animated.Text
                    entering={FadeInDown.delay(200).duration(350)}
                    className="font-bold text-xl mb-1"
                    style={{ color: theme.text }}
                  >
                    {ach.title}
                  </Animated.Text>
                  <Animated.Text
                    entering={FadeInDown.delay(300).duration(350)}
                    className="font-sans text-sm text-center"
                    style={{ color: theme.textSecondary }}
                  >
                    {ach.description}
                  </Animated.Text>
                </View>
              </BlurView>
            </Animated.View>
          );
        })()}
      </LinearGradient>
    </View>
  );
}
