import type { IntentStatus } from '../schemas';

/**
 * Merchant-side intent lifecycle. The API uses `canTransitionIntent` before every status UPDATE,
 * so the app and server share one definition of what's legal.
 *
 *   awaiting_scan (5 min) → scanned → paid → partially_refunded → refunded
 *          ↘ expired | cancelled   ↘ expired | cancelled
 */
export const INTENT_TRANSITIONS: Record<IntentStatus, readonly IntentStatus[]> = {
  awaiting_scan: ['scanned', 'paid', 'expired', 'cancelled'],
  scanned: ['paid', 'expired', 'cancelled'],
  paid: ['partially_refunded', 'refunded'],
  partially_refunded: ['partially_refunded', 'refunded'],
  refunded: [],
  expired: [],
  cancelled: [],
};

export function canTransitionIntent(from: IntentStatus, to: IntentStatus): boolean {
  return INTENT_TRANSITIONS[from].includes(to);
}

export function isPayable(status: IntentStatus): boolean {
  return status === 'awaiting_scan' || status === 'scanned';
}

export function isRefundable(status: IntentStatus): boolean {
  return status === 'paid' || status === 'partially_refunded';
}

/** Status after refunding `refundedCents` in total of an intent worth `amountCents`. */
export function statusAfterRefund(amountCents: number, refundedCents: number): IntentStatus {
  if (refundedCents <= 0) return 'paid';
  if (refundedCents > amountCents) throw new RangeError('refund exceeds payment');
  return refundedCents === amountCents ? 'refunded' : 'partially_refunded';
}

// ---------- Client-side till state ----------

export type TillState =
  | { status: 'draft' }
  | { status: 'creating'; idempotencyKey: string }
  | { status: 'awaiting_scan'; intentId: string; expiresAt: string }
  | { status: 'scanned'; intentId: string; expiresAt: string }
  | { status: 'paid'; intentId: string; receiptNumber: number | null }
  | { status: 'expired'; intentId: string }
  | { status: 'cancelled'; intentId: string }
  | { status: 'create_failed'; idempotencyKey: string; reason: string };

export type TillEvent =
  | { type: 'CREATE'; idempotencyKey: string }
  | { type: 'CREATED'; intentId: string; expiresAt: string }
  | { type: 'CREATE_FAILED'; reason: string }
  | { type: 'STATUS'; status: IntentStatus; receiptNumber?: number | null }
  | { type: 'CANCEL' }
  | { type: 'NEW_ORDER' };

export function tillReducer(state: TillState, event: TillEvent): TillState {
  if (event.type === 'NEW_ORDER') return { status: 'draft' };

  switch (state.status) {
    case 'draft':
      return event.type === 'CREATE' ? { status: 'creating', idempotencyKey: event.idempotencyKey } : state;
    case 'creating':
      if (event.type === 'CREATED')
        return { status: 'awaiting_scan', intentId: event.intentId, expiresAt: event.expiresAt };
      if (event.type === 'CREATE_FAILED')
        return { status: 'create_failed', idempotencyKey: state.idempotencyKey, reason: event.reason };
      return state;
    case 'create_failed':
      // Retrying creation reuses the same key: if the first request did arrive, we get the same intent back.
      return event.type === 'CREATE' ? { status: 'creating', idempotencyKey: state.idempotencyKey } : state;
    case 'awaiting_scan':
    case 'scanned':
      if (event.type === 'CANCEL') return { status: 'cancelled', intentId: state.intentId };
      if (event.type !== 'STATUS' || !canTransitionIntent(state.status, event.status)) return state;
      switch (event.status) {
        case 'scanned':
          return { status: 'scanned', intentId: state.intentId, expiresAt: state.expiresAt };
        case 'paid':
          return { status: 'paid', intentId: state.intentId, receiptNumber: event.receiptNumber ?? null };
        case 'expired':
          return { status: 'expired', intentId: state.intentId };
        case 'cancelled':
          return { status: 'cancelled', intentId: state.intentId };
        default:
          return state;
      }
    case 'paid':
    case 'expired':
    case 'cancelled':
      return state;
  }
}
