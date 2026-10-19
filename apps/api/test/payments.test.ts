import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { paymentIntents, postings } from '../src/db/schema';
import { ALI, CART, JONAS, LENA, MILA, setupTestApp, TOM } from './helpers';

const t = setupTestApp();

describe('creating intents', () => {
  it('prices a catalogue cart on the server', async () => {
    const res = await t.api.createIntent(CART);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      amountCents: 630,
      status: 'awaiting_scan',
      merchant: { name: 'Café Mila' },
    });
    const ttl = new Date(res.body.expiresAt).getTime() - new Date(res.body.createdAt).getTime();
    expect(ttl).toBeCloseTo(5 * 60 * 1000, -3);
  });

  it('staff can create intents too', async () => {
    expect((await t.api.createIntent({ amountCents: 450 }, TOM)).status).toBe(201);
  });

  it('a Free merchant cannot create a dynamic QR (plan gate)', async () => {
    const res = await t.api.createIntent({ amountCents: 850 }, ALI, 'doener-ali');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('plan_required');
  });

  it('only staff of that merchant can create intents', async () => {
    expect((await t.api.createIntent(CART, LENA)).status).toBe(403);
  });

  it('rejects floats and missing idempotency keys', async () => {
    expect((await t.api.createIntent({ amountCents: 6.3 })).status).toBe(400);
    const res = await t.call('POST', '/merchants/cafe-mila/intents', { user: MILA, body: CART });
    expect(res.body.error).toBe('idempotency_key_missing');
  });

  it('creating twice with the same key returns the same intent', async () => {
    const key = randomUUID();
    const a = await t.api.createIntent(CART, MILA, 'cafe-mila', key);
    const b = await t.api.createIntent(CART, MILA, 'cafe-mila', key);
    expect(b.body.id).toBe(a.body.id);
    expect(b.headers['idempotent-replayed']).toBe('true');
  });
});

describe('paying', () => {
  it('moves money from Lena to Café Mila and issues receipt numbers', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const res = await t.api.pay(intent.id);
    expect(res.status).toBe(201);
    expect(res.body.attempt.status).toBe('paid');
    expect(res.body.intent).toMatchObject({ status: 'paid', receiptNumber: 1 });
    expect(await t.api.balance(LENA)).toBe(5000 - 630);
    expect(await t.api.merchantBalance()).toBe(630);

    const wallet = (await t.call('GET', '/wallets/me', { user: LENA })).body;
    expect(wallet.transactions[0]).toMatchObject({
      kind: 'payment',
      amountCents: -630,
      counterpartyName: 'Café Mila',
    });

    const second = (await t.api.createIntent({ amountCents: 220 })).body;
    expect((await t.api.pay(second.id)).body.intent.receiptNumber).toBe(2);
  });

  it('replaying the same key never pays twice', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const key = randomUUID();
    const first = await t.api.pay(intent.id, LENA, key);
    const replay = await t.api.pay(intent.id, LENA, key);

    expect(replay.status).toBe(first.status);
    expect(replay.body).toEqual(first.body);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(await t.api.balance(LENA)).toBe(5000 - 630);
  });

  it('the same key with a different body is a client bug (422)', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const key = randomUUID();
    await t.api.pay(intent.id, LENA, key);
    const res = await t.api.pay(intent.id, LENA, key, { tipCents: 50 });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('idempotency_key_reused');
  });

  it('a second payment of the same intent with a NEW key is refused', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    await t.api.pay(intent.id);
    const res = await t.api.pay(intent.id, JONAS);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('intent_not_payable');
    expect(await t.api.balance(JONAS)).toBe(1000);
  });

  it('insufficient balance is recorded and nothing moves', async () => {
    const intent = (await t.api.createIntent({ amountCents: 1500 })).body;
    const res = await t.api.pay(intent.id, JONAS);
    expect(res.status).toBe(201);
    expect(res.body.attempt.status).toBe('insufficient_balance');
    expect(await t.api.balance(JONAS)).toBe(1000);
    expect(res.body.intent.status).toBe('awaiting_scan'); // still payable, e.g. after a top-up
  });

  it('a rail rejection means not charged', async () => {
    t.chaos.set('reject');
    const intent = (await t.api.createIntent(CART)).body;
    const res = await t.api.pay(intent.id);
    expect(res.body.attempt).toMatchObject({ status: 'not_charged', reason: 'rail_rejected' });
    expect(await t.api.balance(LENA)).toBe(5000);
  });

  it('an expired intent cannot be paid and is marked expired', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    await t.db
      .update(paymentIntents)
      .set({ expiresAt: sql`now() - interval '1 second'` })
      .where(eq(paymentIntents.id, intent.id));

    const res = await t.api.pay(intent.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('intent_expired');
    expect((await t.call('GET', `/intents/${intent.id}`, { user: LENA })).body.status).toBe('expired');
    expect(await t.api.balance(LENA)).toBe(5000);
  });

  it('tips go to the merchant on plans that include them', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const res = await t.api.pay(intent.id, LENA, randomUUID(), { tipCents: 70 });
    expect(res.body.attempt).toMatchObject({ status: 'paid', tipCents: 70 });
    expect(await t.api.merchantBalance()).toBe(700);
  });
});

