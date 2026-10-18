import { useMe, useMerchantWallet, usePrefs, useT } from '@zahln/mobile-core';
import {
  BalanceCard,
  Button,
  greetingKey,
  Icon,
  IconButton,
  StatusBadge,
  Text,
  TillIllustration,
  TransactionList,
  toast,
  useTheme,
} from '@zahln/mobile-ui';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

function useCurrentMerchant() {
  const merchantId = usePrefs((s) => s.merchantId);
  const me = useMe();
  return me.data?.memberships.find((m) => m.merchantId === merchantId) ?? null;
}

function MerchantHeader() {
  const { t } = useT();
  const merchant = useCurrentMerchant();
  const firstName = usePrefs((s) => s.firstName);
  return (
    <Animated.View entering={FadeInDown.duration(380)} className="flex-row items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-md bg-ink">
        <Icon name="store" size={24} color="onInk" weight="duotone" />
      </View>
      <View className="flex-1">
        <Text variant="footnote" tone="tertiary">
          {t(greetingKey())}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <Text variant="headline" style={{ fontFamily: 'Inter-Bold' }} numberOfLines={1}>
          {merchant?.merchantName ?? ' '}
        </Text>
      </View>
      {merchant ? (
        <StatusBadge
          tone="info"
          icon={null}
          label={merchant.plan[0]?.toUpperCase() + merchant.plan.slice(1)}
        />
      ) : null}
    </Animated.View>
  );
}

/** The till's home. Day 3 turns "Neue Zahlung" into catalogue + keypad + one-time QR. */
/** Today's takings: incoming payments since midnight (not the wallet balance). */
function todaysTakings(transactions: { amountCents: number; kind: string; createdAt: string }[] | undefined) {
  if (!transactions) return undefined;
  const today = new Date().toDateString();
  return transactions
    .filter(
      (tx) => tx.kind === 'payment' && tx.amountCents > 0 && new Date(tx.createdAt).toDateString() === today,
    )
    .reduce((sum, tx) => sum + tx.amountCents, 0);
}

export function TillScreen() {
  const { t } = useT();
  const wallet = useMerchantWallet();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerClassName="gap-6 px-5 pb-10 pt-2">
        <MerchantHeader />
        <Animated.View
          entering={FadeInDown.duration(420).delay(60)}
          className="items-center gap-3 rounded-xl border border-border bg-surface px-5 pb-6 pt-4"
        >
          <TillIllustration width={240} />
          <Text variant="title" accessibilityRole="header" className="text-center">
            {t('merchant.tillTitle')}
          </Text>
          <Text tone="secondary" className="text-center">
            {t('merchant.tillBody')}
          </Text>
          <View className="w-full pt-2">
            <Button
              title={t('merchant.newPayment')}
              icon="qr"
              onPress={() => toast(t('home.soon'), 'sparkle')}
            />
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(420).delay(120)}>
          <BalanceCard
            label={t('merchant.todayRevenue')}
            cents={todaysTakings(wallet.data?.transactions)}
            footnote={t('merchant.payout')}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function MerchantWalletScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const wallet = useMerchantWallet();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-10 pt-2"
        refreshControl={
          <RefreshControl
            tintColor={colors.brand}
            refreshing={wallet.isRefetching}
            onRefresh={() => void wallet.refetch()}
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <Text variant="display" accessibilityRole="header">
            {t('tabs.wallet')}
          </Text>
          <IconButton
            icon="arrowOut"
            label={t('home.soon')}
            onPress={() => toast(t('home.soon'), 'sparkle')}
          />
        </View>
        <BalanceCard
          label={t('home.balance')}
          cents={wallet.data?.balanceCents}
          footnote={t('merchant.payout')}
        />
        <View className="gap-1">
          <Text variant="headline" accessibilityRole="header" style={{ fontFamily: 'Inter-Bold' }}>
            {t('home.recent')}
          </Text>
          <TransactionList
            transactions={wallet.data?.transactions}
            loading={wallet.isLoading}
            emptyTitle={t('merchant.noSales')}
            emptyBody={t('merchant.tillBody')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
