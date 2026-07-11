import { View, Text, Pressable, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/lib/state/settings-store';
import Svg, { Defs, RadialGradient, Stop, Circle, Path, Rect } from 'react-native-svg';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// PREMIUM GLASS CARD - Enhanced with inner glow and depth
// ============================================================================

interface PremiumCardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'inset';
  glowColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  borderRadius?: number;
  style?: ViewStyle;
  onPress?: () => void;
  entering?: typeof FadeIn;
}

export function PremiumCard({
  children,
  variant = 'default',
  glowColor,
  padding = 'md',
  borderRadius = 24,
  style,
  onPress,
  entering,
}: PremiumCardProps) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const scale = useSharedValue(1);

  const actualGlowColor = glowColor ?? theme.accent;

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 22, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 22, stiffness: 400 });
    }
  };

  const handlePress = () => {
    if (onPress) {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const paddingMap = {
    none: 0,
    sm: 12,
    md: 20,
    lg: 28,
  };

  const cardContent = (
    <View style={{ flex: 1 }}>
      {/* Inner highlight - top edge glow */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 16,
          right: 16,
          height: 1,
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
          borderRadius: 1,
        }}
      />

      {/* Ambient glow for elevated variant */}
      {variant === 'elevated' && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            borderRadius: borderRadius + 2,
            backgroundColor: actualGlowColor,
            opacity: 0.08,
          }}
        />
      )}

      <View style={{ padding: paddingMap[padding] }}>{children}</View>
    </View>
  );

  const CardWrapper = onPress ? AnimatedPressable : Animated.View;

  return (
    <CardWrapper
      onPress={onPress ? handlePress : undefined}
      onPressIn={onPress ? handlePressIn : undefined}
      onPressOut={onPress ? handlePressOut : undefined}
      entering={entering}
      style={[animatedStyle, style]}
    >
      {/* Outer shadow layer for depth */}
      <View
        style={{
          borderRadius,
          shadowColor: theme.isDark ? '#000' : actualGlowColor,
          shadowOffset: { width: 0, height: variant === 'elevated' ? 12 : 6 },
          shadowOpacity: variant === 'elevated' ? 0.25 : 0.1,
          shadowRadius: variant === 'elevated' ? 20 : 12,
          elevation: variant === 'elevated' ? 12 : 6,
        }}
      >
        <BlurView
          intensity={theme.isDark ? 25 : 50}
          tint={theme.isDark ? 'dark' : 'light'}
          style={{
            borderRadius,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.5)',
          }}
        >
          <View
            style={{
              backgroundColor: variant === 'inset'
                ? theme.isDark
                  ? 'rgba(10,10,12,0.7)'
                  : 'rgba(240,242,238,0.8)'
                : theme.isDark
                  ? 'rgba(15,15,18,0.65)'
                  : 'rgba(255,255,255,0.75)',
            }}
          >
            {cardContent}
          </View>
        </BlurView>
      </View>
    </CardWrapper>
  );
}

// ============================================================================
// STAT TILE - Refined stats display with icon and glow
// ============================================================================

interface StatTileProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  accentColor?: string;
  variant?: 'default' | 'highlight';
  entering?: ReturnType<typeof FadeInDown.delay> | typeof FadeInDown;
}

