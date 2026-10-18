import type { AttemptStatus, PaymentAttempt, PaymentIntent } from '../schemas';

/**
 * Consumer-side payment flow. Every status has its own screen.
 *
 *   idle → scanned → confirming → authorising → submitting → checking → paid
 *                                                          ↘ not_charged | failed | expired | insufficient_balance
 *
 * The key rule: once a request may have reached the server (`submitting`), the only ways out are a
 * server answer or `checking`. There is no path that re-submits with a *new* idempotency key, so a
 * flaky network can never charge twice.
 */
export type AttemptState =
  | { status: 'idle' }
  | { status: 'scanned'; intentRef: string }
  | { status: 'confirming'; intent: PaymentIntent }
  | { status: 'authorising'; intent: PaymentIntent }
  | { status: 'submitting'; intent: PaymentIntent; idempotencyKey: string }
  | { status: 'checking'; intent: PaymentIntent; idempotencyKey: string; since: number; checks: number }
  | { status: 'paid'; intent: PaymentIntent; attempt: PaymentAttempt }
  | { status: 'not_charged'; intent: PaymentIntent; idempotencyKey: string; reason: string }
  | { status: 'insufficient_balance'; intent: PaymentIntent }
  | { status: 'expired'; intent: PaymentIntent | null }
  /** Definitely failed before money could move (e.g. a 4xx validation error). */
  | { status: 'failed'; intent: PaymentIntent | null; reason: string };

export type AttemptEvent =
  | { type: 'SCANNED'; intentRef: string }
  | { type: 'INTENT_LOADED'; intent: PaymentIntent }
  | { type: 'INTENT_EXPIRED' }
  | { type: 'LOAD_FAILED'; reason: string }
  | { type: 'CONFIRM' }
  | { type: 'AUTH_SUCCEEDED'; idempotencyKey: string }
  | { type: 'AUTH_CANCELLED' }
  /** The server answered with a recorded attempt (first response or idempotent replay). */
  | { type: 'SERVER_RESULT'; attempt: PaymentAttempt }
  /** The server answered with a definitive error that means nothing was charged. */
  | { type: 'SERVER_REJECTED'; code: 'intent_expired' | 'intent_not_payable' | 'bad_request'; reason: string }
  /** Timeout, dropped connection, 5xx, 409 in progress: we don't know what happened. */
  | { type: 'OUTCOME_UNKNOWN'; at: number }
  /** A status check also came back unknown; stay in checking. */
  | { type: 'CHECK_PENDING' }
  /** The server confirms it never saw this key, so the same key is safe to send again. */
  | { type: 'KEY_NOT_FOUND' }
  /**
   * The app was killed while a payment was in flight. On the next launch we only know the saved key,
   * so the one honest state is `checking`: ask the server, never re-send blindly.
   */
  | { type: 'RESUME'; intent: PaymentIntent; idempotencyKey: string; at: number }
  | { type: 'RESET' };

export const initialAttemptState: AttemptState = { status: 'idle' };

export const TERMINAL_ATTEMPT_STATUSES = [
  'paid',
  'not_charged',
  'insufficient_balance',
  'expired',
  'failed',
] as const satisfies readonly AttemptState['status'][];

export function isTerminal(state: AttemptState): boolean {
  return (TERMINAL_ATTEMPT_STATUSES as readonly string[]).includes(state.status);
}

function fromServerAttempt(
  state: Extract<AttemptState, { intent: PaymentIntent; idempotencyKey: string }>,
  attempt: PaymentAttempt,
  now: number,
): AttemptState {
  const status: AttemptStatus = attempt.status;
  switch (status) {
    case 'paid':
      return { status: 'paid', intent: state.intent, attempt };
    case 'not_charged':
      return {
        status: 'not_charged',
        intent: state.intent,
        idempotencyKey: state.idempotencyKey,
        reason: attempt.reason ?? 'rejected',
      };
    case 'insufficient_balance':
      return { status: 'insufficient_balance', intent: state.intent };
    case 'processing':
      return state.status === 'checking'
        ? { ...state, checks: state.checks + 1 }
        : {
            status: 'checking',
            intent: state.intent,
            idempotencyKey: state.idempotencyKey,
            since: now,
            checks: 0,
          };
  }
}

/**
 * Pure reducer: illegal events are ignored (the state is returned unchanged), never thrown,
 * so a late network callback can't crash the payment screen.
 */
export function attemptReducer(
  state: AttemptState,
  event: AttemptEvent,
  now: number = Date.now(),
): AttemptState {
  if (event.type === 'RESET') return initialAttemptState;

  switch (state.status) {
    case 'idle':
      if (event.type === 'SCANNED') return { status: 'scanned', intentRef: event.intentRef };
      if (event.type === 'RESUME')
        return {
          status: 'checking',
          intent: event.intent,
          idempotencyKey: event.idempotencyKey,
          since: event.at,
          checks: 0,
        };
      return state;

    case 'scanned':
      switch (event.type) {
        case 'INTENT_LOADED':
          return event.intent.status === 'awaiting_scan' || event.intent.status === 'scanned'
            ? { status: 'confirming', intent: event.intent }
            : event.intent.status === 'expired'
              ? { status: 'expired', intent: event.intent }
              : { status: 'failed', intent: event.intent, reason: 'intent_not_payable' };
        case 'INTENT_EXPIRED':
          return { status: 'expired', intent: null };
        case 'LOAD_FAILED':
          return { status: 'failed', intent: null, reason: event.reason };
        default:
          return state;
      }

    case 'confirming':
      switch (event.type) {
        case 'CONFIRM':
          return { status: 'authorising', intent: state.intent };
        case 'INTENT_EXPIRED':
          return { status: 'expired', intent: state.intent };
        default:
          return state;
      }

    case 'authorising':
      switch (event.type) {
        case 'AUTH_SUCCEEDED':
          return { status: 'submitting', intent: state.intent, idempotencyKey: event.idempotencyKey };
        case 'AUTH_CANCELLED':
          return { status: 'confirming', intent: state.intent };
        case 'INTENT_EXPIRED':
          return { status: 'expired', intent: state.intent };
        default:
          return state;
      }

    case 'submitting':
    case 'checking':
      switch (event.type) {
        case 'SERVER_RESULT':
          return fromServerAttempt(state, event.attempt, now);
        case 'SERVER_REJECTED':
          return event.code === 'intent_expired'
            ? { status: 'expired', intent: state.intent }
            : { status: 'failed', intent: state.intent, reason: event.reason };
        case 'OUTCOME_UNKNOWN':
          return state.status === 'checking'
            ? { ...state, checks: state.checks + 1 }
            : {
                status: 'checking',
                intent: state.intent,
                idempotencyKey: state.idempotencyKey,
                since: event.at,
                checks: 0,
              };
        case 'CHECK_PENDING':
          return state.status === 'checking' ? { ...state, checks: state.checks + 1 } : state;
        case 'KEY_NOT_FOUND':
          // Safe to resend, with the SAME key, so a late duplicate is still deduplicated.
          return state.status === 'checking'
            ? { status: 'submitting', intent: state.intent, idempotencyKey: state.idempotencyKey }
            : state;
        default:
          return state;
      }

    case 'not_charged':
    case 'insufficient_balance':
    case 'expired':
    case 'failed':
    case 'paid':
      return state;
  }
}
