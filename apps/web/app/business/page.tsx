import type { Metadata } from 'next';
import { serverLocale, translator } from '@/lib/i18n';
import { serverGet } from '@/lib/server';
import type { Summary, TxPage } from '@/lib/types';
import { Today } from './_components/Today';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('nav.today') };
}

export default async function TodayPage() {
  const [summary, feed] = await Promise.all([
    serverGet<Summary>('/web/business/summary'),
    serverGet<TxPage>('/web/business/transactions?limit=8'),
  ]);
  return <Today initialSummary={summary} initialFeed={feed.items} />;
}
