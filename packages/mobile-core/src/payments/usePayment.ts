import {
  type AttemptEvent,
  type AttemptState,
  attemptReducer,
  initialAttemptState,
  type PaymentIntent,
} from '@zaster/shared';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiRequestError } from '../api';
import { uuid } from '../random';
import { payments } from './client';
import { type PendingPayment, pendingPayment } from './pending';

/** How often we ask "did it go through?": quickly at first, then calmer. */
const CHECK_BACKOFF_MS = [800, 1500, 2500, 4000, 6000, 8000];
/** After this long we stop implying it's about to finish, and check every 15 s in the background. */
export const LONG_CHECK_MS = 60_000;
const LONG_CHECK_INTERVAL_MS = 15_000;

const reducer = (state: AttemptState, event: AttemptEvent) => attemptReducer(state, event, Date.now());

/** Errors that prove nothing was charged. Everything else is "we don't know yet". */
function definitiveRejection(error: unknown): AttemptEvent | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.code === 'intent_expired')
    return { type: 'SERVER_REJECTED', code: 'intent_expired', reason: error.message };
  if (error.code === 'intent_not_payable')
    return { type: 'SERVER_REJECTED', code: 'intent_not_payable', reason: error.message };
  // 409 idempotency_in_progress and 5xx mean the server may still be working on it.
  if (error.status >= 400 && error.status < 500 && error.code !== 'idempotency_in_progress')
    return { type: 'SERVER_REJECTED', code: 'bad_request', reason: error.code };
  return null;
}

/**
 * The consumer's side of one payment, from a scanned reference to a final answer.
 *
 * All state lives in the shared `attemptReducer`, so the rules are the ones the unit tests prove:
 * one idempotency key per attempt, created when the person authorises, saved to disk before the
 * request is sent, and reused for every status check. No path re-sends with a new key.
 */
