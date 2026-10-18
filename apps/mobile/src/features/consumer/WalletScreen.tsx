import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Icon, IconButton, type IconName, PressableScale, Text, useTheme } from '../../ds';
import { toast } from '../../ds/Toast';
import { useT } from '../../lib/i18n';
import { useMe, useWallet } from '../../lib/queries';
import { BalanceCard } from '../wallet/BalanceCard';
import { TransactionList } from '../wallet/TransactionList';

export function greetingKey(hour = new Date().getHours()) {
  return hour < 11 ? 'home.greeting.morning' : hour < 18 ? 'home.greeting.day' : 'home.greeting.evening';
}

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

        <Animated.View entering={FadeInDown.duration(420).delay(60)}>
          <BalanceCard label={t('home.balance')} cents={wallet.data?.balanceCents} footnote="SEPA Instant" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(120)} className="flex-row gap-2">
          <QuickAction primary icon="scan" label={t('home.actions.pay')} onPress={soon} />
          <QuickAction icon="plus" label={t('home.actions.topUp')} onPress={soon} />
          <QuickAction icon="send" label={t('home.actions.send')} onPress={soon} />
          <QuickAction icon="receipt" label={t('home.actions.receipts')} onPress={soon} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(180)} className="gap-1">
          <Text variant="headline" accessibilityRole="header" style={{ fontFamily: 'Inter-Bold' }}>
            {t('home.recent')}
          </Text>
          <TransactionList
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
