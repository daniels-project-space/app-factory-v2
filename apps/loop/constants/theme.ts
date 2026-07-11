/**
 * Design tokens — THE single source of truth for Loop's look.
 *
 * Brand: warm ember, dark hearth, quiet resolve.
 * One typeface (Sora), one hero color (ember #E8552B), one glow (amber #F2B441).
 *
 * Components must only ever consume these tokens via `useTheme()` — never
 * hardcode colors or sizes in screens/components. The flame palette below is
 * derived from these tokens too (see `flame`), so light and dark stay in sync.
 */

export interface ThemeColors {
  /** App background — the hearth. Warm near-black (dark) / warm paper (light). */
  bg: string;
  /** Elevated surfaces: cards, sheets, inputs. Warmer than the bg, never gray. */
  surface: string;
  /** A second elevation step — sheets over cards, pressed rows, the anchor rail. */
  surfaceAlt: string;
  /** Primary foreground text. Warm ivory (dark) / warm espresso (light). */
  text: string;
  /** Secondary / de-emphasized text. Warm taupe, never a cold gray. */
  textMuted: string;
  /** Brand color: the ember. Primary buttons, active states, the live flame. */
  primary: string;
  /** Text/icon color placed on top of `primary` fills. */
  onPrimary: string;
  /** Secondary brand highlight — the amber glow: badges, progress, streak count. */
  accent: string;
  /** Positive confirmation — an anchor completed, a habit kept. Warm green-gold. */
  success: string;
  /** Destructive actions and error states. A cooler red, distinct from the ember. */
  danger: string;
  /** Hairlines, dividers, input outlines. A warm-tinted line, low contrast. */
  border: string;
}

/**
 * The two themes. Dark is the hero ("dark hearth") — the app is designed
 * dark-first and the ember reads brightest against it. Light is "hearth at
 * dawn": warm cream paper, never a clinical white.
 */
export const palettes: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    bg: '#FBF3E9',
    surface: '#FFFDF9',
    surfaceAlt: '#F5EADB',
    text: '#241A12',
    textMuted: '#7A6B5C',
    primary: '#E8552B',
    onPrimary: '#FFF4EC',
    // Amber is too light to read as text on cream, so light uses burnt honey.
    accent: '#B4700F',
    success: '#3E7A46',
    danger: '#CF4438',
    border: '#EADCC9',
  },
  dark: {
    bg: '#14100D',
    surface: '#201A15',
    surfaceAlt: '#2A2119',
    text: '#F6EEE4',
    textMuted: '#AB9B8B',
    // The ember runs a touch brighter on the dark hearth so it truly glows.
    primary: '#F0602F',
    onPrimary: '#FFF4EC',
    accent: '#F2B441',
    success: '#5BB06A',
    danger: '#FF6B5C',
    border: '#33291F',
  },
};

/**
 * Flame gradient stops per theme — the signature living ember reads these.
 * Ordered hot core → cool tongue tip. See DESIGN.md § Signature element.
 */
export const flame: Record<'light' | 'dark', { core: string; mid: string; tip: string; smoke: string }> = {
  light: { core: '#FFD36B', mid: '#F2842E', tip: '#E8552B', smoke: '#B4700F' },
  dark: { core: '#FFE08A', mid: '#F2B441', tip: '#F0602F', smoke: '#7A2E12' },
};

/**
 * Spacing scale (px) — an 8-point rhythm with a 4 half-step. Use these
 * instead of magic numbers. `xl` (24) is the default screen gutter.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Corner radius scale (px). Cozy and soft — cards are generous, chips are pills. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 22,
  full: 999,
} as const;

/**
 * Font families loaded in app/_layout.tsx via @expo-google-fonts/sora.
 * Loop is a single-typeface system: Sora carries everything, from the
 * display flame count to the caption eyebrows. Custom fonts on native select
 * weight by family name, so each weight is its own family string.
 */
export const fonts = {
  heading: 'Sora_700Bold',
  headingMedium: 'Sora_600SemiBold',
  body: 'Sora_400Regular',
  bodyMedium: 'Sora_500Medium',
  bodySemiBold: 'Sora_600SemiBold',
  bodyBold: 'Sora_700Bold',
} as const;

export interface TypeVariant {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
}

/**
 * Type scale. `Text` component maps its `variant` prop onto these.
 * Sora is a wide, geometric grotesque, so headings get negative tracking to
 * pull them tight; `caption` gets positive tracking because it's used for
 * uppercase eyebrows (ANCHORS, THIS WEEK).
 */
export const typeScale: Record<'display' | 'title' | 'body' | 'caption', TypeVariant> = {
  display: {
    fontFamily: fonts.heading,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  caption: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
};

export type TypeVariantName = keyof typeof typeScale;

export interface Theme {
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  flame: { core: string; mid: string; tip: string; smoke: string };
  spacing: typeof spacing;
  radius: typeof radius;
  typeScale: typeof typeScale;
  fonts: typeof fonts;
}
