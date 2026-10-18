import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { queryClient, useT } from '@zahln/mobile-core';
import { Button, PaidFlood } from '@zahln/mobile-ui';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import type { HomeStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Paid'>;

const AUTO_RETURN_MS = 4000;

/** The till turns green. After a few seconds it's ready for the next customer by itself. */
export function PaidScreen({ navigation, route }: Props) {
  const { t, locale } = useT();
  const { intent } = route.params;
  const time = intent.paidAt
    ? new Date(intent.paidAt).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    const timer = setTimeout(() => navigation.popToTop(), AUTO_RETURN_MS);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <PaidFlood
        amountCents={intent.amountCents}
        subtitle={
          intent.receiptNumber ? t('till.receiptNo', { number: intent.receiptNumber }) : intent.merchant.name
        }
        meta={time}
      >
        <Button title={t('till.nextPayment')} variant="ink" icon="qr" onPress={() => navigation.popToTop()} />
      </PaidFlood>
    </>
  );
}
