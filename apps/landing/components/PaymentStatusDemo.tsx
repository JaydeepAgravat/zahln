'use client';

import { type AttemptEvent, type AttemptState, attemptReducer, type PaymentIntent } from '@zahln/shared';
import { useEffect, useReducer, useRef, useSyncExternalStore } from 'react';
import type { Copy } from '@/content/types';
import { isPaused, prefersReducedMotion, subscribe } from '@/lib/motionPref';

const INTENT: PaymentIntent = {
  id: '00000000-0000-4000-8000-000000000001',
  ref: 'demo',
  merchant: { id: 'm_demo', name: 'Café Mila', handle: 'cafe-mila', city: 'Augsburg' },
  amountCents: 630,
  currency: 'EUR',
  items: [],
  status: 'awaiting_scan',
  acceptsTips: false,
  refundedCents: 0,
  receiptNumber: null,
  expiresAt: '2026-10-18T18:46:43Z',
  createdAt: '2026-10-18T18:41:43Z',
  paidAt: null,
};

const attempt = (status: 'paid' | 'not_charged') => ({
  id: '00000000-0000-4000-8000-000000000002',
  intentId: INTENT.id,
  idempotencyKey: 'demo-key',
  status,
  amountCents: 630,
  tipCents: 0,
  reason: status === 'not_charged' ? 'rail_rejected' : null,
  createdAt: INTENT.createdAt,
  settledAt: status === 'paid' ? INTENT.createdAt : null,
});

/** Two scripted runs through the real reducer: a dead zone that resolves to paid, then one that is refused. */
const RUNS: ReadonlyArray<ReadonlyArray<[AttemptEvent, number]>> = [
  [
    [{ type: 'SCANNED', intentRef: 'demo' }, 300],
    [{ type: 'INTENT_LOADED', intent: INTENT }, 1600],
    [{ type: 'CONFIRM' }, 500],
    [{ type: 'AUTH_SUCCEEDED', idempotencyKey: 'demo-key' }, 900],
    [{ type: 'OUTCOME_UNKNOWN', at: 0 }, 1300],
    [{ type: 'CHECK_PENDING' }, 1300],
    [{ type: 'SERVER_RESULT', attempt: attempt('paid') }, 2800],
  ],
  [
    [{ type: 'SCANNED', intentRef: 'demo' }, 300],
    [{ type: 'INTENT_LOADED', intent: INTENT }, 1600],
    [{ type: 'CONFIRM' }, 500],
    [{ type: 'AUTH_SUCCEEDED', idempotencyKey: 'demo-key' }, 900],
    [{ type: 'OUTCOME_UNKNOWN', at: 0 }, 1500],
    [{ type: 'SERVER_RESULT', attempt: attempt('not_charged') }, 2800],
  ],
];

const PAID: AttemptState = { status: 'paid', intent: INTENT, attempt: attempt('paid') };

function reducer(state: AttemptState, event: AttemptEvent) {
  return attemptReducer(state, event, 0);
}

/**
 * A live <PaymentStatus>: it renders whatever the shared payment-attempt reducer (packages/shared) returns, driven
 * by scripted events. Static HTML shows the paid state; it only cycles in view, with motion on and not paused.
 */
