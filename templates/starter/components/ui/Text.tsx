import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import type { TypeVariantName } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface TextProps extends RNTextProps {
  /** Typography variant from the theme type scale. Defaults to 'body'. */
  variant?: TypeVariantName;
  /** Semantic color token. Defaults to 'text'. */
  color?: 'text' | 'textMuted' | 'primary' | 'accent' | 'danger' | 'onPrimary';
  /** Center-align shorthand. */
  center?: boolean;
}

export function Text({
  variant = 'body',
  color = 'text',
  center = false,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const type = theme.typeScale[variant];

  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: type.fontFamily,
          fontSize: type.fontSize,
          lineHeight: type.lineHeight,
          fontWeight: type.fontWeight,
          letterSpacing: type.letterSpacing,
          color: theme.colors[color],
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    />
  );
}
