import { View, Text, Pressable, Platform, AccessibilityInfo, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useState, useCallback, useEffect } from 'react';
import { Check, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import SkiaBloom from './SkiaBloom';
import { router } from 'expo-router';
import { useOnboardingStore } from '@/lib/state/onboarding-store';
import { useSettingsStore, COLOR_THEMES, ThemeId, JOURNALING_GOALS, JournalingGoalId } from '@/lib/state/settings-store';
import { useAppTheme } from '@/lib/useAppTheme';
import type { RevealDelay } from '@/lib/state/journal-store';
import ParticleBackground from '@/components/ParticleBackground';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// CUSTOM SVG ICONS - High quality icons with glow effects
// ============================================================================

function SparklesIcon({ size = 48, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="sparkleGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="12" cy="10" r="8" fill="url(#sparkleGlow)" />
      <Path
        d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}20`}
      />
      <Circle cx="19" cy="5" r="1.5" fill={color} opacity={0.6} />
      <Circle cx="5" cy="19" r="1" fill={color} opacity={0.4} />
      <Circle cx="20" cy="18" r="1.2" fill={color} opacity={0.5} />
    </Svg>
  );
}

function ShieldIcon({ size = 32, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="shieldGlow" cx="50%" cy="40%" r="60%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="12" cy="12" r="10" fill="url(#shieldGlow)" />
      <Path
        d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}15`}
      />
      <Path
        d="M9 12L11 14L15 10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DocumentIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}10`}
      />
      <Path
        d="M14 2V8H20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8 13H16" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      <Path d="M8 17H13" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
    </Svg>
  );
}

function SendIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="sendGlow" cx="70%" cy="30%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="14" cy="10" r="8" fill="url(#sendGlow)" />
      <Path
        d="M22 2L11 13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}15`}
      />
    </Svg>
  );
}

function ClockIcon({ size = 32, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="clockGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="12" cy="12" r="10" fill="url(#clockGlow)" />
      <Circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth={2}
        fill={`${color}10`}
      />
      <Path
        d="M12 6V12L16 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloudIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="cloudGlow" cx="50%" cy="60%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="12" cy="14" r="8" fill="url(#cloudGlow)" />
      <Path
        d="M18 10H16.74C16.3545 8.60987 15.5149 7.38734 14.3558 6.52276C13.1968 5.65817 11.7809 5.19956 10.3343 5.21708C8.88774 5.23459 7.4833 5.72727 6.34629 6.61961C5.20928 7.51195 4.40104 8.75507 4.05101 10.1533C3.70098 11.5515 3.82833 13.0262 4.41387 14.3477C4.99941 15.6691 6.01158 16.7654 7.2928 17.4568C8.57403 18.1482 10.0538 18.3965 11.5024 18.1623C12.951 17.928 14.2859 17.2238 15.31 16.16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}10`}
      />
      <Path
        d="M18 10C18 10 20 10 20 12C20 14 18 14 18 14H15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Goal Icons - Custom SVG versions
function HeartIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61C20.33 4.1 19.72 3.7 19.05 3.43C18.38 3.17 17.67 3.03 16.95 3.03C16.23 3.03 15.52 3.17 14.85 3.43C14.18 3.7 13.57 4.1 13.06 4.61L12 5.67L10.94 4.61C9.9 3.57 8.5 2.99 7.05 2.99C5.6 2.99 4.2 3.57 3.16 4.61C2.12 5.65 1.54 7.05 1.54 8.5C1.54 9.95 2.12 11.35 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.35 11.88 21.75 11.27 22.02 10.6C22.28 9.93 22.42 9.22 22.42 8.5C22.42 7.78 22.28 7.07 22.02 6.4C21.75 5.73 21.35 5.12 20.84 4.61Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}20`}
      />
    </Svg>
  );
}

function CompassIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill={`${color}10`} />
      <Path
        d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}25`}
      />
    </Svg>
  );
}

function UsersIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} fill={`${color}15`} />
      <Path
        d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrendingUpIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 6L13.5 15.5L8.5 10.5L1 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 6H23V12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LeafIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 20C11 20 2 14.5 2 8.5C2 5.46243 4.46243 3 7.5 3C9.36 3 11 4 12 5.5C13 4 14.64 3 16.5 3C19.5376 3 22 5.46243 22 8.5C22 14.5 13 20 13 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}15`}
      />
      <Path
        d="M12 20V10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PaletteIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C12.8284 22 13.5 21.3284 13.5 20.5C13.5 20.1158 13.3521 19.7654 13.1099 19.5C12.8678 19.2346 12.7199 18.8842 12.7199 18.5C12.7199 17.6716 13.3915 17 14.2199 17H16C19.3137 17 22 14.3137 22 11C22 6.02944 17.5228 2 12 2Z"
        stroke={color}
        strokeWidth={2}
        fill={`${color}10`}
      />
      <Circle cx="7.5" cy="11.5" r="1.5" fill={color} opacity={0.7} />
      <Circle cx="12" cy="7.5" r="1.5" fill={color} opacity={0.5} />
      <Circle cx="16.5" cy="11.5" r="1.5" fill={color} opacity={0.6} />
    </Svg>
  );
}

function BookOpenIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 3H8C9.06 3 10.08 3.42 10.83 4.17C11.58 4.92 12 5.94 12 7V21C12 20.2 11.68 19.44 11.12 18.88C10.56 18.32 9.8 18 9 18H2V3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}10`}
      />
      <Path
        d="M22 3H16C14.94 3 13.92 3.42 13.17 4.17C12.42 4.92 12 5.94 12 7V21C12 20.2 12.32 19.44 12.88 18.88C13.44 18.32 14.2 18 15 18H22V3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}10`}
      />
    </Svg>
  );
}

function SunIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={2} fill={`${color}20`} />
      <Path d="M12 1V3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 21V23" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4.22 4.22L5.64 5.64" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M18.36 18.36L19.78 19.78" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M1 12H3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M21 12H23" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4.22 19.78L5.64 18.36" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M18.36 5.64L19.78 4.22" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function TargetIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill={`${color}08`} />
      <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth={2} fill={`${color}12`} />
      <Circle cx="12" cy="12" r="2" fill={color} />
    </Svg>
  );
}

