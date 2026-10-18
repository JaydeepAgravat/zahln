import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Db } from '../db/client';
import { users } from '../db/schema';
import { authenticate } from '../lib/auth';
import { ApiError } from '../lib/errors';

declare module 'fastify' {
  interface FastifyRequest {
    actor: { userId: string; deviceId: string | null } | null;
  }
}

/**
 * Who is calling:
 * - `Authorization: Bearer <session token>` + `x-device-id`: the token only works from the device it was issued to.
 * - `x-user-id` (dev and tests only, `devAuth: true`): the Day 1 shortcut, so curl and tests stay simple.
 */
export const authPlugin = fp(async (app: FastifyInstance, opts: { db: Db; devAuth: boolean }) => {
  app.decorateRequest('actor', null);
  app.addHook('onRequest', async (req) => {
    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      const deviceHeader = req.headers['x-device-id'];
      const session = await authenticate(
        opts.db,
        authorization.slice('Bearer '.length),
        typeof deviceHeader === 'string' ? deviceHeader : undefined,
      );
      if (session) req.actor = { userId: session.userId, deviceId: session.deviceId };
      return;
    }

    if (!opts.devAuth) return;
    const header = req.headers['x-user-id'];
    if (typeof header !== 'string' || header.length === 0) return;
    const [user] = await opts.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, header), isNull(users.deletedAt)));
    if (user) req.actor = { userId: user.id, deviceId: null };
  });
});

export function requireActor(req: FastifyRequest) {
  if (!req.actor) throw new ApiError(401, 'unauthorized', 'sign in required');
  return req.actor;
}
