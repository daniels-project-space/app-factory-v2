// ReviewPulse Color System
// Aesthetic: "The Job Site Monitor" — deep teal authority + electric lime pulse signal

export const Colors = {
  // Primary — Deep Teal
  primary: {
    950: '#021F1F',
    900: '#0A3838',
    700: '#0D5C5C',
    500: '#0F7B7B', // Brand primary
    300: '#3AACAC',
    100: '#B3E5E5',
    50:  '#E6F7F7',
  },

  // Secondary — Warm Slate
  slate: {
    950: '#0D1820',
    900: '#1A2634',
    700: '#2D3E52',
    500: '#4A6070',
    300: '#8FA8B8',
    200: '#C5D5DE',
    100: '#E2ECF2',
    50:  '#F0F5F8',
  },

  // Accent — Electric Lime (Pulse Signal)
  accent: {
    700: '#5A7800',
    500: '#8FAF00',
    400: '#AACC00',
    300: '#CAFF47', // THE pulse color — live badges, success flashes
    100: '#EDFABB',
    50:  '#F7FDE8',
  },

  // Semantic
  success: {
    700: '#047857',
    500: '#059669',
    300: '#34D399',
    100: '#D1FAE5',
  },

  warning: {
    700: '#B45309',
    500: '#D97706',
    300: '#FCD34D',
    100: '#FEF3C7',
  },

  error: {
    700: '#B91C1C',
    500: '#DC2626',
    300: '#FCA5A5',
    100: '#FEE2E2',
  },

  // Neutrals
  neutral: {
    950: '#0C1117',
    900: '#111827',
    800: '#1F2937',
    700: '#374151',
    600: '#4B5563',
    500: '#6B7280',
    400: '#9CA3AF',
    300: '#D1D5DB',
    200: '#E5E7EB',
    100: '#F3F4F6',
    50:  '#F9FAFB',
  },
} as const;

// Light mode semantic tokens
export const LightTheme = {
  bgBase:     '#F4F7F8',  // Warm off-white — never pure white
  bgSurface:  '#FFFFFF',  // Cards, modals
  bgSurface2: '#F0F5F8',  // Secondary surfaces, bottom sheet bg
  bgSurface3: '#E2ECF2',  // Tertiary: input backgrounds

  textPrimary:   '#1A2634',
  textSecondary: '#4A6070',
  textTertiary:  '#8FA8B8',
  textInverse:   '#F0F6FF',

  borderDefault: '#D0DCE6',
  borderStrong:  '#8FA8B8',
  borderFocus:   '#0F7B7B',

  overlay: 'rgba(10, 30, 45, 0.6)',
} as const;

// Dark mode semantic tokens
export const DarkTheme = {
  bgBase:     '#0C1117',
  bgSurface:  '#131D2B',
  bgSurface2: '#1A2634',
  bgSurface3: '#243446',

  textPrimary:   '#EEF4FA',
  textSecondary: '#94AABB',
  textTertiary:  '#506070',
  textInverse:   '#1A2634',

  borderDefault: '#243446',
  borderStrong:  '#2D3E52',
  borderFocus:   '#3AACAC',

  overlay: 'rgba(6, 12, 20, 0.75)',
} as const;

// Rating color helper
export function getRatingColor(rating: number): string {
  if (rating >= 4) return Colors.success[500];
  if (rating >= 3) return Colors.warning[500];
  return Colors.error[500];
}

// Avatar background color (hashed from name)
export function getAvatarColor(name: string): string {
  const avatarColors = [
    Colors.primary[700],
    Colors.primary[500],
    Colors.slate[700],
    Colors.slate[500],
    '#6D5ACF', // Purple
    '#BE4B48', // Crimson
    '#3D7EAA', // Steel blue
    '#5C6BC0', // Indigo
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
