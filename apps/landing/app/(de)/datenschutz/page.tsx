import type { Metadata } from 'next';
import { LegalPlaceholder } from '@/components/LegalPlaceholder';

export const metadata: Metadata = { title: 'Datenschutz · Zahln', robots: { index: false } };

export default function Page() {
  return <LegalPlaceholder title="Datenschutzerklärung" />;
}