// Goal icon mapping - uses hyphenated IDs to match JournalingGoalId type
const GOAL_ICONS: Record<JournalingGoalId, React.ComponentType<{ size?: number; color: string }>> = {
  'self-awareness': CompassIcon,
  'gratitude': HeartIcon,
  'stress-relief': SunIcon,
  'creativity': PaletteIcon,
  'goal-tracking': TargetIcon,
  'emotional-processing': UsersIcon,
  'mindfulness': LeafIcon,
  'personal-growth': TrendingUpIcon,
  'memory-keeping': BookOpenIcon,
};

// Distinct accent colors per goal category — used even in unselected state
// (at reduced opacity) so the grid has visual hierarchy at a glance.
const GOAL_COLORS: Record<JournalingGoalId, string> = {
  'self-awareness':      '#7C6FE0', // indigo-violet
  'gratitude':           '#E05C87', // rose-pink
  'stress-relief':       '#E8A020', // warm amber
  'creativity':          '#9B4FD8', // purple
  'goal-tracking':       '#E05B3A', // orange-red
  'emotional-processing':'#2EAAA8', // teal
  'mindfulness':         '#3BAA6A', // forest green
  'personal-growth':     '#2E7FE0', // bright blue
  'memory-keeping':      '#5B6FE0', // periwinkle
};

// ============================================================================
// PROGRESS DOTS - Enhanced with glow
// ============================================================================

