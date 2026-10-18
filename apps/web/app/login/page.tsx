import type { Metadata } from 'next';
import { serverLocale, translator } from '@/lib/i18n';
import { LoginForm } from './LoginForm';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('login.verify') };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const wallet = (await searchParams).for === 'wallet';
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <ReceiptMark />
        <LoginForm audience={wallet ? 'consumer' : 'business'} />
      </div>
    </main>
  );
}

/** The Zahln mark as a till receipt with a torn edge: the same Quittung motif as the apps. */
function ReceiptMark() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className="size-20">
      <rect width="120" height="120" rx="28" fill="#FF4F1F" />
      <path d="M34 26h52v62l-6.5 6-6.5-6-6.5 6-6.5-6-6.5 6-6.5-6-6.5 6-6.5-6z" fill="#FFFDFA" />
      <path
        d="M46 46h28L46 70h28"
        fill="none"
        stroke="#1B1A17"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
