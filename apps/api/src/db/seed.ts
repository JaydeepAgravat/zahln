import { INITIAL_ADMIN_CONFIG } from '@zahln/shared';
import { eq, sql } from 'drizzle-orm';
import { accountId, postTransaction } from '../lib/ledger';
import { createDb, type Db } from './client';
import {
  accounts,
  appConfig,
  catalogueItems,
  events,
  ledgerTransactions,
  merchants,
  paymentAttempts,
  paymentIntents,
  staff,
  users,
} from './schema';

export const SEED = {
  users: {
    lena: { id: 'usr_lena', name: 'Lena Hoffmann', phone: '+4915100000001' },
    jonas: { id: 'usr_jonas', name: 'Jonas Weber', phone: '+4915100000002' },
    mila: { id: 'usr_mila', name: 'Mila Schneider', phone: '+4915100000010' },
    tom: { id: 'usr_tom', name: 'Tom Becker', phone: '+4915100000011' },
    ali: { id: 'usr_ali', name: 'Ali Yilmaz', phone: '+4915100000020' },
    sabine: { id: 'usr_sabine', name: 'Sabine Kraus', phone: '+4915100000030' },
  },
  merchants: {
    cafeMila: {
      id: 'cafe-mila',
      name: 'Café Mila',
      handle: 'cafe-mila',
      city: 'Augsburg',
      plan: 'business' as const,
    },
    mensa: {
      id: 'mensa-augsburg',
      name: 'Mensa Universität Augsburg',
      handle: 'mensa-augsburg',
      city: 'Augsburg',
      plan: 'business' as const,
    },
    doener: {
      id: 'doener-ali',
      name: 'Döner Ali',
      handle: 'doener-ali',
      city: 'Augsburg',
      plan: 'free' as const,
    },
  },
  startingBalanceCents: { lena: 5000, jonas: 1000 },
} as const;

const { users: U, merchants: M } = SEED;

/** Products from the zysygy.de demo till. */
const CAFE_MILA_CATALOGUE = [
  { sku: 'cappuccino', name: 'Cappuccino', priceCents: 380, vatRate: 7 },
  { sku: 'croissant', name: 'Croissant', priceCents: 250, vatRate: 7 },
  { sku: 'matcha-latte', name: 'Matcha Latte', priceCents: 450, vatRate: 7 },
  { sku: 'espresso', name: 'Espresso', priceCents: 220, vatRate: 7 },
  { sku: 'avocado-toast', name: 'Avocado Toast', priceCents: 750, vatRate: 19 },
  { sku: 'flat-white', name: 'Flat White', priceCents: 350, vatRate: 7 },
];

const MENSA_CATALOGUE = [
  { sku: 'tagesgericht', name: 'Tagesgericht', priceCents: 320, vatRate: 7 },
  { sku: 'vegan-bowl', name: 'Vegane Bowl', priceCents: 410, vatRate: 7 },
  { sku: 'salat', name: 'Salatbar (Teller)', priceCents: 250, vatRate: 7 },
  { sku: 'kaffee', name: 'Kaffee', priceCents: 120, vatRate: 7 },
];

/** Realistic recent history for the demo: what Lena paid over the last days. */
const HISTORY: {
  merchant: string;
  sku: string;
  name: string;
  cents: number;
  vat: 0 | 7 | 19;
  hoursAgo: number;
}[] = [
  { merchant: 'mensa-augsburg', sku: 'tagesgericht', name: 'Tagesgericht', cents: 320, vat: 7, hoursAgo: 2 },
  { merchant: 'cafe-mila', sku: 'flat-white', name: 'Flat White', cents: 350, vat: 7, hoursAgo: 22 },
  { merchant: 'mensa-augsburg', sku: 'vegan-bowl', name: 'Vegane Bowl', cents: 410, vat: 7, hoursAgo: 26 },
  { merchant: 'cafe-mila', sku: 'cappuccino', name: 'Cappuccino', cents: 380, vat: 7, hoursAgo: 50 },
];

const TABLES = [
  'app_config',
  'devices',
  'auth_challenges',
  'events',
  'idempotency_keys',
  'refunds',
  'payment_attempts',
  'payment_intents',
  'postings',
  'ledger_transactions',
  'accounts',
  'catalogue_items',
  'staff',
  'merchants',
  'users',
];

