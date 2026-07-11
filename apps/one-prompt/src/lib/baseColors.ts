/**
 * Base color palette for the Classic Blue theme (default).
 * These are the foundational neutral colors shared across all themes.
 * The multi-theme system (useAppTheme) uses these as its base values.
 */
export const BASE_COLORS = {
  light: {
    background: '#FAFAF8',
    card: '#F5F5F3',
    text: '#1A1A18',
    border: '#E8EBE4',
    primary: '#A3B899',
  },
  dark: {
    background: '#0F0F0E',
    card: '#1E1E1C',
    text: '#FAFAF8',
    border: '#2A2A28',
    primary: '#A3B899',
  },
} as const;