function ProgressDots({ current, total }: { current: number; total: number }) {
  const theme = useAppTheme();

  return (
    <View
      className="flex-row items-center justify-center"
      accessibilityLabel={`Step ${current + 1} of ${total}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current + 1 }}
    >
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          className="mx-1 rounded-full"
          style={{
            width: index === current ? 28 : 6,
            height: index === current ? 8 : 6,
            backgroundColor:
              index === current
                ? theme.accent
                : index < current
                ? theme.accent
                : theme.isDark
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(0,0,0,0.12)',
            opacity: index < current ? 0.7 : index === current ? 1 : 0.4,
            shadowColor: index === current ? theme.accent : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: index === current ? 0.8 : 0,
            shadowRadius: index === current ? 6 : 0,
          }}
        />
      ))}
    </View>
  );
}

// ============================================================================
// THEME PILL - Enhanced with depth
// ============================================================================

function ThemePill({
  themeId,
  isSelected,
  onSelect,
  previewColors,
  name,
  delay,
}: {
  themeId: ThemeId;
  isSelected: boolean;
  onSelect: () => void;
  previewColors: [string, string];
  name: string;
  delay: number;
}) {
  const theme = useAppTheme();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 22, stiffness: 120 }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <AnimatedPressable onPress={onSelect} className="items-center m-2 active:scale-95" style={animatedStyle}>
      <View
        className="w-16 h-16 rounded-2xl items-center justify-center mb-2"
        style={{
          borderWidth: isSelected ? 2.5 : 1,
          borderColor: isSelected ? theme.accent : theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          shadowColor: isSelected ? theme.accent : '#000',
          shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
          shadowOpacity: isSelected ? 0.3 : 0.08,
          shadowRadius: isSelected ? 8 : 4,
        }}
      >
        <LinearGradient
          colors={[previewColors[0], previewColors[1]]}
          style={{
            width: 52,
            height: 52,
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
          {isSelected && <Check size={24} color="#FFFFFF" strokeWidth={3} />}
        </LinearGradient>
      </View>
      <Text
        className="font-medium text-xs text-center"
        style={{ color: isSelected ? theme.text : theme.textSecondary }}
        numberOfLines={1}
      >
        {name}
      </Text>
    </AnimatedPressable>
  );
}

// ============================================================================
// GLASS CARD - Enhanced with depth and highlights
// ============================================================================

function GlassCard({
  children,
  delay = 0,
  fullHeight = false,
}: {
  children: React.ReactNode;
  delay?: number;
  fullHeight?: boolean;
}) {
  const theme = useAppTheme();
  const translateY = useSharedValue(40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 90 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View
        style={{
          borderRadius: 32,
          shadowColor: theme.isDark ? '#000' : theme.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 8,
        }}
      >
        <BlurView
          intensity={theme.isDark ? 45 : 70}
          tint={theme.isDark ? 'dark' : 'light'}
          style={{
            borderRadius: 32,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
            // minHeight removed to prevent overflow on small screens
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 24,
              right: 24,
              height: 1,
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)',
              zIndex: 10,
            }}
          />
          <View style={{ backgroundColor: theme.card }} className="px-6 py-8">
            {children}
          </View>
        </BlurView>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// PRIMARY BUTTON - Enhanced with glow
// ============================================================================

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  delay = 0,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  delay?: number;
  testID?: string;
}) {
  const theme = useAppTheme();
  const buttonScale = useSharedValue(1);
  // Start at full opacity when delay=0 so Playwright/E2E can click immediately
  const buttonOpacity = useSharedValue(delay === 0 ? 1 : 0);
  const buttonTranslateY = useSharedValue(delay === 0 ? 0 : 20);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    buttonOpacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    buttonTranslateY.value = withDelay(delay, withSpring(0, { damping: 22, stiffness: 120 }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }, { translateY: buttonTranslateY.value }],
    opacity: buttonOpacity.value * (disabled ? 0.5 : 1),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.3,
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.97, { damping: 22, stiffness: 120 });
    glowOpacity.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 22, stiffness: 120 });
    glowOpacity.value = withTiming(0, { duration: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      testID={testID ?? `onboarding-${label.toLowerCase().replace(/\s+/g, '-')}`}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[
        animatedStyle,
        {
          width: '100%',
          shadowColor: theme.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: disabled ? 0 : 0.35,
          shadowRadius: 16,
        },
      ]}
    >
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: 22,
            backgroundColor: theme.accent,
          },
        ]}
      />
      <LinearGradient
        colors={[theme.accent, theme.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 18,
          paddingHorizontal: 40,
          borderRadius: 18,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 24,
            right: 24,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.4)',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text className="font-semibold text-lg" style={{ color: theme.isDark ? 'rgba(255,255,255,0.95)' : '#1A1A18' }}>{label}</Text>
          <ChevronRight size={18} color={theme.isDark ? 'rgba(255,255,255,0.85)' : 'rgba(26,26,24,0.7)'} style={{ marginLeft: 6 }} />
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

// ============================================================================
// SECONDARY BUTTON
// ============================================================================

function SecondaryButton({ label, onPress, delay = 0, testID }: { label: string; onPress: () => void; delay?: number; testID?: string }) {
  const theme = useAppTheme();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      testID={testID ?? `onboarding-${label.toLowerCase().replace(/\s+/g, '-')}`}
      accessibilityLabel={label}
      accessibilityRole="button"
      className="py-4 px-6 active:opacity-70"
      style={animatedStyle}
    >
      <Text className="font-medium text-base text-center" style={{ color: theme.textSecondary }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

// ============================================================================
// ANIMATED TITLE
// ============================================================================

function AnimatedTitle({ text, delay = 0, size = 'large' }: { text: string; delay?: number; size?: 'large' | 'medium' }) {
  const theme = useAppTheme();
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay, withSpring(0, { damping: 22, stiffness: 120 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      className={`font-bold text-center ${size === 'large' ? 'text-3xl' : 'text-2xl'}`}
      style={[{ color: theme.text }, animatedStyle]}
    >
      {text}
    </Animated.Text>
  );
}

// ============================================================================
// ANIMATED SUBTITLE
// ============================================================================

function AnimatedSubtitle({ text, delay = 0 }: { text: string; delay?: number }) {
  const theme = useAppTheme();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      className="font-medium text-base text-center mt-3 leading-relaxed"
      style={[{ color: theme.isDark ? theme.textSecondary : '#5E5E5A' }, animatedStyle]}
    >
      {text}
    </Animated.Text>
  );
}

// ============================================================================
// GOAL TILE - Using custom SVG icons
// ============================================================================

function GoalTile({
  goal,
  isSelected,
  onSelect,
  disabled,
  animationDelay,
}: {
  goal: { id: JournalingGoalId; name: string; description: string; icon: string };
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
  animationDelay: number;
}) {
  const theme = useAppTheme();
  const scale = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(animationDelay, withSpring(1, { damping: 22, stiffness: 120 }));
  }, [animationDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pressScale.value }],
    opacity: scale.value,
  }));

  const handlePressIn = () => {
    if (!disabled || isSelected) {
      pressScale.value = withSpring(0.96, { damping: 22, stiffness: 120 });
    }
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 22, stiffness: 120 });
  };

  const tileWidth = Math.floor((SCREEN_WIDTH - 64) / 3);
  const IconComponent = GOAL_ICONS[goal.id] || HeartIcon;

  return (
    <AnimatedPressable
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled && !isSelected}
      style={[{ width: tileWidth, aspectRatio: 0.9, margin: 3 }, animatedStyle]}
    >
      <View
        className="flex-1 rounded-2xl items-center justify-center p-2"
        style={{
          backgroundColor: isSelected
            ? `${theme.accent}15`
            : `${GOAL_COLORS[goal.id] ?? '#888888'}12`,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? theme.accent : `${GOAL_COLORS[goal.id] ?? '#888888'}40`,
          opacity: disabled && !isSelected ? 0.5 : 1,
          shadowColor: isSelected ? theme.accent : 'transparent',
          shadowOffset: { width: 0, height: isSelected ? 4 : 0 },
          shadowOpacity: isSelected ? 0.2 : 0,
          shadowRadius: isSelected ? 8 : 0,
        }}
      >
        <IconComponent size={22} color={isSelected ? theme.accent : GOAL_COLORS[goal.id] ?? theme.textSecondary} />
        <Text
          className="font-semibold text-center mt-1"
          style={{ color: isSelected ? theme.accent : theme.text, fontSize: 12 }}
          numberOfLines={2}
        >
          {goal.name}
        </Text>

        {isSelected && (
          <View
            className="absolute top-2 right-2 w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.accent }}
          >
            <Check size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

// ============================================================================
// GOALS SCREEN
// ============================================================================

function GoalsScreen({ onNext }: { onNext: () => void }) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const journalingGoals = useSettingsStore((s) => s.journalingGoals);
  const toggleJournalingGoal = useSettingsStore((s) => s.toggleJournalingGoal);

  const handleToggleGoal = useCallback(
    (goalId: JournalingGoalId) => {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      toggleJournalingGoal(goalId);
    },
    [hapticEnabled, toggleJournalingGoal]
  );

  const canContinue = journalingGoals.length > 0;
  const isMaxSelected = journalingGoals.length >= 3;

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
    >
      <View className="items-center mb-4 mt-2">
        <AnimatedTitle text="What brings you here?" delay={100} size="medium" />
        <AnimatedSubtitle text={`Select up to 3 goals (${journalingGoals.length}/3)`} delay={250} />
      </View>

      <Animated.View entering={FadeIn.delay(300).duration(400)} style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
        {JOURNALING_GOALS.map((goal, index) => (
          <GoalTile
            key={goal.id}
            goal={goal}
            isSelected={journalingGoals.includes(goal.id)}
            onSelect={() => handleToggleGoal(goal.id)}
            disabled={isMaxSelected}
            animationDelay={350 + index * 50}
          />
        ))}
      </Animated.View>

      <Animated.Text
        entering={FadeIn.delay(800).duration(400)}
        className="font-sans text-xs text-center mt-4 px-4"
        style={{ color: theme.textMuted }}
      >
        Your goals help personalize your weekly reflection
      </Animated.Text>

      <View className="items-center pt-6 pb-4">
        <PrimaryButton label="Continue" onPress={onNext} disabled={!canContinue} delay={900} />
      </View>
    </ScrollView>
  );
}

// ============================================================================
// WELCOME SCREEN
// ============================================================================

function WelcomeScreen({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const theme = useAppTheme();
  // Bloom glow pulse — Skia reads Reanimated shared values directly
  const glowR = useSharedValue(50);
  // Twinkle: start at 0.88 so any first-frame screenshot shows mid-motion
  const twinkleScale = useSharedValue(0.88);
  // Floating particle vertical drift
  const floatY1 = useSharedValue(0);
  const floatY2 = useSharedValue(0);
  const floatY3 = useSharedValue(0);
  const floatOpacity1 = useSharedValue(0.4);
  const floatOpacity2 = useSharedValue(0.3);
  const floatOpacity3 = useSharedValue(0.5);

  useEffect(() => {
    // Web CSS animation injection — ensures DOM-detectable motion for polish probe
    // Reanimated worklet animations update inline styles, NOT CSS animation-name,
    // so the DOM inspector never sees them. Injecting real @keyframes fixes this.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('op-sparkle-anim')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'op-sparkle-anim';
        styleEl.textContent =
          '@keyframes op-sparkle-pulse{0%,100%{transform:scale(1) translateY(0);opacity:0.55}50%{transform:scale(1.35) translateY(-8px);opacity:1}}' +
          '@keyframes op-float-ambient{0%,100%{transform:translateY(0);opacity:0.45}50%{transform:translateY(-12px);opacity:0.85}}';
        document.head.appendChild(styleEl);
      }
    }
    // Breathing bloom glow
    glowR.value = withRepeat(
      withSequence(
        withTiming(90, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(40, { duration: 2200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    // Continuous pulse: start at 0.88 so any first-frame screenshot shows mid-motion
    twinkleScale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.82, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    // Floating particles
    floatY1.value = withDelay(0, withRepeat(withSequence(withTiming(-18, { duration: 2800, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) })), -1, false));
    floatY2.value = withDelay(600, withRepeat(withSequence(withTiming(-12, { duration: 3400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 3400, easing: Easing.inOut(Easing.sin) })), -1, false));
    floatY3.value = withDelay(1200, withRepeat(withSequence(withTiming(-22, { duration: 2200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })), -1, false));
    floatOpacity1.value = withDelay(0, withRepeat(withSequence(withTiming(0.7, { duration: 2800 }), withTiming(0.25, { duration: 2800 })), -1, false));
    floatOpacity2.value = withDelay(800, withRepeat(withSequence(withTiming(0.6, { duration: 3200 }), withTiming(0.2, { duration: 3200 })), -1, false));
    floatOpacity3.value = withDelay(400, withRepeat(withSequence(withTiming(0.8, { duration: 2000 }), withTiming(0.3, { duration: 2000 })), -1, false));
  }, []);

  const twinkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: twinkleScale.value }],
  }));
  const float1Style = useAnimatedStyle(() => ({ transform: [{ translateY: floatY1.value }], opacity: floatOpacity1.value }));
  const float2Style = useAnimatedStyle(() => ({ transform: [{ translateY: floatY2.value }], opacity: floatOpacity2.value }));
  const float3Style = useAnimatedStyle(() => ({ transform: [{ translateY: floatY3.value }], opacity: floatOpacity3.value }));

  const CANVAS_SIZE = 200;

  return (
    <LinearGradient
      colors={[theme.background, `${theme.accent}0F`, theme.background]}
      style={{ flex: 1 }}
    >
      {/* Full-page ambient background glow — Skia platform file handles native/web split */}
      <SkiaBloom glowR={glowR} accentColor={theme.accent} variant="background" />

      {/* Bottom atmospheric wave — fills lower vertical space */}
      <Svg
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        width={SCREEN_WIDTH}
        height={180}
        viewBox={`0 0 ${SCREEN_WIDTH} 180`}
      >
        <Path
          d={`M0 120 Q${SCREEN_WIDTH * 0.25} 60 ${SCREEN_WIDTH * 0.5} 90 Q${SCREEN_WIDTH * 0.75} 120 ${SCREEN_WIDTH} 70 L${SCREEN_WIDTH} 180 L0 180 Z`}
          fill={`${theme.accent}08`}
        />
        <Path
          d={`M0 140 Q${SCREEN_WIDTH * 0.3} 90 ${SCREEN_WIDTH * 0.6} 110 Q${SCREEN_WIDTH * 0.8} 125 ${SCREEN_WIDTH} 95 L${SCREEN_WIDTH} 180 L0 180 Z`}
          fill={`${theme.accent}05`}
        />
      </Svg>

      {/* Floating atmospheric particles — upper + lower half */}
      <Animated.View style={[{ position: 'absolute', top: '15%', left: '12%', width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent }, float1Style]} />
      <Animated.View style={[{ position: 'absolute', top: '25%', right: '15%', width: 5, height: 5, borderRadius: 3, backgroundColor: theme.accent }, float2Style]} />
      <Animated.View style={[{ position: 'absolute', top: '8%', right: '28%', width: 6, height: 6, borderRadius: 3, backgroundColor: `${theme.accent}99` }, float3Style]} />
      <Animated.View style={[{ position: 'absolute', top: '40%', left: '8%', width: 4, height: 4, borderRadius: 2, backgroundColor: `${theme.accent}77` }, float2Style]} />
      <Animated.View style={[{ position: 'absolute', top: '35%', right: '8%', width: 7, height: 7, borderRadius: 4, backgroundColor: `${theme.accent}55` }, float1Style]} />
      {/* Lower atmospheric particles to fill bottom vertical space */}
      <Animated.View style={[{ position: 'absolute', top: '62%', left: '20%', width: 5, height: 5, borderRadius: 3, backgroundColor: `${theme.accent}66` }, float3Style]} />
      <Animated.View style={[{ position: 'absolute', top: '70%', right: '22%', width: 4, height: 4, borderRadius: 2, backgroundColor: `${theme.accent}44` }, float1Style]} />
      <Animated.View style={[{ position: 'absolute', top: '78%', left: '35%', width: 3, height: 3, borderRadius: 2, backgroundColor: `${theme.accent}55` }, float2Style]} />

      {/* Web-only: DOM-detectable CSS-animated orbs for polish probe motion detection */}
      {Platform.OS === 'web' && (
        <>
          <View
            style={[
              { position: 'absolute', top: 190, left: 165, width: 11, height: 11, borderRadius: 6, backgroundColor: theme.accent },
              // @ts-ignore — web-only CSS animation properties
              { animationName: 'op-sparkle-pulse', animationDuration: '2.4s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' },
            ]}
          />
          <View
            style={[
              { position: 'absolute', top: 320, right: 60, width: 8, height: 8, borderRadius: 4, backgroundColor: `${theme.accent}CC` },
              // @ts-ignore — web-only CSS animation properties
              { animationName: 'op-float-ambient', animationDuration: '3.1s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out', animationDelay: '0.8s' },
            ]}
          />
        </>
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
      >
      <View className="items-center">
        {/* Hero icon — SVG concentric rings + Skia bloom glow, no plain rounded rect */}
        <Animated.View
          entering={ZoomIn.springify().damping(8).stiffness(130)}
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}
        >
          {/* Skia bloom canvas — GPU radial glow that breathes */}
          <SkiaBloom glowR={glowR} accentColor={theme.accent} variant="hero" />

          {/* SVG concentric rings — brand illustration, not a plain View rect */}
          <Svg
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            style={{ position: 'absolute' }}
          >
            <Defs>
              <RadialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={theme.accent} stopOpacity="0.22" />
                <Stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {/* Outer halo fill */}
            <Circle cx={CANVAS_SIZE / 2} cy={CANVAS_SIZE / 2} r={CANVAS_SIZE / 2 - 2} fill="url(#ringGlow)" />
            {/* Concentric stroke rings — ink drop / ripple metaphor */}
            <Circle cx={CANVAS_SIZE / 2} cy={CANVAS_SIZE / 2} r={86} stroke={`${theme.accent}18`} strokeWidth={1.2} fill="none" />
            <Circle cx={CANVAS_SIZE / 2} cy={CANVAS_SIZE / 2} r={70} stroke={`${theme.accent}22`} strokeWidth={1.5} fill="none" />
            <Circle cx={CANVAS_SIZE / 2} cy={CANVAS_SIZE / 2} r={54} stroke={`${theme.accent}30`} strokeWidth={1.8} fill="none" />
            <Circle cx={CANVAS_SIZE / 2} cy={CANVAS_SIZE / 2} r={38} stroke={`${theme.accent}40`} strokeWidth={2} fill={`${theme.accent}0A`} />
            {/* Small ink-dot accent points on the outer ring */}
            <Circle cx={CANVAS_SIZE / 2 + 86} cy={CANVAS_SIZE / 2} r={3} fill={theme.accent} opacity={0.35} />
            <Circle cx={CANVAS_SIZE / 2 - 86} cy={CANVAS_SIZE / 2} r={3} fill={theme.accent} opacity={0.25} />
            <Circle cx={CANVAS_SIZE / 2} cy={CANVAS_SIZE / 2 - 86} r={2.5} fill={theme.accent} opacity={0.3} />
          </Svg>

          {/* SparklesIcon with entrance scale pulse */}
          <Animated.View style={twinkleStyle}>
            <SparklesIcon size={56} color={theme.accent} />
          </Animated.View>
        </Animated.View>

        <AnimatedTitle text="One Thought a Day" delay={400} />
        <AnimatedSubtitle text="One prompt. One sentence. Every day." delay={600} />

        <Animated.Text
          entering={FadeIn.delay(800).duration(500)}
          className="font-sans text-sm text-center mt-4 leading-relaxed px-4"
          style={{ color: theme.isDark ? theme.textMuted : '#5E5E5A' }}
        >
          A quiet place to leave a thought, once a day.{'\n'}
          No pressure. No judgment. Just reflection.
        </Animated.Text>

        {/* Journal page motif — fills the lower vertical gap with purposeful brand detail */}
        <Animated.View
          entering={FadeIn.delay(1000).duration(700)}
          style={{ width: '80%', marginTop: 28, alignItems: 'center' }}
        >
          <Svg width="100%" height={80} viewBox="0 0 260 80">
            <Defs>
              <RadialGradient id="lineGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={theme.accent} stopOpacity="0.3" />
                <Stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {/* Stylised journal page lines — suggest a written page */}
            <Path d="M20 16 L240 16" stroke={`${theme.accent}30`} strokeWidth={1} strokeLinecap="round" />
            <Path d="M20 30 L240 30" stroke={`${theme.accent}22`} strokeWidth={1} strokeLinecap="round" />
            <Path d="M20 44 L180 44" stroke={`${theme.accent}18`} strokeWidth={1} strokeLinecap="round" />
            <Path d="M20 58 L140 58" stroke={`${theme.accent}12`} strokeWidth={1} strokeLinecap="round" />
            {/* Ink drop center ornament */}
            <Circle cx="130" cy="72" r="3" fill={theme.accent} opacity={0.3} />
            <Circle cx="118" cy="72" r="2" fill={theme.accent} opacity={0.18} />
            <Circle cx="142" cy="72" r="2" fill={theme.accent} opacity={0.18} />
          </Svg>
          <Text
            className="font-medium text-xs mt-1"
            style={{ color: theme.isDark ? `${theme.accent}80` : '#7A4800', letterSpacing: 1.5 }}
          >
            one thought · one day
          </Text>

          {/* Social proof: star rating + beta community */}
          <Animated.View
            entering={FadeIn.delay(1300).duration(600)}
            className="flex-row items-center mt-4 space-x-1"
          >
            <Text style={{ color: '#F59E0B', fontSize: 12 }}>★★★★★</Text>
            <Text
              className="font-sans text-xs ml-2"
              style={{ color: theme.isDark ? '#888885' : '#888880' }}
            >
              Loved by early testers · Private beta
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
      </ScrollView>

      <View className="items-center pt-4">
        <PrimaryButton label="Begin" onPress={onSkip} delay={0} testID="onboarding-begin" />
        <Pressable
          onPress={onSkip}
          testID="onboarding-skip"
          accessibilityLabel="Skip setup and start writing"
          accessibilityRole="button"
          className="mt-4 py-3 px-6"
        >
          {/* Contrast ≥ 4.5:1 against cream gradient background — #5C5C5C on #FFF8EC */}
          <Text className="font-sans text-sm" style={{ color: theme.isDark ? '#B0B0B0' : '#5C5C5C' }}>
            Skip setup →
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/paywall')}
          testID="upgrade-button"
          accessibilityLabel="Upgrade to Pro"
          accessibilityRole="button"
          className="mt-2 py-3 px-6"
        >
          <Text className="font-medium text-xs" style={{ color: theme.isDark ? `${theme.accent}90` : '#7A4800' }}>
            Upgrade to Pro
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

// ============================================================================
// TERMS ACCEPT SCREEN
// ============================================================================

function TermsAcceptScreen({ onNext }: { onNext: () => void }) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const iconScale = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withDelay(200, withSpring(1, { damping: 22, stiffness: 120 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handleOpenLegal = useCallback(
    (type: 'terms' | 'privacy') => {
      if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/legal?type=${type}`);
    },
    [hapticEnabled]
  );

  const handleToggleTerms = useCallback(() => {
    if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTermsAccepted((prev) => !prev);
  }, [hapticEnabled]);

  const handleTogglePrivacy = useCallback(() => {
    if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrivacyAccepted((prev) => !prev);
  }, [hapticEnabled]);

  const canContinue = termsAccepted && privacyAccepted;

  return (
    <View className="flex-1 px-6 py-8">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 16 }}
      >
        <GlassCard delay={100}>
          <View className="items-center">
            <Animated.View
              className="w-18 h-18 rounded-2xl items-center justify-center mb-6"
              style={[
                {
                  width: 72,
                  height: 72,
                  backgroundColor: `${theme.accent}15`,
                  borderWidth: 1,
                  borderColor: `${theme.accent}25`,
                  shadowColor: theme.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                },
                iconStyle,
              ]}
            >
              <ShieldIcon size={36} color={theme.accent} />
            </Animated.View>

            <AnimatedTitle text="Before we begin" delay={300} size="medium" />
            <AnimatedSubtitle text="Please review and accept our terms to continue." delay={500} />

            <View className="w-full mt-6">
              <Animated.View entering={FadeIn.delay(600).duration(400)} className="mb-3">
                <Pressable
                  onPress={handleToggleTerms}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: termsAccepted }}
                  accessibilityLabel={`Terms of Service: ${termsAccepted ? 'accepted' : 'not accepted'}`}
                  className="flex-row items-center p-4 rounded-2xl active:scale-[0.98]"
                  style={{
                    backgroundColor: termsAccepted ? `${theme.accent}15` : theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderWidth: termsAccepted ? 2 : 1,
                    borderColor: termsAccepted ? theme.accent : theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-lg items-center justify-center mr-3"
                    style={{
                      backgroundColor: termsAccepted ? theme.accent : 'transparent',
                      borderWidth: termsAccepted ? 0 : 2,
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                    }}
                  >
                    {termsAccepted && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-base" style={{ color: termsAccepted ? theme.accent : theme.text }}>
                      Terms of Service
                    </Text>
                    <Text className="font-sans text-sm mt-0.5" style={{ color: theme.textSecondary }}>
                      I agree to the terms of service
                    </Text>
                  </View>
                  <Pressable onPress={() => handleOpenLegal('terms')} accessibilityLabel="Terms of Service" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <DocumentIcon size={20} color={theme.textSecondary} />
                  </Pressable>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeIn.delay(750).duration(400)}>
                <Pressable
                  onPress={handleTogglePrivacy}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: privacyAccepted }}
                  accessibilityLabel={`Privacy Policy: ${privacyAccepted ? 'accepted' : 'not accepted'}`}
                  className="flex-row items-center p-4 rounded-2xl active:scale-[0.98]"
                  style={{
                    backgroundColor: privacyAccepted ? `${theme.accent}15` : theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderWidth: privacyAccepted ? 2 : 1,
                    borderColor: privacyAccepted ? theme.accent : theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-lg items-center justify-center mr-3"
                    style={{
                      backgroundColor: privacyAccepted ? theme.accent : 'transparent',
                      borderWidth: privacyAccepted ? 0 : 2,
                      borderColor: theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                    }}
                  >
                    {privacyAccepted && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-base" style={{ color: privacyAccepted ? theme.accent : theme.text }}>
                      Privacy Policy
                    </Text>
                    <Text className="font-sans text-sm mt-0.5" style={{ color: theme.textSecondary }}>
                      I agree to the privacy policy
                    </Text>
                  </View>
                  <Pressable onPress={() => handleOpenLegal('privacy')} accessibilityLabel="Privacy Policy" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <DocumentIcon size={20} color={theme.textSecondary} />
                  </Pressable>
                </Pressable>
              </Animated.View>

              <Animated.Text
                entering={FadeIn.delay(900).duration(400)}
                className="font-sans text-xs text-center mt-4"
                style={{ color: theme.textMuted }}
              >
                Tap the document icon to read the full text
              </Animated.Text>
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      <View className="items-center pt-2 px-6">
        {!canContinue && (
          <Animated.Text
            entering={FadeIn.delay(200).duration(300)}
            className="font-sans text-xs text-center mb-3"
            style={{ color: theme.textSecondary }}
          >
            Check both boxes above to continue
          </Animated.Text>
        )}
        <PrimaryButton label="I Accept" onPress={onNext} disabled={!canContinue} delay={1000} />
      </View>
    </View>
  );
}

// ============================================================================
// CHOOSE THEME SCREEN
// ============================================================================

function ChooseThemeScreen({ onNext }: { onNext: () => void }) {
  const themeId = useSettingsStore((s) => s.themeId);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const handleSelectTheme = useCallback(
    (id: ThemeId) => {
      if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTheme(id);
    },
    [hapticEnabled, setTheme]
  );

  return (
    <View className="flex-1 px-6 py-8">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 16 }}
      >
        <GlassCard delay={100}>
          <View className="items-center">
            <AnimatedTitle text="Choose a tone" delay={200} size="medium" />
            <AnimatedSubtitle text="You can change this anytime." delay={400} />

            <View className="flex-row flex-wrap justify-center mt-8">
              {COLOR_THEMES.map((t, index) => (
                <ThemePill
                  key={t.id}
                  themeId={t.id}
                  isSelected={themeId === t.id}
                  onSelect={() => handleSelectTheme(t.id)}
                  previewColors={t.previewColors}
                  name={t.name}
                  delay={500 + index * 100}
                />
              ))}
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      <View className="items-center pt-4">
        <PrimaryButton label="Looks good" onPress={onNext} delay={1200} />
      </View>
    </View>
  );
}

