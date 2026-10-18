import {
  type CreateIntentRequest,
  canTransitionIntent,
  type Feature,
  hasFeature,
  INTENT_TTL_SECONDS,
  type IntentStatus,
  isPayable,
  isRefundable,
  type LineItem,
  minimumPlanFor,
  type PaymentAttempt,
  type PaymentIntent,
  type Refund,
  statusAfterRefund,
  sumCents,
  type VatRate,
  type Wallet,
} from '@zahln/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DbOrTx, Tx } from '../db/client';
import {
  catalogueItems,
  events,
  merchants,
  paymentAttempts,
  paymentIntents,
  refunds,
  staff,
} from '../db/schema';
import type { Chaos } from '../rail/chaos';
import type { PaymentRail } from '../rail/types';
import { ApiError, forbidden, notFound } from './errors';
import { accountId, balanceOf, lockAccount, postTransaction } from './ledger';

type IntentRow = typeof paymentIntents.$inferSelect;
type MerchantRow = typeof merchants.$inferSelect;
type AttemptRow = typeof paymentAttempts.$inferSelect;

const iso = (d: Date) => d.toISOString();

export function toIntentDto(row: IntentRow, merchant: MerchantRow): PaymentIntent {
  return {
    id: row.id,
    merchant: { id: merchant.id, name: merchant.name, handle: merchant.handle, city: merchant.city },
    amountCents: row.amountCents,
    currency: 'EUR',
    items: row.items,
    status: row.status,
    refundedCents: row.refundedCents,
    receiptNumber: row.receiptNumber,
    expiresAt: iso(row.expiresAt),
    createdAt: iso(row.createdAt),
    paidAt: row.paidAt ? iso(row.paidAt) : null,
  };
}

export function toAttemptDto(row: AttemptRow): PaymentAttempt {
  return {
    id: row.id,
    intentId: row.intentId,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    amountCents: row.amountCents,
    tipCents: row.tipCents,
    reason: row.reason,
    createdAt: iso(row.createdAt),
    settledAt: row.settledAt ? iso(row.settledAt) : null,
  };
}

async function recordEvent(tx: Tx, aggregateId: string, type: string, data: Record<string, unknown> = {}) {
  await tx.insert(events).values({ aggregateId, type, data });
}

async function loadMerchant(db: DbOrTx, merchantId: string): Promise<MerchantRow> {
  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, merchantId));
  if (!merchant) throw notFound('merchant');
  return merchant;
}

function requireFeature(merchant: MerchantRow, feature: Feature) {
  if (!hasFeature(merchant.plan, feature)) {
    throw new ApiError(
      403,
      'plan_required',
      `${feature} needs the ${minimumPlanFor(feature)} plan (current: ${merchant.plan})`,
    );
  }
}

async function requireStaff(db: DbOrTx, merchantId: string, userId: string, roles?: string[]) {
  const [member] = await db
    .select({ role: staff.role })
    .from(staff)
    .where(and(eq(staff.merchantId, merchantId), eq(staff.userId, userId)));
  if (!member) throw forbidden('not a staff member of this merchant');
  if (roles && !roles.includes(member.role)) throw forbidden(`requires role ${roles.join(' or ')}`);
  return member.role;
}

/** Lock the intent row for this transaction and say whether it's past its expiry by the database clock. */
async function lockIntent(tx: Tx, intentId: string) {
  const [row] = await tx
    .select({ intent: paymentIntents, pastExpiry: sql<boolean>`${paymentIntents.expiresAt} <= now()` })
    .from(paymentIntents)
    .where(eq(paymentIntents.id, intentId))
    .for('update');
  if (!row) throw notFound('payment intent');
  return row;
}

function assertTransition(from: IntentStatus, to: IntentStatus) {
  if (!canTransitionIntent(from, to)) throw new Error(`illegal intent transition ${from} → ${to}`);
}

// ---------- Create ----------

