'use client';

import { Badge, Card, cx } from '@zahln/web-ui';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/components/I18n';
import { Status } from '@/components/Status';
import { API_URL, api } from '@/lib/client';
import { berlinDate, day, money, time } from '@/lib/format';
import type { Summary, Tx, TxPage } from '@/lib/types';
import { ReceiptSheet } from './ReceiptSheet';

/** Counts up from the previous value to the new one, so a new payment is felt, not just shown. */
function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      from.current = target;
      return;
    }
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / 700, 1);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(begin + (target - begin) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

type Live = 'off' | 'connecting' | 'live' | 'reconnecting';

export function Today({ initialSummary, initialFeed }: { initialSummary: Summary; initialFeed: Tx[] }) {
  const { t, locale } = useT();
  const [summary, setSummary] = useState(initialSummary);
  const [feed, setFeed] = useState(initialFeed);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [live, setLive] = useState<Live>(initialSummary.live ? 'connecting' : 'off');
  const [open, setOpen] = useState<string | null>(null);
  const takings = useCountUp(summary.today.cents);

  useEffect(() => {
    if (!initialSummary.live) return;
    // SSE straight to the API with the session cookie. The stream is a hint: on every event (and on
    // every reconnect) the numbers are refetched, so a dropped minute heals itself.
    const source = new EventSource(`${API_URL}/web/business/events`, { withCredentials: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = (changed?: string) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const [s, f] = await Promise.all([
          api<Summary>('GET', '/web/business/summary'),
          api<TxPage>('GET', '/web/business/transactions?limit=8'),
        ]);
        setSummary(s);
        setFeed((prev) => {
          const known = new Set(prev.map((x) => x.id));
          const arrived = f.items.filter((x) => !known.has(x.id)).map((x) => x.id);
          if (changed && !arrived.includes(changed)) arrived.push(changed);
          setFresh(new Set(arrived));
          return f.items;
        });
      }, 120);
    };
    source.addEventListener('ready', () => {
      setLive('live');
      refresh();
    });
    source.addEventListener('intent', (e) =>
      refresh((JSON.parse((e as MessageEvent).data) as { id: string }).id),
    );
    source.onerror = () => setLive('reconnecting');
    return () => {
      clearTimeout(timer);
      source.close();
    };
  }, [initialSummary.live]);

  const today = berlinDate();
  // Today's rows show the time; older ones (the feed starts with the latest) also show the day.
  const when = (iso: string) =>
    berlinDate(new Date(iso)) === today ? time(iso, locale) : `${day(iso, locale)}, ${time(iso, locale)}`;
  const firstHour = Math.min(7, ...summary.byHour.flatMap((c, h) => (c > 0 ? [h] : [])));
  const hours = summary.byHour.slice(firstHour, 23).map((cents, i) => ({ hour: firstHour + i, cents }));
  const maxHour = Math.max(...hours.map((h) => h.cents), 1);
  const maxDay = Math.max(...summary.week.map((d) => d.cents), 1);
  const staffTotal = summary.byStaff.reduce((s, x) => s + x.cents, 0) || 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-bold tracking-tight">{t('today.title')}</h1>
        {live === 'off' ? (
          <Badge>{t('today.liveOff')}</Badge>
        ) : (
          <span aria-live="polite" className="flex items-center gap-2 text-footnote text-text-secondary">
            <span
              className={cx(
                'size-2 rounded-full',
                live === 'live'
                  ? 'animate-pulse bg-success'
                  : live === 'reconnecting'
                    ? 'bg-danger'
                    : 'bg-pending',
              )}
            />
            {live === 'reconnecting' ? t('today.reconnecting') : t('today.live')}
          </span>
        )}
      </div>

      <section className="relative overflow-hidden rounded-lg bg-ink px-6 pt-6 pb-8 text-on-ink">
        <p className="text-callout text-on-ink-muted">{t('today.takings')}</p>
        <p className="mt-1 text-[clamp(2.75rem,7vw,4.5rem)] leading-none font-bold tracking-tight text-brand tabular-nums">
          <span aria-hidden>{money(takings, locale)}</span>
          <span className="sr-only">{money(summary.today.cents, locale)}</span>
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 text-callout text-on-ink-muted">
          <span>{t('today.payments', { count: summary.today.count })}</span>
          {summary.today.tipCents ? (
            <span>{t('today.tips', { amount: money(summary.today.tipCents, locale) })}</span>
          ) : null}
          {summary.today.refundedCents ? (
            <span>{t('today.refunded', { amount: money(summary.today.refundedCents, locale) })}</span>
          ) : null}
        </p>
        {/* The receipt's torn edge, as on the phones. */}
        <svg
          aria-hidden
          viewBox="0 0 400 10"
          preserveAspectRatio="none"
          className="absolute inset-x-0 -bottom-px h-2.5 w-full"
        >
          <path
            d={`M0 10 ${Array.from({ length: 40 }, (_, i) => `L${i * 10 + 5} 0 L${i * 10 + 10} 10`).join(' ')} Z`}
            fill="var(--color-bg)"
          />
        </svg>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <Card title={t('today.byHour')}>
            <div
              className="flex h-40 items-end gap-1 px-5 pt-4 pb-2"
              role="img"
              aria-label={t('today.byHour')}
            >
              {hours.map(({ hour, cents }) => (
                <div key={hour} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    title={`${hour}:00 · ${money(cents, locale)}`}
                    className={cx(
                      'w-full rounded-t-xs transition-[height] duration-500',
                      cents ? 'bg-brand' : 'bg-border',
                    )}
                    style={{ height: `${Math.max((cents / maxHour) * 112, 2)}px` }}
                  />
                  <span className="text-[10px] text-text-tertiary tabular-nums">{hour}</span>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card title={t('today.week')}>
              <ul className="flex flex-col gap-2 px-5 py-4">
                {summary.week.map((d) => (
                  <li key={d.day} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-footnote">
                    <span className="text-text-secondary">{day(`${d.day}T12:00:00Z`, locale)}</span>
                    <span className="h-2 rounded-full bg-surface-muted">
                      <span
                        className="block h-2 rounded-full bg-text-primary"
                        style={{ width: `${(d.cents / maxDay) * 100}%` }}
                      />
                    </span>
                    <span className="font-medium tabular-nums">{money(d.cents, locale)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={t('today.byStaff')}>
              <ul className="flex flex-col gap-3 px-5 py-4">
                {summary.byStaff.length === 0 ? (
                  <li className="text-footnote text-text-tertiary">–</li>
                ) : null}
                {summary.byStaff.map((s) => (
                  <li key={s.name} className="flex flex-col gap-1 text-footnote">
                    <span className="flex justify-between">
                      <span>{s.name}</span>
                      <span className="font-medium tabular-nums">{money(s.cents, locale)}</span>
                    </span>
                    <span className="h-1.5 rounded-full bg-surface-muted">
                      <span
                        className="block h-1.5 rounded-full bg-brand"
                        style={{ width: `${(s.cents / staffTotal) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <Card title={summary.live ? t('today.feed') : t('today.recent')} className="self-start">
          {feed.length === 0 ? (
            <p className="px-5 py-8 text-center text-footnote text-text-tertiary">
              {summary.live ? t('today.feedEmpty') : t('today.recentEmpty')}
            </p>
          ) : (
            <ul>
              {feed.map((x) => (
                <li
                  key={x.id}
                  className={cx('border-b border-border last:border-0', fresh.has(x.id) && 'animate-arrive')}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(x.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-surface-muted/60"
                  >
                    <span className="flex flex-col">
                      <span className="text-callout font-semibold tabular-nums">
                        {money(x.amountCents, locale)}
                      </span>
                      <span className="text-caption text-text-tertiary">
                        {when(x.paidAt ?? x.createdAt)} · {x.payerName ?? x.staffName}
                      </span>
                    </span>
                    <Status status={x.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <ReceiptSheet intentId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
