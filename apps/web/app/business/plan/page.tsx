import type { Metadata } from 'next';
import { serverLocale, translator } from '@/lib/i18n';
import { getSession } from '@/lib/server';
import { PlanView } from './PlanView';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('nav.plan') };
}

export default async function PlanPage() {
  const session = await getSession();
  return <PlanView current={session.merchant?.plan ?? 'free'} isOwner={session.role === 'owner'} />;
}