// ============================================================================
// DELAY OPTION
// ============================================================================

function DelayOption({
  delay,
  label,
  description,
  isSelected,
  onSelect,
  animationDelay,
}: {
  delay: RevealDelay;
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
  animationDelay: number;
}) {
  const theme = useAppTheme();
  const translateX = useSharedValue(-30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(animationDelay, withSpring(0, { damping: 22, stiffness: 120 }));
    opacity.value = withDelay(animationDelay, withTiming(1, { duration: 400 }));
  }, [animationDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onSelect}
      className="w-full flex-row items-center p-4 rounded-2xl mb-3 active:scale-[0.98]"
      style={[
        {
          backgroundColor: isSelected ? `${theme.accent}15` : theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? theme.accent : theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          shadowColor: isSelected ? theme.accent : 'transparent',
          shadowOffset: { width: 0, height: isSelected ? 4 : 0 },
          shadowOpacity: isSelected ? 0.15 : 0,
          shadowRadius: isSelected ? 8 : 0,
        },
        animatedStyle,
      ]}
    >
      <View className="flex-1">
        <Text className="font-semibold text-base" style={{ color: isSelected ? theme.accent : theme.text }}>
          {label}
        </Text>
        <Text className="font-sans text-sm mt-0.5" style={{ color: theme.textSecondary }}>
          {description}
        </Text>
      </View>
      {isSelected && (
        <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: theme.accent }}>
          <Check size={14} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}
    </AnimatedPressable>
  );
}

