import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { pendingPayment, useKillSwitch, useMe, useT, useWallet } from '@zahln/mobile-core';
import {
  Avatar,
  BalanceCard,
  ConfigBanner,
  greetingKey,
  Icon,
  IconButton,
  type IconName,
  PressableScale,
  Text,
  TransactionList,
  toast,
  useTheme,
} from '@zahln/mobile-ui';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeStackParamList } from '../../app/navigation/types';
import { usePayLinks } from '../pay/usePayLinks';

function QuickAction({
  icon,
  label,
  primary,
  onPress,
}: {
  icon: IconName;
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      hapticOnPress
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 items-center gap-2"
    >
      <View
        className={`h-16 w-16 items-center justify-center rounded-lg ${primary ? 'bg-brand' : 'border border-border bg-surface'}`}
      >
        <Icon
          name={icon}
          size={28}
          color={primary ? 'onBrand' : 'textPrimary'}
          weight={primary ? 'bold' : 'duotone'}
        />
      </View>
      <Text variant="caption" style={{ fontFamily: 'Inter-SemiBold' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Student home: greeting, ink balance card, quick actions, recent payments. */
export function WalletScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const me = useMe();
  const wallet = useWallet();
  const name = me.data?.user.name ?? '';
  const soon = () => toast(t('home.soon'), 'sparkle');
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const topupKilled = useKillSwitch('topup');
  usePayLinks();

  // A payment was in flight when the app was killed: pick it up before anything else.
  useEffect(() => {
    const pending = pendingPayment.read();
    if (pending) navigation.navigate('Pay', { resume: pending });
  }, [navigation]);

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
        <Animated.View entering={FadeInDown.duration(380)} className="flex-row items-center gap-3">
          <Avatar name={name || 'Z'} size={44} />
          <View className="flex-1">
            <Text variant="footnote" tone="tertiary">
              {t(greetingKey())}
            </Text>
            <Text variant="headline" style={{ fontFamily: 'Inter-Bold' }} numberOfLines={1}>
              {name.split(' ')[0] || ' '}
            </Text>
          </View>
          <IconButton icon="bell" label="Mitteilungen" onPress={soon} />
        </Animated.View>
        <ConfigBanner />

        <Animated.View entering={FadeInDown.duration(420).delay(60)}>
          <BalanceCard label={t('home.balance')} cents={wallet.data?.balanceCents} footnote="SEPA Instant" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(120)} className="flex-row gap-2">
          <QuickAction
            primary
            icon="scan"
            label={t('home.actions.pay')}
            onPress={() => navigation.navigate('Scan')}
          />
          {topupKilled ? null : <QuickAction icon="plus" label={t('home.actions.topUp')} onPress={soon} />}
          <QuickAction icon="send" label={t('home.actions.send')} onPress={soon} />
          <QuickAction
            icon="receipt"
            label={t('home.actions.receipts')}
            onPress={() => navigation.navigate('History')}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(180)} className="gap-1">
          <Text variant="headline" accessibilityRole="header" style={{ fontFamily: 'Inter-Bold' }}>
            {t('home.recent')}
          </Text>
          <TransactionList
            onPress={(tx) => tx.intentId && navigation.navigate('Receipt', { intentId: tx.intentId })}
            transactions={wallet.data?.transactions}
            loading={wallet.isLoading}
            emptyTitle={t('home.emptyTitle')}
            emptyBody={t('home.emptyBody')}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