export function PaymentStatusDemo({ copy }: { copy: Copy['status'] }) {
  const [state, dispatch] = useReducer(reducer, PAID);
  const ref = useRef<HTMLDivElement>(null);
  const still = useSyncExternalStore(
    subscribe,
    () => isPaused() || prefersReducedMotion(),
    () => true,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    let timer: number | undefined;
    let run = 0;
    let step = 0;
    let visible = false;
    const tick = () => {
      const script = RUNS[run % RUNS.length] ?? [];
      const next = script[step];
      if (!next) {
        dispatch({ type: 'RESET' });
        run += 1;
        step = 0;
        timer = window.setTimeout(tick, 400);
        return;
      }
      dispatch(next[0]);
      step += 1;
      timer = window.setTimeout(tick, next[1]);
    };
    const io = new IntersectionObserver(([entry]) => {
      const now = entry?.isIntersecting ?? false;
      if (now && !visible) {
        dispatch({ type: 'RESET' });
        step = 0;
        timer = window.setTimeout(tick, 400);
      } else if (!now && visible) {
        window.clearTimeout(timer);
      }
      visible = now;
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [still]);

  const shown = still ? PAID : state;
  const view = viewFor(shown, copy);

  return (
    <figure className="mx-auto w-full max-w-[300px]">
      <div
        ref={ref}
        className={`relative flex aspect-[9/14] flex-col items-center justify-center rounded-[28px] p-6 text-center transition-colors duration-300 ${view.surface}`}
      >
        <StatusIcon kind={view.icon} still={still} />
        <p className="mt-5 font-display text-2xl font-extrabold tracking-tight">{view.title}</p>
        <p className="mt-1 font-display text-4xl font-extrabold tracking-[-0.03em] tabular-nums">
          {copy.amount}
        </p>
        <p className="mt-2 font-sans text-sm">{view.hint}</p>
        <p className="absolute bottom-4 font-mono text-[11px]">state: {shown.status}</p>
      </div>
      <figcaption className="mt-3 text-center font-serif text-base text-text-2 italic">
        {copy.caption}
      </figcaption>
    </figure>
  );
}

type Icon = 'check' | 'ring' | 'cross' | 'dot';

function viewFor(
  state: AttemptState,
  copy: Copy['status'],
): { surface: string; title: string; hint: string; icon: Icon } {
  switch (state.status) {
    case 'paid':
      return { surface: 'bg-flood-paid text-on-flood', title: copy.paid, hint: copy.merchant, icon: 'check' };
    case 'checking':
      return {
        surface: 'bg-pending-subtle text-ink',
        title: copy.checking,
        hint: copy.checkingHint,
        icon: 'ring',
      };
    case 'not_charged':
    case 'failed':
    case 'insufficient_balance':
    case 'expired':
      return {
        surface: 'bg-flood-not-charged text-on-flood',
        title: copy.notCharged,
        hint: copy.notChargedHint,
        icon: 'cross',
      };
    case 'submitting':
    case 'authorising':
      return {
        surface: 'bg-paper-raised text-ink border border-line',
        title: copy.submitting,
        hint: copy.merchant,
        icon: 'ring',
      };
    default:
      return {
        surface: 'bg-paper-raised text-ink border border-line',
        title: copy.confirming,
        hint: copy.merchant,
        icon: 'dot',
      };
  }
}

function StatusIcon({ kind, still }: { kind: Icon; still: boolean }) {
  const common = 'h-16 w-16';
  if (kind === 'check')
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,.18)" />
        <circle cx="32" cy="32" r="22" fill="#fff" />
        <path
          d="M22 33l7 7 14-15"
          fill="none"
          stroke="var(--z-flood-paid)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === 'cross')
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden="true">
        <circle cx="32" cy="32" r="22" fill="#fff" />
        <path
          d="M24 24l16 16M40 24L24 40"
          stroke="var(--z-flood-not-charged)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === 'ring')
    return (
      <svg
        viewBox="0 0 64 64"
        className={`${common} ${still ? '' : 'animate-spin [animation-duration:1.4s]'}`}
        aria-hidden="true"
      >
        <circle
          cx="32"
          cy="32"
          r="22"
          fill="none"
          stroke="currentColor"
          strokeOpacity=".15"
          strokeWidth="5"
        />
        <path
          d="M32 10a22 22 0 0 1 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 64 64" className={common} aria-hidden="true">
      <rect x="12" y="12" width="40" height="40" rx="10" fill="var(--z-ink)" />
      <path
        d="M24 26h16L24 40h16"
        fill="none"
        stroke="var(--z-ember)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
