// ReviewPulse Animation System
// Philosophy: purposeful motion that makes the app feel alive, not distracting

// Animation constants — no external dependencies needed

// Duration tokens (ms)
export const Duration = {
  instant:  100,   // Visual feedback only (button press color)
  fast:     150,   // Haptic accompaniment, icon switches
  normal:   250,   // Most UI transitions (modal open, tab switch)
  slow:     350,   // Screen entrance, bottom sheet rise
  crawl:    500,   // Skeleton shimmer cycle, progress fills
  pulse:   1500,   // Idle pulse animation (live indicator dot)
} as const;

// Spring configs for react-native-reanimated withSpring
export const SpringConfigs = {
  // Standard button feedback
  button: {
    damping: 30,
    stiffness: 300,
    mass: 0.8,
  },
  // Success bounce (checkmarks, confirmations)
  bouncy: {
    damping: 18,
    stiffness: 200,
    mass: 0.7,
  },
  // Bottom sheet rise
  sheet: {
    damping: 30,
    stiffness: 300,
    mass: 0.8,
  },
  // Tab bar active indicator
  tab: {
    damping: 25,
    stiffness: 250,
    mass: 0.6,
  },
} as const;

// Stagger delays for list animations (ms between each item)
export const StaggerDelay = 50;

// List item animation — fade + slide up on entrance
export const ListItemEntrance = {
  from: { opacity: 0, translateY: 12 },
  to:   { opacity: 1, translateY: 0 },
  duration: Duration.slow,
};

// Skeleton shimmer config
export const SkeletonConfig = {
  duration: 1500,  // Full shimmer cycle
  colors: {
    light: {
      base:    '#E5E7EB',
      shimmer: 'rgba(255,255,255,0.6)',
    },
    dark: {
      base:    '#243446',
      shimmer: 'rgba(255,255,255,0.08)',
    },
  },
} as const;

// New review pulse animation (lime dot)
export const PulseConfig = {
  minScale: 1.0,
  maxScale: 1.3,
  duration: Duration.pulse,
} as const;

// Rules:
// WHAT ANIMATES: screen transitions, button presses, list item entry,
//   modal open/close, tab switches, skeleton loading, new review badge
// WHAT DOES NOT ANIMATE: text content changes, color theme switches,
//   background color changes, layout shifts during scroll, keyboard appearance
