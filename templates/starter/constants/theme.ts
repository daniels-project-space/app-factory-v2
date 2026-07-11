/**
 * Design tokens — THE single source of truth for the app's look.
 *
 * The factory's designer agent rewrites this file per app (palette, type
 * scale, radii). Components must only ever consume these tokens via
 * `useTheme()` — never hardcode colors or sizes in screens/components.
 */

export interface ThemeColors {
  /** App background (behind everything). */
  bg: string;
  /** Elevated surfaces: cards, sheets, inputs. */
  surface: string;
  /** Primary foreground text. */
  text: string;
  /** Secondary / de-emphasized text. */
  textMuted: string;
  /** Brand color: primary buttons, active states, links. */
  primary: string;
  /** Text/icon color placed on top of `primary` fills. */
  onPrimary: string;
  /** Secondary brand highlight: badges, progress, small accents. */
  accent: string;
  /** Destructive actions and error states. */
  danger: string;
  /** Hairlines, dividers, input outlines. */
  border: string;
}

export const palettes: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    bg: '#F5F5F8',
    surface: '#FFFFFF',
    text: '#17181D',
    textMuted: '#6B7080',
    primary: '#5B54F0',
    onPrimary: '#FFFFFF',
    accent: '#0FA284',
    danger: '#DC4446',
    border: '#E4E5EB',
  },
  dark: {
    bg: '#0E0F14',
    surface: '#1A1C24',
    text: '#F1F2F7',
    textMuted: '#9AA0B0',
    primary: '#7B75F5',
    onPrimary: '#FFFFFF',
    accent: '#2BC79F',
    danger: '#F0555B',
    border: '#2A2D38',
  },
};

/** Spacing scale (px). Use these instead of magic numbers. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Corner radius scale (px). */
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

/**
 * Font families loaded in app/_layout.tsx via @expo-google-fonts.
 * Custom fonts on native select weight by family name, so each weight
 * is its own family string.
 */
export const fonts = {
  heading: 'SpaceGrotesk_700Bold',
  headingMedium: 'SpaceGrotesk_500Medium',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
} as const;

export interface TypeVariant {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
}

/** Type scale. `Text` component maps its `variant` prop onto these. */
export const typeScale: Record<'display' | 'title' | 'body' | 'caption', TypeVariant> = {
  display: {
    fontFamily: fonts.heading,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  caption: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
};

export type TypeVariantName = keyof typeof typeScale;

export interface Theme {
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typeScale: typeof typeScale;
  fonts: typeof fonts;
}