describe('concurrency', () => {
  it('two simultaneous payments that together exceed the balance: exactly one succeeds', async () => {
    // Jonas has 10,00 €; two intents of 7,00 € each.
    const a = (await t.api.createIntent({ amountCents: 700 })).body;
    const b = (await t.api.createIntent({ amountCents: 700 })).body;
    const results = await Promise.all([t.api.pay(a.id, JONAS), t.api.pay(b.id, JONAS)]);

    const statuses = results.map((r) => r.body.attempt.status).sort();
    expect(statuses).toEqual(['insufficient_balance', 'paid']);
    expect(await t.api.balance(JONAS)).toBe(300);
  });

  it('two people racing to pay the same intent: exactly one pays', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const [x, y] = await Promise.all([t.api.pay(intent.id, LENA), t.api.pay(intent.id, JONAS)]);
    const paid = [x, y].filter((r) => r.status === 201 && r.body.attempt.status === 'paid');
    expect(paid).toHaveLength(1);
    expect((await t.api.balance(LENA)) + (await t.api.balance(JONAS))).toBe(6000 - 630);
  });

  it('the same request fired twice at once is processed once', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const key = randomUUID();
    const results = await Promise.all([t.api.pay(intent.id, LENA, key), t.api.pay(intent.id, LENA, key)]);
    // One processes; the other either replays the result or is told "in progress" (409) — never a second charge.
    for (const r of results) expect([201, 409]).toContain(r.status);
    expect(await t.api.balance(LENA)).toBe(5000 - 630);
  });
});

