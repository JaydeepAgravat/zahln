import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmountDisplay, Card, StatusBadge, Text } from '../../ds';
import { useT } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useMe, useMerchantWallet } from '../../lib/queries';

function useCurrentMerchant() {
  const merchantId = usePrefs((s) => s.merchantId);
  const me = useMe();
  return me.data?.memberships.find((m) => m.merchantId === merchantId) ?? null;
}

export function TillScreen() {
  const { t } = useT();
  const merchant = useCurrentMerchant();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerClassName="gap-6 px-5 py-4">
        <Text variant="title" accessibilityRole="header">
          {merchant?.merchantName ?? ' '}
        </Text>
        {merchant ? <StatusBadge tone="info" label={merchant.plan.toUpperCase()} /> : null}
        <Card className="bg-brand-subtle">
          <Text tone="brand">{t('home.tillComingSoon')}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export function MerchantWalletScreen() {
  const { t } = useT();
  const wallet = useMerchantWallet();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerClassName="gap-6 px-5 py-4">
        <Text variant="title" accessibilityRole="header">
          {t('tabs.wallet')}
        </Text>
        <Card className="gap-1 p-5">
          <Text variant="callout" tone="secondary">
            {t('home.merchantBalance')}
          </Text>
          {wallet.data ? <AmountDisplay cents={wallet.data.balanceCents} /> : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
