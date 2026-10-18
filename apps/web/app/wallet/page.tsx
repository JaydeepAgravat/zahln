import type { Metadata } from 'next';
import Link from 'next/link';
import { dateTime, money } from '@/lib/format';
import { serverLocale, translator } from '@/lib/i18n';
import { serverGet } from '@/lib/server';
import type { WalletView } from '@/lib/types';
import { ExportButton } from './ExportButton';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('wallet.title') };
}

export default async function WalletPage() {
  const [{ wallet }, locale] = await Promise.all([serverGet<WalletView>('/web/wallet'), serverLocale()]);
  const t = translator(locale);
  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg bg-ink px-6 py-6 text-on-ink">
        <p className="text-callout text-on-ink-muted">{t('wallet.balance')}</p>
        <p className="text-[clamp(2.5rem,9vw,3.5rem)] leading-tight font-bold tracking-tight tabular-nums">
          {money(wallet.balanceCents, locale)}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-headline font-semibold">{t('wallet.history')}</h2>
        {wallet.transactions.length === 0 ? (
          <p className="text-callout text-text-tertiary">{t('wallet.empty')}</p>
        ) : (
          <ul className="rounded-md border border-border bg-surface">
            {wallet.transactions.map((tx) => {
              const label =
                tx.kind === 'topup'
                  ? t('wallet.topup')
                  : tx.kind === 'refund'
                    ? `${t('wallet.refund')} · ${tx.counterpartyName}`
                    : tx.counterpartyName;
              const row = (
                <>
                  <span className="flex flex-col">
                    <span className="font-medium">{label}</span>
                    <span className="font-mono text-caption text-text-tertiary tabular-nums">
                      {dateTime(tx.createdAt, locale)}
                    </span>
                  </span>
                  {/* Outgoing money isn't an error: ink, not red. Incoming is green. */}
                  <span className={`font-semibold tabular-nums ${tx.amountCents > 0 ? 'text-success' : ''}`}>
                    {tx.amountCents > 0 ? '+' : '−'}
                    {money(Math.abs(tx.amountCents), locale)}
                  </span>
                </>
              );
              return (
                <li key={tx.id} className="border-b border-border last:border-0">
                  {tx.intentId && tx.kind === 'payment' ? (
                    <Link
                      href={`/wallet/r/${tx.intentId}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-muted/60"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-4 px-4 py-3">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/wallet/devices"
          className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4 hover:bg-surface-muted/60"
        >
          <span className="font-semibold">{t('wallet.devices')} →</span>
          <span className="text-footnote text-text-tertiary">{t('wallet.devicesSub')}</span>
        </Link>
        <ExportButton />
      </section>
    </div>
  );
}
