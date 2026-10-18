import type { WalletTransaction } from '@zahln/shared';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EmptyReceiptsIllustration, type IconName, ListRow, Skeleton, Text } from '../../ds';
import { useT } from '../../lib/i18n';

/** A category icon from the counterparty (a real backend would send a merchant category code). */
function iconFor(tx: WalletTransaction): {
  icon: IconName;
  color: 'brandText' | 'success' | 'textPrimary';
  bg: string;
} {
  if (tx.kind === 'topup') return { icon: 'plus', color: 'success', bg: 'bg-success-subtle' };
  if (tx.kind === 'refund') return { icon: 'arrowIn', color: 'success', bg: 'bg-success-subtle' };
  if (tx.kind === 'payout') return { icon: 'arrowOut', color: 'textPrimary', bg: 'bg-surface-muted' };
  const name = tx.counterpartyName.toLowerCase();
  if (name.includes('mensa')) return { icon: 'food', color: 'brandText', bg: 'bg-brand-subtle' };
  if (name.includes('café') || name.includes('cafe'))
    return { icon: 'coffee', color: 'brandText', bg: 'bg-brand-subtle' };
  // Incoming money is green: green always means "money moved to you".
  if (tx.amountCents > 0) return { icon: 'arrowIn', color: 'success', bg: 'bg-success-subtle' };
  return { icon: 'store', color: 'textPrimary', bg: 'bg-surface-muted' };
}

function useRelativeTime() {
  const { t, locale } = useT();
  const intl = locale === 'de' ? 'de-DE' : 'en-IE';
  return (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    const time = d.toLocaleTimeString(intl, { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === today.toDateString()) return `${t('home.today')} · ${time}`;
    if (d.toDateString() === yesterday.toDateString()) return `${t('home.yesterday')} · ${time}`;
    return `${d.toLocaleDateString(intl, { day: 'numeric', month: 'short' })} · ${time}`;
  };
}

export function TransactionList({
  transactions,
  loading,
  emptyTitle,
  emptyBody,
}: {
  transactions: WalletTransaction[] | undefined;
  loading: boolean;
  emptyTitle: string;
  emptyBody: string;
}) {
  const { t, money } = useT();
  const when = useRelativeTime();

  if (loading || !transactions) {
    return (
      <View className="gap-4 pt-2">
        {[0, 1, 2].map((i) => (
          <View key={i} className="flex-row items-center gap-3">
            <Skeleton width={44} height={44} radius={12} />
            <View className="flex-1 gap-2">
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={12} />
            </View>
            <Skeleton width={64} height={14} />
          </View>
        ))}
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View className="items-center gap-2 py-6">
        <EmptyReceiptsIllustration size={120} />
        <Text variant="headline" className="pt-2" style={{ fontFamily: 'Inter-Bold' }}>
          {emptyTitle}
        </Text>
        <Text tone="secondary" className="px-6 text-center">
          {emptyBody}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {transactions.map((tx, i) => {
        const { icon, color, bg } = iconFor(tx);
        const title = tx.kind === 'topup' ? t('home.topup') : tx.counterpartyName || t('home.topup');
        const amount = `${tx.amountCents > 0 ? '+' : '−'}${money(Math.abs(tx.amountCents))}`;
        return (
          <Animated.View key={tx.id} entering={FadeInDown.duration(320).delay(Math.min(i, 6) * 45)}>
            <ListRow
              icon={icon}
              iconColor={color}
              iconBackground={bg}
              title={title}
              subtitle={when(tx.createdAt)}
              accessibilityLabel={`${title}, ${amount}, ${when(tx.createdAt)}`}
              trailing={
                <Text
                  variant="callout"
                  tone={tx.amountCents > 0 ? 'success' : 'primary'}
                  style={{ fontFamily: 'Inter-Bold', fontVariant: ['tabular-nums'] }}
                >
                  {amount}
                </Text>
              }
            />
          </Animated.View>
        );
      })}
    </View>
  );
}
