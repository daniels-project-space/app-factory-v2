// ReviewPulse Typography System
// Fonts: Barlow Condensed (headings) + Source Sans 3 (body)
// Vibe: work truck decals authority + clean field-readable text

import { TextStyle } from 'react-native';

// Font family constants — loaded via expo-font in _layout.tsx
export const FontFamily = {
  barlowCondensedExtraBold: 'Barlow-Condensed-ExtraBold',
  barlowCondensedBold:      'Barlow-Condensed-Bold',
  barlowCondensedSemiBold:  'Barlow-Condensed-SemiBold',
  sourceSansLight:          'Source-Sans-Light',
  sourceSansRegular:        'Source-Sans-Regular',
  sourceSansSemiBold:       'Source-Sans-SemiBold',
  sourceSansBold:           'Source-Sans-Bold',
} as const;

// Google Fonts download URLs (for reference, loaded via expo-font)
// Barlow Condensed: https://fonts.google.com/specimen/Barlow+Condensed
// Source Sans 3: https://fonts.google.com/specimen/Source+Sans+3

export const Typography: Record<string, TextStyle> = {
  // Hero numbers — rating scores, big stats
  display: {
    fontFamily: FontFamily.barlowCondensedExtraBold,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -0.5,
  },

  // Screen titles
  h1: {
    fontFamily: FontFamily.barlowCondensedBold,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.3,
  },

  // Section headers
  h2: {
    fontFamily: FontFamily.barlowCondensedBold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.2,
  },

  // Card titles, subsections
  h3: {
    fontFamily: FontFamily.barlowCondensedSemiBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0,
  },

  // List headers, form labels
  h4: {
    fontFamily: FontFamily.sourceSansSemiBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0,
  },

  // Review text, descriptions
  body: {
    fontFamily: FontFamily.sourceSansRegular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },

  // Secondary content
  bodySm: {
    fontFamily: FontFamily.sourceSansRegular,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0,
  },

  // Timestamps, metadata
  caption: {
    fontFamily: FontFamily.sourceSansRegular,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
  },

  // ALL CAPS badges, status tags, section labels
  label: {
    fontFamily: FontFamily.barlowCondensedSemiBold,
    fontSize: 13,
    lineHeight: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Dashboard stat numbers
  stat: {
    fontFamily: FontFamily.barlowCondensedExtraBold,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1,
  },

  // Button text
  button: {
    fontFamily: FontFamily.barlowCondensedBold,
    fontSize: 18,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Small button text
  buttonSm: {
    fontFamily: FontFamily.barlowCondensedSemiBold,
    fontSize: 15,
    lineHeight: 15,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
} as const;
