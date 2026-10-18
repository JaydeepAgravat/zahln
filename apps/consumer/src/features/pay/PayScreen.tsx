import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  checkPin,
  haptic,
  queryClient,
  unlockWithBiometrics,
  useBiometry,
  usePayment,
  usePrefs,
  useT,
} from '@zahln/mobile-core';
import {
  AmountDisplay,
  Button,
  Icon,
  type IconName,
  PaidFlood,
  PinLayout,
  PressableScale,
  ReceiptEdge,
  SafeArea,
  Skeleton,
  Text,
  useCountdown,
  usePinEntry,
  useTheme,
} from '@zahln/mobile-ui';
import { type AttemptState, MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN, type PaymentIntent } from '@zahln/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StatusBar, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { HomeStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Pay'>;

function CloseButton({ onPress }: { onPress: () => void }) {
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

/** What the person is about to pay for, as a receipt: the server's merchant, items and total. */
function OrderReceipt({ intent }: { intent: PaymentIntent }) {
  const { t, money } = useT();
  return (
    <View>
      <View className="gap-3 rounded-t-xl border border-b-0 border-border bg-surface px-5 pb-4 pt-5">
        {intent.items.map((item) => (
          <View key={item.sku} className="flex-row items-baseline justify-between gap-3">
            <Text variant="callout" className="flex-1" numberOfLines={1}>
              {item.qty}× {item.name}
            </Text>
            <Text variant="callout" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
              {money(item.unitPriceCents * item.qty)}
            </Text>
          </View>
        ))}
        {intent.items.length ? <View className="border-t border-dashed border-border-strong" /> : null}
        <View className="flex-row items-end justify-between">
          <Text variant="footnote" tone="tertiary" className="pb-2">
            {t('pay.total')}
          </Text>
          <AmountDisplay cents={intent.amountCents} size="lg" />
        </View>
      </View>
      <ReceiptEdge color="surface" />
    </View>
  );
}

function ConfirmView({
  state,
  onPay,
  onClose,
  onExpire,
}: {
  state: Extract<AttemptState, { status: 'confirming' | 'authorising' | 'submitting' }>;
  onPay: () => void;
  onClose: () => void;
  onExpire: () => void;
}) {
  const { t, money } = useT();
  const biometry = useBiometry();
  const biometricsEnabled = usePrefs((s) => s.biometricsEnabled);
  const { intent } = state;
  const countdown = useCountdown(intent);
  const busy = state.status !== 'confirming';
  const useBio = biometricsEnabled && biometry?.available;

  useEffect(() => {
    if (countdown.expired && state.status === 'confirming') onExpire();
  }, [countdown.expired, state.status, onExpire]);

  const amount = money(intent.amountCents);
  return (
    <SafeArea className="flex-1 bg-bg px-5" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between py-2">
        <CloseButton onPress={onClose} />
        <View className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1.5">
          <Icon name="clock" size={14} color={countdown.left <= 30 ? 'warning' : 'textTertiary'} />
          <Text
            variant="caption"
            tone={countdown.left <= 30 ? 'warning' : 'tertiary'}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {t('pay.validFor', { time: countdown.label })}
          </Text>
        </View>
      </View>

      <View className="flex-1 justify-center gap-6">
        <Animated.View entering={FadeInDown.duration(320)} className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-lg bg-ink">
            <Icon name="store" size={32} color="onInk" weight="duotone" />
          </View>
          <View className="items-center gap-0.5">
            <Text variant="title" accessibilityRole="header" className="text-center">
              {intent.merchant.name}
            </Text>
            <Text variant="footnote" tone="tertiary">
              @{intent.merchant.handle} · {intent.merchant.city}
            </Text>
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(320).delay(80)}>
          <OrderReceipt intent={intent} />
        </Animated.View>
      </View>

      <View className="gap-3 pb-2">
        <Button
          title={
            state.status === 'submitting'
              ? t('pay.paying')
              : useBio
                ? t('pay.payWithBiometrics', { method: biometry?.label ?? 'Face ID', amount })
                : t('pay.payWithPin', { amount })
          }
          icon={useBio ? (biometry?.icon ?? 'faceId') : 'lock'}
          loading={busy}
          onPress={onPay}
        />
        <View className="flex-row items-center justify-center gap-1.5">
          <Icon name="shield" size={14} color="textTertiary" weight="fill" />
          <Text variant="caption" tone="tertiary">
            {t('onboarding.welcome.trust')}
          </Text>
        </View>
      </View>
    </SafeArea>
  );
}

