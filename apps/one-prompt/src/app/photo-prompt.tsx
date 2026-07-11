import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { X, Camera, Check, RotateCcw, RefreshCw } from 'lucide-react-native';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import { useJournalStore, getTodayDate, calculateRevealTimestamp } from '@/lib/state/journal-store';
import { getTodayPhotoPrompts, getCategoryPhotoPromptsForDate } from '@/lib/photo-prompts';
import { scheduleRevealNotification } from '@/lib/notifications';
import { usePremiumStatus } from '@/lib/usePremium';

export default function PhotoPromptScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isPremium } = usePremiumStatus();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const revealDelay = useSettingsStore((s) => s.revealDelay);
  const selectedPromptCategories = useSettingsStore((s) => s.selectedPromptCategories);
  const customPhotoPrompts = useSettingsStore((s) => s.customPhotoPrompts);
  const selectedPromptIndex = useSettingsStore((s) => s.selectedPromptIndex);
  const selectedPromptDate = useSettingsStore((s) => s.selectedPromptDate);
  const cyclePromptIndex = useSettingsStore((s) => s.cyclePromptIndex);
  const setSelectedPromptDate = useSettingsStore((s) => s.setSelectedPromptDate);
  const setSelectedPromptIndex = useSettingsStore((s) => s.setSelectedPromptIndex);
  const addPhotoEntry = useJournalStore((s) => s.addPhotoEntry);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Get today's photo prompts (5 options) - use category-based if categories are selected
  const photoPrompts = useMemo(() => {
    const today = getTodayDate();
    if (selectedPromptCategories.length > 0) {
      return getCategoryPhotoPromptsForDate(today, selectedPromptCategories, customPhotoPrompts, 5);
    }
    return getTodayPhotoPrompts(5);
  }, [selectedPromptCategories, customPhotoPrompts]);

  // Reset prompt index if date changed
  useEffect(() => {
    const today = getTodayDate();
    if (selectedPromptDate !== today) {
      setSelectedPromptDate(today);
      setSelectedPromptIndex(0);
    }
  }, [selectedPromptDate, setSelectedPromptDate, setSelectedPromptIndex]);

  // Get the currently selected photo prompt
  const photoPrompt = useMemo(() => {
    const safeIndex = Math.min(selectedPromptIndex, photoPrompts.length - 1);
    return photoPrompts[safeIndex] ?? photoPrompts[0];
  }, [photoPrompts, selectedPromptIndex]);

  // Double-tap handling for prompt shuffle
  const lastTapRef = useRef<number>(0);
  const DOUBLE_TAP_DELAY = 300;

  const handlePromptTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - cycle to next prompt
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      cyclePromptIndex();
      lastTapRef.current = 0; // Reset to prevent triple-tap counting
    } else {
      lastTapRef.current = now;
    }
  }, [hapticEnabled, cyclePromptIndex]);

  // Redirect non-premium users to paywall
  useEffect(() => {
    if (!isPremium) {
      router.replace('/paywall');
    }
  }, [isPremium, router]);

  const handleClose = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [hapticEnabled, router]);

  const handleFlipCamera = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }, [hapticEnabled]);

  const handleTakePhoto = useCallback(async () => {
    if (!cameraRef.current) return;

    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedPhoto(photo.uri);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to take photo:', error);
      }
    }
  }, [hapticEnabled]);

  const handleRetake = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCapturedPhoto(null);
  }, [hapticEnabled]);

  const handleSavePhoto = useCallback(async () => {
    if (!capturedPhoto) return;

    setIsSaving(true);
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Create a permanent copy of the photo
      const today = getTodayDate();
      const fileName = `photo_${today}_${Date.now()}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: capturedPhoto,
        to: permanentUri,
      });

      // Create photo-only entry (or add to existing entry)
      addPhotoEntry(permanentUri, photoPrompt, revealDelay);

      // Schedule reveal notification for time capsule modes (not instant)
      if (revealDelay !== 'instant') {
        const revealAt = calculateRevealTimestamp(Date.now(), revealDelay);
        scheduleRevealNotification(revealAt, today);
      }

      if (hapticEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.back();
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to save photo:', error);
      }
      setIsSaving(false);
    }
  }, [capturedPhoto, hapticEnabled, addPhotoEntry, photoPrompt, revealDelay, router]);

  // Permission not determined yet
  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#000' }}>
        <Text className="text-white text-lg">Loading camera...</Text>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: '#000' }}>
        <SafeAreaView className="items-center">
          <Animated.View entering={FadeInUp.duration(400)} className="items-center">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <Camera size={36} color="#FFFFFF" />
            </View>
            <Text className="text-white text-xl font-semibold text-center mb-3">
              Camera Access Required
            </Text>
            <Text className="text-white/60 text-base text-center mb-8">
              To capture your photo prompt, we need access to your camera.
            </Text>
            <Pressable
              onPress={requestPermission}
              accessibilityLabel="Enable camera"
              className="px-8 py-4 rounded-full active:scale-95"
              style={{ backgroundColor: theme.accent }}
            >
              <Text className="text-white font-semibold text-base">
                Enable Camera
              </Text>
            </Pressable>
            <Pressable
              onPress={handleClose}
              accessibilityLabel="Dismiss camera permission"
              className="mt-4 px-6 py-3 active:opacity-70"
            >
              <Text className="text-white/60 font-medium">
                Maybe Later
              </Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Photo preview mode
  if (capturedPhoto) {
    return (
      <View className="flex-1" style={{ backgroundColor: '#000' }}>
        <Image
          source={{ uri: capturedPhoto }}
          style={{ flex: 1 }}
          resizeMode="cover"
        />

        {/* Overlay with prompt */}
        <View className="absolute inset-0">
          <SafeAreaView className="flex-1">
            {/* Header - positioned lower to avoid phone UI */}
            <Animated.View
              entering={FadeIn.duration(300)}
              className="flex-row items-center justify-between px-4 pt-8 mt-4"
            >
              <Pressable
                onPress={handleRetake}
                accessibilityLabel="Retake photo"
                accessibilityRole="button"
                className="w-12 h-12 rounded-full items-center justify-center active:scale-95"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              >
                <RotateCcw size={22} color="#FFFFFF" />
              </Pressable>

              <Pressable
                onPress={handleClose}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
                className="w-12 h-12 rounded-full items-center justify-center active:scale-95"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              >
                <X size={22} color="#FFFFFF" />
              </Pressable>
            </Animated.View>

            {/* Spacer */}
            <View className="flex-1" />

            {/* Bottom section */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(100)}
              className="px-6 pb-8"
            >
              {/* Photo prompt card - Tappable to shuffle */}
              <Pressable
                onPress={handlePromptTap}
                accessibilityLabel="Photo prompt"
                className="rounded-2xl p-4 mb-6 active:opacity-80"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white/60 text-xs uppercase tracking-wider">
                    Photo Challenge
                  </Text>
                  <View className="flex-row items-center">
                    <RefreshCw size={10} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                    <Text className="text-white/50 text-xs">
                      {selectedPromptIndex + 1}/{photoPrompts.length}
                    </Text>
                  </View>
                </View>
                <Text className="text-white text-lg font-medium">
                  {photoPrompt}
                </Text>
              </Pressable>

              {/* Save button */}
              <Pressable
                onPress={handleSavePhoto}
                accessibilityLabel="Save photo"
                disabled={isSaving}
                className="flex-row items-center justify-center py-4 rounded-full active:scale-95"
                style={{
                  backgroundColor: theme.accent,
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                <Check size={20} color="#FFFFFF" />
                <Text className="text-white font-semibold text-base ml-2">
                  {isSaving ? 'Saving...' : 'Save Photo'}
                </Text>
              </Pressable>
            </Animated.View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  // Camera mode
  return (
    <View className="flex-1" style={{ backgroundColor: '#000' }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
      >
        <SafeAreaView className="flex-1">
          {/* Header - positioned lower to avoid phone UI */}
          <Animated.View
            entering={FadeIn.duration(300)}
            className="flex-row items-center justify-between px-4 pt-8 mt-4"
          >
            <Pressable
              onPress={handleFlipCamera}
              accessibilityLabel="Switch camera"
              accessibilityRole="button"
              className="w-12 h-12 rounded-full items-center justify-center active:scale-95"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <RotateCcw size={22} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={handleClose}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              className="w-12 h-12 rounded-full items-center justify-center active:scale-95"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <X size={22} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Bottom section */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(100)}
            className="px-6 pb-8"
          >
            {/* Photo prompt card - Tappable to shuffle */}
            <Pressable
              onPress={handlePromptTap}
              accessibilityLabel="Photo prompt"
              className="rounded-2xl p-4 mb-8 active:opacity-80"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white/60 text-xs uppercase tracking-wider">
                  Today's Photo Challenge
                </Text>
                <View className="flex-row items-center">
                  <RefreshCw size={10} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                  <Text className="text-white/50 text-xs">
                    {selectedPromptIndex + 1}/{photoPrompts.length}
                  </Text>
                </View>
              </View>
              <Text className="text-white text-lg font-medium">
                {photoPrompt}
              </Text>
            </Pressable>

            {/* Capture button */}
            <View className="items-center">
              <Pressable
                onPress={handleTakePhoto}
                testID="camera-capture"
                accessibilityLabel="Take photo"
                accessibilityRole="button"
                className="w-20 h-20 rounded-full items-center justify-center active:scale-95"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderWidth: 4,
                  borderColor: '#FFFFFF',
                }}
              >
                <View
                  className="w-14 h-14 rounded-full"
                  style={{ backgroundColor: '#FFFFFF' }}
                />
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
