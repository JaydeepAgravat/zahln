import { isPayable, type PaymentIntent } from '@zahln/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Db } from '../db/client';
import { publishIntent, subscribeIntent } from '../lib/eventBus';
import { expireIfDue, getIntent, requireMerchantStaff } from '../lib/payments';
import { requireActor } from '../plugins/auth';

const HEARTBEAT_MS = 15_000;

/**
 * Server-Sent Events for one intent: the till's live "Warten auf Scan → Kunde prüft → Bezahlt".
 *
 * SSE is a hint, not the truth: the first event is always the current status, so a reconnect
 * catches up by itself, and the client still falls back to `GET /intents/:id` if the stream dies.
 */
export async function eventRoutes(fastify: FastifyInstance, deps: { db: Db }) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const { db } = deps;

  app.get(
    '/intents/:intentId/events',
    { schema: { params: z.object({ intentId: z.uuid() }) } },
    async (req, reply) => {
      const actor = requireActor(req);
      const intentId = req.params.intentId;
      const current = await getIntent(db, intentId);
      // Only the merchant's own staff may watch a till; payers learn the outcome from their own request.
      await requireMerchantStaff(db, current.merchant.id, actor.userId);

      reply.hijack();
      const res = reply.raw;
      res.writeHead(200, {
        ...(reply.getHeaders() as Record<string, string>),
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      });

      const send = (intent: PaymentIntent) => res.write(`event: status\ndata: ${JSON.stringify(intent)}\n\n`);
      send(current);
      const unsubscribe = subscribeIntent(intentId, send);
      const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

      // Nobody else flips an unpaid intent to `expired` at minute five, so the open stream does it.
      const expiry = isPayable(current.status)
        ? setTimeout(
            async () => {
              try {
                const intent = await db.transaction((tx) => expireIfDue(tx, intentId));
                if (intent.status === 'expired') publishIntent(intent);
              } catch (err) {
                req.log.warn({ err, intentId }, 'expiry check failed');
              }
            },
            Math.max(0, Date.parse(current.expiresAt) - Date.now() + 250),
          )
        : null;

      req.raw.on('close', () => {
        unsubscribe();
        clearInterval(heartbeat);
        if (expiry) clearTimeout(expiry);
      });
    },
  );
}
