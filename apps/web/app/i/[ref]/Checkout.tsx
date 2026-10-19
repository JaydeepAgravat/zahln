'use client';

import type { PaymentAttempt, PaymentIntent } from '@zaster/shared';
import { formatMoney } from '@zaster/shared/money';
import {
  type AttemptEvent,
  type AttemptState,
  attemptReducer,
  initialAttemptState,
} from '@zaster/shared/payment';
import { GERMAN_MOBILE, normalizeGermanPhone } from '@zaster/shared/phone';
import { type ReactNode, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { checkoutCopy } from '@/lib/checkout-copy';
import type { Locale } from '@/lib/i18n-messages';

// Deliberately no design-system or data library here: this page ships to phones without the app.
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Json = Record<string, unknown> & { error?: string; message?: string };

/** One fetch to the API with the session cookie and the CSRF header. `null` status = the network gave up. */
async function call(
  method: 'GET' | 'POST',
  path: string,
  opts: { body?: unknown; key?: string } = {},
): Promise<{ status: number | null; body: Json | null }> {
  const csrf = document.cookie.match(/(?:^|;\s*)zaster_csrf=([^;]+)/)?.[1] ?? '';
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(method === 'POST'
          ? { 'x-csrf-token': decodeURIComponent(csrf), 'content-type': 'application/json' }
          : {}),
        ...(opts.key ? { 'idempotency-key': opts.key } : {}),
      },
      body: method === 'POST' ? JSON.stringify(opts.body ?? {}) : undefined,
    });
    return { status: res.status, body: (await res.json().catch(() => null)) as Json | null };
  } catch {
    return { status: null, body: null };
  }
}

/** The key for this attempt survives a reload in this tab, so a refresh during "checking" never pays twice. */
const keyStore = {
  name: (intentId: string) => `zaster.pay.${intentId}`,
  read(intentId: string) {
    try {
      return sessionStorage.getItem(this.name(intentId));
    } catch {
      return null;
    }
  },
  write(intentId: string, key: string) {
    try {
      sessionStorage.setItem(this.name(intentId), key);
    } catch {
      // Private mode: the payment still works, a reload just can't resume it.
    }
  },
  clear(intentId: string) {
    try {
      sessionStorage.removeItem(this.name(intentId));
    } catch {}
  },
};

type Who = { name: string; fresh: boolean } | null;