/** Wipe all data (TRUNCATE bypasses the append-only row trigger on purpose: it's a reset, not an edit). */
export async function resetDatabase(db: Db) {
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`));
}

/** `history: true` adds a few days of realistic payments for the demo; tests start from a clean slate. */
export async function seed(db: Db, options: { history?: boolean } = {}) {
  await resetDatabase(db);

  await db.transaction(async (tx) => {
    await tx.insert(appConfig).values({ id: 'global', version: 1, data: INITIAL_ADMIN_CONFIG });
    await tx.insert(users).values(Object.values(U));
    await tx.insert(merchants).values(Object.values(M));
    await tx.insert(staff).values([
      { merchantId: M.cafeMila.id, userId: U.mila.id, role: 'owner' },
      { merchantId: M.cafeMila.id, userId: U.tom.id, role: 'staff' },
      { merchantId: M.doener.id, userId: U.ali.id, role: 'owner' },
      { merchantId: M.mensa.id, userId: U.sabine.id, role: 'manager' },
    ]);
    await tx
      .insert(catalogueItems)
      .values([
        ...CAFE_MILA_CATALOGUE.map((item) => ({ merchantId: M.cafeMila.id, ...item })),
        ...MENSA_CATALOGUE.map((item) => ({ merchantId: M.mensa.id, ...item })),
      ]);

    await tx.insert(accounts).values([
      { id: accountId.topupSource, kind: 'topup_source', allowNegative: true },
      { id: accountId.settlementOutbound, kind: 'settlement_outbound', allowNegative: true },
      ...[U.lena, U.jonas, U.mila, U.tom, U.ali, U.sabine].map((u) => ({
        id: accountId.consumer(u.id),
        kind: 'consumer_wallet' as const,
        ownerId: u.id,
      })),
      ...Object.values(M).map((m) => ({
        id: accountId.merchant(m.id),
        kind: 'merchant_wallet' as const,
        ownerId: m.id,
      })),
    ]);

    for (const [who, cents] of Object.entries(SEED.startingBalanceCents)) {
      const createdAt = who === 'lena' ? sql`now() - interval '5 days'` : sql`now()`;
      const user = U[who as keyof typeof SEED.startingBalanceCents];
      const ledgerId = await postTransaction(tx, {
        kind: 'topup',
        reference: `seed:${user.id}`,
        postings: [
          { accountId: accountId.topupSource, amountCents: -cents },
          { accountId: accountId.consumer(user.id), amountCents: cents },
        ],
      });
      await tx.update(ledgerTransactions).set({ createdAt }).where(eq(ledgerTransactions.id, ledgerId));
    }

    if (!options.history) return;
    // Past payments go through the same tables as real ones (intent → paid attempt → balanced postings).
    // Oldest first, so ids and timestamps agree; receipt numbers count per merchant.
    const receipts = new Map<string, number>();
    const ordered = [...HISTORY].sort((a, b) => b.hoursAgo - a.hoursAgo);
    for (const [i, h] of ordered.entries()) {
      const receiptNumber = (receipts.get(h.merchant) ?? 0) + 1;
      receipts.set(h.merchant, receiptNumber);
      const at = sql`now() - make_interval(hours => ${h.hoursAgo})`;
      const [intent] = await tx
        .insert(paymentIntents)
        .values({
          merchantId: h.merchant,
          createdByUserId: h.merchant === 'cafe-mila' ? U.mila.id : U.sabine.id,
          amountCents: h.cents,
          items: [{ sku: h.sku, name: h.name, qty: 1, unitPriceCents: h.cents, vatRate: h.vat }],
          status: 'paid',
          receiptNumber,
          expiresAt: at,
          paidAt: at,
          createdAt: at,
        })
        .returning({ id: paymentIntents.id });
      if (!intent) throw new Error('seed intent failed');
      const [attempt] = await tx
        .insert(paymentAttempts)
        .values({
          intentId: intent.id,
          payerUserId: U.lena.id,
          idempotencyKey: `seed-${i}`,
          status: 'paid',
          amountCents: h.cents,
          settledAt: at,
          createdAt: at,
        })
        .returning({ id: paymentAttempts.id });
      if (!attempt) throw new Error('seed attempt failed');
      const ledgerId = await postTransaction(tx, {
        kind: 'payment',
        reference: attempt.id,
        postings: [
          { accountId: accountId.consumer(U.lena.id), amountCents: -h.cents },
          { accountId: accountId.merchant(h.merchant), amountCents: h.cents },
        ],
      });
      await tx.update(ledgerTransactions).set({ createdAt: at }).where(eq(ledgerTransactions.id, ledgerId));
      await tx
        .insert(events)
        .values({ aggregateId: intent.id, type: 'intent.paid', data: { seeded: true }, createdAt: at });
    }
    for (const [merchantId, seq] of receipts) {
      await tx.update(merchants).set({ receiptSeq: seq }).where(eq(merchants.id, merchantId));
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, close } = createDb(url, { max: 1 });
  await seed(db, { history: true });
  await close();
  process.stdout.write(
    'seeded: Lena 35,40 € (50 € top-up, 4 payments), Jonas 10,00 €, Café Mila (Business), Mensa (Business), Döner Ali (Free)\n',
  );
}
