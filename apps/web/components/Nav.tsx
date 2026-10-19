'use client';

import { cx } from '@zaster/web-ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import type { MessageKey } from '@/lib/i18n-messages';
import { useT } from './I18n';

export const PAGES: { href: string; key: MessageKey }[] = [
  { href: '/business', key: 'nav.today' },
  { href: '/business/transactions', key: 'nav.transactions' },
  { href: '/business/requests', key: 'nav.requests' },
  { href: '/business/payouts', key: 'nav.payouts' },
  { href: '/business/team', key: 'nav.team' },
  { href: '/business/plan', key: 'nav.plan' },
  { href: '/business/export', key: 'nav.export' },
  { href: '/business/poster', key: 'nav.poster' },
];

export function Nav() {
  const { t } = useT();
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {PAGES.map((p) => {
        const active = p.href === '/business' ? path === p.href : path.startsWith(p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'rounded-sm px-3 py-2 text-callout whitespace-nowrap transition-colors',
              active
                ? 'bg-surface-muted font-semibold text-text-primary'
                : 'text-text-secondary hover:bg-surface-muted/60 hover:text-text-primary',
            )}
          >
            {t(p.key)}
          </Link>
        );
      })}
    </nav>
  );
}

export function SignOut() {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={async () => {
        await api('POST', '/web/auth/logout').catch(() => {});
        window.location.assign('/login');
      }}
      className="text-text-tertiary hover:text-text-primary"
    >
      {t('nav.signOut')}
    </button>
  );
}

export function LocaleSwitch() {
  const { locale } = useT();
  const router = useRouter();
  const next = locale === 'de' ? 'en' : 'de';
  return (
    <button
      type="button"
      aria-label={next === 'en' ? 'Switch to English' : 'Auf Deutsch umstellen'}
      onClick={() => {
        // biome-ignore lint/suspicious/noDocumentCookie: a plain preference cookie, read by the server on the next render
        document.cookie = `zaster_locale=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      className="rounded-sm border border-border px-2 py-0.5 text-caption font-semibold text-text-secondary uppercase hover:text-text-primary"
    >
      {next}
    </button>
  );
}

/** ⌘K / Ctrl+K: type to jump to a page. */
export function CommandPalette() {
  const { t } = useT();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const results = PAGES.filter((p) => t(p.key).toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuery('');
        setIndex(0);
        ref.current?.showModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    ref.current?.close();
    router.push(href);
  };

  return (
    <dialog
      ref={ref}
      aria-label={t('nav.jump')}
      className="m-auto mt-[15vh] w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface-raised p-0 text-text-primary shadow-2xl backdrop:bg-ink/40"
    >
      <input
        autoFocus
        value={query}
        placeholder={t('nav.jump')}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setIndex((i) => Math.min(i + 1, results.length - 1));
          if (e.key === 'ArrowUp') setIndex((i) => Math.max(i - 1, 0));
          const hit = results[index];
          if (e.key === 'Enter' && hit) go(hit.href);
        }}
        className="h-12 w-full border-b border-border bg-transparent px-4 text-body outline-none"
      />
      <ul className="p-2">
        {results.map((p, i) => (
          <li key={p.href}>
            <button
              type="button"
              onClick={() => go(p.href)}
              className={cx(
                'flex w-full justify-between rounded-sm px-3 py-2 text-left text-callout',
                i === index && 'bg-surface-muted',
              )}
            >
              {t(p.key)}
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
