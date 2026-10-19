import { hasFeature } from '@zaster/shared';
import type { Metadata } from 'next';
import { serverLocale, translator } from '@/lib/i18n';
import { getSession } from '@/lib/server';
import { RequestForm } from './RequestForm';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('nav.requests') };
}

export default async function RequestsPage() {
  const session = await getSession();
  return <RequestForm allowed={session.merchant ? hasFeature(session.merchant.plan, 'dynamic_qr') : false} />;
}
