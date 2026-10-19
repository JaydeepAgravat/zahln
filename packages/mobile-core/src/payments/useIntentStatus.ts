import { type PaymentIntent, PaymentIntentSchema } from '@zaster/shared';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import EventSource from 'react-native-sse';
import { apiUrl, authHeaders } from '../api';
import { payments } from './client';

const FINAL = new Set<PaymentIntent['status']>([
  'paid',
  'expired',
  'cancelled',
  'refunded',
  'partially_refunded',
]);
const POLL_MS = 2000;

/**
 * Live status of one intent for the till: Server-Sent Events first, polling as the safety net.
 *
 * SSE is a hint, not the truth. If the stream errors, we poll `GET /intents/:id` every 2 s, and
 * coming back to the foreground always refetches, so a missed event can't leave the till stuck.
 */
export function useIntentStatus(initial: PaymentIntent) {
  const [intent, setIntent] = useState(initial);
  const [live, setLive] = useState(false);
  const latest = useRef(initial);

  useEffect(() => {
    if (FINAL.has(initial.status)) return;
    let closed = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    const accept = (next: PaymentIntent) => {
      // Ignore stale or out-of-order updates: a final status never goes back.
      if (closed || FINAL.has(latest.current.status)) return;
      latest.current = next;
      setIntent(next);
      if (FINAL.has(next.status)) stop();
    };

    const refetch = () => {
      payments
        .intent(initial.id)
        .then(accept)
        .catch(() => undefined);
    };

    const source = new EventSource<'status'>(`${apiUrl()}/intents/${initial.id}/events`, {
      headers: authHeaders(),
      pollingInterval: 3000, // react-native-sse reconnects by itself
    });
    source.addEventListener('open', () => {
      setLive(true);
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    });
    source.addEventListener('status', (event) => {
      const parsed = PaymentIntentSchema.safeParse(JSON.parse(event.data ?? 'null'));
      if (parsed.success) accept(parsed.data);
    });
    source.addEventListener('error', () => {
      setLive(false);
      poll ??= setInterval(refetch, POLL_MS);
    });

    const appState = AppState.addEventListener('change', (s) => s === 'active' && refetch());

    function stop() {
      closed = true;
      source.removeAllEventListeners();
      source.close();
      if (poll) clearInterval(poll);
      appState.remove();
    }
    return stop;
  }, [initial]);

  return { intent, live };
}
