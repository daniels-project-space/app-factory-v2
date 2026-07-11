import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useSettingsStore } from '@/lib/state/settings-store';
import { usePremiumStatus } from '@/lib/usePremium';

/**
 * BackgroundMusicPlayer - Premium feature
 * Plays ambient background music that loops while the app is in use.
 * Music pauses when the app goes to background and resumes when it returns.
 * Handles audio interruptions from camera and other components gracefully.
 */
export default function BackgroundMusicPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const isLoadedRef = useRef(false);
  const isPlayingRef = useRef(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const backgroundMusicEnabled = useSettingsStore((s) => s.backgroundMusicEnabled);
  const backgroundMusicVolume = useSettingsStore((s) => s.backgroundMusicVolume);
  const { isPremium } = usePremiumStatus();

  // Configure audio mode for mixing with other audio
  const configureAudioMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
    } catch (error) {
      console.log('[BackgroundMusic] Audio mode config error:', error);
    }
  }, []);

  // Resume playback if it should be playing
  const ensurePlayback = useCallback(async () => {
    if (!soundRef.current || !isLoadedRef.current) return;
    if (!backgroundMusicEnabled || !isPremium) return;

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        // Reconfigure audio mode before resuming (in case camera changed it)
        await configureAudioMode();
        await soundRef.current.playAsync();
        isPlayingRef.current = true;
      }
    } catch (error) {
      console.log('[BackgroundMusic] Resume error:', error);
    }
  }, [backgroundMusicEnabled, isPremium, configureAudioMode]);

  // Setup audio on mount
  useEffect(() => {
    let isMounted = true;

    const setupAudio = async () => {
      try {
        await configureAudioMode();

        // Create and load the sound
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/music-1767745779191.mp3'),
          {
            isLooping: true,
            volume: backgroundMusicVolume,
            shouldPlay: false,
          }
        );

        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        isLoadedRef.current = true;

        // Start playing if enabled and premium
        if (backgroundMusicEnabled && isPremium) {
          await sound.playAsync();
          isPlayingRef.current = true;
        }
      } catch (error) {
        console.log('[BackgroundMusic] Failed to load audio:', error);
      }
    };

    setupAudio();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
        isLoadedRef.current = false;
        isPlayingRef.current = false;
      }
    };
  }, []);

  // Periodic check to ensure music resumes after interruptions (camera, etc.)
  useEffect(() => {
    if (backgroundMusicEnabled && isPremium) {
      // Check every 2 seconds if music should be playing but isn't
      checkIntervalRef.current = setInterval(() => {
        ensurePlayback();
      }, 2000);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [backgroundMusicEnabled, isPremium, ensurePlayback]);

  // Handle volume changes
  useEffect(() => {
    const updateVolume = async () => {
      if (!soundRef.current || !isLoadedRef.current) return;

      try {
        await soundRef.current.setVolumeAsync(backgroundMusicVolume);
      } catch (error) {
        console.log('[BackgroundMusic] Volume update error:', error);
      }
    };

    updateVolume();
  }, [backgroundMusicVolume]);

  // Handle play/pause when settings change
  useEffect(() => {
    const handlePlayback = async () => {
      if (!soundRef.current || !isLoadedRef.current) return;

      try {
        if (backgroundMusicEnabled && isPremium) {
          await configureAudioMode();
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && !status.isPlaying) {
            await soundRef.current.playAsync();
            isPlayingRef.current = true;
          }
        } else {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await soundRef.current.pauseAsync();
            isPlayingRef.current = false;
          }
        }
      } catch (error) {
        console.log('[BackgroundMusic] Playback error:', error);
      }
    };

    handlePlayback();
  }, [backgroundMusicEnabled, isPremium, configureAudioMode]);

  // Handle app state changes (pause on background, resume on foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (!soundRef.current || !isLoadedRef.current) return;
      if (!backgroundMusicEnabled || !isPremium) return;

      try {
        if (nextAppState === 'active') {
          // App came to foreground - reconfigure audio and resume
          await configureAudioMode();
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && !status.isPlaying) {
            await soundRef.current.playAsync();
            isPlayingRef.current = true;
          }
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          // App went to background - pause
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await soundRef.current.pauseAsync();
            isPlayingRef.current = false;
          }
        }
      } catch (error) {
        console.log('[BackgroundMusic] App state change error:', error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [backgroundMusicEnabled, isPremium, configureAudioMode]);

  // This component renders nothing - it's purely functional
  return null;
}
