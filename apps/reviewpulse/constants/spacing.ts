// ReviewPulse Spacing System
// Base unit: 4px

export const Spacing = {
  px:    1,
  '0':   0,
  xs:    4,    // Inner padding on compact elements
  sm:    8,    // Gap between related items
  md:    16,   // Standard horizontal padding, card inner padding
  lg:    24,   // Section gaps, button padding vertical
  xl:    32,   // Screen padding top, card gaps
  '2xl': 48,   // Section separations, modal padding
  '3xl': 64,   // Hero areas
  '4xl': 96,   // Full-screen hero padding
} as const;

// Layout constants
export const Layout = {
  screenPaddingH: 20,          // Screen horizontal padding (not 16 — more breathing room)
  cardPadding: 16,             // Card inner padding all sides
  listItemHeight: 72,          // Min height for review items
  listItemHeightCompact: 60,   // Min height for customer items
  tabBarHeight: 80,            // Tab bar total height (includes safe area)
  headerHeight: 56,            // Navigation header height
  buttonHeight: 56,            // Primary/secondary button height
  buttonHeightSm: 44,          // Small button height (also min touch target)
  inputHeight: 52,             // Text input height
  searchInputHeight: 48,       // Search input height
  fabSize: 56,                 // Floating action button diameter
  avatarLg: 56,                // Large avatar
  avatarMd: 40,                // Medium avatar
  avatarSm: 32,                // Small avatar
  ratingBadgeSize: 42,         // Rating circle badge on list items
  statCardHeight: 100,         // Stat card height
  actionCardHeight: 80,        // Action card height
} as const;

export const Radius = {
  none: 0,
  xs:   4,    // Inputs, small tags
  sm:   8,    // Inline badges, chips
  md:   12,   // Cards, buttons — the primary radius
  lg:   16,   // Bottom sheets, large cards
  xl:   20,   // Modal containers
  full: 9999, // Badges, avatars, pills
} as const;

export const Shadows = {
  none: {},

  sm: {
    shadowColor: '#1A2634',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  md: {
    shadowColor: '#1A2634',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 5,
  },

  lg: {
    // Teal shadow — brand-tinted depth
    shadowColor: '#0F7B7B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },

  // Bottom sheet handle shadow (upward)
  upward: {
    shadowColor: '#1A2634',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
} as const;

// Dark mode: replace shadows with border definition
// cards use: borderWidth: 1, borderColor: DarkTheme.borderDefault
