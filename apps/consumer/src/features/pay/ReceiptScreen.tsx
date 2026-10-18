import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { payments, useT } from '@zahln/mobile-core';
import { AmountDisplay, Icon, PressableScale, ReceiptEdge, SafeArea, Skeleton, Text } from '@zahln/mobile-ui';
import { useSecureScreen } from '@zahln/secure-screen';
import { includedVat, type VatRate } from '@zahln/shared';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { HomeStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Receipt'>;

function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <View className="flex-row items-baseline justify-between gap-4">
      <Text variant="footnote" tone="tertiary">
        {label}
      </Text>
      <Text
        variant="footnote"
        className="flex-1 text-right"
        numberOfLines={1}
        style={mono ? { fontVariant: ['tabular-nums'], fontFamily: 'Inter-Medium' } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

const Rule = () => <View className="border-t border-dashed border-border-strong" />;

/**
 * A digital receipt with the fields a German receipt needs (GoBD/KassenSichV style): sequential
 * receipt number per merchant, timestamp, line items, VAT per rate and a payment reference.
 * The TSE signature from a real Fiskaltrust integration would go in the footer.
 */
export function ReceiptScreen({ navigation, route }: Props) {
  useSecureScreen();
  const { t, money, locale } = useT();
  const { intentId, attempt } = route.params;
  // Always fetched fresh: the receipt must show refunds made after the payment.
  const query = useQuery({ queryKey: ['intent', intentId], queryFn: () => payments.intent(intentId) });
  const intent = query.data;
  if (!intent) {
    return (
      <SafeArea className="flex-1 gap-4 bg-bg px-5 pt-16" edges={['top']}>
        <Skeleton height={520} radius={24} />
      </SafeArea>
    );
  }
  const paidAt = new Date(intent.paidAt ?? attempt?.settledAt ?? intent.createdAt);
  const tip = attempt?.tipCents ?? 0;
  const total = intent.amountCents + tip;

  // Gross per VAT rate, then the VAT included in it (prices in Germany are gross).
  const byRate = new Map<VatRate, number>();
  for (const item of intent.items)
    byRate.set(item.vatRate, (byRate.get(item.vatRate) ?? 0) + item.unitPriceCents * item.qty);

  return (
    <SafeArea className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 py-2">
        <PressableScale
          onPress={() => navigation.popToTop()}
          hapticOnPress
          accessibilityRole="button"
          accessibilityLabel={t('pay.close')}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        >
          <Icon name="close" size={22} color="textPrimary" />
        </PressableScale>
        <Text variant="headline" accessibilityRole="header" style={{ fontFamily: 'Inter-Bold' }}>
          {t('receipt.title')}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <ScrollView contentContainerClassName="px-5 pb-12 pt-4">
        <Animated.View entering={FadeInDown.duration(360)}>
          <View className="gap-4 rounded-t-xl bg-surface px-5 pb-6 pt-6">
            <View className="items-center gap-2 pb-1">
              <View className="h-12 w-12 items-center justify-center rounded-md bg-ink">
                <Icon name="store" size={26} color="onInk" weight="duotone" />
              </View>
              <Text variant="headline" style={{ fontFamily: 'Inter-Bold' }}>
                {intent.merchant.name}
              </Text>
              <Text variant="caption" tone="tertiary">
                @{intent.merchant.handle} · {intent.merchant.city}
              </Text>
            </View>

            <Rule />
            <View className="gap-2">
              {intent.receiptNumber != null ? (
                <Row label={t('receipt.number')} value={String(intent.receiptNumber).padStart(6, '0')} mono />
              ) : null}
              <Row
                label={t('receipt.date')}
                value={paidAt.toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'medium',
                })}
                mono
              />
            </View>

            <Rule />
            <View className="gap-2.5">
              {intent.items.length ? (
                intent.items.map((item) => (
                  <View key={item.sku} className="flex-row items-baseline gap-3">
                    <Text variant="callout" className="flex-1" numberOfLines={1}>
                      {item.qty}× {item.name}
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      {item.vatRate} %
                    </Text>
                    <Text variant="callout" style={{ fontVariant: ['tabular-nums'] }}>
                      {money(item.unitPriceCents * item.qty)}
                    </Text>
                  </View>
                ))
              ) : (
                <Row label={t('till.amount')} value={money(intent.amountCents)} mono />
              )}
            </View>

            <Rule />
            <View className="flex-row items-end justify-between">
              <Text variant="callout" tone="secondary" className="pb-1.5">
                {t('pay.total')}
              </Text>
              <AmountDisplay cents={total} size="lg" />
            </View>
            {[...byRate.entries()]
              .filter(([rate]) => rate > 0)
              .map(([rate, gross]) => (
                <Row
                  key={rate}
                  label={t('receipt.vatIncluded', { rate })}
                  value={money(includedVat(gross, rate))}
                  mono
                />
              ))}

            {tip > 0 ? <Row label={t('pay.tip')} value={money(tip)} mono /> : null}
            {intent.refundedCents > 0 ? (
              <View className="flex-row items-center justify-between rounded-md bg-success-subtle px-3 py-2">
                <Text variant="footnote" tone="success" style={{ fontFamily: 'Inter-SemiBold' }}>
                  {intent.status === 'refunded' ? t('receipt.refunded') : t('receipt.partiallyRefunded')}
                </Text>
                <Text
                  variant="footnote"
                  tone="success"
                  style={{ fontFamily: 'Inter-Bold', fontVariant: ['tabular-nums'] }}
                >
                  +{money(intent.refundedCents)}
                </Text>
              </View>
            ) : null}

            <Rule />
            <View className="gap-2">
              <Row label={t('receipt.method')} value={t('receipt.methodValue')} />
              <Row
                label={t('receipt.paymentId')}
                value={(attempt?.id ?? intent.id).slice(0, 8).toUpperCase()}
                mono
              />
            </View>

            <View className="flex-row items-start gap-2 pt-1">
              <Icon name="shield" size={14} color="textTertiary" weight="fill" />
              <Text variant="caption" tone="tertiary" className="flex-1">
                {t('receipt.gobd')}
              </Text>
            </View>
          </View>
          <ReceiptEdge color="surface" />
        </Animated.View>
      </ScrollView>
    </SafeArea>
  );
}
