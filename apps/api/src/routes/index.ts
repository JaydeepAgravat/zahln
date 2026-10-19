import {
  CreateIntentRequestSchema,
  HandleIntentRequestSchema,
  IdempotencyKeySchema,
  type KillSwitch,
  type PaymentIntent,
  PayRequestSchema,
  RefundRequestSchema,
  TopUpRequestSchema,
} from '@zaster/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Db } from '../db/client';
import { getStoredConfig } from '../lib/config';
import { ApiError } from '../lib/errors';
import { publishIntent } from '../lib/eventBus';
import { type IdempotentResult, readIdempotencyKey, withIdempotency } from '../lib/idempotency';
import { verifyIntentRef } from '../lib/intentRef';
import { accountId } from '../lib/ledger';
import {
  createHandleIntent,
  createIntent,
  getAttemptByKey,
  getCatalogue,
  getIntent,
  getWallet,
  latestOpenIntent,
  markScanned,
  merchantByHandle,
  payIntent,
  refundIntent,
  requireMerchantStaff,
  topUp,
} from '../lib/payments';
import { requireActor } from '../plugins/auth';
import { CHAOS_MODES, type Chaos } from '../rail/chaos';
import type { PaymentRail } from '../rail/types';
import { resetDemo } from './admin';
import { eventRoutes } from './events';

export type RouteDeps = { db: Db; rail: PaymentRail; chaos: Chaos; chaosEnabled: boolean };

const IntentParams = z.object({ intentId: z.uuid() });
const MerchantParams = z.object({ merchantId: z.string().min(1) });
const RefParams = z.object({ ref: z.string().min(10).max(80) });

/** Live status goes out only after the transaction that changed it has committed. */
function publishCommitted(result: IdempotentResult) {
  const body = result.body as { intent?: PaymentIntent } | null;
  if (result.statusCode < 300 && body?.intent) publishIntent(body.intent);
}

function send(reply: FastifyReply, result: IdempotentResult) {
  if (result.replayed) reply.header('idempotent-replayed', 'true');
  return reply.status(result.statusCode).send(result.body);
}

/**
 * Pay one intent, idempotently, and answer. Shared by the app (bearer token) and the web checkout (cookie),
 * so both get the same rules, the same replay behaviour and the same chaos.
 */
export async function respondToPay(
  deps: Pick<RouteDeps, 'db' | 'rail' | 'chaos' | 'chaosEnabled'>,
  req: FastifyRequest,
  reply: FastifyReply,
  input: { userId: string; intentId: string; tipCents: number; route?: string },
) {
  const { db, rail, chaos } = deps;
  const key = readIdempotencyKey(req);
  const result = await withIdempotency(
    db,
    {
      scope: input.userId,
      key,
      route: input.route ?? `POST /intents/${input.intentId}/pay`,
      body: { tipCents: input.tipCents },
    },
    async (tx) => {
      const outcome = await payIntent(
        tx,
        { rail, chaos },
        {
          intentId: input.intentId,
          payerUserId: input.userId,
          idempotencyKey: key,
          tipCents: input.tipCents,
        },
      );
      return outcome.kind === 'expired'
        ? {
            statusCode: 409,
            body: new ApiError(409, 'intent_expired', 'this payment code has expired').toJSON(),
          }
        : { statusCode: 201, body: outcome.result };
    },
  );

  // Chaos: the money moved and the response is saved, but the client never hears back.
  // A replay with the same key returns the stored response: that's how the app and the web reconcile.
  if (
    deps.chaosEnabled &&
    (chaos.mode === 'drop_after_settle' || chaos.mode === 'drop_and_hold') &&
    !result.replayed &&
    result.statusCode === 201
  ) {
    req.log.warn({ intentId: input.intentId }, 'chaos: dropping response after settlement');
    publishCommitted(result);
    reply.hijack();
    reply.raw.destroy();
    return;
  }
  publishCommitted(result);
  return send(reply, result);
}

