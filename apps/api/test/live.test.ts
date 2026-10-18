import { describe, expect, it } from 'vitest';
import { signIntentRef } from '../src/lib/intentRef';
import { CART, LENA, MILA, setupTestApp, TOM } from './helpers';

const t = setupTestApp();

/** Opens the SSE stream on a real socket and yields parsed `status` events. */
async function openStream(intentId: string, user: string) {
  const app = await t.app;
  const address = app.server.address();
  const base =
    address && typeof address === 'object'
      ? `http://127.0.0.1:${address.port}`
      : await app.listen({ port: 0, host: '127.0.0.1' });
  const controller = new AbortController();
  const res = await fetch(`${base}/intents/${intentId}/events`, {
    headers: { 'x-user-id': user },
    signal: controller.signal,
  });
  if (!res.body) throw new Error('no response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const next = async (): Promise<{ status: string; receiptNumber: number | null }> => {
    for (;;) {
      const frame = buffer.indexOf('\n\n');
      if (frame >= 0) {
        const chunk = buffer.slice(0, frame);
        buffer = buffer.slice(frame + 2);
        const data = chunk.split('\n').find((l) => l.startsWith('data: '));
        if (data) return JSON.parse(data.slice(6));
        continue; // heartbeat comment
      }
      const { value, done } = await reader.read();
      if (done) throw new Error('stream ended');
      buffer += decoder.decode(value, { stream: true });
    }
  };
  return { res, next, close: () => controller.abort() };
}

describe('QR references', () => {
  it('every intent carries a signed reference that resolves back to it', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    expect(intent.ref).toBe(signIntentRef(intent.id));
    const found = await t.call('GET', `/intents/by-ref/${intent.ref}`, { user: LENA });
    expect(found.status).toBe(200);
    expect(found.body).toMatchObject({ id: intent.id, amountCents: 630, merchant: { name: 'Café Mila' } });
  });

  it('a forged or tampered reference is indistinguishable from a missing one', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const tampered = `${intent.id}.${'A'.repeat(16)}`;
    const otherId = `00000000-0000-4000-8000-000000000000.${intent.ref.split('.')[1]}`;
    for (const ref of [tampered, otherId, 'garbage-reference']) {
      const res = await t.call('GET', `/intents/by-ref/${ref}`, { user: LENA });
      expect(res.status).toBe(404);
    }
  });
});

describe('scan report', () => {
  it('moves awaiting_scan to scanned once, and never revives a paid intent', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const first = await t.call('POST', `/intents/${intent.id}/scanned`, { user: LENA });
    expect(first.body.status).toBe('scanned');
    expect((await t.call('POST', `/intents/${intent.id}/scanned`, { user: LENA })).body.status).toBe(
      'scanned',
    );

    expect((await t.api.pay(intent.id)).status).toBe(201);
    expect((await t.call('POST', `/intents/${intent.id}/scanned`, { user: LENA })).body.status).toBe('paid');
  });
});

describe('live till status (SSE)', () => {
  it('streams the current status first, then scanned and paid as they commit', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const stream = await openStream(intent.id, MILA);
    try {
      expect(stream.res.headers.get('content-type')).toContain('text/event-stream');
      expect((await stream.next()).status).toBe('awaiting_scan');

      await t.call('POST', `/intents/${intent.id}/scanned`, { user: LENA });
      expect((await stream.next()).status).toBe('scanned');

      await t.api.pay(intent.id);
      const paid = await stream.next();
      expect(paid.status).toBe('paid');
      expect(paid.receiptNumber).toBe(1);
    } finally {
      stream.close();
    }
  });

  it('any staff member may watch the till, but customers may not', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const staff = await openStream(intent.id, TOM);
    expect(staff.res.status).toBe(200);
    staff.close();
    expect((await t.call('GET', `/intents/${intent.id}/events`, { user: LENA })).status).toBe(403);
  });
});

describe('dev helpers', () => {
  it('hands the newest open QR to a simulator without a camera', async () => {
    expect((await t.call('GET', '/dev/latest-intent')).body.ref).toBeNull();
    const intent = (await t.api.createIntent(CART)).body;
    expect((await t.call('GET', '/dev/latest-intent')).body.ref).toBe(intent.ref);
    await t.api.pay(intent.id);
    expect((await t.call('GET', '/dev/latest-intent')).body.ref).toBeNull();
  });

  it('serves the till its catalogue, staff only', async () => {
    const res = await t.call('GET', '/merchants/cafe-mila/catalogue', { user: TOM });
    expect(res.body[0]).toEqual({ sku: 'cappuccino', name: 'Cappuccino', priceCents: 380, vatRate: 7 });
    expect((await t.call('GET', '/merchants/cafe-mila/catalogue', { user: LENA })).status).toBe(403);
  });
});