export function usePayment() {
  const [state, dispatch] = useReducer(reducer, initialAttemptState);
  const [confirmedInMs, setConfirmedInMs] = useState<number | null>(null);
  /** The intent as it is *after* payment (receipt number, paid time), for the receipt. */
  const [paidIntent, setPaidIntent] = useState<PaymentIntent | null>(null);
  const authorisedAt = useRef<number | null>(null);
  const [tipCents, setTipCents] = useState(0);
  // Read by the send effect: the tip is fixed once the person authorised, so changing it must not resend.
  const tipRef = useRef(0);
  tipRef.current = tipCents;
  /** Bumped when the app returns to the foreground: check right away instead of waiting out the backoff. */
  const [nudge, setNudge] = useState(0);
  const lastNudge = useRef(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNudge((n) => n + 1));
    return () => sub.remove();
  }, []);

  const load = useCallback(async (ref: string) => {
    dispatch({ type: 'RESET' });
    setTipCents(0);
    dispatch({ type: 'SCANNED', intentRef: ref });
    try {
      const intent = await payments.intentByRef(ref);
      dispatch({ type: 'INTENT_LOADED', intent });
      // Fire and forget: the till shows "Kunde prüft…". A failure here must never block paying.
      payments.reportScanned(intent.id).catch(() => undefined);
    } catch (error) {
      dispatch({
        type: 'LOAD_FAILED',
        reason: error instanceof ApiRequestError ? error.code : 'network',
      });
    }
  }, []);

  const confirm = useCallback(() => dispatch({ type: 'CONFIRM' }), []);
  const cancelAuthorisation = useCallback(() => dispatch({ type: 'AUTH_CANCELLED' }), []);

  /**
   * Call after Face ID or the PIN succeeded. This is the only place a key is ever created.
   * Safe to call from async callbacks: the reducer ignores it unless we are still authorising.
   */
  const authorised = useCallback(() => {
    authorisedAt.current = Date.now();
    dispatch({ type: 'AUTH_SUCCEEDED', idempotencyKey: uuid() });
  }, []);

  /**
   * The app was killed mid-payment and this is the next launch. All we trust is the saved key:
   * go straight to `checking` and let the server tell us what happened.
   */
  const resume = useCallback(async (pending: PendingPayment) => {
    setTipCents(pending.tipCents ?? 0);
    for (let attempt = 0; ; attempt++) {
      try {
        const intent = await payments.intent(pending.intentId);
        dispatch({ type: 'RESUME', intent, idempotencyKey: pending.idempotencyKey, at: pending.startedAt });
        return;
      } catch {
        // Offline right after launch: keep the key, try again shortly.
        await new Promise<void>((r) => setTimeout(r, Math.min(8000, 1000 * 2 ** attempt)));
      }
    }
  }, []);

  /** The QR ran out while the person was still looking at it. */
  const expire = useCallback(() => dispatch({ type: 'INTENT_EXPIRED' }), []);

  // submitting → send (also re-entered after KEY_NOT_FOUND, with the same key)
  const submitting = state.status === 'submitting' ? state : null;
  useEffect(() => {
    if (!submitting) return;
    let alive = true;
    // On disk before the request leaves the phone: if the app dies now, the next launch can ask.
    pendingPayment.save({
      intentId: submitting.intent.id,
      idempotencyKey: submitting.idempotencyKey,
      startedAt: Date.now(),
      tipCents: tipRef.current,
    });
    payments
      .pay(submitting.intent.id, submitting.idempotencyKey, tipRef.current)
      .then((result) => alive && dispatch({ type: 'SERVER_RESULT', attempt: result.attempt }))
      .catch((error: unknown) => {
        if (!alive) return;
        dispatch(definitiveRejection(error) ?? { type: 'OUTCOME_UNKNOWN', at: Date.now() });
      });
    return () => {
      alive = false;
    };
  }, [submitting]);

  // checking → ask the server what happened to this key, with backoff
  const checking = state.status === 'checking' ? state : null;
  useEffect(() => {
    if (!checking) return;
    let alive = true;
    const long = Date.now() - checking.since > LONG_CHECK_MS;
    // Back in the foreground (often: back online): ask right away instead of waiting out the backoff.
    const nudged = nudge !== lastNudge.current;
    lastNudge.current = nudge;
    const delay = nudged
      ? 0
      : long
        ? LONG_CHECK_INTERVAL_MS
        : (CHECK_BACKOFF_MS[Math.min(checking.checks, CHECK_BACKOFF_MS.length - 1)] ?? 8000);
    const timer = setTimeout(() => {
      payments
        .attemptByKey(checking.idempotencyKey)
        .then((attempt) => alive && dispatch({ type: 'SERVER_RESULT', attempt }))
        .catch((error: unknown) => {
          if (!alive) return;
          // 404: the request never arrived, so the same key is safe to send again.
          if (error instanceof ApiRequestError && error.status === 404) dispatch({ type: 'KEY_NOT_FOUND' });
          else dispatch({ type: 'CHECK_PENDING' });
        });
    }, delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [checking, nudge]);

  // A final answer: forget the pending key and record the time to confirmation.
  useEffect(() => {
    if (['paid', 'not_charged', 'insufficient_balance', 'expired', 'failed'].includes(state.status)) {
      if (state.status !== 'failed' || state.intent) pendingPayment.clear();
      if (state.status === 'paid' && authorisedAt.current) {
        setConfirmedInMs(Date.now() - authorisedAt.current);
        authorisedAt.current = null;
      }
      if (state.status === 'paid') {
        payments
          .intent(state.intent.id)
          .then(setPaidIntent)
          .catch(() => undefined);
      }
    }
  }, [state]);

  const stillChecking = state.status === 'checking' && Date.now() - state.since > LONG_CHECK_MS;

  return {
    state,
    load,
    resume,
    confirm,
    authorised,
    cancelAuthorisation,
    expire,
    tipCents,
    setTipCents,
    stillChecking,
    confirmedInMs,
    paidIntent,
  };
}
