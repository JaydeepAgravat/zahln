import type { PaymentIntent } from '@zaster/shared';
import { useEffect, useState } from 'react';
import { type AdminPayment, API_URL, queryClient, session } from './api';

export type LiveState = 'connecting' | 'live' | 'offline';

/** Rows that changed in the last few seconds, so the table can flash them. */
const fresh = new Map<string, number>();
export const isFresh = (id: string) => (fresh.get(id) ?? 0) > Date.now() - 2500;

/** Folds one live intent into every cached payments list and drops the cached detail, so screens update in place. */
function applyIntent(intent: PaymentIntent) {
  fresh.set(intent.id, Date.now());
  for (const [key, rows] of queryClient.getQueriesData<AdminPayment[]>({ queryKey: ['payments'] })) {
    if (!rows) continue;
    const at = rows.findIndex((r) => r.id === intent.id);
    if (at >= 0) {
      const next = rows.slice();
      next[at] = { ...rows[at], ...intent } as AdminPayment;
      queryClient.setQueryData(key, next);
    } else {
      // A new payment: refetch so search and filters decide whether it belongs in this list.
      void queryClient.invalidateQueries({ queryKey: key, exact: true });
    }
  }
  void queryClient.invalidateQueries({ queryKey: ['payment', intent.id] });
  void queryClient.invalidateQueries({ queryKey: ['merchants'] });
}

/**
 * The console's live feed: `/admin/events` streamed with fetch (EventSource can't send the ops headers),
 * parsed as SSE, and reconnected with backoff. Every payment change and config version lands here.
 */
export function useLiveFeed(): LiveState {
  const [state, setState] = useState<LiveState>('connecting');
  useEffect(() => {
    let stopped = false;
    let controller: AbortController | null = null;
    let retry = 0;

    const connect = async () => {
      const op = session.get();
      if (!op || stopped) return;
      controller = new AbortController();
      try {
        const res = await fetch(`${API_URL}/admin/events`, {
          headers: { 'x-admin-token': op.token, 'x-admin-name': op.name, accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`events ${res.status}`);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let end = buffer.indexOf('\n\n');
          while (end >= 0) {
            dispatch(buffer.slice(0, end));
            buffer = buffer.slice(end + 2);
            end = buffer.indexOf('\n\n');
          }
        }
      } catch {
        // Aborted on unmount, or the API restarted: fall through to reconnect.
      }
      if (stopped) return;
      setState('offline');
      retry = Math.min(retry + 1, 5);
      setTimeout(connect, 500 * 2 ** retry);
    };

    const dispatch = (block: string) => {
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (event === 'ready') {
        retry = 0;
        setState('live');
        // Anything missed while disconnected: refetch what's on screen.
        void queryClient.invalidateQueries();
      } else if (event === 'intent' && data) applyIntent(JSON.parse(data) as PaymentIntent);
      else if (event === 'config') {
        void queryClient.invalidateQueries({ queryKey: ['config'] });
        void queryClient.invalidateQueries({ queryKey: ['audit'] });
      }
    };

    void connect();
    return () => {
      stopped = true;
      controller?.abort();
    };
  }, []);
  return state;
}
