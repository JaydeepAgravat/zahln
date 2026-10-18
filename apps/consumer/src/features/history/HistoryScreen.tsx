import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import { useT, useWallet } from '@zahln/mobile-core';
import { Icon, ListRow, PressableScale, SafeArea, Skeleton, Text, TextField } from '@zahln/mobile-ui';
import type { WalletTransaction } from '@zahln/shared';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { HomeStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'History'>;
type Filter = 'all' | 'payment' | 'refund' | 'topup';
type Row =
  | { type: 'header'; key: string; label: string }
  | { type: 'tx'; key: string; tx: WalletTransaction };

/**
 * Every payment, refund and top-up, grouped by day with sticky headers.
 * Outgoing money is shown in the primary text colour, not red: spending isn't an error.
 */
export function HistoryScreen({ navigation }: Props) {
  const { t, money, locale } = useT();
  const wallet = useWallet(100);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo<Row[]>(() => {
    const tz = locale === 'de' ? 'de-DE' : 'en-GB';
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    const q = query.trim().toLowerCase();
    const out: Row[] = [];
    let lastDay = '';
    for (const tx of wallet.data?.transactions ?? []) {
      if (filter !== 'all' && tx.kind !== filter) continue;
      const name = tx.kind === 'topup' ? t('home.topup') : tx.counterpartyName;
      if (q && !name.toLowerCase().includes(q)) continue;
      const day = new Date(tx.createdAt).toDateString();
      if (day !== lastDay) {
        lastDay = day;
        const label =
          day === today
            ? t('home.today')
            : day === yesterday
              ? t('home.yesterday')
              : new Date(tx.createdAt).toLocaleDateString(tz, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                });
        out.push({ type: 'header', key: `h-${day}`, label });
      }
      out.push({ type: 'tx', key: tx.id, tx });
    }
    return out;
  }, [wallet.data, filter, query, locale, t]);

  const stickyIndices = rows.flatMap((r, i) => (r.type === 'header' ? [i] : []));
  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('history.all') },
    { value: 'payment', label: t('history.payments') },
    { value: 'refund', label: t('history.refunds') },
    { value: 'topup', label: t('history.topups') },
  ];

  return (
    <SafeArea className="flex-1 bg-bg" edges={['top']}>
      <View className="gap-4 px-5 pb-2 pt-2">
        <View className="flex-row items-center gap-3">
          <PressableScale
            onPress={() => navigation.goBack()}
            hapticOnPress
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            className="h-11 w-11 items-center justify-center rounded-full bg-surface"
          >
            <Icon name="back" size={22} color="textPrimary" />
          </PressableScale>
          <Text variant="display" accessibilityRole="header">
            {t('history.title')}
          </Text>
        </View>
        <TextField label={t('history.search')} value={query} onChangeText={setQuery} autoCorrect={false} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-5">
          {filters.map((f) => {
            const active = f.value === filter;
            return (
              <PressableScale
                key={f.value}
                onPress={() => setFilter(f.value)}
                hapticOnPress
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`min-h-[36px] justify-center rounded-full px-3 ${active ? 'bg-ink' : 'bg-surface'}`}
              >
                <Text
                  variant="footnote"
                  tone={active ? 'on-ink' : 'secondary'}
                  style={{ fontFamily: 'Inter-SemiBold' }}
                >
                  {f.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {wallet.isLoading ? (
        <View className="gap-4 px-5 pt-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={52} radius={12} />
          ))}
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(r) => r.key}
          getItemType={(r) => r.type}
          stickyHeaderIndices={stickyIndices}
          // No horizontal padding here: a sticky header is drawn outside the content padding, so rows pad themselves.
          contentContainerStyle={{ paddingBottom: 48 }}
          ListEmptyComponent={
            <Text tone="secondary" className="pt-10 text-center">
              {t('history.empty')}
            </Text>
          }
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <View className="bg-bg px-5 pb-1 pt-4">
                <Text variant="caption" tone="tertiary" className="uppercase" style={{ letterSpacing: 0.8 }}>
                  {item.label}
                </Text>
              </View>
            ) : (
              <View className="px-5">
                <ListRow
                  icon={
                    item.tx.kind === 'payment' ? 'receipt' : item.tx.kind === 'refund' ? 'arrowIn' : 'plus'
                  }
                  iconColor={item.tx.amountCents > 0 ? 'success' : 'brandText'}
                  iconBackground={item.tx.amountCents > 0 ? 'bg-success-subtle' : 'bg-brand-subtle'}
                  title={item.tx.kind === 'topup' ? t('home.topup') : item.tx.counterpartyName}
                  subtitle={new Date(item.tx.createdAt).toLocaleTimeString(
                    locale === 'de' ? 'de-DE' : 'en-GB',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                  chevron={!!item.tx.intentId}
                  onPress={
                    item.tx.intentId
                      ? () => navigation.navigate('Receipt', { intentId: item.tx.intentId as string })
                      : undefined
                  }
                  trailing={
                    <Text
                      variant="callout"
                      tone={item.tx.amountCents > 0 ? 'success' : 'primary'}
                      style={{ fontFamily: 'Inter-Bold', fontVariant: ['tabular-nums'] }}
                    >
                      {`${item.tx.amountCents > 0 ? '+' : '−'}${money(Math.abs(item.tx.amountCents))}`}
                    </Text>
                  }
                />
              </View>
            )
          }
        />
      )}
    </SafeArea>
  );
}
