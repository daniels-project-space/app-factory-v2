import { useColorScheme } from 'react-native';

import { palettes, radius, spacing, typeScale, fonts, type Theme } from '@/constants/theme';
import { useSettings } from '@/store/settings';

/**
 * Returns the active theme tokens.
 *
 * Resolution order: manual override from the settings store
 * ('light' | 'dark') beats the system color scheme; 'system' follows
 * `useColorScheme()`.
 */
export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const override = useSettings((s) => s.themeOverride);

  const scheme: 'light' | 'dark' =
    override === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : override;

  return {
    scheme,
    isDark: scheme === 'dark',
    colors: palettes[scheme],
    spacing,
    radius,
    typeScale,
    fonts,
  };
}
