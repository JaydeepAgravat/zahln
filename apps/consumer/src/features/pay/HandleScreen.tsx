import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { haptic, payments, useT, uuid } from '@zaster/mobile-core';
import {
  AmountDisplay,
  Button,
  Icon,
  Keypad,
  PressableScale,
  SafeArea,
  Skeleton,
  Text,
  toast,
} from '@zaster/mobile-ui';
import { applyKeypadKey } from '@zaster/shared';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import type { HomeStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Handle'>;

/** Above this, a typed amount is almost certainly a typo at a market stall (and the server caps at 500 €). */
const MAX_TYPED_CENTS = 50_000;

/**
 * Paying a merchant's static QR (Free plan): the payer types the amount, then it becomes a normal
 * one-time intent and goes through exactly the same confirm → authorise → pay → reconcile path.
 */
export function HandleScreen({ navigation, route }: Props) {
  const { t, money } = useT();
  const merchant = useQuery({
    queryKey: ['handle', route.params.handle],
    queryFn: () => payments.handle(route.params.handle),
  });
  const [cents, setCents] = useState(0);
  const [busy, setBusy] = useState(false);
  // One key per typed amount: a double tap on "Weiter" returns the same intent.
  const key = useRef<{ cents: number; key: string } | null>(null);

  const next = async () => {
    if (!cents) return;
    if (key.current?.cents !== cents) key.current = { cents, key: uuid() };
    setBusy(true);
    try {
      const intent = await payments.createHandleIntent(route.params.handle, cents, key.current.key);
      navigation.replace('Pay', { ref: intent.ref });
    } catch {
      haptic.error();
      toast(t('common.networkError'), 'warning');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeArea className="flex-1 bg-bg px-5">
      <View className="flex-row items-center py-2">
        <PressableScale
          onPress={() => navigation.goBack()}
          hapticOnPress
          accessibilityRole="button"
          accessibilityLabel={t('pay.close')}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        >
          <Icon name="close" size={22} color="textPrimary" />
        </PressableScale>
      </View>

      <View className="flex-1 items-center justify-center gap-3">
        {merchant.data ? (
          <>
            <View className="h-14 w-14 items-center justify-center rounded-lg bg-ink">
              <Icon name="store" size={28} color="onInk" weight="duotone" />
            </View>
            <Text variant="title" accessibilityRole="header">
              {merchant.data.name}
            </Text>
            <Text variant="footnote" tone="tertiary" className="px-6 text-center">
              {t('pay.handleHint', { merchant: merchant.data.name })}
            </Text>
          </>
        ) : (
          <>
            <Skeleton width={56} height={56} radius={16} />
            <Skeleton width={160} height={24} />
          </>
        )}
        <View className="pt-6">
          <AmountDisplay cents={cents} tone={cents ? 'primary' : 'tertiary'} />
        </View>
      </View>

      <View className="gap-4 pb-2">
        <Keypad
          mode="amount"
          onKey={(k) => k !== 'biometric' && setCents(applyKeypadKey(cents, k, MAX_TYPED_CENTS))}
        />
        <Button
          title={cents ? `${t('common.continue')} · ${money(cents)}` : t('pay.handleTitle')}
          disabled={!cents || !merchant.data}
          loading={busy}
          onPress={() => void next()}
        />
      </View>
    </SafeArea>
  );
}
