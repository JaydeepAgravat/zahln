import { APPS } from '@zahln/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Db } from '../db/client';
import { configFor, getStoredConfig } from '../lib/config';
import { subscribeConfig } from '../lib/eventBus';
import { openSse } from '../lib/sse';

/**
 * `GET /config`: works signed out (the forced-update gate must work before login), and adds the
 * merchant's plan for a signed-in till. `GET /config/events`: a nudge to refetch, so the demo is instant;
 * apps also refetch on launch and on every return to the foreground, so a missed nudge is harmless.
 */
export async function configRoutes(fastify: FastifyInstance, deps: { db: Db }) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const { db } = deps;

  app.get(
    '/config',
    { schema: { querystring: z.object({ merchantId: z.string().optional() }) } },
    async (req) => {
      const header = req.headers['x-app'];
      const appName =
        typeof header === 'string' && (APPS as readonly string[]).includes(header) ? header : 'consumer';
      return configFor(db, {
        app: appName as (typeof APPS)[number],
        userId: req.actor?.userId ?? null,
        merchantId: req.query.merchantId ?? null,
      });
    },
  );

  app.get('/config/events', async (req, reply) => {
    const { version } = await getStoredConfig(db);
    let unsubscribe = () => {};
    const send = openSse(req, reply, () => unsubscribe());
    send('config', { version });
    unsubscribe = subscribeConfig((v) => send('config', { version: v }));
  });
}
