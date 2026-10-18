import { z } from 'zod';
import { PLANS } from '../plans';

/** Integer cents, never floats. */
export const CentsSchema = z.number().int().nonnegative().max(10_000_000);
export const PositiveCentsSchema = CentsSchema.min(1);
export const VatRateSchema = z.union([z.literal(0), z.literal(7), z.literal(19)]);
export const PlanSchema = z.enum(PLANS);

export const IdempotencyKeySchema = z.uuid();
export const IDEMPOTENCY_HEADER = 'idempotency-key';

// ---------- Merchants ----------

export const MerchantPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  city: z.string(),
});
export type MerchantPublic = z.infer<typeof MerchantPublicSchema>;

export const LineItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  qty: z.number().int().min(1).max(99),
  unitPriceCents: CentsSchema,
  vatRate: VatRateSchema,
});
export type LineItem = z.infer<typeof LineItemSchema>;

export const CatalogueItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  priceCents: PositiveCentsSchema,
  vatRate: VatRateSchema,
});
export type CatalogueItem = z.infer<typeof CatalogueItemSchema>;

// ---------- Payment intents (merchant side) ----------

export const INTENT_STATUSES = [
  'awaiting_scan',
  'scanned',
  'paid',
  'expired',
  'cancelled',
  'partially_refunded',
  'refunded',
] as const;
export const IntentStatusSchema = z.enum(INTENT_STATUSES);
export type IntentStatus = z.infer<typeof IntentStatusSchema>;

export const INTENT_TTL_SECONDS = 5 * 60;

/** Either a cart from the catalogue or a keypad amount, never both. */
export const CreateIntentRequestSchema = z.union([
  z.object({
    items: z
      .array(z.object({ sku: z.string().min(1), qty: z.number().int().min(1).max(99) }))
      .min(1)
      .max(50),
  }),
  z.object({ amountCents: PositiveCentsSchema, description: z.string().max(80).optional() }),
]);
export type CreateIntentRequest = z.infer<typeof CreateIntentRequestSchema>;

export const PaymentIntentSchema = z.object({
  id: z.uuid(),
  /** Signed reference the QR encodes (see payUrl.ts). */
  ref: z.string(),
  merchant: MerchantPublicSchema,
  amountCents: PositiveCentsSchema,
  currency: z.literal('EUR'),
  items: z.array(LineItemSchema),
  status: IntentStatusSchema,
  refundedCents: CentsSchema,
  receiptNumber: z.number().int().nullable(),
  expiresAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }),
  paidAt: z.iso.datetime({ offset: true }).nullable(),
});
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;

// ---------- Payment attempts (consumer side) ----------

/** Outcomes the server records for one pay request. `processing` only exists while the rail is working. */
export const ATTEMPT_STATUSES = ['processing', 'paid', 'not_charged', 'insufficient_balance'] as const;
export const AttemptStatusSchema = z.enum(ATTEMPT_STATUSES);
export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;

export const PayRequestSchema = z.object({
  tipCents: CentsSchema.default(0),
});
export type PayRequest = z.infer<typeof PayRequestSchema>;

export const PaymentAttemptSchema = z.object({
  id: z.uuid(),
  intentId: z.uuid(),
  idempotencyKey: z.string(),
  status: AttemptStatusSchema,
  amountCents: PositiveCentsSchema,
  tipCents: CentsSchema,
  reason: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  settledAt: z.iso.datetime({ offset: true }).nullable(),
});
export type PaymentAttempt = z.infer<typeof PaymentAttemptSchema>;

/** What `POST /intents/:id/pay` answers (also what an idempotent replay returns). */
export const PayResultSchema = z.object({ attempt: PaymentAttemptSchema, intent: PaymentIntentSchema });
export type PayResult = z.infer<typeof PayResultSchema>;

// ---------- Refunds ----------

export const RefundRequestSchema = z.object({
  amountCents: PositiveCentsSchema,
  reason: z.string().min(3).max(200),
});
export type RefundRequest = z.infer<typeof RefundRequestSchema>;

export const RefundSchema = z.object({
  id: z.uuid(),
  intentId: z.uuid(),
  amountCents: PositiveCentsSchema,
  reason: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type Refund = z.infer<typeof RefundSchema>;

// ---------- Wallets ----------

export const TopUpRequestSchema = z.object({ amountCents: PositiveCentsSchema.max(50_000) });

export const WalletTransactionSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['payment', 'refund', 'topup', 'payout']),
  amountCents: z.number().int(), // signed from the wallet's point of view
  counterparty: z.string(),
  /** Display name: merchant or person on the other side, or empty for system accounts (top-up, payout). */
  counterpartyName: z.string(),
  reference: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;

export const WalletSchema = z.object({
  accountId: z.string(),
  balanceCents: z.number().int(),
  currency: z.literal('EUR'),
  transactions: z.array(WalletTransactionSchema),
});
export type Wallet = z.infer<typeof WalletSchema>;

// ---------- Remote config (filled in on Day 5) ----------

export const RemoteConfigSchema = z.object({
  version: z.number().int(),
  minSupportedVersion: z.string(),
  latestVersion: z.string(),
  killSwitches: z.record(z.string(), z.boolean()),
  flags: z.record(z.string(), z.boolean()),
  limits: z.object({ reauthAboveCents: CentsSchema, maxPaymentCents: CentsSchema }),
  ttlSeconds: z.number().int().positive(),
});
export type RemoteConfig = z.infer<typeof RemoteConfigSchema>;

// ---------- Errors ----------

export const API_ERROR_CODES = [
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'plan_required',
  'otp_invalid',
  'otp_expired',
  'otp_too_many_attempts',
  'name_required',
  'wrong_app',
  'idempotency_key_missing',
  'idempotency_key_reused',
  'idempotency_in_progress',
  'intent_expired',
  'intent_not_payable',
  'refund_exceeds_payment',
  'insufficient_merchant_balance',
  'internal',
] as const;
export const ApiErrorSchema = z.object({
  error: z.enum(API_ERROR_CODES),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiErrorCode = ApiError['error'];
