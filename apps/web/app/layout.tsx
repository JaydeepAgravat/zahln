import '@fontsource-variable/inter';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/components/I18n';
import { ToastProvider } from '@/components/Toast';
import { serverLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: { default: 'Zaster Business', template: '%s · Zaster Business' },
  robots: { index: false },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F3EE' },
    { media: '(prefers-color-scheme: dark)', color: '#121110' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await serverLocale();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-bg text-text-primary">
        <I18nProvider locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