export function StatTile({
  icon,
  value,
  label,
  accentColor,
  variant = 'default',
  entering,
}: StatTileProps) {
  const theme = useAppTheme();
  const color = accentColor ?? theme.accent;

  return (
    <Animated.View entering={entering} style={{ flex: 1 }}>
      <PremiumCard variant={variant === 'highlight' ? 'elevated' : 'default'} glowColor={color}>
        <View className="items-center">
          {/* Icon container with subtle inner shadow */}
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center mb-3"
            style={{
              backgroundColor: `${color}18`,
              shadowColor: color,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
          >
            {/* Inner glow ring */}
            <View
              style={{
                position: 'absolute',
                width: 44,
                height: 44,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: `${color}30`,
              }}
            />
            {icon}
          </View>

          <Text
            className="font-bold text-3xl tracking-tight"
            style={{ color: theme.text }}
          >
            {value}
          </Text>
          <Text
            className="font-medium text-xs mt-1 tracking-wide uppercase"
            style={{ color: theme.textSecondary }}
          >
            {label}
          </Text>
        </View>
      </PremiumCard>
    </Animated.View>
  );
}

// ============================================================================
// PREMIUM BUTTON - Enhanced with depth, glow, and micro-interactions
// ============================================================================

interface PremiumButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  fullWidth?: boolean;
  glowIntensity?: number;
}

export function PremiumButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  fullWidth = false,
  glowIntensity = 0.3,
}: PremiumButtonProps) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 13, iconSize: 16 },
    md: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 15, iconSize: 18 },
    lg: { paddingVertical: 20, paddingHorizontal: 32, fontSize: 17, iconSize: 20 },
  };

  const currentSize = sizeStyles[size];

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.96, { damping: 22, stiffness: 500 });
      glowOpacity.value = withTiming(1, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 22, stiffness: 400 });
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  };

  const handlePress = () => {
    if (!disabled) {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * glowIntensity,
  }));

  if (variant === 'ghost') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[animatedStyle, fullWidth && { width: '100%' }]}
        className="active:opacity-70"
      >
        <View
          className="flex-row items-center justify-center"
          style={{ padding: currentSize.paddingVertical }}
        >
          {icon && iconPosition === 'left' && <View className="mr-2">{icon}</View>}
          <Text
            style={{
              fontSize: currentSize.fontSize,
              fontWeight: '600',
              color: disabled ? theme.textMuted : theme.textSecondary,
            }}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && <View className="ml-2">{icon}</View>}
        </View>
      </AnimatedPressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[animatedStyle, fullWidth && { width: '100%' }]}
      >
        <BlurView
          intensity={theme.isDark ? 40 : 60}
          tint={theme.isDark ? 'dark' : 'light'}
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
          }}
        >
          <View
            className="flex-row items-center justify-center"
            style={{
              paddingVertical: currentSize.paddingVertical,
              paddingHorizontal: currentSize.paddingHorizontal,
              backgroundColor: theme.isDark ? 'rgba(30,30,28,0.8)' : 'rgba(255,255,255,0.8)',
            }}
          >
            {icon && iconPosition === 'left' && <View className="mr-2">{icon}</View>}
            <Text
              style={{
                fontSize: currentSize.fontSize,
                fontWeight: '600',
                color: disabled ? theme.textMuted : theme.text,
              }}
            >
              {label}
            </Text>
            {icon && iconPosition === 'right' && <View className="ml-2">{icon}</View>}
          </View>
        </BlurView>
      </AnimatedPressable>
    );
  }

  // Primary button with gradient and glow
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        animatedStyle,
        fullWidth && { width: '100%' },
        {
          shadowColor: theme.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: disabled ? 0 : 0.35,
          shadowRadius: 16,
          elevation: disabled ? 0 : 8,
        },
      ]}
    >
      {/* Glow layer */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: 20,
            backgroundColor: theme.accent,
          },
        ]}
      />

      <LinearGradient
        colors={
          disabled
            ? [theme.textMuted, theme.textMuted]
            : [theme.accent, theme.accent]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Inner highlight */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 20,
            right: 20,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.4)',
          }}
        />

        <View
          className="flex-row items-center justify-center"
          style={{
            paddingVertical: currentSize.paddingVertical,
            paddingHorizontal: currentSize.paddingHorizontal,
          }}
        >
          {icon && iconPosition === 'left' && <View className="mr-2">{icon}</View>}
          <Text
            style={{
              fontSize: currentSize.fontSize,
              fontWeight: '600',
              color: '#FFFFFF',
              letterSpacing: 0.3,
            }}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && <View className="ml-2">{icon}</View>}
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

// ============================================================================
// ACTION TILE - Settings-style tile with icon and chevron
// ============================================================================

interface ActionTileProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: ReactNode;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
}

