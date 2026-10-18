import type { Meta } from '@storybook/react-native';
import { View } from 'react-native';
import { CountdownRing, PaidFlood } from '../payments';
import { BalanceCard } from '../wallet/BalanceCard';
import { TransactionList } from '../wallet/TransactionList';
import { themed } from './themed';

const meta: Meta = { title: 'Payments' };
export default meta;

const Wallet = () => (
  <View className="gap-6">
    <BalanceCard label="Guthaben" cents={2847} footnote="SEPA Instant" />
    <TransactionList
      loading={false}
      emptyTitle="Noch keine Zahlungen"
      emptyBody="Scanne an der Kasse einen QR-Code."
      transactions={[
        {
          id: 't1',
          kind: 'payment',
          amountCents: -630,
          counterparty: 'merchant_wallet:cafe-mila',
          counterpartyName: 'Café Mila',
          reference: 'a1',
          intentId: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: 't2',
          kind: 'refund',
          amountCents: 100,
          counterparty: 'merchant_wallet:cafe-mila',
          counterpartyName: 'Café Mila',
          reference: 'r1',
          intentId: null,
          createdAt: new Date(Date.now() - 3_600_000).toISOString(),
        },
      ]}
    />
  </View>
);
export const { Light: WalletLight, Dark: WalletDark, English: WalletEnglish } = themed(Wallet);

const Loading = () => <BalanceCard label="Guthaben" cents={undefined} footnote="SEPA Instant" />;
export const { Light: WalletLoadingLight, Dark: WalletLoadingDark } = themed(Loading);

const Countdown = () => (
  <View className="flex-row items-center gap-6 rounded-xl bg-ink p-6">
    <CountdownRing left={252} total={300} label="4:12" />
    <CountdownRing left={20} total={300} label="0:20" />
  </View>
);
export const { Light: CountdownLight, Dark: CountdownDark } = themed(Countdown);

const Paid = () => (
  <View className="-m-5 flex-1">
    <PaidFlood amountCents={630} subtitle="an Café Mila" meta="Bestätigt in 254 ms" />
  </View>
);
export const { Light: PaidLight, Dark: PaidDark, English: PaidEnglish } = themed(Paid);
