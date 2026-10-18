import { describe, expect, it } from 'vitest';
import { INTENT_STATUSES } from '../src/schemas';
import {
  canTransitionIntent,
  INTENT_TRANSITIONS,
  statusAfterRefund,
  type TillState,
  tillReducer,
} from '../src/state/paymentIntent';

describe('intent transitions', () => {
  it('defines every status', () => {
    expect(Object.keys(INTENT_TRANSITIONS).sort()).toEqual([...INTENT_STATUSES].sort());
  });

  it('allows the normal lifecycle', () => {
    expect(canTransitionIntent('awaiting_scan', 'scanned')).toBe(true);
    expect(canTransitionIntent('scanned', 'paid')).toBe(true);
    expect(canTransitionIntent('paid', 'partially_refunded')).toBe(true);
    expect(canTransitionIntent('partially_refunded', 'refunded')).toBe(true);
  });

  it('never un-pays, re-opens or pays twice', () => {
    expect(canTransitionIntent('paid', 'awaiting_scan')).toBe(false);
    expect(canTransitionIntent('paid', 'paid')).toBe(false);
    expect(canTransitionIntent('expired', 'paid')).toBe(false);
    expect(canTransitionIntent('refunded', 'paid')).toBe(false);
  });
});

describe('statusAfterRefund', () => {
  it('tracks partial and full refunds', () => {
    expect(statusAfterRefund(630, 250)).toBe('partially_refunded');
    expect(statusAfterRefund(630, 630)).toBe('refunded');
    expect(() => statusAfterRefund(630, 631)).toThrow(RangeError);
  });
});

describe('tillReducer', () => {
  const KEY = 'key-1';
  const created: TillState = { status: 'awaiting_scan', intentId: 'i1', expiresAt: '2026-10-18T12:05:00Z' };

  it('draft → creating → awaiting_scan → scanned → paid', () => {
    let s: TillState = { status: 'draft' };
    s = tillReducer(s, { type: 'CREATE', idempotencyKey: KEY });
    expect(s.status).toBe('creating');
    s = tillReducer(s, { type: 'CREATED', intentId: 'i1', expiresAt: '2026-10-18T12:05:00Z' });
    expect(s.status).toBe('awaiting_scan');
    s = tillReducer(s, { type: 'STATUS', status: 'scanned' });
    expect(s.status).toBe('scanned');
    s = tillReducer(s, { type: 'STATUS', status: 'paid', receiptNumber: 42 });
    expect(s).toEqual({ status: 'paid', intentId: 'i1', receiptNumber: 42 });
  });

  it('retries a failed create with the same idempotency key', () => {
    const failed = tillReducer(
      { status: 'creating', idempotencyKey: KEY },
      { type: 'CREATE_FAILED', reason: 'x' },
    );
    expect(tillReducer(failed, { type: 'CREATE', idempotencyKey: 'other' })).toEqual({
      status: 'creating',
      idempotencyKey: KEY,
    });
  });

  it('ignores status events that are not legal transitions', () => {
    expect(tillReducer(created, { type: 'STATUS', status: 'refunded' })).toBe(created);
  });

  it('expires while waiting', () => {
    expect(tillReducer(created, { type: 'STATUS', status: 'expired' }).status).toBe('expired');
  });
});
