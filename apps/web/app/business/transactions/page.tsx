import { INTENT_STATUSES, type IntentStatus } from '@zahln/shared';
import type { Metadata } from 'next';
import { serverLocale, translator } from '@/lib/i18n';
import { serverGet } from '@/lib/server';
import type { TxFilters, TxPage } from '@/lib/types';
import { Transactions } from './Transactions';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('nav.transactions') };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const one = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : undefined);
  // Only well-formed filters reach the API; the URL is user input like any other.
  const filters: TxFilters = {};
  const q = one('q')?.slice(0, 40);
  if (q) filters.q = q;
  const status = one('status');
  if (status && (INTENT_STATUSES as readonly string[]).includes(status))
    filters.status = status as IntentStatus;
  const from = one('from');
  if (from && DATE.test(from)) filters.from = from;
  const to = one('to');
  if (to && DATE.test(to)) filters.to = to;

  const page = await serverGet<TxPage>(
    `/web/business/transactions?${new URLSearchParams({ ...filters, limit: '30' })}`,
  );
  return <Transactions filters={filters} initial={page} />;
}