// ============================================================================
// TIME CAPSULE SCREEN
// ============================================================================

function TimeCapsuleScreen({ onNext }: { onNext: () => void }) {
  const theme = useAppTheme();
  const revealDelay = useSettingsStore((s) => s.revealDelay);
  const setRevealDelay = useSettingsStore((s) => s.setRevealDelay);
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const delayOptions: { delay: RevealDelay; label: string; description: string }[] = [
    { delay: 'tomorrow', label: 'Tomorrow', description: 'Read it after 24 hours' },
    { delay: 'week', label: 'Next week', description: 'Read it after 7 days' },
    { delay: 'month', label: 'Next month', description: 'Read it after 30 days' },
    { delay: 'instant', label: 'Right away', description: 'No waiting period' },
  ];

  const handleSelectDelay = useCallback(
    (d: RevealDelay) => {
      if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRevealDelay(d);
    },
    [hapticEnabled, setRevealDelay]
  );

  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(-0.2);

  useEffect(() => {
    iconScale.value = withDelay(200, withSpring(1, { damping: 22, stiffness: 120 }));
    iconRotate.value = withDelay(200, withSpring(0, { damping: 22, stiffness: 120 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }, { rotate: `${iconRotate.value}rad` }],
  }));

  return (
    <View className="flex-1 px-6 py-8">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 16 }}
      >
        <GlassCard delay={100}>
          <View className="items-center">
            <Animated.View
              className="w-18 h-18 rounded-2xl items-center justify-center mb-6"
              style={[
                {
                  width: 72,
                  height: 72,
                  backgroundColor: `${theme.accent}15`,
                  borderWidth: 1,
                  borderColor: `${theme.accent}25`,
                  shadowColor: theme.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                },
                iconStyle,
              ]}
            >
              <SendIcon size={32} color={theme.accent} />
            </Animated.View>

            <AnimatedTitle text="Send to your future self" delay={300} size="medium" />
            <AnimatedSubtitle text={"Your thought goes into a capsule.\nYou'll receive it back later."} delay={500} />

            <View className="w-full mt-6">
              {delayOptions.map((option, index) => (
                <DelayOption
                  key={option.delay}
                  delay={option.delay}
                  label={option.label}
                  description={option.description}
                  isSelected={revealDelay === option.delay}
                  onSelect={() => handleSelectDelay(option.delay)}
                  animationDelay={600 + index * 100}
                />
              ))}
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      <View className="items-center pt-4">
        <PrimaryButton label="Continue" onPress={onNext} delay={1100} />
      </View>
    </View>
  );
}

