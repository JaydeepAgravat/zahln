import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Db } from '../db/client';
import { users } from '../db/schema';
import { ApiError } from '../lib/errors';

declare module 'fastify' {
  interface FastifyRequest {
    actor: { userId: string } | null;
  }
}

/**
 * Day 1 auth stub: the caller says who they are in `x-user-id`.
 * Day 2 replaces this with device-bound session tokens.
 */
export const authPlugin = fp(async (app: FastifyInstance, opts: { db: Db }) => {
  app.decorateRequest('actor', null);
  app.addHook('onRequest', async (req) => {
    const header = req.headers['x-user-id'];
    if (typeof header !== 'string' || header.length === 0) return;
    const [user] = await opts.db.select({ id: users.id }).from(users).where(eq(users.id, header));
    if (user) req.actor = { userId: user.id };
  });
});

export function requireActor(req: FastifyRequest): { userId: string } {
  if (!req.actor) throw new ApiError(401, 'unauthorized', 'missing or unknown x-user-id');
  return req.actor;
}