export function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  badge,
  badgeColor,
  disabled = false,
}: ActionTileProps) {
  const theme = useAppTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedbackEnabled);
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, { damping: 22, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 22, stiffness: 400 });
    }
  };

  const handlePress = () => {
    if (!disabled) {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const actualBadgeColor = badgeColor ?? theme.accent;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={animatedStyle}
    >
      <BlurView
        intensity={theme.isDark ? 35 : 55}
        tint={theme.isDark ? 'dark' : 'light'}
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        }}
      >
        <View
          className="flex-row items-center p-4"
          style={{
            backgroundColor: theme.card,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {/* Icon container */}
          <View
            className="w-11 h-11 rounded-xl items-center justify-center mr-4"
            style={{
              backgroundColor: `${theme.accent}15`,
              shadowColor: theme.accent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
            }}
          >
            {icon}
          </View>

          {/* Text content */}
          <View className="flex-1">
            <Text
              className="font-semibold text-base"
              style={{ color: theme.text }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                className="font-sans text-sm mt-0.5"
                style={{ color: theme.textSecondary }}
              >
                {subtitle}
              </Text>
            )}
          </View>

          {/* Badge */}
          {badge && (
            <View
              className="px-2.5 py-1 rounded-full mr-2"
              style={{ backgroundColor: actualBadgeColor }}
            >
              <Text className="font-semibold text-xs text-white">{badge}</Text>
            </View>
          )}

          {/* Right element or chevron */}
          {rightElement ?? (
            <ChevronIcon color={theme.textMuted} size={20} />
          )}
        </View>
      </BlurView>
    </AnimatedPressable>
  );
}

// ============================================================================
// CUSTOM SVG ICONS - High quality, theme-aware icons
// ============================================================================

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function FlameIcon({ size = 24, color }: IconProps) {
  const theme = useAppTheme();
  const actualColor = color ?? theme.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="flameGlow" cx="50%" cy="70%" r="60%">
          <Stop offset="0%" stopColor={actualColor} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={actualColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Glow effect */}
      <Circle cx="12" cy="14" r="10" fill="url(#flameGlow)" />
      {/* Flame path */}
      <Path
        d="M12 2C8.5 6 5 9.5 5 14C5 17.87 8.13 21 12 21C15.87 21 19 17.87 19 14C19 9.5 15.5 6 12 2Z"
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M12 21C10.34 21 9 19.66 9 18C9 16.34 10.34 15 12 15C13.66 15 15 16.34 15 18C15 19.66 13.66 21 12 21Z"
        fill={actualColor}
        opacity={0.3}
      />
    </Svg>
  );
}

export function SparklesIcon({ size = 24, color }: IconProps) {
  const theme = useAppTheme();
  const actualColor = color ?? theme.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="sparkleGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={actualColor} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={actualColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Main star */}
      <Path
        d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${actualColor}20`}
      />
      {/* Small stars */}
      <Circle cx="19" cy="5" r="1.5" fill={actualColor} opacity={0.6} />
      <Circle cx="5" cy="19" r="1" fill={actualColor} opacity={0.4} />
      <Circle cx="20" cy="18" r="1.2" fill={actualColor} opacity={0.5} />
    </Svg>
  );
}

export function BookOpenIcon({ size = 24, color }: IconProps) {
  const theme = useAppTheme();
  const actualColor = color ?? theme.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 3H8C9.06 3 10.08 3.42 10.83 4.17C11.58 4.92 12 5.94 12 7V21C12 20.2 11.68 19.44 11.12 18.88C10.56 18.32 9.8 18 9 18H2V3Z"
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${actualColor}10`}
      />
      <Path
        d="M22 3H16C14.94 3 13.92 3.42 13.17 4.17C12.42 4.92 12 5.94 12 7V21C12 20.2 12.32 19.44 12.88 18.88C13.44 18.32 14.2 18 15 18H22V3Z"
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${actualColor}10`}
      />
      {/* Page lines */}
      <Path d="M5 8H9" stroke={actualColor} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      <Path d="M5 12H9" stroke={actualColor} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      <Path d="M15 8H19" stroke={actualColor} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      <Path d="M15 12H19" stroke={actualColor} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
    </Svg>
  );
}

export function ChevronIcon({ size = 24, color, direction = 'right' }: IconProps & { direction?: 'left' | 'right' | 'up' | 'down' }) {
  const theme = useAppTheme();
  const actualColor = color ?? theme.textSecondary;

  const rotations = {
    right: 0,
    down: 90,
    left: 180,
    up: 270,
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: [{ rotate: `${rotations[direction]}deg` }] }}
    >
      <Path
        d="M9 18L15 12L9 6"
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LockIcon({ size = 24, color, locked = true }: IconProps & { locked?: boolean }) {
  const theme = useAppTheme();
  const actualColor = color ?? theme.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="lockGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={actualColor} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={actualColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="12" cy="14" r="8" fill="url(#lockGlow)" />
      <Rect
        x="5"
        y="11"
        width="14"
        height="11"
        rx="2"
        stroke={actualColor}
        strokeWidth={2}
        fill={`${actualColor}15`}
      />
      <Path
        d={locked ? "M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" : "M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7"}
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx="12" cy="16" r="1.5" fill={actualColor} />
    </Svg>
  );
}

export function CameraIcon({ size = 24, color }: IconProps) {
  const theme = useAppTheme();
  const actualColor = color ?? theme.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19C23 19.53 22.79 20.04 22.41 20.41C22.04 20.79 21.53 21 21 21H3C2.47 21 1.96 20.79 1.59 20.41C1.21 20.04 1 19.53 1 19V8C1 7.47 1.21 6.96 1.59 6.59C1.96 6.21 2.47 6 3 6H7L9 3H15L17 6H21C21.53 6 22.04 6.21 22.41 6.59C22.79 6.96 23 7.47 23 8V19Z"
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${actualColor}10`}
      />
      <Circle
        cx="12"
        cy="13"
        r="4"
        stroke={actualColor}
        strokeWidth={2}
        fill={`${actualColor}20`}
      />
      {/* Lens highlight */}
      <Circle cx="10.5" cy="11.5" r="1" fill={actualColor} opacity={0.4} />
    </Svg>
  );
}