export async function createIntent(
  tx: Tx,
  input: { merchantId: string; userId: string; request: CreateIntentRequest },
): Promise<PaymentIntent> {
  const merchant = await loadMerchant(tx, input.merchantId);
  await requireStaff(tx, merchant.id, input.userId);
  // A one-time QR for a specific amount is the Pro "dynamic QR" feature (zysygy.de/plans).
  requireFeature(merchant, 'dynamic_qr');

  let items: LineItem[] = [];
  let amountCents: number;
  let description: string | null = null;

  if ('items' in input.request) {
    requireFeature(merchant, 'catalogue');
    const skus = input.request.items.map((i) => i.sku);
    const products = await tx
      .select()
      .from(catalogueItems)
      .where(
        and(
          eq(catalogueItems.merchantId, merchant.id),
          inArray(catalogueItems.sku, skus),
          eq(catalogueItems.active, true),
        ),
      );
    const bySku = new Map(products.map((p) => [p.sku, p]));
    items = input.request.items.map(({ sku, qty }) => {
      const product = bySku.get(sku);
      if (!product) throw new ApiError(400, 'bad_request', `unknown product ${sku}`);
      return {
        sku,
        name: product.name,
        qty,
        unitPriceCents: product.priceCents,
        vatRate: product.vatRate as VatRate,
      };
    });
    amountCents = sumCents(items.map((i) => i.unitPriceCents * i.qty));
  } else {
    amountCents = input.request.amountCents;
    description = input.request.description ?? null;
  }

  const [row] = await tx
    .insert(paymentIntents)
    .values({
      merchantId: merchant.id,
      createdByUserId: input.userId,
      amountCents,
      items,
      description,
      expiresAt: sql`now() + make_interval(secs => ${INTENT_TTL_SECONDS})`,
    })
    .returning();
  if (!row) throw new Error('failed to create intent');
  await recordEvent(tx, row.id, 'intent.created', { amountCents, by: input.userId });
  return toIntentDto(row, merchant);
}

export async function getIntent(db: DbOrTx, intentId: string): Promise<PaymentIntent> {
  const [row] = await db
    .select({ intent: paymentIntents, merchant: merchants })
    .from(paymentIntents)
    .innerJoin(merchants, eq(merchants.id, paymentIntents.merchantId))
    .where(eq(paymentIntents.id, intentId));
  if (!row) throw notFound('payment intent');
  return toIntentDto(row.intent, row.merchant);
}

// ---------- Pay ----------

export type PayResult = { attempt: PaymentAttempt; intent: PaymentIntent };
/** The intent was past its expiry: the `expired` status is committed and the client gets a 409. */
export type PayOutcome = { kind: 'attempted'; result: PayResult } | { kind: 'expired' };

/**
 * One payment, in one database transaction:
 * lock intent → check payable and not expired → lock payer wallet → check balance →
 * submit to the rail → post the ledger transaction → mark intent paid with the next receipt number.
 *
 * MVP simplification: the (simulated, in-process) rail call happens inside the DB transaction.
 * With a real PSP the call is external, so production would reserve funds, commit, call the rail,
 * and settle via an outbox. See docs/days/DAY-1.md.
 */
