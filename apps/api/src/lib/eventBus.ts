import { EventEmitter } from 'node:events';
import type { PaymentIntent } from '@zahln/shared';

/**
 * In-process pub/sub for live intent status (SSE). Publish only *after* the database commit:
 * a till that turns green for a payment that then rolls back is worse than a till that's a second late.
 *
 * One API process is enough for the MVP. With several instances this becomes Postgres LISTEN/NOTIFY
 * or Redis pub/sub behind the same two functions.
 */
const bus = new EventEmitter();
bus.setMaxListeners(0);

const channel = (intentId: string) => `intent:${intentId}`;

export function publishIntent(intent: PaymentIntent) {
  bus.emit(channel(intent.id), intent);
}

export function subscribeIntent(intentId: string, listener: (intent: PaymentIntent) => void): () => void {
  bus.on(channel(intentId), listener);
  return () => bus.off(channel(intentId), listener);
}
