import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Db } from '../db/client';
import { ApiError } from '../lib/errors';
import { publishIntent } from '../lib/eventBus';
import { verifyIntentRef } from '../lib/intentRef';
import { expireIfDue } from '../lib/payments';

/**
 * What a pay link shows to anyone holding it, signed in or not: the merchant, the items and the amount.
 * Never who paid, never a balance. The signature makes intent IDs unguessable, so the link is the capability.
 */
export async function publicRoutes(fastify: FastifyInstance, deps: { db: Db }) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.get(
    '/public/intents/:ref',
    { schema: { params: z.object({ ref: z.string().min(10).max(80) }) } },
    async (req, reply) => {
      const intentId = verifyIntentRef(req.params.ref);
      if (!intentId || !z.uuid().safeParse(intentId).success)
        throw new ApiError(404, 'not_found', 'payment code not found');
      // A link opened after minute five must say "expired", not offer a pay button.
      const intent = await deps.db.transaction((tx) => expireIfDue(tx, intentId));
      if (intent.status === 'expired') publishIntent(intent);
      reply.header('cache-control', 'no-store');
      return intent;
    },
  );
}