export function Checkout({ intent: initial, locale }: { intent: PaymentIntent; locale: Locale }) {
  const t = checkoutCopy(locale);
  const money = (c: number) => formatMoney(c, locale);
  const [state, dispatchRaw] = useReducer(
    (s: AttemptState, e: AttemptEvent) => attemptReducer(s, e),
    initialAttemptState,
  );
  const dispatch = useCallback((e: AttemptEvent) => dispatchRaw(e), []);
  const [now, setNow] = useState(() => Date.now());
  const [who, setWho] = useState<Who | undefined>(undefined);
  const [slow, setSlow] = useState(false);

  // ---- Start: a saved key means a payment was in flight before a reload → only "checking" is honest.
  useEffect(() => {
    const saved = keyStore.read(initial.id);
    if (saved) dispatch({ type: 'RESUME', intent: initial, idempotencyKey: saved, at: Date.now() });
    else {
      dispatch({ type: 'SCANNED', intentRef: initial.ref });
      dispatch({ type: 'INTENT_LOADED', intent: initial });
    }
  }, [initial, dispatch]);

  // ---- Countdown; at zero, ask the server instead of trusting the clock.
  const intent = 'intent' in state && state.intent ? state.intent : initial;
  const left = Math.max(0, Date.parse(intent.expiresAt) - now);
  useEffect(() => {
    if (state.status !== 'confirming' && state.status !== 'authorising') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.status]);
  useEffect(() => {
    if ((state.status === 'confirming' || state.status === 'authorising') && left === 0) {
      void call('GET', `/public/intents/${initial.ref}`).then(({ body }) => {
        if (body?.status === 'expired') dispatch({ type: 'INTENT_EXPIRED' });
      });
    }
  }, [left, state.status, initial.ref, dispatch]);

  // ---- Who is paying (if anyone is signed in here).
  const loadWho = useCallback(async () => {
    const { status, body } = await call('GET', '/web/session');
    const user = body?.user as { name: string } | undefined;
    const fresh = typeof body?.stepUpUntil === 'string' && Date.parse(body.stepUpUntil) > Date.now();
    setWho(status === 200 && user && !body?.merchant ? { name: user.name.split(' ')[0] ?? '', fresh } : null);
  }, []);
  useEffect(() => {
    if (state.status === 'authorising') void loadWho();
  }, [state.status, loadWho]);

  // ---- Submitting: one request with the attempt's key.
  const submitting = state.status === 'submitting' ? state : null;
  useEffect(() => {
    if (!submitting) return;
    let cancelled = false;
    void call('POST', `/web/pay/${submitting.intent.id}`, { key: submitting.idempotencyKey }).then(
      ({ status, body }) => {
        if (cancelled) return;
        const attempt = body?.attempt as PaymentAttempt | undefined;
        if (status === 201 && attempt) dispatch({ type: 'SERVER_RESULT', attempt });
        else if (status === 409 && body?.error === 'intent_expired')
          dispatch({ type: 'SERVER_REJECTED', code: 'intent_expired', reason: 'expired' });
        else if (status !== null && status >= 400 && status < 500 && status !== 409)
          dispatch({ type: 'SERVER_REJECTED', code: 'bad_request', reason: body?.message ?? String(status) });
        // A dropped connection, a 5xx or "still in progress": we don't know. Never a new key: check.
        else dispatch({ type: 'OUTCOME_UNKNOWN', at: Date.now() });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [submitting, dispatch]);

  // ---- Checking: ask by key, backing off (0.5 s → 4 s); after 60 s say so, and slow down.
  const checking = state.status === 'checking' ? state : null;
  useEffect(() => {
    if (!checking) return;
    const elapsed = Date.now() - checking.since;
    setSlow(elapsed > 60_000);
    const delay = elapsed > 60_000 ? 15_000 : Math.min(500 * 2 ** checking.checks, 4000);
    const id = setTimeout(async () => {
      const { status, body } = await call('GET', `/web/pay/attempts/${checking.idempotencyKey}`);
      if (status === 200 && body)
        dispatch({ type: 'SERVER_RESULT', attempt: body as unknown as PaymentAttempt });
      // The server never saw this key: safe to send again, with the same key.
      else if (status === 404) dispatch({ type: 'KEY_NOT_FOUND' });
      else dispatch({ type: 'CHECK_PENDING' });
    }, delay);
    return () => clearTimeout(id);
  }, [checking, dispatch]);

  // ---- A final answer: forget the key.
  useEffect(() => {
    if (['paid', 'not_charged', 'insufficient_balance', 'expired', 'failed'].includes(state.status))
      keyStore.clear(initial.id);
  }, [state.status, initial.id]);

  const pay = () => {
    const key = crypto.randomUUID();
    // Saved before the request leaves: if the tab dies mid-flight, the reload resumes with this key.
    keyStore.write(initial.id, key);
    dispatch({ type: 'AUTH_SUCCEEDED', idempotencyKey: key });
  };

  // ---------- Views ----------

  if (state.status === 'paid')
    return (
      <Outcome
        tone="paid"
        title={t('paid')}
        amount={money(state.attempt.amountCents + state.attempt.tipCents)}
      >
        {t('paidBody', { amount: money(state.attempt.amountCents), merchant: intent.merchant.name })}
      </Outcome>
    );
  if (state.status === 'checking')
    return (
      <Outcome tone="checking" title={t('checking')} amount={money(intent.amountCents)}>
        {slow ? t('checkingLong') : t('checkingBody')}
      </Outcome>
    );
  if (state.status === 'not_charged')
    return (
      <Outcome tone="declined" title={t('notCharged')} amount={money(intent.amountCents)}>
        {t('notChargedBody')}
      </Outcome>
    );
  if (state.status === 'insufficient_balance')
    return (
      <Outcome tone="declined" title={t('insufficient')} amount={money(intent.amountCents)}>
        {t('insufficientBody', { amount: money(intent.amountCents) })}
      </Outcome>
    );
  if (state.status === 'expired')
    return (
      <Outcome tone="neutral" title={t('expired')}>
        {t('expiredBody')}
      </Outcome>
    );
  if (state.status === 'failed')
    return state.intent && state.intent.status !== 'awaiting_scan' && state.intent.status !== 'scanned' ? (
      <Outcome tone="neutral" title={t('alreadyPaid')}>
        {t('alreadyPaidBody')}
      </Outcome>
    ) : (
      <Outcome tone="declined" title={t('failed')}>
        {t('failedBody', { reason: state.reason })}
      </Outcome>
    );

  const mins = Math.floor(left / 60_000);
  const secs = Math.floor((left % 60_000) / 1000);
  const time =
    left > 3_600_000 ? `${Math.floor(left / 3_600_000)} h` : `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-md bg-brand text-headline font-bold text-on-brand"
        >
          {intent.merchant.name[0]}
        </span>
        <div>
          <h1 className="text-headline font-bold">{intent.merchant.name}</h1>
          <p className="text-footnote text-text-tertiary">{intent.merchant.city}</p>
        </div>
      </header>

      <section aria-label={t('total')} className="rounded-lg bg-surface">
        <div className="flex flex-col gap-2 px-5 pt-5 pb-6 text-callout">
          {intent.items.map((item) => (
            <div key={item.sku} className="flex justify-between gap-4">
              <span>
                {item.qty}× {item.name}
              </span>
              <span className="tabular-nums">{money(item.unitPriceCents * item.qty)}</span>
            </div>
          ))}
          {intent.description ? <p className="text-text-secondary">{intent.description}</p> : null}
          <div
            className={`flex items-baseline justify-between ${intent.items.length ? 'mt-2 border-t border-dashed border-border-strong pt-3' : ''}`}
          >
            <span className="font-semibold">{t('total')}</span>
            <span className="text-[2.5rem] leading-tight font-bold tracking-tight tabular-nums">
              {money(intent.amountCents)}
            </span>
          </div>
          <p className="text-footnote text-text-tertiary" aria-live="off">
            {t('validFor', { time })}
          </p>
        </div>
      </section>

      {state.status === 'authorising' ? (
        who === undefined ? null : who?.fresh ? (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={pay} className={primary}>
              {t('payAs', { amount: money(intent.amountCents) })}
            </button>
            <p className="text-center text-footnote text-text-tertiary">
              {t('payingAs', { name: who.name })}
            </p>
          </div>
        ) : (
          <SignIn
            t={t}
            stepUp={who !== null}
            onDone={async () => {
              void call('POST', `/web/pay/${intent.id}/scanned`);
              await loadWho();
            }}
          />
        )
      ) : state.status === 'submitting' ? (
        <button type="button" disabled className={primary}>
          {t('paying')}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <a href={`zaster://i/${intent.ref}`} className={primary}>
            {t('openApp')}
          </a>
          <button type="button" onClick={() => dispatch({ type: 'CONFIRM' })} className={secondary}>
            {t('payInBrowser')}
          </button>
          <p className="text-center text-footnote text-text-tertiary">{t('noApp')}</p>
        </div>
      )}
      <p className="mt-auto text-center text-caption text-text-tertiary">{t('secure')}</p>
    </div>
  );
}

