import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Document } from '@/components/Document';
import { de } from '@/content/de';
import { palette } from '@/lib/tokens';
import '../globals.css';
import '../tears.gen.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://edition.zaster.example'),
  title: de.meta.title,
  description: de.meta.description,
  alternates: { canonical: '/', languages: { de: '/', en: '/en/' } },
  openGraph: { title: de.meta.title, description: de.meta.description, locale: 'de_DE', type: 'website' },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: palette.ink, colorScheme: 'dark light' };

export default function GermanLayout({ children }: { children: ReactNode }) {
  return <Document lang="de">{children}</Document>;
}
