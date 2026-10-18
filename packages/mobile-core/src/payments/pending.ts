import { storage } from '../storage';

/**
 * The idempotency key of a payment in flight, written to disk *before* the request leaves the phone.
 * If the app is killed mid-payment, the next launch asks the server about this key instead of guessing.
 * Not a secret: a key is useless without the session token, which lives in the keychain.
 */
export type PendingPayment = {
  intentId: string;
  idempotencyKey: string;
  startedAt: number;
  tipCents?: number;
};

const KEY = 'payments.pending';

export const pendingPayment = {
  save(p: PendingPayment) {
    storage.set(KEY, JSON.stringify(p));
  },
  read(): PendingPayment | null {
    const raw = storage.getString(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingPayment;
    } catch {
      return null;
    }
  },
  clear() {
    storage.remove(KEY);
  },
};
