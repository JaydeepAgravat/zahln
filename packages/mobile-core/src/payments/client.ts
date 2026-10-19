import {
  type CatalogueItem,
  CatalogueItemSchema,
  type CreateIntentRequest,
  MerchantPublicSchema,
  PaymentAttemptSchema,
  PaymentIntentSchema,
  PayResultSchema,
  RefundSchema,
} from '@zaster/shared';
import { z } from 'zod';
import { api } from '../api';

/** Thin, typed wrappers: every response is validated against the shared schema. */
export const payments = {
  catalogue: (merchantId: string): Promise<CatalogueItem[]> =>
    api(`/merchants/${merchantId}/catalogue`, z.array(CatalogueItemSchema)),

  createIntent: (merchantId: string, body: CreateIntentRequest, idempotencyKey: string) =>
    api(`/merchants/${merchantId}/intents`, PaymentIntentSchema, { method: 'POST', body, idempotencyKey }),

  intent: (intentId: string) => api(`/intents/${intentId}`, PaymentIntentSchema),

  intentByRef: (ref: string) => api(`/intents/by-ref/${encodeURIComponent(ref)}`, PaymentIntentSchema),

  reportScanned: (intentId: string) =>
    api(`/intents/${intentId}/scanned`, PaymentIntentSchema, { method: 'POST' }),

  /** Generous timeout: the rail can be slow, and a timeout means "checking", never "failed". */
  pay: (intentId: string, idempotencyKey: string, tipCents = 0) =>
    api(`/intents/${intentId}/pay`, PayResultSchema, {
      method: 'POST',
      body: { tipCents },
      idempotencyKey,
      timeoutMs: 12_000,
    }),

  handle: (handle: string) => api(`/handles/${encodeURIComponent(handle)}`, MerchantPublicSchema),

  /** Static QR: the payer typed the amount; this turns it into a normal one-time intent. */
  createHandleIntent: (handle: string, amountCents: number, idempotencyKey: string) =>
    api(`/handles/${encodeURIComponent(handle)}/intents`, PaymentIntentSchema, {
      method: 'POST',
      body: { amountCents },
      idempotencyKey,
    }),

  refund: (intentId: string, amountCents: number, reason: string, idempotencyKey: string) =>
    api(`/intents/${intentId}/refunds`, z.object({ refund: RefundSchema, intent: PaymentIntentSchema }), {
      method: 'POST',
      body: { amountCents, reason },
      idempotencyKey,
    }),

  setChaos: (mode: string) =>
    api('/dev/chaos', z.object({ mode: z.string() }), { method: 'POST', body: { mode } }),
  chaos: () => api('/dev/chaos', z.object({ mode: z.string() })),

  attemptByKey: (idempotencyKey: string) => api(`/attempts/by-key/${idempotencyKey}`, PaymentAttemptSchema),

  /** Dev builds only: the newest open QR, for simulators without a camera. */
  devLatestRef: async (): Promise<string | null> =>
    (await api('/dev/latest-intent', z.object({ ref: z.string().nullable() }))).ref,
};
