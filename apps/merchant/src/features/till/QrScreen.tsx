import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { haptic, useIntentStatus, useT } from '@zahln/mobile-core';
import {
  AmountDisplay,
  Button,
  CountdownRing,
  Icon,
  PressableScale,
  ReceiptEdge,
  SafeArea,
  Text,
  useCountdown,
  useTheme,
} from '@zahln/mobile-ui';
import { payUrlFor } from '@zahln/shared';
import { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { HomeStackParamList } from '../../app/navigation/types';
import { useCart } from './cart';
import { openIntent } from './openIntent';

type Props = NativeStackScreenProps<HomeStackParamList, 'Qr'>;

const QR_SIZE = 232;

/**
 * The customer-facing moment on the merchant's phone: a one-time QR for exactly this order,
 * valid for 5 minutes, with live status from the server (SSE, polling as fallback).
 * Always ink, whatever the theme: it's turned towards the customer, and white-on-ink QR scans best.
 */
export function QrScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const { intent, live } = useIntentStatus(route.params.intent);
  const countdown = useCountdown(route.params.intent);
  const clearCart = useCart((s) => s.clear);
  const expired = intent.status === 'expired' || (countdown.expired && intent.status !== 'paid');
  const scanned = intent.status === 'scanned';

  useEffect(() => {
    openIntent.set(intent.id);
  }, [intent.id]);

  useEffect(() => {
    if (intent.status === 'paid') {
      clearCart();
      openIntent.clear();
      navigation.replace('Paid', { intent });
    }
  }, [intent, navigation, clearCart]);

  /** Leaving on purpose (cancel or a new code) forgets the QR; being locked out does not. */
  const leave = () => {
    openIntent.clear();
    navigation.goBack();
  };

  useEffect(() => {
    if (scanned) haptic.tap();
  }, [scanned]);

  const items = intent.items.map((i) => `${i.qty}× ${i.name}`).join(' · ');

  return (
    <View className="flex-1" style={{ backgroundColor: colors.ink }}>
      <StatusBar barStyle="light-content" />
      <SafeArea className="flex-1 px-6" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between py-2">
          <PressableScale
            onPress={leave}
            hapticOnPress
            accessibilityRole="button"
            accessibilityLabel={t('till.cancel')}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Icon name="close" size={22} color="onInk" />
          </PressableScale>
          <Text
            variant="callout"
            tone="on-ink-muted"
            numberOfLines={1}
            style={{ fontFamily: 'Inter-SemiBold' }}
          >
            {intent.merchant.name}
          </Text>
          <View
            className="h-11 w-11 items-center justify-center"
            accessibilityLabel={live ? t('till.live') : t('till.reconnecting')}
          >
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: live ? colors.success : colors.warning }}
            />
          </View>
        </View>

        <View className="flex-1 items-center justify-center gap-6">
          <Animated.View entering={FadeInDown.springify().damping(16)} className="items-center">
            <View
              className="items-center rounded-t-xl px-5 pb-3 pt-5"
              style={{ backgroundColor: colors.qrBackground }}
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('till.scanWithZahln')}
            >
              <View style={{ opacity: expired ? 0.12 : 1 }}>
                <QRCode
                  value={payUrlFor(intent.ref)}
                  size={QR_SIZE}
                  ecl="M"
                  quietZone={4}
                  color={colors.qrForeground}
                  backgroundColor={colors.qrBackground}
                />
              </View>
              {expired ? (
                <View className="absolute inset-0 items-center justify-center gap-2 px-8">
                  <Icon name="clock" size={36} color="textPrimary" weight="duotone" />
                  <Text variant="headline" className="text-center" style={{ color: colors.qrForeground }}>
                    {t('payment.status.expired')}
                  </Text>
                </View>
              ) : null}
              <View className="flex-row items-center gap-1.5 pt-3">
                <Icon name="lock" size={14} color="textTertiary" weight="fill" />
                <Text variant="caption" style={{ color: '#6B665E' }}>
                  {t('till.uniqueCode')}
                </Text>
              </View>
            </View>
            <View style={{ width: QR_SIZE + 40 }}>
              <ReceiptEdge color="qrBackground" />
            </View>
          </Animated.View>

          <View className="items-center gap-1 px-2">
            <AmountDisplay cents={intent.amountCents} tone="on-ink" />
            {items ? (
              <Text variant="footnote" tone="on-ink-muted" numberOfLines={2} className="text-center">
                {items}
              </Text>
            ) : null}
          </View>
        </View>

        {expired ? (
          <Animated.View entering={FadeIn} className="gap-3 pb-2">
            <Text variant="footnote" tone="on-ink-muted" className="text-center">
              {t('till.expiredBody')}
            </Text>
            <Button title={t('payment.actions.newCode')} icon="qr" onPress={leave} />
          </Animated.View>
        ) : (
          <View
            className="mb-2 flex-row items-center gap-4 rounded-xl px-5 py-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            accessibilityLiveRegion="polite"
          >
            <View className="flex-1 gap-0.5">
              <Text variant="headline" tone="on-ink" style={{ fontFamily: 'Inter-Bold' }}>
                {scanned ? t('till.customerReviewing') : t('till.waitingForScan')}
              </Text>
              <Text variant="footnote" tone="on-ink-muted">
                {t('till.timeLeft', { time: countdown.label })}
              </Text>
            </View>
            {scanned ? (
              <Animated.View entering={FadeIn} className="h-16 w-16 items-center justify-center">
                <Icon name="faceId" size={36} color="brand" weight="duotone" />
              </Animated.View>
            ) : (
              <CountdownRing left={countdown.left} total={countdown.total} label={countdown.label} />
            )}
          </View>
        )}
      </SafeArea>
    </View>
  );
}
