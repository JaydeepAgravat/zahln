import { AMOUNT_MAX_FONT_SCALE, fontFamily, type TypeStyle, typeScale } from '@zahln/shared/tokens';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'on-brand'
  | 'on-flood';

const toneClass: Record<TextTone, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  brand: 'text-brand',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  'on-brand': 'text-on-brand',
  'on-flood': 'text-on-flood',
};

export type TextProps = RNTextProps & {
  variant?: TypeStyle;
  tone?: TextTone;
  className?: string;
};

/**
 * The only text component. Applies the type scale (size, line height, weight → font file,
 * tracking, tabular numerals) and caps Dynamic Type for amounts so they wrap instead of overflowing.
 */
export function Text({ variant = 'body', tone = 'primary', className, style, ...rest }: TextProps) {
  const spec = typeScale[variant];
  const isAmount = variant === 'amountHero' || variant === 'amountLg';
  return (
    <RNText
      className={`${toneClass[tone]} ${className ?? ''}`}
      maxFontSizeMultiplier={isAmount ? AMOUNT_MAX_FONT_SCALE : undefined}
      style={[
        {
          fontFamily: fontFamily[spec.weight],
          fontSize: spec.size,
          lineHeight: spec.lineHeight,
          letterSpacing: spec.tracking * spec.size,
          fontVariant: spec.tabular ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
      {...rest}
    />
  );
}