export function HeartIcon({ size = 24, color, filled = false }: IconProps & { filled?: boolean }) {
  const theme = useAppTheme();
  const actualColor = color ?? theme.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="heartGlow" cx="50%" cy="40%" r="60%">
          <Stop offset="0%" stopColor={actualColor} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={actualColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {filled && <Circle cx="12" cy="12" r="10" fill="url(#heartGlow)" />}
      <Path
        d="M20.84 4.61C20.33 4.1 19.72 3.7 19.05 3.43C18.38 3.17 17.67 3.03 16.95 3.03C16.23 3.03 15.52 3.17 14.85 3.43C14.18 3.7 13.57 4.1 13.06 4.61L12 5.67L10.94 4.61C9.9 3.57 8.5 2.99 7.05 2.99C5.6 2.99 4.2 3.57 3.16 4.61C2.12 5.65 1.54 7.05 1.54 8.5C1.54 9.95 2.12 11.35 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.35 11.88 21.75 11.27 22.02 10.6C22.28 9.93 22.42 9.22 22.42 8.5C22.42 7.78 22.28 7.07 22.02 6.4C21.75 5.73 21.35 5.12 20.84 4.61Z"
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? actualColor : `${actualColor}10`}
      />
    </Svg>
  );
}

export function SendIcon({ size = 24, color }: IconProps) {
  const theme = useAppTheme();
  const actualColor = color ?? theme.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="sendGlow" cx="70%" cy="30%" r="50%">
          <Stop offset="0%" stopColor={actualColor} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={actualColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="14" cy="10" r="8" fill="url(#sendGlow)" />
      <Path
        d="M22 2L11 13"
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={actualColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${actualColor}15`}
      />
    </Svg>
  );
}

// ============================================================================
// SECTION HEADER - For grouping content
// ============================================================================

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const theme = useAppTheme();

  return (
    <View className="flex-row items-center justify-between mb-4">
      <Text
        className="font-semibold text-lg tracking-tight"
        style={{ color: theme.text }}
      >
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} className="active:opacity-70" accessibilityLabel="Pressable button">
          <Text
            className="font-medium text-sm"
            style={{ color: theme.accent }}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ============================================================================
// BADGE - Small info badge
// ============================================================================

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'accent';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const theme = useAppTheme();

  const colors = {
    default: { bg: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', text: theme.textSecondary },
    success: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
    accent: { bg: `${theme.accent}20`, text: theme.accent },
  };

  const { bg, text } = colors[variant];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <View className={`${sizeClass} rounded-full`} style={{ backgroundColor: bg }}>
      <Text className={`font-semibold ${textSize}`} style={{ color: text }}>
        {label}
      </Text>
    </View>
  );
}
