import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { InjectOptions } from 'fastify';
import { afterAll, afterEach, beforeEach, expect } from 'vitest';
import { buildApp } from '../src/app';
import { createDb } from '../src/db/client';
import { seed } from '../src/db/seed';
import { Chaos } from '../src/rail/chaos';
import { SimulatedSepaInstantRail } from '../src/rail/simulatedSepaInstant';
import { TEST_DATABASE_URL } from './globalSetup';

export const LENA = 'usr_lena'; // 50,00 €
export const JONAS = 'usr_jonas'; // 10,00 €
export const MILA = 'usr_mila'; // owner, Café Mila (Business)
export const TOM = 'usr_tom'; // staff, Café Mila
export const ALI = 'usr_ali'; // owner, Döner Ali (Free)

/** One app + database per test file; data is re-seeded before every test. */
export function setupTestApp() {
  const handle = createDb(TEST_DATABASE_URL, { max: 10 });
  const chaos = new Chaos();
  chaos.slowMs = [300, 400];
  const rail = new SimulatedSepaInstantRail(chaos, 0);
  const appPromise = buildApp({
    db: handle.db,
    chaos,
    rail,
    chaosEnabled: true,
    devAuth: true,
    logger: false,
  });

  beforeEach(async () => {
    chaos.set('ok');
    await seed(handle.db);
  });

  // The ledger invariant, checked after every single test: every transaction sums to zero.
  afterEach(async () => {
    const unbalanced = await handle.db.execute(
      sql`SELECT transaction_id FROM postings GROUP BY transaction_id HAVING SUM(amount_cents) <> 0`,
    );
    expect(unbalanced).toHaveLength(0);
  });

  afterAll(async () => {
    await (await appPromise).close();
    await handle.close();
  });

  const call = async (
    method: 'GET' | 'POST' | 'DELETE',
    url: string,
    opts: { user?: string; key?: string; body?: unknown; headers?: Record<string, string> } = {},
  ) => {
    const app = await appPromise;
    const headers: Record<string, string> = { ...opts.headers };
    if (opts.user) headers['x-user-id'] = opts.user;
    if (opts.key) headers['idempotency-key'] = opts.key;
    const request: InjectOptions = { method, url, headers };
    if (opts.body !== undefined) request.payload = opts.body as InjectOptions['payload'];
    const res = await app.inject(request);
    return { status: res.statusCode, body: res.body ? res.json() : null, headers: res.headers };
  };

  const api = {
    createIntent: (body: unknown, user = MILA, merchant = 'cafe-mila', key = randomUUID()) =>
      call('POST', `/merchants/${merchant}/intents`, { user, key, body }),
    pay: (intentId: string, user = LENA, key = randomUUID(), body: unknown = {}) =>
      call('POST', `/intents/${intentId}/pay`, { user, key, body }),
    refund: (intentId: string, amountCents: number, user = MILA, key = randomUUID()) =>
      call('POST', `/intents/${intentId}/refunds`, {
        user,
        key,
        body: { amountCents, reason: 'Kunde unzufrieden' },
      }),
    balance: async (user: string) => (await call('GET', '/wallets/me', { user })).body.balanceCents as number,
    merchantBalance: async (merchant = 'cafe-mila', user = MILA) =>
      (await call('GET', `/merchants/${merchant}/wallet`, { user })).body.balanceCents as number,
  };

  return { db: handle.db, chaos, call, api, app: appPromise };
}

export const CART = {
  items: [
    { sku: 'cappuccino', qty: 1 },
    { sku: 'croissant', qty: 1 },
  ],
}; // 6,30 €