export async function payIntent(
  tx: Tx,
  deps: { rail: PaymentRail; chaos: Chaos },
  input: { intentId: string; payerUserId: string; idempotencyKey: string; tipCents: number },
): Promise<PayOutcome> {
  const { intent, pastExpiry } = await lockIntent(tx, input.intentId);
  const merchant = await loadMerchant(tx, intent.merchantId);

  if (intent.status === 'expired') throw new ApiError(409, 'intent_expired', 'this payment code has expired');
  if (!isPayable(intent.status)) throw new ApiError(409, 'intent_not_payable', `intent is ${intent.status}`);
  if (pastExpiry) {
    // Expiry is checked inside the payment transaction, not only by a background job.
    // We return instead of throwing so the status change commits.
    assertTransition(intent.status, 'expired');
    await tx.update(paymentIntents).set({ status: 'expired' }).where(eq(paymentIntents.id, intent.id));
    await recordEvent(tx, intent.id, 'intent.expired');
    return { kind: 'expired' };
  }
  if (input.tipCents > 0) requireFeature(merchant, 'tips');

  const payer = accountId.consumer(input.payerUserId);
  const payee = accountId.merchant(merchant.id);
  const totalCents = intent.amountCents + input.tipCents;

  await lockAccount(tx, payer);
  const balance = await balanceOf(tx, payer);

  const [attempt] = await tx
    .insert(paymentAttempts)
    .values({
      intentId: intent.id,
      payerUserId: input.payerUserId,
      idempotencyKey: input.idempotencyKey,
      status: 'processing',
      amountCents: intent.amountCents,
      tipCents: input.tipCents,
    })
    .returning();
  if (!attempt) throw new Error('failed to create attempt');

  const finish = async (patch: Partial<AttemptRow>, intentRow: IntentRow = intent): Promise<PayOutcome> => {
    const [updated] = await tx
      .update(paymentAttempts)
      .set(patch)
      .where(eq(paymentAttempts.id, attempt.id))
      .returning();
    if (!updated) throw new Error('attempt vanished');
    return {
      kind: 'attempted',
      result: { attempt: toAttemptDto(updated), intent: toIntentDto(intentRow, merchant) },
    };
  };

  if (balance < totalCents || deps.chaos.mode === 'insufficient') {
    await recordEvent(tx, intent.id, 'attempt.insufficient_balance', { attemptId: attempt.id });
    return finish({ status: 'insufficient_balance', reason: 'insufficient_balance' });
  }

  const result = await deps.rail.submit({
    id: attempt.id,
    amountCents: totalCents,
    debtorAccount: payer,
    creditorAccount: payee,
  });

  if (result.state === 'rejected') {
    await recordEvent(tx, intent.id, 'attempt.rejected', { attemptId: attempt.id, reason: result.reason });
    return finish({ status: 'not_charged', reason: result.reason });
  }

  await postTransaction(tx, {
    kind: 'payment',
    reference: attempt.id,
    postings: [
      { accountId: payer, amountCents: -totalCents },
      { accountId: payee, amountCents: totalCents },
    ],
  });

  const [{ receiptSeq } = { receiptSeq: 0 }] = await tx
    .update(merchants)
    .set({ receiptSeq: sql`${merchants.receiptSeq} + 1` })
    .where(eq(merchants.id, merchant.id))
    .returning({ receiptSeq: merchants.receiptSeq });

  assertTransition(intent.status, 'paid');
  const [paidIntent] = await tx
    .update(paymentIntents)
    .set({ status: 'paid', paidAt: result.settledAt, receiptNumber: receiptSeq })
    .where(eq(paymentIntents.id, intent.id))
    .returning();
  if (!paidIntent) throw new Error('intent vanished');

  await recordEvent(tx, intent.id, 'intent.paid', {
    attemptId: attempt.id,
    totalCents,
    railReference: result.railReference,
    receiptNumber: receiptSeq,
  });
  return finish(
    { status: 'paid', railReference: result.railReference, settledAt: result.settledAt },
    paidIntent,
  );
}

export async function getAttemptByKey(db: DbOrTx, payerUserId: string, key: string): Promise<PaymentAttempt> {
  const [row] = await db
    .select()
    .from(paymentAttempts)
    .where(and(eq(paymentAttempts.payerUserId, payerUserId), eq(paymentAttempts.idempotencyKey, key)));
  if (!row) throw notFound('payment attempt');
  return toAttemptDto(row);
}

// ---------- Refund ----------