export async function routes(fastify: FastifyInstance, deps: RouteDeps) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const { db, rail, chaos } = deps;

  app.get('/health', async () => ({ ok: true, rail: rail.name }));

  /** Kill switches are enforced here too: hiding a button in the app isn't a security boundary. */
  async function requireNotKilled(feature: KillSwitch) {
    const { data } = await getStoredConfig(db);
    if (data.killSwitches[feature]) {
      throw new ApiError(503, 'feature_disabled', `${feature} is temporarily switched off`);
    }
  }
  await eventRoutes(fastify, { db });

  // ---------- Merchant: the till's catalogue ----------
  app.get('/merchants/:merchantId/catalogue', { schema: { params: MerchantParams } }, async (req) => {
    const actor = requireActor(req);
    return getCatalogue(db, req.params.merchantId, actor.userId);
  });

  // ---------- Merchant: create a one-time payment intent (the dynamic QR) ----------
  app.post(
    '/merchants/:merchantId/intents',
    { schema: { params: MerchantParams, body: CreateIntentRequestSchema } },
    async (req, reply) => {
      const actor = requireActor(req);
      const key = readIdempotencyKey(req);
      const result = await withIdempotency(
        db,
        {
          scope: actor.userId,
          key,
          route: `POST /merchants/${req.params.merchantId}/intents`,
          body: req.body,
        },
        async (tx) => ({
          statusCode: 201,
          body: await createIntent(tx, {
            merchantId: req.params.merchantId,
            userId: actor.userId,
            request: req.body,
          }),
        }),
      );
      return send(reply, result);
    },
  );

  // ---------- Consumer: static @handle QR (Free plan) ----------
  const HandleParams = z.object({ handle: z.string().regex(/^[a-z0-9-]{3,32}$/) });
  app.get('/handles/:handle', { schema: { params: HandleParams } }, async (req) => {
    requireActor(req);
    return merchantByHandle(db, req.params.handle);
  });
  app.post(
    '/handles/:handle/intents',
    { schema: { params: HandleParams, body: HandleIntentRequestSchema } },
    async (req, reply) => {
      const actor = requireActor(req);
      const key = readIdempotencyKey(req);
      const result = await withIdempotency(
        db,
        { scope: actor.userId, key, route: `POST /handles/${req.params.handle}/intents`, body: req.body },
        async (tx) => ({
          statusCode: 201,
          body: await createHandleIntent(tx, {
            handle: req.params.handle,
            payerUserId: actor.userId,
            amountCents: req.body.amountCents,
          }),
        }),
      );
      return send(reply, result);
    },
  );

  // ---------- Consumer: resolve a scanned QR (signed reference) ----------
  app.get('/intents/by-ref/:ref', { schema: { params: RefParams } }, async (req) => {
    requireActor(req);
    const intentId = verifyIntentRef(req.params.ref);
    // A forged or mistyped reference looks exactly like a missing one: nothing to learn from probing.
    if (!intentId || !z.uuid().safeParse(intentId).success)
      throw new ApiError(404, 'not_found', 'payment code not found');
    return getIntent(db, intentId);
  });

  // ---------- Consumer: "I'm looking at this payment" (the till shows "Kunde prüft…") ----------
  app.post('/intents/:intentId/scanned', { schema: { params: IntentParams } }, async (req) => {
    requireActor(req);
    const intent = await db.transaction((tx) => markScanned(tx, req.params.intentId));
    publishIntent(intent);
    return intent;
  });

  // ---------- Anyone signed in: look up an intent by ID ----------
  app.get('/intents/:intentId', { schema: { params: IntentParams } }, async (req) => {
    requireActor(req);
    return getIntent(db, req.params.intentId);
  });

  // ---------- Consumer: pay an intent ----------
  app.post(
    '/intents/:intentId/pay',
    { schema: { params: IntentParams, body: PayRequestSchema } },
    async (req, reply) => {
      const actor = requireActor(req);
      return respondToPay(deps, req, reply, {
        userId: actor.userId,
        intentId: req.params.intentId,
        tipCents: req.body.tipCents,
      });
    },
  );

  // ---------- Consumer: what happened to my request? (reconciliation) ----------
  app.get(
    '/attempts/by-key/:key',
    { schema: { params: z.object({ key: IdempotencyKeySchema }) } },
    async (req) => {
      const actor = requireActor(req);
      if (deps.chaosEnabled && chaos.mode === 'drop_and_hold') {
        throw new ApiError(503, 'rail_unavailable', 'chaos: the bank has not answered yet');
      }
      return getAttemptByKey(db, actor.userId, req.params.key.toLowerCase());
    },
  );

  // ---------- Merchant manager: refund ----------
  app.post(
    '/intents/:intentId/refunds',
    { schema: { params: IntentParams, body: RefundRequestSchema } },
    async (req, reply) => {
      const actor = requireActor(req);
      await requireNotKilled('refunds');
      const key = readIdempotencyKey(req);
      const result = await withIdempotency(
        db,
        { scope: actor.userId, key, route: `POST /intents/${req.params.intentId}/refunds`, body: req.body },
        async (tx) => ({
          statusCode: 201,
          body: await refundIntent(tx, {
            intentId: req.params.intentId,
            by: { userId: actor.userId },
            ...req.body,
          }),
        }),
      );
      publishCommitted(result);
      return send(reply, result);
    },
  );

  // ---------- Wallets ----------
  const WalletQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(20) });
  app.get('/wallets/me', { schema: { querystring: WalletQuery } }, async (req) => {
    const actor = requireActor(req);
    return getWallet(db, accountId.consumer(actor.userId), req.query.limit);
  });

  app.post('/wallets/me/topups', { schema: { body: TopUpRequestSchema } }, async (req, reply) => {
    const actor = requireActor(req);
    await requireNotKilled('topup');
    const key = readIdempotencyKey(req);
    const result = await withIdempotency(
      db,
      { scope: actor.userId, key, route: 'POST /wallets/me/topups', body: req.body },
      async (tx) => {
        await topUp(tx, { userId: actor.userId, amountCents: req.body.amountCents, key });
        return { statusCode: 201, body: await getWallet(tx, accountId.consumer(actor.userId)) };
      },
    );
    return send(reply, result);
  });

  app.get('/merchants/:merchantId/wallet', { schema: { params: MerchantParams } }, async (req) => {
    const actor = requireActor(req);
    await requireMerchantStaff(db, req.params.merchantId, actor.userId);
    return getWallet(db, accountId.merchant(req.params.merchantId));
  });

  // ---------- Dev only ----------
  if (deps.chaosEnabled) {
    app.get('/dev/chaos', async () => ({ mode: chaos.mode }));
    app.post('/dev/chaos', { schema: { body: z.object({ mode: z.enum(CHAOS_MODES) }) } }, async (req) => {
      chaos.set(req.body.mode);
      req.log.warn({ mode: chaos.mode }, 'chaos mode changed');
      return { mode: chaos.mode };
    });
    // A simulator has no camera: this hands the newest open QR link to the consumer app's dev button.
    app.get('/dev/latest-intent', async () => {
      const intent = await latestOpenIntent(db);
      return { ref: intent?.ref ?? null };
    });
    // Rehearsal reset: money, intents and history go back to the seed, but the demo phones stay signed in
    // (their device sessions are kept for users that still exist), so nobody re-onboards two devices.
    app.post('/dev/reset', async () => {
      await resetDemo(db);
      chaos.set('ok');
      return { ok: true };
    });
  }
}
