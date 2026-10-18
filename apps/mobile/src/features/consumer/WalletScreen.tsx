import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmountDisplay, Card, Text } from '../../ds';
import { useT } from '../../lib/i18n';
import { useMe, useWallet } from '../../lib/queries';

/** Day 2: proves the authenticated session works end to end. Scan-to-pay arrives on Day 3. */
export function WalletScreen() {
  const { t } = useT();
  const me = useMe();
  const wallet = useWallet();
  const [discreet, setDiscreet] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        contentContainerClassName="gap-6 px-5 py-4"
        refreshControl={
          <RefreshControl refreshing={wallet.isRefetching} onRefresh={() => void wallet.refetch()} />
        }
      >
        <Text variant="title" accessibilityRole="header">
          {me.data ? t('home.hello', { name: me.data.user.name.split(' ')[0] }) : ' '}
        </Text>
        <Card className="gap-1 p-5">
          <View className="flex-row items-center justify-between">
            <Text variant="callout" tone="secondary">
              {t('home.balance')}
            </Text>
            <Pressable
              onPress={() => setDiscreet((d) => !d)}
              accessibilityRole="button"
              accessibilityLabel={discreet ? t('home.showBalance') : t('home.hideBalance')}
              className="min-h-[48px] min-w-[48px] items-end justify-center"
            >
              <Text variant="callout" tone="brand">
                {discreet ? '◡' : '◠'}
              </Text>
            </Pressable>
          </View>
          {wallet.data ? (
            <AmountDisplay cents={wallet.data.balanceCents} discreet={discreet} />
          ) : (
            <Text variant="amountHero" tone="tertiary">
              –
            </Text>
          )}
        </Card>
        <Card className="bg-brand-subtle">
          <Text tone="brand">{t('home.scanComingSoon')}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
