import { useT } from '@zahln/mobile-core';
import { useSecureScreen } from '@zahln/secure-screen';
import { spokenMoney } from '@zahln/shared';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon, PressableScale, ReceiptEdge, Skeleton, Text } from '../ds';

/**
 * The ink card: balance as the hero, torn-receipt edge at the bottom (the brand motif),
 * discreet mode for crowded Mensa queues.
 */
export function BalanceCard({
  label,
  cents,
  footnote,
}: {
  label: string;
  cents: number | undefined;
  footnote?: string;
}) {
  const { t, money, locale } = useT();
  const [discreetChoice, setDiscreet] = useState(false);
  // Protected while visible; while the screen is recorded or mirrored (iOS), the balance hides itself.
  const { captured } = useSecureScreen();
  const discreet = discreetChoice || captured;
  const formatted = cents === undefined ? '' : money(cents);
  return (
    <View>
      <View className="gap-4 rounded-t-xl bg-ink px-5 pb-6 pt-5">
        <View className="flex-row items-center justify-between">
          <Text variant="callout" tone="on-ink-muted">
            {label}
          </Text>
          <PressableScale
            onPress={() => setDiscreet((d) => !d)}
            hapticOnPress
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={discreet ? t('home.showBalance') : t('home.hideBalance')}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Icon name={discreet ? 'eyeOff' : 'eye'} size={20} color="onInk" />
          </PressableScale>
        </View>
        {cents === undefined ? (
          <View className="gap-2">
            <Skeleton width={180} height={44} radius={10} />
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text
              variant="amountHero"
              tone="on-ink"
              accessibilityLabel={discreet ? t('a11y.amountHidden') : spokenMoney(cents, locale)}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {discreet ? formatted.replace(/\d/g, '•') : formatted}
            </Text>
          </Animated.View>
        )}
        <View className="flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center gap-1.5 rounded-full bg-brand px-3 py-1.5">
            <Icon name="instant" size={14} color="onBrand" weight="fill" />
            <Text variant="caption" tone="on-brand" style={{ fontFamily: 'Inter-Bold' }}>
              {t('home.feesChip')}
            </Text>
          </View>
          {footnote ? (
            <Text variant="caption" tone="on-ink-muted">
              {footnote}
            </Text>
          ) : null}
        </View>
      </View>
      <ReceiptEdge color="ink" tooth={12} depth={8} />
    </View>
  );
}
