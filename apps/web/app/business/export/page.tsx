import { hasFeature } from '@zaster/shared';
import type { Metadata } from 'next';
import { serverLocale, translator } from '@/lib/i18n';
import { getSession } from '@/lib/server';
import { ExportView } from './ExportView';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('nav.export') };
}

export default async function ExportPage() {
  const session = await getSession();
  return <ExportView allowed={session.merchant ? hasFeature(session.merchant.plan, 'csv_export') : false} />;
}
