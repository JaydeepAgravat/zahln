import type { Metadata } from 'next';
import { serverLocale, translator } from '@/lib/i18n';
import { getSession, serverGet } from '@/lib/server';
import type { Payouts } from '@/lib/types';
import { PayoutsView } from './PayoutsView';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('nav.payouts') };
}

export default async function PayoutsPage() {
  const [payouts, session] = await Promise.all([serverGet<Payouts>('/web/business/payouts'), getSession()]);
  return <PayoutsView initial={payouts} isOwner={session.role === 'owner'} />;
}
