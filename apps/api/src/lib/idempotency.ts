import { createHash } from 'node:crypto';
import { IDEMPOTENCY_HEADER, IdempotencyKeySchema } from '@zaster/shared';
import { and, eq, lt, sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { Db, Tx } from '../db/client';
import { idempotencyKeys } from '../db/schema';
import { ApiError } from './errors';

/** A processing key older than this belongs to a request that died before committing. */
const STALE_AFTER_SECONDS = 30;

export type StoredResponse = { statusCode: number; body: unknown };
export type IdempotentResult = StoredResponse & { replayed: boolean };

/** Canonical JSON: object keys sorted, so `{a,b}` and `{b,a}` hash the same. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function requestHash(route: string, body: unknown): string {
  return createHash('sha256')
    .update(`${route}\n${canonicalJson(body)}`)
    .digest('hex');
}

export function readIdempotencyKey(req: FastifyRequest): string {
  const raw = req.headers[IDEMPOTENCY_HEADER];
  if (typeof raw !== 'string') {
    throw new ApiError(400, 'idempotency_key_missing', 'Idempotency-Key header (UUID) is required');
  }
  const parsed = IdempotencyKeySchema.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, 'idempotency_key_missing', 'Idempotency-Key must be a UUID');
  return parsed.data.toLowerCase();
}

/**
 * Run a money-moving handler at most once per (scope, key).
 *
 * 1. Claim the key in its own short transaction (status `processing`).
 *    - Same key + same request, already completed → replay the stored response.
 *    - Same key + different request → 422 (client bug).
 *    - Same key, still processing → 409 (ask again soon).
 * 2. Run the handler inside ONE transaction that also stores the response, so "money moved"
 *    and "response saved" commit together or not at all.
 * 3. If the handler throws, release the key so the client can retry with the same key.
 */
export async function withIdempotency(
  db: Db,
  input: { scope: string; key: string; route: string; body: unknown },
  handler: (tx: Tx) => Promise<StoredResponse>,
): Promise<IdempotentResult> {
  const hash = requestHash(input.route, input.body);
  const where = and(eq(idempotencyKeys.scope, input.scope), eq(idempotencyKeys.key, input.key));

  const claimed = await db
    .insert(idempotencyKeys)
    .values({ scope: input.scope, key: input.key, requestHash: hash })
    .onConflictDoNothing()
    .returning({ key: idempotencyKeys.key });

  if (claimed.length === 0) {
    const [existing] = await db.select().from(idempotencyKeys).where(where);
    if (!existing) throw new ApiError(409, 'idempotency_in_progress', 'retry this request');
    if (existing.requestHash !== hash) {
      throw new ApiError(
        422,
        'idempotency_key_reused',
        'this Idempotency-Key was used for a different request',
      );
    }
    if (existing.status === 'completed') {
      return {
        statusCode: existing.responseStatus ?? 200,
        body: existing.responseBody,
        replayed: true,
      };
    }
    // Still processing. If it's stale, the earlier request died before committing: take over the key.
    const takenOver = await db
      .update(idempotencyKeys)
      .set({ createdAt: sql`now()` })
      .where(
        and(
          where,
          eq(idempotencyKeys.status, 'processing'),
          lt(idempotencyKeys.createdAt, sql`now() - make_interval(secs => ${STALE_AFTER_SECONDS})`),
        ),
      )
      .returning({ key: idempotencyKeys.key });
    if (takenOver.length === 0) {
      throw new ApiError(409, 'idempotency_in_progress', 'the original request is still being processed');
    }
  }

  try {
    const response = await db.transaction(async (tx) => {
      const result = await handler(tx);
      await tx
        .update(idempotencyKeys)
        .set({
          status: 'completed',
          responseStatus: result.statusCode,
          responseBody: result.body,
          completedAt: sql`now()`,
        })
        .where(where);
      return result;
    });
    return { ...response, replayed: false };
  } catch (error) {
    await db.delete(idempotencyKeys).where(and(where, eq(idempotencyKeys.status, 'processing')));
    throw error;
  }
}
