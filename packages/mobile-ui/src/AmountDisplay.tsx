import { useT } from '@zahln/mobile-core';
import { spokenMoney } from '@zahln/shared';
import { Text, type TextTone } from './Text';

type Props = {
  cents: number;
  size?: 'hero' | 'lg' | 'inline';
  /** Hide the value (•••,•• €) for crowded places like a Mensa queue. */
  discreet?: boolean;
  tone?: TextTone;
  /** Prefix "+" for incoming money. */
  signed?: boolean;
};

const variant = { hero: 'amountHero', lg: 'amountLg', inline: 'body' } as const;

/** Locale-formatted, tabular, and read naturally by screen readers. The amount is the hero. */
export function AmountDisplay({
  cents,
  size = 'hero',
  discreet = false,
  tone = 'primary',
  signed = false,
}: Props) {
  const { money, locale, t } = useT();
  const formatted = money(cents);
  const text = discreet ? formatted.replace(/\d/g, '•') : `${signed && cents > 0 ? '+' : ''}${formatted}`;
  return (
    <Text
      variant={variant[size]}
      tone={tone}
      accessibilityLabel={discreet ? t('a11y.amountHidden') : spokenMoney(cents, locale)}
      numberOfLines={size === 'inline' ? 1 : 2}
      adjustsFontSizeToFit={size !== 'inline'}
    >
      {text}
    </Text>
  );
}
