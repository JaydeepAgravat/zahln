import { describe, expect, it } from 'vitest';
import type { PaymentAttempt, PaymentIntent } from '../src/schemas';
import {
  type AttemptEvent,
  type AttemptState,
  attemptReducer,
  initialAttemptState,
} from '../src/state/paymentAttempt';

const intent: PaymentIntent = {
  id: '6f1e1a51-8b8a-4bd0-9a43-0c8d0b0f7a11',
  ref: '6f1e1a51-8b8a-4bd0-9a43-0c8d0b0f7a11.AbCdEf0123_-xyZ9',
  merchant: { id: 'cafe-mila', name: 'Café Mila', handle: 'cafe-mila', city: 'Augsburg' },
  amountCents: 630,
  currency: 'EUR',
  items: [],
  status: 'awaiting_scan',
  acceptsTips: true,
  refundedCents: 0,
  receiptNumber: null,
  expiresAt: '2026-10-18T12:05:00.000Z',
  createdAt: '2026-10-18T12:00:00.000Z',
  paidAt: null,
};

const KEY = 'a2d3c1f0-1111-4111-8111-111111111111';

const attempt = (status: PaymentAttempt['status']): PaymentAttempt => ({
  id: 'b7a4b5d2-2222-4222-8222-222222222222',
  intentId: intent.id,
  idempotencyKey: KEY,
  status,
  amountCents: 630,
  tipCents: 0,
  reason: status === 'not_charged' ? 'rail_rejected' : null,
  createdAt: '2026-10-18T12:01:00.000Z',
  settledAt: status === 'paid' ? '2026-10-18T12:01:01.000Z' : null,
});

const run = (events: AttemptEvent[], from: AttemptState = initialAttemptState) =>
  events.reduce((state, event) => attemptReducer(state, event, 1_000), from);

const toSubmitting: AttemptEvent[] = [
  { type: 'SCANNED', intentRef: intent.id },
  { type: 'INTENT_LOADED', intent },
  { type: 'CONFIRM' },
  { type: 'AUTH_SUCCEEDED', idempotencyKey: KEY },
];

describe('attemptReducer', () => {
  it('happy path: scan → confirm → authorise → submit → paid', () => {
    const states = toSubmitting.map((_, i) => run(toSubmitting.slice(0, i + 1)).status);
    expect(states).toEqual(['scanned', 'confirming', 'authorising', 'submitting']);
    expect(run([...toSubmitting, { type: 'SERVER_RESULT', attempt: attempt('paid') }]).status).toBe('paid');
  });

  it('cancelling Face ID returns to confirming without sending anything', () => {
    expect(run([...toSubmitting.slice(0, 3), { type: 'AUTH_CANCELLED' }]).status).toBe('confirming');
  });

  it('a timeout after submitting means checking, never failed', () => {
    const state = run([...toSubmitting, { type: 'OUTCOME_UNKNOWN', at: 500 }]);
    expect(state).toMatchObject({ status: 'checking', idempotencyKey: KEY, since: 500, checks: 0 });
  });

  it('checking resolves to paid or not charged from the server', () => {
    const checking = run([...toSubmitting, { type: 'OUTCOME_UNKNOWN', at: 0 }]);
    expect(run([{ type: 'SERVER_RESULT', attempt: attempt('paid') }], checking).status).toBe('paid');
    expect(run([{ type: 'SERVER_RESULT', attempt: attempt('not_charged') }], checking).status).toBe(
      'not_charged',
    );
  });

  it('repeated unknown checks stay in checking and count attempts', () => {
    const checking = run([...toSubmitting, { type: 'OUTCOME_UNKNOWN', at: 0 }]);
    const later = run([{ type: 'CHECK_PENDING' }, { type: 'OUTCOME_UNKNOWN', at: 9 }], checking);
    expect(later).toMatchObject({ status: 'checking', checks: 2, since: 0 });
  });

  it('a processing result moves to checking', () => {
    expect(run([...toSubmitting, { type: 'SERVER_RESULT', attempt: attempt('processing') }]).status).toBe(
      'checking',
    );
  });

  it('KEY_NOT_FOUND re-submits with the SAME idempotency key', () => {
    const checking = run([...toSubmitting, { type: 'OUTCOME_UNKNOWN', at: 0 }]);
    const resent = run([{ type: 'KEY_NOT_FOUND' }], checking);
    expect(resent).toMatchObject({ status: 'submitting', idempotencyKey: KEY });
  });

  it('there is no way to get a new idempotency key once a request may have been sent', () => {
    const checking = run([...toSubmitting, { type: 'OUTCOME_UNKNOWN', at: 0 }]);
    const tried = run([{ type: 'AUTH_SUCCEEDED', idempotencyKey: 'another-key' }], checking);
    expect(tried).toBe(checking);
  });

  it('insufficient balance and expiry have their own states', () => {
    expect(
      run([...toSubmitting, { type: 'SERVER_RESULT', attempt: attempt('insufficient_balance') }]).status,
    ).toBe('insufficient_balance');
    expect(
      run([...toSubmitting, { type: 'SERVER_REJECTED', code: 'intent_expired', reason: 'expired' }]).status,
    ).toBe('expired');
  });

  it('a scanned intent that is already paid cannot be confirmed', () => {
    const state = run([
      { type: 'SCANNED', intentRef: intent.id },
      { type: 'INTENT_LOADED', intent: { ...intent, status: 'paid' } },
    ]);
    expect(state).toMatchObject({ status: 'failed', reason: 'intent_not_payable' });
  });

  it('ignores illegal events instead of throwing', () => {
    const idle = initialAttemptState;
    expect(attemptReducer(idle, { type: 'CONFIRM' })).toBe(idle);
    const paid = run([...toSubmitting, { type: 'SERVER_RESULT', attempt: attempt('paid') }]);
    expect(attemptReducer(paid, { type: 'OUTCOME_UNKNOWN', at: 2 })).toBe(paid);
  });

  it('after an app kill, a saved key resumes in checking, never in submitting', () => {
    const resumed = run([{ type: 'RESUME', intent, idempotencyKey: KEY, at: 500 }]);
    expect(resumed).toMatchObject({ status: 'checking', idempotencyKey: KEY, since: 500, checks: 0 });
    expect(run([{ type: 'SERVER_RESULT', attempt: attempt('paid') }], resumed).status).toBe('paid');
    // If the server never saw it, the resend uses the SAME saved key.
    expect(run([{ type: 'KEY_NOT_FOUND' }], resumed)).toMatchObject({
      status: 'submitting',
      idempotencyKey: KEY,
    });
  });

  it('RESUME is ignored mid-payment: it can only start from idle', () => {
    const confirming = run(toSubmitting.slice(0, 2));
    expect(run([{ type: 'RESUME', intent, idempotencyKey: KEY, at: 500 }], confirming)).toBe(confirming);
  });

  it('RESET always returns to idle', () => {
    expect(run([...toSubmitting, { type: 'RESET' }])).toEqual(initialAttemptState);
  });
});
