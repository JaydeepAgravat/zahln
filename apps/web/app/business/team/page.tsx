import type { Metadata } from 'next';
import { serverLocale, translator } from '@/lib/i18n';
import { serverGet } from '@/lib/server';
import type { Team } from '@/lib/types';
import { TeamView } from './TeamView';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('nav.team') };
}

export default async function TeamPage() {
  return <TeamView initial={await serverGet<Team>('/web/business/staff')} />;
}
