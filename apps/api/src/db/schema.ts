import { ATTEMPT_STATUSES, INTENT_STATUSES, type LineItem, PLANS } from '@zahln/shared';
import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const planEnum = pgEnum('plan', PLANS);
export const staffRoleEnum = pgEnum('staff_role', ['owner', 'manager', 'staff']);
export const accountKindEnum = pgEnum('account_kind', [
  'consumer_wallet',
  'merchant_wallet',
  'topup_source',
  'settlement_outbound',
]);
export const ledgerKindEnum = pgEnum('ledger_kind', ['payment', 'refund', 'topup', 'payout']);
export const intentStatusEnum = pgEnum('intent_status', INTENT_STATUSES);
export const attemptStatusEnum = pgEnum('attempt_status', ATTEMPT_STATUSES);
export const idempotencyStatusEnum = pgEnum('idempotency_status', ['processing', 'completed']);

// ---------- People and merchants ----------

export const users = pgTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  phone: text().notNull().unique(),
  createdAt: createdAt(),
});

export const merchants = pgTable('merchants', {
  id: text().primaryKey(),
  name: text().notNull(),
  handle: text().notNull().unique(),
  city: text().notNull(),
  plan: planEnum().notNull().default('free'),
  /** Gapless receipt counter per merchant (GoBD-style), incremented inside the payment transaction. */
  receiptSeq: integer().notNull().default(0),
  createdAt: createdAt(),
});

export const staff = pgTable(
  'staff',
  {
    merchantId: text()
      .notNull()
      .references(() => merchants.id),
    userId: text()
      .notNull()
      .references(() => users.id),
    role: staffRoleEnum().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.merchantId, t.userId] })],
);

export const catalogueItems = pgTable(
  'catalogue_items',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    merchantId: text()
      .notNull()
      .references(() => merchants.id),
    sku: text().notNull(),
    name: text().notNull(),
    priceCents: integer().notNull(),
    vatRate: smallint().notNull(),
    active: boolean().notNull().default(true),
  },
  (t) => [unique().on(t.merchantId, t.sku), check('price_positive', sql`${t.priceCents} > 0`)],
);

// ---------- Ledger ----------

export const accounts = pgTable('accounts', {
  /** e.g. `consumer_wallet:usr_lena`, `merchant_wallet:cafe-mila` */
  id: text().primaryKey(),
  kind: accountKindEnum().notNull(),
  ownerId: text(),
  currency: text().notNull().default('EUR'),
  /** Only system accounts (top-up source, settlement) may go negative. */
  allowNegative: boolean().notNull().default(false),
  createdAt: createdAt(),
});

export const ledgerTransactions = pgTable('ledger_transactions', {
  id: uuid().primaryKey().defaultRandom(),
  kind: ledgerKindEnum().notNull(),
  /** What caused it: an attempt ID, refund ID or top-up key. */
  reference: text().notNull(),
  createdAt: createdAt(),
});

/**
 * Append-only. Balances are SUM(amount_cents) per account; postings of one transaction sum to zero.
 * Both rules are enforced by database triggers (see drizzle/0001_ledger_rules.sql), not just app code.
 */
export const postings = pgTable(
  'postings',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    transactionId: uuid()
      .notNull()
      .references(() => ledgerTransactions.id),
    accountId: text()
      .notNull()
      .references(() => accounts.id),
    amountCents: integer().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.accountId),
    index().on(t.transactionId),
    check('non_zero', sql`${t.amountCents} <> 0`),
  ],
);

// ---------- Payments ----------

export const paymentIntents = pgTable(
  'payment_intents',
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: text()
      .notNull()
      .references(() => merchants.id),
    createdByUserId: text()
      .notNull()
      .references(() => users.id),
    amountCents: integer().notNull(),
    currency: text().notNull().default('EUR'),
    items: jsonb().$type<LineItem[]>().notNull().default([]),
    description: text(),
    status: intentStatusEnum().notNull().default('awaiting_scan'),
    refundedCents: integer().notNull().default(0),
    receiptNumber: integer(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.merchantId, t.createdAt),
    check('amount_positive', sql`${t.amountCents} > 0`),
    check('refund_within_amount', sql`${t.refundedCents} >= 0 AND ${t.refundedCents} <= ${t.amountCents}`),
  ],
);

export const paymentAttempts = pgTable(
  'payment_attempts',
  {
    id: uuid().primaryKey().defaultRandom(),
    intentId: uuid()
      .notNull()
      .references(() => paymentIntents.id),
    payerUserId: text()
      .notNull()
      .references(() => users.id),
    idempotencyKey: text().notNull(),
    status: attemptStatusEnum().notNull(),
    amountCents: integer().notNull(),
    tipCents: integer().notNull().default(0),
    railReference: text(),
    reason: text(),
    settledAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique().on(t.payerUserId, t.idempotencyKey),
    // Last line of defence: an intent can be paid at most once, whatever the app code does.
    uniqueIndex('one_paid_attempt_per_intent').on(t.intentId).where(sql`${t.status} = 'paid'`),
  ],
);

export const refunds = pgTable('refunds', {
  id: uuid().primaryKey().defaultRandom(),
  intentId: uuid()
    .notNull()
    .references(() => paymentIntents.id),
  amountCents: integer().notNull(),
  reason: text().notNull(),
  createdByUserId: text()
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

// ---------- Idempotency and events ----------

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    /** Keys are scoped per actor, like Stripe scopes them per account. */
    scope: text().notNull(),
    key: text().notNull(),
    requestHash: text().notNull(),
    status: idempotencyStatusEnum().notNull().default('processing'),
    responseStatus: integer(),
    responseBody: jsonb(),
    createdAt: createdAt(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.scope, t.key] })],
);

/** Timeline for the console: created → scanned → paid → refunded. */
export const events = pgTable(
  'events',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    aggregateId: text().notNull(),
    type: text().notNull(),
    data: jsonb().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.aggregateId, t.id)],
);