const primary =
  'flex h-14 w-full items-center justify-center rounded-full bg-brand text-body font-semibold text-on-brand disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary';
const secondary =
  'flex h-14 w-full items-center justify-center rounded-full border border-border bg-surface text-body font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary';

/** Phone → code. Signs in (consumer) or, for a session that's just stale, steps up. */
function SignIn({
  t,
  stepUp,
  onDone,
}: {
  t: ReturnType<typeof checkoutCopy>;
  stepUp: boolean;
  onDone: () => Promise<void>;
}) {
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; devCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const e164 = normalizeGermanPhone(phone);

  const send = useCallback(async () => {
    setBusy(true);
    setError(null);
    const { status, body } = stepUp
      ? await call('POST', '/web/auth/step-up/otp')
      : await call('POST', '/web/auth/otp', { body: { phone: e164 } });
    setBusy(false);
    if (status === 201 && body)
      setChallenge({
        id: String(body.challengeId),
        ...(body.devCode ? { devCode: String(body.devCode) } : {}),
      });
    else setError(t('error', { message: body?.message ?? 'network' }));
  }, [stepUp, e164, t]);

  // Signed in but stale: the number is known, so send the code straight away.
  useEffect(() => {
    if (stepUp && !started.current) {
      started.current = true;
      void send();
    }
  }, [stepUp, send]);

  if (!challenge && !stepUp)
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Label text={t('phone')} error={error}>
          <input
            // biome-ignore lint/a11y/noAutofocus: the next thing to do on this screen
            autoFocus
            type="tel"
            autoComplete="tel"
            placeholder="0151 0000 0001"
            value={phone}
            onChange={(e) => setPhone(e.target.value.slice(0, 18))}
            className={field}
          />
        </Label>
        <button type="submit" disabled={busy || !GERMAN_MOBILE.test(e164)} className={primary}>
          {t('sendCode')}
        </button>
      </form>
    );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!challenge) return;
        setBusy(true);
        setError(null);
        const { status, body } = stepUp
          ? await call('POST', '/web/auth/step-up', { body: { challengeId: challenge.id, code } })
          : await call('POST', '/web/auth/verify', {
              body: { challengeId: challenge.id, code, audience: 'consumer' },
            });
        setBusy(false);
        if (status === 200) return onDone();
        setError(
          body?.error === 'no_account' ? t('noAccount') : t('error', { message: body?.message ?? 'network' }),
        );
      }}
    >
      <Label
        text={t('code')}
        error={error}
        hint={challenge?.devCode ? t('devCode', { code: challenge.devCode }) : undefined}
      >
        <input
          // biome-ignore lint/a11y/noAutofocus: the code is the only thing to type
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className={`${field} font-mono tracking-[0.4em]`}
        />
      </Label>
      <button type="submit" disabled={busy || code.length !== 6 || !challenge} className={primary}>
        {t('confirmCode')}
      </button>
    </form>
  );
}

