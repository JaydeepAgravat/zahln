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
  bus.emit('intents', intent);
}

/** Every intent change, for the internal console's live payments list. */
export function subscribeAllIntents(listener: (intent: PaymentIntent) => void): () => void {
  bus.on('intents', listener);
  return () => bus.off('intents', listener);
}

/**
 * "Config changed" (switches, versions, or a merchant's plan). Clients refetch `GET /config`:
 * the event carries no data, so a client can never apply a config it wasn't allowed to see.
 */
export function publishConfigChanged(version: number) {
  bus.emit('config', version);
}

export function subscribeConfig(listener: (version: number) => void): () => void {
  bus.on('config', listener);
  return () => bus.off('config', listener);
}

export function subscribeIntent(intentId: string, listener: (intent: PaymentIntent) => void): () => void {
  bus.on(channel(intentId), listener);
  return () => bus.off(channel(intentId), listener);
}
