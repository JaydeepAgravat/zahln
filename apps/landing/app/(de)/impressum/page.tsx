import type { Metadata } from 'next';
import { LegalPlaceholder } from '@/components/LegalPlaceholder';

export const metadata: Metadata = { title: 'Impressum · Zahln', robots: { index: false } };

export default function Page() {
  return <LegalPlaceholder title="Impressum" />;
}