const field =
  'h-12 w-full rounded-md border border-border bg-surface px-4 text-body text-text-primary placeholder:text-text-tertiary focus:border-text-primary focus:outline-none';

function Label({
  text,
  error,
  hint,
  children,
}: {
  text: string;
  error: string | null;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the input is the `children` wrapped by this label
    <label className="flex flex-col gap-1.5">
      <span className="text-footnote font-medium text-text-secondary">{text}</span>
      {children}
      {error ? (
        <span role="alert" className="text-footnote text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="text-footnote text-text-tertiary">{hint}</span>
      ) : null}
    </label>
  );
}

const TONES = {
  paid: 'bg-flood-paid text-on-flood',
  checking: 'bg-surface text-text-primary',
  declined: 'bg-flood-not-charged text-on-flood',
  neutral: 'bg-surface text-text-primary',
} as const;

/**
 * The outcome screen. "Bezahlt" floods the page green from the bottom (CSS only, no JS animation),
 * the same moment as in the app; with reduced motion it simply appears.
 */
function Outcome({
  tone,
  title,
  amount,
  children,
}: {
  tone: keyof typeof TONES;
  title: string;
  amount?: string;
  children: ReactNode;
}) {
  return (
    <section
      role="status"
      aria-live="assertive"
      className={`fixed inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center ${TONES[tone]} ${tone === 'paid' || tone === 'declined' ? 'motion-safe:animate-[flood_520ms_cubic-bezier(.2,.8,.2,1)]' : ''}`}
    >
      {tone === 'checking' ? (
        <span
          aria-hidden
          className="size-10 animate-spin rounded-full border-4 border-border border-t-brand"
        />
      ) : null}
      <h1 className="text-display font-bold tracking-tight">{title}</h1>
      {amount ? (
        <p className="text-[3rem] leading-none font-bold tracking-tight tabular-nums">{amount}</p>
      ) : null}
      <p className="max-w-sm text-callout opacity-90">{children}</p>
    </section>
  );
}