/** Payment PIN as a sheet: same keypad and cooldown rules as the lock screen. */
function PinSheet({
  visible,
  intent,
  onSuccess,
  onCancel,
}: {
  visible: boolean;
  intent: PaymentIntent | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t, money } = useT();
  const [error, setError] = useState<string | null>(null);
  const entry = usePinEntry(async (pin) => {
    const result = await checkPin(pin);
    entry.reset();
    if (result.ok) {
      setError(null);
      onSuccess();
      return;
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
      onRequestClose={onCancel}
    >
      {/* A page sheet on iOS (already below the status bar), full screen on Android (needs the inset). */}
      <SafeArea className="flex-1 bg-bg" edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
        <View className="flex-row justify-end px-5 pt-4">
          <CloseButton onPress={onCancel} />
        </View>
        {intent ? (
          <PinLayout
            title={t('pay.pinTitle')}
            subtitle={t('pay.authPrompt', {
              amount: money(intent.amountCents),
              merchant: intent.merchant.name,
            })}
            error={error}
            pin={entry.pin}
            onKey={(key) => {
              if (error) setError(null);
              entry.onKey(key);
            }}
          />
        ) : null}
      </SafeArea>
    </Modal>
  );
}

type Outcome = { icon: IconName; tone: 'danger' | 'warning' | 'textSecondary'; title: string; body: string };

function OutcomeView({
  outcome,
  primary,
  onClose,
}: {
  outcome: Outcome;
  primary?: { title: string; onPress: () => void };
  onClose: () => void;
}) {
  const { t } = useT();
  return (
    <SafeArea className="flex-1 bg-bg px-5" edges={['top', 'bottom']}>
      <View className="flex-row py-2">
        <CloseButton onPress={onClose} />
      </View>
      <Animated.View
        entering={FadeIn.duration(240)}
        className="flex-1 items-center justify-center gap-4 px-4"
      >
        <View className="h-20 w-20 items-center justify-center rounded-full bg-surface">
          <Icon name={outcome.icon} size={40} color={outcome.tone} weight="duotone" />
        </View>
        <Text variant="title" accessibilityRole="header" className="text-center">
          {outcome.title}
        </Text>
        <Text tone="secondary" className="text-center">
          {outcome.body}
        </Text>
      </Animated.View>
      <View className="gap-3 pb-2">
        {primary ? <Button title={primary.title} onPress={primary.onPress} /> : null}
        <Button title={t('pay.done')} variant="secondary" onPress={onClose} />
      </View>
    </SafeArea>
  );
}

function CheckingView({ checks }: { checks: number }) {
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <SafeArea className="flex-1 bg-bg px-5" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center gap-4 px-4" accessibilityLiveRegion="polite">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-surface">
          <ActivityIndicator size="large" color={colors.pending} />
        </View>
        <Text variant="title" accessibilityRole="header" className="text-center">
          {t('payment.status.checking')}
        </Text>
        <Text tone="secondary" className="text-center">
          {checks >= 3 ? t('pay.checkingLong') : t('payment.explain.checking')}
        </Text>
      </View>
    </SafeArea>
  );
}

/**
 * One screen, one state machine. Each status of the shared `attemptReducer` has exactly one view,
 * so there is no screen the app can show that the reducer doesn't know about.
 */
export function PayScreen({ navigation, route }: Props) {
  const { t, money } = useT();
  const pay = usePayment();
  const { state } = pay;
  const biometricsEnabled = usePrefs((s) => s.biometricsEnabled);
  const biometry = useBiometry();
  const [pinVisible, setPinVisible] = useState(false);

  useEffect(() => {
    void pay.load(route.params.ref);
  }, [route.params.ref, pay.load]);

  useEffect(() => {
    if (state.status === 'paid') void queryClient.invalidateQueries({ queryKey: ['wallet'] });
  }, [state.status]);

  const close = () => navigation.popToTop();
  const scanAgain = () => navigation.replace('Scan');

  const startPayment = async () => {
    if (state.status !== 'confirming') return;
    pay.confirm();
    if (biometricsEnabled && biometry?.available) {
      const result = await unlockWithBiometrics({
        title: t('pay.authPrompt', {
          amount: money(state.intent.amountCents),
          merchant: state.intent.merchant.name,
        }),
        cancel: t('lock.usePin'),
      });
      if (result === 'ok') return pay.authorised();
    }
    setPinVisible(true);
  };

  const intentForPin = state.status === 'authorising' ? state.intent : null;
  const pinSheet = (
    <PinSheet
      visible={pinVisible && state.status === 'authorising'}
      intent={intentForPin}
      onSuccess={() => {
        setPinVisible(false);
        pay.authorised();
      }}
      onCancel={() => {
        setPinVisible(false);
        pay.cancelAuthorisation();
      }}
    />
  );

  switch (state.status) {
    case 'idle':
    case 'scanned':
      return (
        <SafeArea className="flex-1 gap-6 bg-bg px-5 pt-20">
          <View className="items-center gap-3">
            <Skeleton width={64} height={64} radius={16} />
            <Skeleton width={180} height={28} />
          </View>
          <Skeleton height={180} radius={24} />
        </SafeArea>
      );
    case 'confirming':
    case 'authorising':
    case 'submitting':
      return (
        <>
          <ConfirmView
            state={state}
            onPay={() => void startPayment()}
            onClose={close}
            onExpire={pay.expire}
          />
          {pinSheet}
        </>
      );
    case 'checking':
      return <CheckingView checks={state.checks} />;
    case 'paid': {
      const total = state.attempt.amountCents + state.attempt.tipCents;
      return (
        <>
          <StatusBar barStyle="light-content" />
          <PaidFlood
            amountCents={total}
            subtitle={t('pay.to', { merchant: state.intent.merchant.name })}
            meta={pay.confirmedInMs != null ? t('pay.confirmedIn', { ms: pay.confirmedInMs }) : undefined}
          >
            <Button
              title={t('pay.viewReceipt')}
              variant="ink"
              icon="receipt"
              onPress={() =>
                navigation.replace('Receipt', {
                  intent: pay.paidIntent ?? state.intent,
                  attempt: state.attempt,
                })
              }
            />
            <PressableScale
              onPress={close}
              accessibilityRole="button"
              className="min-h-[48px] items-center justify-center"
            >
              <Text variant="headline" tone="on-flood">
                {t('pay.done')}
              </Text>
            </PressableScale>
          </PaidFlood>
        </>
      );
    }
    case 'insufficient_balance':
      return (
        <OutcomeView
          outcome={{
            icon: 'coins',
            tone: 'warning',
            title: t('payment.status.insufficientBalance'),
            body: t('payment.explain.insufficientBalance', { amount: money(state.intent.amountCents) }),
          }}
          primary={{ title: t('payment.actions.topUp'), onPress: close }}
          onClose={close}
        />
      );
    case 'not_charged':
      return (
        <OutcomeView
          outcome={{
            icon: 'shield',
            tone: 'danger',
            title: t('payment.status.notCharged'),
            body: t('payment.explain.notCharged'),
          }}
          primary={{ title: t('pay.scanAgain'), onPress: scanAgain }}
          onClose={close}
        />
      );
    case 'expired':
      return (
        <OutcomeView
          outcome={{
            icon: 'clock',
            tone: 'textSecondary',
            title: t('payment.status.expired'),
            body: t('payment.explain.expired'),
          }}
          primary={{ title: t('pay.scanAgain'), onPress: scanAgain }}
          onClose={close}
        />
      );
    case 'failed':
      return (
        <OutcomeView
          outcome={{
            icon: 'warning',
            tone: 'danger',
            title: t('payment.status.failed'),
            body: state.intent ? t('payment.explain.failed') : t('pay.loadFailed'),
          }}
          primary={{ title: t('pay.scanAgain'), onPress: scanAgain }}
          onClose={close}
        />
      );
  }
}
