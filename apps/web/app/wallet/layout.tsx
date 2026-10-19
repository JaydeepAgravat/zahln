import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LocaleSwitch, SignOut } from '@/components/Nav';
import { StepUpProvider } from '@/components/StepUp';
import { serverGet } from '@/lib/server';
import type { WalletView } from '@/lib/types';

export const metadata: Metadata = { title: { default: 'Zaster Wallet', template: '%s · Zaster' } };

/** The consumer's web wallet: read-mostly (balance, receipts, devices, data export). Paying stays in the app or on a pay link. */
export default async function WalletLayout({ children }: { children: ReactNode }) {
  const { user } = await serverGet<WalletView>('/web/wallet');
  return (
    <StepUpProvider phone={user.phone}>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
        <header className="mb-8 flex items-center justify-between gap-3">
          <Link href="/wallet" className="flex items-center gap-2 font-semibold">
            <Image src="/favicon.svg" alt="" width={28} height={28} /> Zaster
          </Link>
          <span className="flex items-center gap-4 text-footnote">
            <span className="text-text-secondary">{user.name}</span>
            <LocaleSwitch />
            <SignOut />
          </span>
        </header>
        {children}
      </div>
    </StepUpProvider>
  );
}
