import { useColorScheme as useSystemColorScheme } from '@/lib/useColorScheme';
import {
  useSettingsStore,
  getThemeById,
} from '@/lib/state/settings-store';
import { useMemo } from 'react';
import { BASE_COLORS } from '@/lib/baseColors';

export interface ThemeColors {
  gradient: [string, string, string];
  accent: string;
  accentLight: string;
  // Base colors
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  isDark: boolean;
}

export function useAppTheme(): ThemeColors {
  const systemColorScheme = useSystemColorScheme();
  const themeId = useSettingsStore((s) => s.themeId);
  const appearanceMode = useSettingsStore((s) => s.appearanceMode);

  const isDark = useMemo(() => {
    if (appearanceMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return appearanceMode === 'dark';
  }, [appearanceMode, systemColorScheme]);

  const theme = useMemo(() => {
    const colorTheme = getThemeById(themeId);
    const colors = isDark ? colorTheme.dark : colorTheme.light;

    return {
      gradient: colors.gradient,
      accent: colors.accent,
      accentLight: colors.accentLight,
      background: isDark ? BASE_COLORS.dark.background : BASE_COLORS.light.background,
      card: isDark ? 'rgba(30,30,28,0.7)' : 'rgba(255,255,255,0.7)',
      cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      text: isDark ? BASE_COLORS.dark.text : BASE_COLORS.light.text,
      textSecondary: isDark ? '#A0A09C' : '#8B8B87',
      textMuted: isDark ? '#666664' : '#AAAA9F',
      isDark,
    };
  }, [themeId, isDark]);

  return theme;
}

export function useIsDark(): boolean {
  const systemColorScheme = useSystemColorScheme();
  const appearanceMode = useSettingsStore((s) => s.appearanceMode);

  return useMemo(() => {
    if (appearanceMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return appearanceMode === 'dark';
  }, [appearanceMode, systemColorScheme]);
}
