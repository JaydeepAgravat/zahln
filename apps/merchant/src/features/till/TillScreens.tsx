import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  ApiRequestError,
  haptic,
  payments,
  useMe,
  useMerchantWallet,
  usePrefs,
  useT,
  uuid,
} from '@zahln/mobile-core';
import {
  AmountDisplay,
  BalanceCard,
  Button,
  greetingKey,
  Icon,
  IconButton,
  type IconName,
  Keypad,
  PressableScale,
  Skeleton,
  StatusBadge,
  Text,
  TillIllustration,
  TransactionList,
  toast,
  useTheme,
} from '@zahln/mobile-ui';
import { applyKeypadKey, type CatalogueItem, isPayable } from '@zahln/shared';
import { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeStackParamList } from '../../app/navigation/types';
import { cartTotal, useCart } from './cart';
import { openIntent } from './openIntent';

export function useCurrentMerchant() {
  const merchantId = usePrefs((s) => s.merchantId);
  const me = useMe();
  return me.data?.memberships.find((m) => m.merchantId === merchantId) ?? null;
}

function MerchantHeader({ onMyQr }: { onMyQr?: () => void }) {
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
      {onMyQr ? <IconButton icon="qr" label={t('myQr.title')} onPress={onMyQr} /> : null}
    </Animated.View>
  );
}

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

const SKU_ICONS: Record<string, IconName> = {
  cappuccino: 'coffee',
  'flat-white': 'coffee',
  'matcha-latte': 'leaf',
  espresso: 'coffeeBean',
  croissant: 'bread',
  'avocado-toast': 'avocado',
  tagesgericht: 'bowl',
  'vegan-bowl': 'leaf',
  salat: 'leaf',
  kaffee: 'coffee',
};

