import type { PaymentIntent } from '@zaster/shared';
import Link from 'next/link';
import { dateTime, money } from '@/lib/format';
import { serverLocale, translator } from '@/lib/i18n';
import { serverGet } from '@/lib/server';

export default async function WalletReceipt({ params }: { params: Promise<{ intentId: string }> }) {
  const { intentId } = await params;
  const [{ intent, tipCents }, locale] = await Promise.all([
    serverGet<{ intent: PaymentIntent; tipCents: number }>(
      `/web/wallet/receipts/${encodeURIComponent(intentId)}`,
    ),
    serverLocale(),
  ]);
  const t = translator(locale);
  return (
    <div className="flex flex-col gap-6">
      <Link href="/wallet" className="text-footnote text-text-secondary hover:text-text-primary">
        {t('wallet.back')}
      </Link>
      <section className="flex flex-col gap-3 rounded-lg bg-surface p-6 text-callout">
        <p className="text-headline font-bold">{intent.merchant.name}</p>
        <p className="font-mono text-footnote text-text-tertiary">
          {dateTime(intent.paidAt ?? intent.createdAt, locale)}
          {intent.receiptNumber ? ` · ${t('receipt.title', { number: intent.receiptNumber })}` : ''}
        </p>
        {intent.items.map((item) => (
          <div key={item.sku} className="flex justify-between gap-4">
            <span>
              {item.qty}× {item.name}
            </span>
            <span className="tabular-nums">{money(item.unitPriceCents * item.qty, locale)}</span>
          </div>
        ))}
        {tipCents ? (
          <div className="flex justify-between text-text-secondary">
            <span>{t('receipt.tip')}</span>
            <span className="tabular-nums">{money(tipCents, locale)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-dashed border-border-strong pt-3 font-semibold">
          <span>{t('receipt.total')}</span>
          <span className="tabular-nums">{money(intent.amountCents + tipCents, locale)}</span>
        </div>
        {intent.refundedCents ? (
          <div className="flex justify-between text-success">
            <span>{t('receipt.refunded')}</span>
            <span className="tabular-nums">+{money(intent.refundedCents, locale)}</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