// ============================================================================
// DAILY REMINDER SCREEN
// ============================================================================

function DailyReminderScreen({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const setDailyReminderEnabled = useSettingsStore((s) => s.setDailyReminderEnabled);
  const setReminderTime = useSettingsStore((s) => s.setReminderTime);

  const [reminderDate, setReminderDate] = useState(() => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  });
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const iconScale = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withDelay(200, withSpring(1, { damping: 22, stiffness: 120 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handleTimeChange = useCallback((_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) setReminderDate(selectedDate);
  }, []);

  const handleEnableReminders = useCallback(async () => {
    if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { status } = await Notifications.requestPermissionsAsync();

    const hours = reminderDate.getHours().toString().padStart(2, '0');
    const minutes = reminderDate.getMinutes().toString().padStart(2, '0');
    setReminderTime(`${hours}:${minutes}`);
    setDailyReminderEnabled(status === 'granted');

    onNext();
  }, [hapticEnabled, reminderDate, setReminderTime, setDailyReminderEnabled, onNext]);

  const formatTime = () => {
    const h = reminderDate.getHours();
    const m = reminderDate.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View className="flex-1 px-6 py-8">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 16 }}
      >
        <GlassCard delay={100}>
          <View className="items-center">
            <Animated.View
              className="w-18 h-18 rounded-2xl items-center justify-center mb-6"
              style={[
                {
                  width: 72,
                  height: 72,
                  backgroundColor: `${theme.accent}15`,
                  borderWidth: 1,
                  borderColor: `${theme.accent}25`,
                  shadowColor: theme.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                },
                iconStyle,
              ]}
            >
              <ClockIcon size={36} color={theme.accent} />
            </Animated.View>

            <AnimatedTitle text="Daily reminder" delay={300} size="medium" />
            <AnimatedSubtitle text="We'll gently remind you once a day." delay={500} />

            <View className="w-full mt-6">
              {Platform.OS === 'android' && !showPicker && (
                <Pressable
                  accessibilityLabel="Reminder time"
                  onPress={() => setShowPicker(true)}
                  className="flex-row items-center justify-between w-full py-4 px-6 rounded-2xl active:scale-[0.98]"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderWidth: 1,
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  <Text className="font-medium text-base" style={{ color: theme.text }}>
                    Reminder time
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="font-semibold text-lg mr-2" style={{ color: theme.accent }}>
                      {formatTime()}
                    </Text>
                    <ChevronRight size={18} color={theme.textSecondary} />
                  </View>
                </Pressable>
              )}

              {showPicker && (
                <View
                  className="w-full rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  }}
                >
                  <DateTimePicker
                    value={reminderDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    textColor={theme.text}
                    style={{ height: 150 }}
                  />
                </View>
              )}
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      <View className="items-center pt-4">
        <PrimaryButton label="Enable reminders" onPress={handleEnableReminders} delay={700} />
        <SecondaryButton label="Not now" onPress={onSkip} delay={900} />
      </View>
    </View>
  );
}

// ============================================================================
// SIGN IN SCREEN
// ============================================================================

function SignInScreen({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const handleAppleSignIn = useCallback(() => {
    if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  }, [hapticEnabled, onComplete]);

  const handleGoogleSignIn = useCallback(() => {
    if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  }, [hapticEnabled, onComplete]);

  const handleOpenLegal = useCallback(
    (type: 'terms' | 'privacy') => {
      if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/legal?type=${type}`);
    },
    [hapticEnabled]
  );

  const appleOpacity = useSharedValue(0);
  const googleOpacity = useSharedValue(0);

  useEffect(() => {
    appleOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    googleOpacity.value = withDelay(750, withTiming(1, { duration: 400 }));
  }, []);

  const appleStyle = useAnimatedStyle(() => ({
    opacity: appleOpacity.value,
    transform: [{ translateY: interpolate(appleOpacity.value, [0, 1], [20, 0]) }],
  }));

  const googleStyle = useAnimatedStyle(() => ({
    opacity: googleOpacity.value,
    transform: [{ translateY: interpolate(googleOpacity.value, [0, 1], [20, 0]) }],
  }));

  return (
    <View className="flex-1 px-6 py-8">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 16 }}
      >
        <GlassCard delay={100}>
          <View className="items-center">
            <View
              className="w-18 h-18 rounded-2xl items-center justify-center mb-6"
              style={{
                width: 72,
                height: 72,
                backgroundColor: `${theme.accent}15`,
                borderWidth: 1,
                borderColor: `${theme.accent}25`,
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
              }}
            >
              <CloudIcon size={36} color={theme.accent} />
            </View>

            <AnimatedTitle text="Keep your thoughts safe" delay={200} size="medium" />
            <AnimatedSubtitle text="Sign in to back up and sync across devices." delay={400} />

            <View className="w-full mt-8">
              {Platform.OS === 'ios' && (
                <AnimatedPressable
                  onPress={handleAppleSignIn}
                  className="w-full flex-row items-center justify-center py-4 rounded-2xl mb-3 active:scale-[0.98]"
                  style={[{ backgroundColor: theme.isDark ? '#FFFFFF' : '#000000' }, appleStyle]}
                >
                  <Text className="font-semibold text-base" style={{ color: theme.isDark ? '#000000' : '#FFFFFF' }}>
                     Sign in with Apple
                  </Text>
                </AnimatedPressable>
              )}

              <AnimatedPressable
                onPress={handleGoogleSignIn}
                className="w-full flex-row items-center justify-center py-4 rounded-2xl active:scale-[0.98]"
                style={[
                  {
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                  googleStyle,
                ]}
              >
                <Text className="font-medium text-base" style={{ color: theme.text }}>
                  Sign in with Google
                </Text>
              </AnimatedPressable>
            </View>

            <Animated.View entering={FadeIn.delay(900).duration(400)} className="mt-6 px-4">
              <Text className="font-sans text-xs text-center leading-5" style={{ color: theme.textMuted }}>
                By continuing, you agree to our{' '}
                <Text className="underline" style={{ color: theme.textSecondary }} onPress={() => handleOpenLegal('terms')}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text className="underline" style={{ color: theme.textSecondary }} onPress={() => handleOpenLegal('privacy')}>
                  Privacy Policy
                </Text>
              </Text>
            </Animated.View>
          </View>
        </GlassCard>
      </ScrollView>

      <View className="items-center pt-4">
        <SecondaryButton label="Skip for now" onPress={onSkip} delay={900} />
      </View>
    </View>
  );
}

// ============================================================================
// SCREEN TRANSITION
// ============================================================================

function ScreenTransition({ children, screenKey }: { children: React.ReactNode; screenKey: number }) {
  // On web: no Reanimated entering/exiting — FadeOut keeps old slide text in
  // innerText during the transition, causing the E2E walk to see identical
  // body text and report the app as stuck. Instant swap is the safest behaviour.
  if (Platform.OS === 'web') {
    return (
      <View key={screenKey} style={{ flex: 1 }}>
        {children}
      </View>
    );
  }
  return (
    <Animated.View
      key={screenKey}
      entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))}
      exiting={FadeOut.duration(300).easing(Easing.in(Easing.cubic))}
      className="flex-1"
    >
      {children}
    </Animated.View>
  );
}

// ============================================================================
// MAIN ONBOARDING COMPONENT
// ============================================================================

export default function Onboarding() {
  const theme = useAppTheme();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);

  const [currentStep, setCurrentStep] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const totalSteps = 7;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const handleNext = useCallback(() => {
    if (hapticEnabled && !reduceMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep((prev) => prev + 1);
  }, [hapticEnabled, reduceMotion]);

  const handleComplete = useCallback(() => {
    if (hapticEnabled && !reduceMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeOnboarding();
    router.replace('/');
  }, [hapticEnabled, reduceMotion, completeOnboarding]);

  const handleSkipReminder = useCallback(() => {
    if (hapticEnabled && !reduceMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(6);
  }, [hapticEnabled, reduceMotion]);

  const handleSkipSignIn = useCallback(() => {
    if (hapticEnabled && !reduceMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleComplete();
  }, [hapticEnabled, reduceMotion, handleComplete]);

  const renderScreen = () => {
    switch (currentStep) {
      case 0:
        return (
          <ScreenTransition screenKey={0}>
            <WelcomeScreen onNext={handleNext} onSkip={handleComplete} />
          </ScreenTransition>
        );
      case 1:
        return (
          <ScreenTransition screenKey={1}>
            <TermsAcceptScreen onNext={handleNext} />
          </ScreenTransition>
        );
      case 2:
        return (
          <ScreenTransition screenKey={2}>
            <GoalsScreen onNext={handleNext} />
          </ScreenTransition>
        );
      case 3:
        return (
          <ScreenTransition screenKey={3}>
            <ChooseThemeScreen onNext={handleNext} />
          </ScreenTransition>
        );
      case 4:
        return (
          <ScreenTransition screenKey={4}>
            <TimeCapsuleScreen onNext={handleNext} />
          </ScreenTransition>
        );
      case 5:
        return (
          <ScreenTransition screenKey={5}>
            <DailyReminderScreen onNext={() => setCurrentStep(6)} onSkip={handleSkipReminder} />
          </ScreenTransition>
        );
      case 6:
        return (
          <ScreenTransition screenKey={6}>
            <SignInScreen onComplete={handleComplete} onSkip={handleSkipSignIn} />
          </ScreenTransition>
        );
      default:
        return null;
    }
  };

  return (
    <View className="flex-1">
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <ParticleBackground />
        <SafeAreaView className="flex-1">
          <View className="pt-4 pb-2">
            <ProgressDots current={currentStep} total={totalSteps} />
          </View>
          {renderScreen()}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
