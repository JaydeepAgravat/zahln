import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Document } from '@/components/Document';
import { en } from '@/content/en';
import { palette } from '@/lib/tokens';
import '../globals.css';
import '../tears.gen.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://edition.zahln.example'),
  title: en.meta.title,
  description: en.meta.description,
  alternates: { canonical: '/en/', languages: { de: '/', en: '/en/' } },
  openGraph: { title: en.meta.title, description: en.meta.description, locale: 'en_GB', type: 'website' },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: palette.ink, colorScheme: 'dark light' };

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <Document lang="en">{children}</Document>;
}
