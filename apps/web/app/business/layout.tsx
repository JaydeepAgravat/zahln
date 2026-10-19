import { Badge } from '@zaster/web-ui';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { CommandPalette, LocaleSwitch, Nav, SignOut } from '@/components/Nav';
import { StepUpProvider } from '@/components/StepUp';
import { getSession } from '@/lib/server';

/** Every /business page: the session is checked on the server (no flash of a page you can't see). */
export default async function BusinessLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const merchant = session.merchant;
  return (
    <StepUpProvider phone={session.user.phone}>
      <div className="min-h-dvh md:pl-60">
        <aside className="flex flex-col gap-6 border-b border-border bg-surface px-4 py-4 md:fixed md:inset-y-0 md:left-0 md:w-60 md:border-r md:border-b-0 md:py-6">
          <div className="flex items-center gap-3 px-2">
            <Image src="/favicon.svg" alt="" width={32} height={32} />
            <div className="min-w-0">
              <p className="truncate text-callout font-semibold">{merchant?.name}</p>
              <p className="flex items-center gap-1.5 text-caption text-text-tertiary">
                @{merchant?.handle}
                {merchant ? (
                  <Badge tone={merchant.plan === 'free' ? 'neutral' : 'brand'}>
                    {merchant.plan[0]?.toUpperCase()}
                    {merchant.plan.slice(1)}
                  </Badge>
                ) : null}
              </p>
            </div>
          </div>
          <Nav />
          <div className="flex flex-col gap-3 px-2 md:mt-auto">
            <p className="text-caption text-text-tertiary">
              <kbd className="rounded-xs border border-border px-1 font-sans">⌘K</kbd>
            </p>
            <div className="flex items-center justify-between gap-2 text-footnote md:border-t md:border-border md:pt-3">
              <span className="truncate">{session.user.name}</span>
              <span className="flex items-center gap-3">
                <LocaleSwitch />
                <SignOut />
              </span>
            </div>
          </div>
        </aside>
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</main>
        <CommandPalette />
      </div>
    </StepUpProvider>
  );
}
