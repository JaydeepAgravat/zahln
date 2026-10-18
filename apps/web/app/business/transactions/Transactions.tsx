'use client';

import { INTENT_STATUSES } from '@zahln/shared';
import { Button, Card, Empty, Field, Input, Select, Spinner } from '@zahln/web-ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useT } from '@/components/I18n';
import { Status } from '@/components/Status';
import { api } from '@/lib/client';
import { dateTime, money } from '@/lib/format';
import type { TxFilters, TxPage } from '@/lib/types';
import { ReceiptSheet } from '../_components/ReceiptSheet';

/**
 * Server-rendered first page (filters live in the URL, so a link shows the same list);
 * "load more" pages with the API's keyset cursor on the client.
 */
export function Transactions({ filters, initial }: { filters: TxFilters; initial: TxPage }) {
  const { t, locale } = useT();
  const router = useRouter();
  const path = usePathname();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(filters.q ?? '');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial.items);
    setCursor(initial.nextCursor);
  }, [initial]);

  const apply = (next: TxFilters) => {
    const params = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    startTransition(() => router.replace(`${path}${params.size ? `?${params}` : ''}`));
  };

  // Typing searches after a short pause, without a submit button.
  useEffect(() => {
    if (q === (filters.q ?? '')) return;
    const id = setTimeout(() => apply({ ...filters, q }), 300);
    return () => clearTimeout(id);
  });

  const more = async () => {
    if (!cursor) return;
    setLoading(true);
    const page = await api<TxPage>(
      'GET',
      `/web/business/transactions?${new URLSearchParams({ ...filters, cursor, limit: '30' })}`,
    );
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-bold tracking-tight">{t('tx.title')}</h1>
      <div className="flex flex-wrap items-end gap-3">
        <Input
          type="search"
          aria-label={t('tx.search')}
          placeholder={t('tx.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs flex-1"
        />
        <Select
          aria-label={t('tx.status')}
          value={filters.status ?? ''}
          onChange={(e) =>
            apply({ ...filters, status: (e.target.value || undefined) as TxFilters['status'] })
          }
          className="w-44"
        >
          <option value="">{t('tx.allStatuses')}</option>
          {INTENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </Select>
        <Field label={t('tx.from')}>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => apply({ ...filters, from: e.target.value || undefined })}
              className="w-40"
            />
          )}
        </Field>
        <Field label={t('tx.to')}>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => apply({ ...filters, to: e.target.value || undefined })}
              className="w-40"
            />
          )}
        </Field>
        {pending ? <Spinner className="mb-3 text-text-tertiary" /> : null}
      </div>

      <Card>
        {items.length === 0 ? (
          <Empty title={t('tx.empty')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-callout">
              <thead>
                <tr className="border-b border-border text-left text-caption text-text-tertiary uppercase">
                  <th className="px-5 py-2.5 font-medium">{t('tx.time')}</th>
                  <th className="px-5 py-2.5 font-medium">{t('tx.receipt')}</th>
                  <th className="px-5 py-2.5 font-medium">{t('tx.staff')}</th>
                  <th className="px-5 py-2.5 font-medium">{t('tx.payer')}</th>
                  <th className="px-5 py-2.5 text-right font-medium">{t('tx.amount')}</th>
                  <th className="px-5 py-2.5 font-medium">{t('tx.status')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr
                    key={x.id}
                    tabIndex={0}
                    onClick={() => setOpen(x.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setOpen(x.id)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none"
                  >
                    <td className="px-5 py-3 font-mono text-footnote whitespace-nowrap text-text-secondary tabular-nums">
                      {dateTime(x.paidAt ?? x.createdAt, locale)}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{x.receiptNumber ?? '–'}</td>
                    <td className="px-5 py-3">{x.staffName}</td>
                    <td className="px-5 py-3">
                      {x.payerName ?? <span className="text-text-tertiary">–</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                      {money(x.amountCents, locale)}
                      {x.refundedCents ? (
                        <span className="block text-caption text-warning">
                          −{money(x.refundedCents, locale)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <Status status={x.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {cursor ? (
        <Button className="self-center" busy={loading} onClick={more}>
          {t('tx.more')}
        </Button>
      ) : null}
      <ReceiptSheet intentId={open} onClose={() => setOpen(null)} onChanged={() => router.refresh()} />
    </div>
  );
}