function ModeSwitch() {
  const { t } = useT();
  const mode = useCart((s) => s.mode);
  const setMode = useCart((s) => s.setMode);
  const options = [
    { value: 'catalogue', label: t('till.catalogue'), icon: 'grid' },
    { value: 'amount', label: t('till.amount'), icon: 'keypad' },
  ] as const;
  return (
    <View className="flex-row rounded-full bg-surface-muted p-1" accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === mode;
        return (
          <PressableScale
            key={o.value}
            onPress={() => {
              haptic.select();
              setMode(o.value);
            }}
            scaleTo={0.96}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            className={`min-h-[40px] flex-1 flex-row items-center justify-center gap-2 rounded-full ${active ? 'bg-surface-raised' : ''}`}
          >
            <Icon
              name={o.icon}
              size={18}
              color={active ? 'textPrimary' : 'textSecondary'}
              weight={active ? 'fill' : 'regular'}
            />
            <Text
              variant="callout"
              tone={active ? 'primary' : 'secondary'}
              style={{ fontFamily: 'Inter-SemiBold' }}
            >
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function ProductTile({ item, qty }: { item: CatalogueItem; qty: number }) {
  const { t, money } = useT();
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const selected = qty > 0;
  return (
    <PressableScale
      onPress={() => {
        haptic.tap();
        add(item.sku);
      }}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={t('till.add', { name: item.name, price: money(item.priceCents) })}
      accessibilityValue={selected ? { text: `${qty}×` } : undefined}
      className={`min-h-[132px] flex-1 justify-between rounded-lg border-2 bg-surface p-4 ${selected ? 'border-brand' : 'border-border'}`}
    >
      <View className="flex-row items-start justify-between">
        <View
          className={`h-11 w-11 items-center justify-center rounded-md ${selected ? 'bg-brand-subtle' : 'bg-surface-muted'}`}
        >
          <Icon
            name={SKU_ICONS[item.sku] ?? 'bag'}
            size={24}
            color={selected ? 'brandText' : 'textPrimary'}
            weight="duotone"
          />
        </View>
        {selected ? (
          <Animated.View
            entering={ZoomIn.springify().damping(14)}
            className="h-8 min-w-[32px] items-center justify-center rounded-full bg-brand px-2"
          >
            <Text
              variant="callout"
              tone="on-brand"
              style={{ fontFamily: 'Inter-Bold', fontVariant: ['tabular-nums'] }}
            >
              {qty}
            </Text>
          </Animated.View>
        ) : null}
      </View>
      <View className="gap-0.5">
        <Text variant="callout" numberOfLines={2} style={{ fontFamily: 'Inter-SemiBold' }}>
          {item.name}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
            {money(item.priceCents)}
          </Text>
          {selected ? (
            <PressableScale
              onPress={() => {
                haptic.tap();
                remove(item.sku);
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('till.remove', { name: item.name })}
              className="h-7 w-7 items-center justify-center rounded-full bg-surface-muted"
            >
              <Icon name="minus" size={16} color="textPrimary" weight="bold" />
            </PressableScale>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

function CatalogueGrid({ catalogue }: { catalogue: CatalogueItem[] | undefined }) {
  const lines = useCart((s) => s.lines);
  if (!catalogue) {
    return (
      <View className="flex-row flex-wrap gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="48%" height={132} radius={20} />
        ))}
      </View>
    );
  }
  const rows: CatalogueItem[][] = [];
  for (let i = 0; i < catalogue.length; i += 2) rows.push(catalogue.slice(i, i + 2));
  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row.map((r) => r.sku).join()} className="flex-row gap-3">
          {row.map((item) => (
            <ProductTile key={item.sku} item={item} qty={lines[item.sku] ?? 0} />
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

function AmountEntry() {
  const { t } = useT();
  const amountCents = useCart((s) => s.amountCents);
  const setAmount = useCart((s) => s.setAmount);
  return (
    <View className="flex-1 justify-between gap-4">
      <View className="flex-1 items-center justify-center gap-1">
        <Text variant="footnote" tone="tertiary">
          {t('till.enterAmount')}
        </Text>
        <AmountDisplay cents={amountCents} tone={amountCents ? 'primary' : 'tertiary'} />
      </View>
      <Keypad
        mode="amount"
        onKey={(key) => key !== 'biometric' && setAmount(applyKeypadKey(amountCents, key))}
      />
    </View>
  );
}

/**
 * The till: ring up items from the catalogue (or type an amount), then one tap creates a one-time,
 * 5-minute QR for exactly this order. The server prices the cart itself; the till only shows it.
 */
export function TillScreen() {
  const { t, money } = useT();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const merchant = useCurrentMerchant();
  const cart = useCart();
  const catalogue = useQuery({
    queryKey: ['catalogue', merchant?.merchantId],
    queryFn: () => payments.catalogue(merchant?.merchantId ?? ''),
    enabled: !!merchant,
    staleTime: 5 * 60_000,
  });
  const total = cartTotal(cart, catalogue.data);
  const clearCart = useCart((s) => s.clear);

  // Back from an auto-lock (or an app restart) mid-payment: show the open QR again, or the result.
  useEffect(() => {
    const id = openIntent.get();
    if (!id) return;
    payments
      .intent(id)
      .then((intent) => {
        if (intent.status === 'paid') {
          openIntent.clear();
          clearCart();
          navigation.navigate('Paid', { intent });
        } else if (isPayable(intent.status) && Date.parse(intent.expiresAt) > Date.now()) {
          navigation.navigate('Qr', { intent });
        } else {
          openIntent.clear();
        }
      })
      .catch(() => undefined);
  }, [navigation, clearCart]);
  // One key per order: a retry after a network error returns the same intent instead of a second QR.
  const orderKey = useRef<string | null>(null);
  const [creating, setCreating] = useState(false);

  const charge = async () => {
    if (!merchant || total.cents === 0) return;
    orderKey.current ??= uuid();
    setCreating(true);
    try {
      const body =
        cart.mode === 'amount'
          ? { amountCents: cart.amountCents }
          : { items: Object.entries(cart.lines).map(([sku, qty]) => ({ sku, qty })) };
      const intent = await payments.createIntent(merchant.merchantId, body, orderKey.current);
      orderKey.current = null;
      haptic.success();
      navigation.navigate('Qr', { intent });
    } catch (error) {
      haptic.error();
      const plan = error instanceof ApiRequestError && error.code === 'plan_required';
      toast(t(plan ? 'till.planRequired' : 'till.createFailed'), 'warning');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1 gap-4 px-5 pt-2">
        <MerchantHeader onMyQr={() => navigation.navigate('MyQr')} />
        {merchant?.plan === 'free' ? (
          // Free plan: no one-time QR codes. Say so up front and point to what does work.
          <View className="flex-1 items-center justify-center gap-4 px-2">
            <TillIllustration width={220} />
            <Text tone="secondary" className="text-center">
              {t('myQr.freePlan')}
            </Text>
            <View className="w-full">
              <Button title={t('myQr.title')} icon="qr" onPress={() => navigation.navigate('MyQr')} />
            </View>
          </View>
        ) : null}
        {merchant?.plan === 'free' ? null : <ModeSwitch />}
        {merchant?.plan === 'free' ? null : cart.mode === 'catalogue' ? (
          <ScrollView contentContainerClassName="pb-4" showsVerticalScrollIndicator={false}>
            <CatalogueGrid catalogue={catalogue.data} />
          </ScrollView>
        ) : (
          <AmountEntry />
        )}
      </View>
      {merchant?.plan === 'free' ? null : (
        <View className="gap-3 border-t border-border bg-surface px-5 pb-4 pt-3">
          <View className="flex-row items-center justify-between">
            <Text variant="footnote" tone="secondary">
              {total.count > 0 ? t('till.items', { count: total.count }) : t('till.emptyCart')}
            </Text>
            {total.count > 0 ? (
              <PressableScale onPress={cart.clear} hitSlop={8} accessibilityRole="button">
                <Text variant="footnote" tone="brand" style={{ fontFamily: 'Inter-SemiBold' }}>
                  {t('till.clear')}
                </Text>
              </PressableScale>
            ) : null}
          </View>
          <Button
            title={total.cents > 0 ? t('till.charge', { amount: money(total.cents) }) : t('till.createQr')}
            icon="qr"
            loading={creating}
            disabled={total.cents === 0 || !merchant}
            onPress={() => void charge()}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

export function MerchantWalletScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const wallet = useMerchantWallet();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
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
          label={t('merchant.todayRevenue')}
          cents={todaysTakings(wallet.data?.transactions)}
          footnote={t('merchant.payout')}
        />
        <View className="gap-1">
          <Text variant="headline" accessibilityRole="header" style={{ fontFamily: 'Inter-Bold' }}>
            {t('home.recent')}
          </Text>
          <TransactionList
            onPress={(tx) => tx.intentId && navigation.navigate('Payment', { intentId: tx.intentId })}
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
