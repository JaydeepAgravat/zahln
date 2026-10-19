import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  ApiRequestError,
  checkPin,
  haptic,
  payments,
  queryClient,
  useFeature,
  useKillSwitch,
  useT,
  uuid,
} from '@zaster/mobile-core';
import {
  AmountDisplay,
  Button,
  Icon,
  Keypad,
  PinLayout,
  PressableScale,
  ReceiptEdge,
  SafeArea,
  Skeleton,
  StatusBadge,
  Text,
  toast,
  usePinEntry,
} from '@zaster/mobile-ui';
import { useSecureScreen } from '@zaster/secure-screen';
import {
  applyKeypadKey,
  isRefundable,
  MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN,
  type PaymentIntent,
} from '@zaster/shared';
import { useRef, useState } from 'react';
import { Modal, Platform, ScrollView, View } from 'react-native';
import type { HomeStackParamList } from '../../app/navigation/types';
import { useCurrentMerchant } from './TillScreens';

type Props = NativeStackScreenProps<HomeStackParamList, 'Payment'>;

const REASONS = ['wrongOrder', 'unhappy', 'double'] as const;

function Close({ onPress }: { onPress: () => void }) {
  const { t } = useT();
  return (
    <PressableScale
      onPress={onPress}
      hapticOnPress
      accessibilityRole="button"
      accessibilityLabel={t('pay.close')}
      className="h-11 w-11 items-center justify-center rounded-full bg-surface"
    >
      <Icon name="close" size={22} color="textPrimary" />
    </PressableScale>
  );
}

/**
 * Refund: amount (defaults to what's left) → reason → the manager's PIN → one idempotent request.
 * The server enforces the rules too (owner/manager only, never more than was paid, row lock against
 * two managers refunding at once); the app just makes the right thing easy.
 */