export async function refundIntent(
  tx: Tx,
  input: { intentId: string; userId: string; amountCents: number; reason: string },
): Promise<{ refund: Refund; intent: PaymentIntent }> {
  const { intent } = await lockIntent(tx, input.intentId);
  const merchant = await loadMerchant(tx, intent.merchantId);
  await requireStaff(tx, merchant.id, input.userId, ['owner', 'manager']);
  requireFeature(merchant, 'refunds');

  if (!isRefundable(intent.status))
    throw new ApiError(409, 'intent_not_payable', `intent is ${intent.status}`);
  const refundedTotal = intent.refundedCents + input.amountCents;
  if (refundedTotal > intent.amountCents) {
    throw new ApiError(
      409,
      'refund_exceeds_payment',
      `can refund at most ${intent.amountCents - intent.refundedCents} more cents`,
    );
  }

  const [paid] = await tx
    .select()
    .from(paymentAttempts)
    .where(and(eq(paymentAttempts.intentId, intent.id), eq(paymentAttempts.status, 'paid')));
  if (!paid) throw new Error('paid intent without a paid attempt');

  const merchantAccount = accountId.merchant(merchant.id);
  await lockAccount(tx, merchantAccount);
  if ((await balanceOf(tx, merchantAccount)) < input.amountCents) {
    throw new ApiError(
      409,
      'insufficient_merchant_balance',
      'merchant wallet balance is too low for this refund',
    );
  }

  const [refund] = await tx
    .insert(refunds)
    .values({
      intentId: intent.id,
      amountCents: input.amountCents,
      reason: input.reason,
      createdByUserId: input.userId,
    })
    .returning();
  if (!refund) throw new Error('failed to create refund');

  await postTransaction(tx, {
    kind: 'refund',
    reference: refund.id,
    postings: [
      { accountId: merchantAccount, amountCents: -input.amountCents },
      { accountId: accountId.consumer(paid.payerUserId), amountCents: input.amountCents },
    ],
  });

  const nextStatus = statusAfterRefund(intent.amountCents, refundedTotal);
  assertTransition(intent.status, nextStatus);
  const [updated] = await tx
    .update(paymentIntents)
    .set({ status: nextStatus, refundedCents: refundedTotal })
    .where(eq(paymentIntents.id, intent.id))
    .returning();
  if (!updated) throw new Error('intent vanished');

  await recordEvent(tx, intent.id, 'intent.refunded', {
    refundId: refund.id,
    amountCents: input.amountCents,
    by: input.userId,
  });

  return {
    refund: {
      id: refund.id,
      intentId: refund.intentId,
      amountCents: refund.amountCents,
      reason: refund.reason,
      createdAt: iso(refund.createdAt),
    },
    intent: toIntentDto(updated, merchant),
  };
}

// ---------- Wallets ----------

export async function topUp(tx: Tx, input: { userId: string; amountCents: number; key: string }) {
  await postTransaction(tx, {
    kind: 'topup',
    reference: `topup:${input.key}`,
    postings: [
      { accountId: accountId.topupSource, amountCents: -input.amountCents },
      { accountId: accountId.consumer(input.userId), amountCents: input.amountCents },
    ],
  });
}

export async function getWallet(db: DbOrTx, account: string, limit = 20): Promise<Wallet> {
  const balanceCents = await balanceOf(db, account);
  const rows = await db.execute<{
    id: string;
    kind: 'payment' | 'refund' | 'topup' | 'payout';
    amount_cents: number;
    reference: string;
    created_at: Date | string;
    counterparty: string | null;
    counterparty_name: string;
  }>(sql`
    SELECT lt.id, lt.kind, p.amount_cents, lt.reference, lt.created_at, cp.account_id AS counterparty,
           -- Data minimisation: people are shown as "Lena H.", merchants by their business name.
           COALESCE(m.name, split_part(u.name, ' ', 1) || COALESCE(' ' || left(NULLIF(split_part(u.name, ' ', 2), ''), 1) || '.', ''), '') AS counterparty_name
      FROM postings p
      JOIN ledger_transactions lt ON lt.id = p.transaction_id
      LEFT JOIN LATERAL (SELECT p2.account_id FROM postings p2
             WHERE p2.transaction_id = p.transaction_id AND p2.account_id <> p.account_id LIMIT 1) cp ON true
      LEFT JOIN accounts a ON a.id = cp.account_id
      LEFT JOIN merchants m ON a.kind = 'merchant_wallet' AND m.id = a.owner_id
      LEFT JOIN users u ON a.kind = 'consumer_wallet' AND u.id = a.owner_id
     WHERE p.account_id = ${account}
     ORDER BY p.id DESC
     LIMIT ${limit}
  `);
  return {
    accountId: account,
    balanceCents,
    currency: 'EUR',
    transactions: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      amountCents: Number(r.amount_cents),
      counterparty: r.counterparty ?? '',
      counterpartyName: r.counterparty_name,
      reference: r.reference,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  };
}

export async function requireMerchantStaff(db: DbOrTx, merchantId: string, userId: string) {
  await loadMerchant(db, merchantId);
  return requireStaff(db, merchantId, userId);
}
