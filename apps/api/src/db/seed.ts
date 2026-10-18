import { sql } from 'drizzle-orm';
import { accountId, postTransaction } from '../lib/ledger';
import { createDb, type Db } from './client';
import { accounts, catalogueItems, merchants, staff, users } from './schema';

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

const TABLES = [
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

export async function seed(db: Db) {
  await resetDatabase(db);

  await db.transaction(async (tx) => {
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
      const user = U[who as keyof typeof SEED.startingBalanceCents];
      await postTransaction(tx, {
        kind: 'topup',
        reference: `seed:${user.id}`,
        postings: [
          { accountId: accountId.topupSource, amountCents: -cents },
          { accountId: accountId.consumer(user.id), amountCents: cents },
        ],
      });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, close } = createDb(url, { max: 1 });
  await seed(db);
  await close();
  process.stdout.write(
    'seeded: Lena 50,00 €, Jonas 10,00 €, Café Mila (Business), Mensa (Business), Döner Ali (Free)\n',
  );
}