describe('dropped responses (campus wifi)', () => {
  it('drop_after_settle: no response, money moved once, reconciliation finds it', async () => {
    t.chaos.set('drop_after_settle');
    const intent = (await t.api.createIntent(CART)).body;
    const key = randomUUID();
    const app = await t.app;

    const res = await app
      .inject({
        method: 'POST',
        url: `/intents/${intent.id}/pay`,
        headers: { 'x-user-id': LENA, 'idempotency-key': key },
        payload: {},
      })
      .then(
        (r) => ({ ok: true as const, status: r.statusCode }),
        (error: unknown) => ({ ok: false as const, error }),
      );
    // The phone never gets a usable answer.
    expect(res.ok && res.status === 201).toBe(false);

    // The app asks "what happened to my request?" with the same key …
    const lookup = await t.call('GET', `/attempts/by-key/${key}`, { user: LENA });
    expect(lookup.body.status).toBe('paid');

    // … or simply resends with the same key: the stored answer comes back, no second charge.
    const replay = await t.api.pay(intent.id, LENA, key);
    expect(replay.body.attempt.status).toBe('paid');
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(await t.api.balance(LENA)).toBe(5000 - 630);
  });

  it('drop_and_hold: lookups fail until the bank "answers", then find the one payment', async () => {
    t.chaos.set('drop_and_hold');
    const intent = (await t.api.createIntent(CART)).body;
    const key = randomUUID();
    const app = await t.app;
    await app
      .inject({
        method: 'POST',
        url: `/intents/${intent.id}/pay`,
        headers: { 'x-user-id': LENA, 'idempotency-key': key },
        payload: {},
      })
      .catch(() => undefined);

    const held = await t.call('GET', `/attempts/by-key/${key}`, { user: LENA });
    expect(held.status).toBe(503);

    t.chaos.set('ok');
    const lookup = await t.call('GET', `/attempts/by-key/${key}`, { user: LENA });
    expect(lookup.body.status).toBe('paid');
    expect(await t.api.balance(LENA)).toBe(5000 - 630);
  });

  it('a key the server never saw returns 404, so it is safe to resend with that key', async () => {
    const res = await t.call('GET', `/attempts/by-key/${randomUUID()}`, { user: LENA });
    expect(res.status).toBe(404);
  });
});

describe('refunds', () => {
  const paidIntent = async () => {
    const intent = (await t.api.createIntent(CART)).body;
    await t.api.pay(intent.id);
    return intent.id as string;
  };

  it('partial refunds add up to a full refund, then stop', async () => {
    const id = await paidIntent();
    const first = await t.api.refund(id, 250);
    expect(first.body.intent).toMatchObject({ status: 'partially_refunded', refundedCents: 250 });
    const second = await t.api.refund(id, 380);
    expect(second.body.intent).toMatchObject({ status: 'refunded', refundedCents: 630 });

    const third = await t.api.refund(id, 1);
    expect(third.status).toBe(409);
    expect(await t.api.balance(LENA)).toBe(5000);
    expect(await t.api.merchantBalance()).toBe(0);
  });

  it('cannot refund more than was paid', async () => {
    const id = await paidIntent();
    const res = await t.api.refund(id, 631);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('refund_exceeds_payment');
  });

  it('staff cannot refund, only owners and managers', async () => {
    const id = await paidIntent();
    expect((await t.api.refund(id, 100, TOM)).status).toBe(403);
  });

  it('two managers refunding at the same time cannot over-refund', async () => {
    const id = await paidIntent();
    const results = await Promise.all([t.api.refund(id, 400), t.api.refund(id, 400)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await t.api.balance(LENA)).toBe(5000 - 630 + 400);
  });

  it('cannot refund an unpaid intent', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    expect((await t.api.refund(intent.id, 100)).status).toBe(409);
  });
});

describe('ledger rules in the database', () => {
  it('an unbalanced transaction is rejected at commit', async () => {
    await expect(
      t.db.transaction(async (tx) => {
        const [row] = await tx.execute<{ id: string }>(
          sql`INSERT INTO ledger_transactions (kind, reference) VALUES ('topup', 'bad') RETURNING id`,
        );
        await tx.insert(postings).values({
          transactionId: String(row?.id),
          accountId: 'consumer_wallet:usr_lena',
          amountCents: 100,
        });
      }),
    ).rejects.toThrow(/unbalanced/);
    expect(await t.api.balance(LENA)).toBe(5000);
  });

  it('postings cannot be edited or deleted', async () => {
    // Drizzle wraps the Postgres error; the trigger's message is on `cause`.
    const causeOf = (query: Promise<unknown>) =>
      query.then(
        () => null,
        (e: { cause?: Error }) => e.cause?.message,
      );
    expect(await causeOf(t.db.execute(sql`UPDATE postings SET amount_cents = amount_cents + 1`))).toMatch(
      /append-only/,
    );
    expect(await causeOf(t.db.execute(sql`DELETE FROM postings`))).toMatch(/append-only/);
  });
});