function RefundSheet({
  intent,
  visible,
  onClose,
}: {
  intent: PaymentIntent;
  visible: boolean;
  onClose: () => void;
}) {
  // A manager's PIN is typed on this sheet: no screenshots, no recordings.
  useSecureScreen();
  const { t, money } = useT();
  const remaining = intent.amountCents - intent.refundedCents;
  const [cents, setCents] = useState(remaining);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('wrongOrder');
  const [step, setStep] = useState<'amount' | 'pin'>('amount');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per refund attempt: a retry after a timeout can't refund twice.
  const key = useRef<{ sig: string; key: string } | null>(null);

  const submit = async () => {
    const sig = `${cents}:${reason}`;
    if (key.current?.sig !== sig) key.current = { sig, key: uuid() };
    setBusy(true);
    try {
      await payments.refund(intent.id, cents, t(`refund.reasons.${reason}`), key.current.key);
      haptic.success();
      toast(t('refund.done', { amount: money(cents) }), 'checkCircle');
      void queryClient.invalidateQueries({ queryKey: ['intent', intent.id] });
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      onClose();
    } catch (e) {
      haptic.error();
      toast(
        e instanceof ApiRequestError && e.code === 'forbidden' ? t('refund.managerOnly') : t('refund.failed'),
        'warning',
      );
      setStep('amount');
    } finally {
      setBusy(false);
    }
  };

  const entry = usePinEntry(async (pin) => {
    const result = await checkPin(pin);
    entry.reset();
    if (result.ok) {
      setError(null);
      return void submit();
    }
    haptic.error();
    setError(
      result.lockedForMs > 0
        ? t('lock.locked', { seconds: Math.ceil(result.lockedForMs / 1000) })
        : t('lock.wrong', { left: MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN - result.failed }),
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeArea className="flex-1 bg-bg px-5" edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
        <View className="flex-row items-center justify-between pt-4">
          <Text variant="title" accessibilityRole="header">
            {t('refund.title')}
          </Text>
          <Close onPress={onClose} />
        </View>
        {step === 'pin' ? (
          <PinLayout
            title={t('refund.pinTitle')}
            subtitle={t('refund.confirm', { amount: money(cents) })}
            error={error}
            pin={entry.pin}
            disabled={busy}
            onKey={(k) => {
              if (error) setError(null);
              entry.onKey(k);
            }}
          />
        ) : (
          <View className="flex-1 justify-between gap-4 pt-4">
            <View className="items-center gap-1">
              <AmountDisplay cents={cents} />
              <Text variant="footnote" tone="tertiary">
                {t('refund.refundable', { amount: money(remaining) })}
              </Text>
            </View>
            <View className="gap-2">
              <Text variant="footnote" tone="tertiary">
                {t('refund.reason')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {REASONS.map((r) => (
                  <PressableScale
                    key={r}
                    onPress={() => setReason(r)}
                    hapticOnPress
                    accessibilityRole="radio"
                    accessibilityState={{ selected: r === reason }}
                    className={`min-h-[36px] justify-center rounded-full px-3 ${r === reason ? 'bg-ink' : 'bg-surface'}`}
                  >
                    <Text
                      variant="footnote"
                      tone={r === reason ? 'on-ink' : 'secondary'}
                      style={{ fontFamily: 'Inter-SemiBold' }}
                    >
                      {t(`refund.reasons.${r}`)}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </View>
            <Keypad
              mode="amount"
              onKey={(k) => k !== 'biometric' && setCents(applyKeypadKey(cents, k, remaining))}
            />
            <View className="pb-2">
              <Button
                title={t('refund.confirm', { amount: money(cents) })}
                variant="ink"
                icon="lock"
                disabled={cents <= 0 || cents > remaining}
                onPress={() => setStep('pin')}
              />
            </View>
          </View>
        )}
      </SafeArea>
    </Modal>
  );
}

/** One payment as the merchant sees it: what was sold, what's been refunded, and the refund action. */
export function PaymentScreen({ navigation, route }: Props) {
  const { t, money, locale } = useT();
  const merchant = useCurrentMerchant();
  const query = useQuery({
    queryKey: ['intent', route.params.intentId],
    queryFn: () => payments.intent(route.params.intentId),
  });
  const [refunding, setRefunding] = useState(false);
  const intent = query.data;
  const isManager = merchant?.role === 'owner' || merchant?.role === 'manager';
  const planHasRefunds = useFeature('refunds', merchant?.plan);
  const refundsKilled = useKillSwitch('refunds');
  const canRefund = isManager && planHasRefunds && !refundsKilled;

  return (
    <SafeArea className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 py-2">
        <Close onPress={() => navigation.goBack()} />
        <Text variant="headline" style={{ fontFamily: 'Inter-Bold' }}>
          {t('refund.payment')}
        </Text>
        <View className="h-11 w-11" />
      </View>
      {!intent ? (
        <View className="px-5 pt-4">
          <Skeleton height={360} radius={24} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-12 pt-4">
          <View>
            <View className="gap-4 rounded-t-xl bg-surface px-5 pb-6 pt-6">
              <View className="flex-row items-start justify-between">
                <View className="gap-1">
                  <AmountDisplay cents={intent.amountCents} size="lg" />
                  <Text variant="footnote" tone="tertiary">
                    {new Date(intent.paidAt ?? intent.createdAt).toLocaleString(
                      locale === 'de' ? 'de-DE' : 'en-GB',
                      {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      },
                    )}
                    {intent.receiptNumber
                      ? ` · ${t('till.receiptNo', { number: intent.receiptNumber })}`
                      : ''}
                  </Text>
                </View>
                {intent.status === 'refunded' || intent.status === 'partially_refunded' ? (
                  <StatusBadge
                    tone="success"
                    label={
                      intent.status === 'refunded' ? t('receipt.refunded') : t('receipt.partiallyRefunded')
                    }
                  />
                ) : null}
              </View>
              {intent.items.map((item) => (
                <View key={item.sku} className="flex-row justify-between">
                  <Text variant="callout">
                    {item.qty}× {item.name}
                  </Text>
                  <Text variant="callout" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
                    {money(item.unitPriceCents * item.qty)}
                  </Text>
                </View>
              ))}
              {intent.refundedCents > 0 ? (
                <View className="flex-row justify-between border-t border-dashed border-border-strong pt-3">
                  <Text variant="callout" tone="secondary">
                    {t('refund.refundedSoFar')}
                  </Text>
                  <Text
                    variant="callout"
                    style={{ fontFamily: 'Inter-SemiBold', fontVariant: ['tabular-nums'] }}
                  >
                    −{money(intent.refundedCents)}
                  </Text>
                </View>
              ) : null}
            </View>
            <ReceiptEdge color="surface" />
          </View>

          {isRefundable(intent.status) ? (
            canRefund ? (
              <Button
                title={t('refund.action')}
                variant="secondary"
                icon="arrowOut"
                onPress={() => setRefunding(true)}
              />
            ) : (
              <Text variant="footnote" tone="tertiary" className="text-center">
                {refundsKilled
                  ? t('refund.paused')
                  : !planHasRefunds
                    ? t('till.planRequired')
                    : t('refund.managerOnly')}
              </Text>
            )
          ) : null}
          {refunding ? (
            <RefundSheet intent={intent} visible={refunding} onClose={() => setRefunding(false)} />
          ) : null}
        </ScrollView>
      )}
    </SafeArea>
  );
}
