import { timingSafeEqual } from 'node:crypto';
import { AdminConfigSchema, PLANS } from '@zahln/shared';
import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Db } from '../db/client';
import {
  auditLog,
  devices,
  events,
  ledgerTransactions,
  merchants,
  paymentAttempts,
  paymentIntents,
  postings,
  refunds,
  staff,
  users,
  webSessions,
} from '../db/schema';
import { seed } from '../db/seed';
import { audit } from '../lib/audit';
import { getStoredConfig, saveConfig } from '../lib/config';
import { ApiError, notFound } from '../lib/errors';
import { publishConfigChanged, publishIntent, subscribeAllIntents, subscribeConfig } from '../lib/eventBus';
import { merchantCsv } from '../lib/export';
import { readIdempotencyKey, withIdempotency } from '../lib/idempotency';
import { getIntent, refundIntent, toIntentDto } from '../lib/payments';
import { openSse } from '../lib/sse';
import { CHAOS_MODES, type Chaos } from '../rail/chaos';

export type AdminDeps = { db: Db; adminToken: string; chaos: Chaos; chaosEnabled: boolean };

const Reason = z.string().trim().min(3, 'a reason is required').max(200);

/**
 * The internal console's API. Stand-in for SSO: a shared ops token plus the operator's name.
 * Production would use the company IdP with roles (support, finance, admin) and four-eyes approval
 * for large refunds; every write here is already audited the way that setup would need.
 */
function requireOps(req: FastifyRequest, token: string): string {
  const given = Buffer.from(String(req.headers['x-admin-token'] ?? ''));
  const expected = Buffer.from(token);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new ApiError(401, 'unauthorized', 'ops token required');
  }
  const name = String(req.headers['x-admin-name'] ?? 'ops')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .slice(0, 40);
  return `console:${name || 'ops'}`;
}

const todayStart = sql`date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin'`;

export async function adminRoutes(fastify: FastifyInstance, deps: AdminDeps) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const { db } = deps;
  // Authenticate before validation, so an unauthenticated caller learns nothing about request shapes.
  const actors = new WeakMap<FastifyRequest, string>();
  app.addHook('onRequest', async (req) => {
    if (req.url.startsWith('/admin')) actors.set(req, requireOps(req, deps.adminToken));
  });
  const ops = (req: FastifyRequest) => actors.get(req) ?? requireOps(req, deps.adminToken);

  app.get('/admin/me', async (req) => ({ actor: ops(req) }));

  // ---------- Control room: config ----------
  app.get('/admin/config', async (req) => {
    ops(req);
    return getStoredConfig(db);
  });

  app.put(
    '/admin/config',
    { schema: { body: z.object({ data: AdminConfigSchema, reason: Reason }) } },
    async (req) => {
      const actor = ops(req);
      const result = await db.transaction(async (tx) => {
        const saved = await saveConfig(tx, req.body.data);
        if (saved.changed.length) {
          await audit(tx, {
            actor,
            action: 'config.update',
            target: 'config',
            reason: req.body.reason,
            data: { changed: saved.changed, version: saved.version },
          });
        }
        return saved;
      });
      publishConfigChanged(result.version);
      return getStoredConfig(db);
    },
  );

  // ---------- Payments ----------
  app.get(
    '/admin/payments',
    {
      schema: {
        querystring: z.object({
          q: z.string().max(80).optional(),
          status: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50),
        }),
      },
    },
    async (req) => {
      ops(req);
      const { q, status, limit } = req.query;
      const conds = [];
      if (status)
        conds.push(eq(paymentIntents.status, status as (typeof paymentIntents.status.enumValues)[number]));
      if (q?.trim()) {
        const term = q.trim();
        // "6,30" or "6.30" searches the amount; anything else matches the ID prefix, merchant or payer.
        const cents = /^\d+([.,]\d{1,2})?$/.test(term)
          ? Math.round(Number(term.replace(',', '.')) * 100)
          : null;
        conds.push(
          or(
            sql`${paymentIntents.id}::text ILIKE ${`${term}%`}`,
            ilike(merchants.name, `%${term}%`),
            ilike(users.name, `%${term}%`),
            ...(cents !== null ? [eq(paymentIntents.amountCents, cents)] : []),
          ),
        );
      }
      const rows = await db
        .select({ intent: paymentIntents, merchant: merchants, payer: users.name })
        .from(paymentIntents)
        .innerJoin(merchants, eq(merchants.id, paymentIntents.merchantId))
        .leftJoin(
          paymentAttempts,
          and(eq(paymentAttempts.intentId, paymentIntents.id), eq(paymentAttempts.status, 'paid')),
        )
        .leftJoin(users, eq(users.id, paymentAttempts.payerUserId))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(paymentIntents.createdAt))
        .limit(limit);
      return rows.map((r) => ({ ...toIntentDto(r.intent, r.merchant), payerName: r.payer }));
    },
  );

  app.get(
    '/admin/payments/:intentId',
    { schema: { params: z.object({ intentId: z.uuid() }) } },
    async (req) => {
      ops(req);
      const intent = await getIntent(db, req.params.intentId);
      const attempts = await db
        .select({ attempt: paymentAttempts, payer: users.name })
        .from(paymentAttempts)
        .leftJoin(users, eq(users.id, paymentAttempts.payerUserId))
        .where(eq(paymentAttempts.intentId, intent.id))
        .orderBy(paymentAttempts.createdAt);
      const refundRows = await db
        .select()
        .from(refunds)
        .where(eq(refunds.intentId, intent.id))
        .orderBy(refunds.createdAt);
      const timeline = await db
        .select()
        .from(events)
        .where(eq(events.aggregateId, intent.id))
        .orderBy(events.id);
      const references = [...attempts.map((a) => a.attempt.id), ...refundRows.map((r) => r.id)];
      const ledger = references.length
        ? await db
            .select({
              transactionId: postings.transactionId,
              kind: ledgerTransactions.kind,
              accountId: postings.accountId,
              amountCents: postings.amountCents,
              createdAt: ledgerTransactions.createdAt,
            })
            .from(postings)
            .innerJoin(ledgerTransactions, eq(ledgerTransactions.id, postings.transactionId))
            .where(inArray(ledgerTransactions.reference, references))
            .orderBy(ledgerTransactions.createdAt, postings.id)
        : [];
      return {
        intent,
        attempts: attempts.map((a) => ({
          id: a.attempt.id,
          status: a.attempt.status,
          payerName: a.payer,
          amountCents: a.attempt.amountCents,
          tipCents: a.attempt.tipCents,
          reason: a.attempt.reason,
          idempotencyKey: a.attempt.idempotencyKey,
          createdAt: a.attempt.createdAt.toISOString(),
          settledAt: a.attempt.settledAt?.toISOString() ?? null,
        })),
        refunds: refundRows.map((r) => ({
          id: r.id,
          amountCents: r.amountCents,
          reason: r.reason,
          by: r.createdByOps ?? r.createdByUserId,
          createdAt: r.createdAt.toISOString(),
        })),
        timeline: timeline.map((e) => ({ type: e.type, data: e.data, at: e.createdAt.toISOString() })),
        ledger: ledger.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      };
    },
  );

  app.post(
    '/admin/payments/:intentId/refunds',
    {
      schema: {
        params: z.object({ intentId: z.uuid() }),
        body: z.object({ amountCents: z.number().int().positive(), reason: Reason }),
      },
    },
    async (req, reply) => {
      const actor = ops(req);
      const key = readIdempotencyKey(req);
      const result = await withIdempotency(
        db,
        { scope: actor, key, route: `POST /admin/payments/${req.params.intentId}/refunds`, body: req.body },
        async (tx) => {
          const out = await refundIntent(tx, {
            intentId: req.params.intentId,
            by: { ops: actor },
            amountCents: req.body.amountCents,
            reason: req.body.reason,
          });
          await audit(tx, {
            actor,
            action: 'payment.refund',
            target: req.params.intentId,
            reason: req.body.reason,
            data: { amountCents: req.body.amountCents, refundId: out.refund.id },
          });
          return { statusCode: 201, body: out };
        },
      );
      const body = result.body as { intent?: Parameters<typeof publishIntent>[0] } | null;
      if (result.statusCode < 300 && body?.intent) publishIntent(body.intent);
      return reply.status(result.statusCode).send(result.body);
    },
  );

  // ---------- Merchants ----------
  app.get('/admin/merchants', async (req) => {
    ops(req);
    const rows = await db
      .select({
        merchant: merchants,
        staffCount: sql<number>`(SELECT count(*)::int FROM ${staff} s WHERE s.merchant_id = ${merchants.id})`,
        todayCents: sql<number>`(SELECT coalesce(sum(p.amount_cents), 0)::int FROM ${postings} p
          JOIN ${ledgerTransactions} lt ON lt.id = p.transaction_id
          WHERE p.account_id = 'merchant_wallet:' || ${merchants.id} AND lt.kind = 'payment' AND lt.created_at >= ${todayStart})`,
      })
      .from(merchants)
      .orderBy(merchants.name);
    return rows.map((r) => ({
      id: r.merchant.id,
      name: r.merchant.name,
      handle: r.merchant.handle,
      city: r.merchant.city,
      plan: r.merchant.plan,
      staffCount: r.staffCount,
      todayCents: r.todayCents,
    }));
  });

  app.get(
    '/admin/merchants/:merchantId',
    { schema: { params: z.object({ merchantId: z.string() }) } },
    async (req) => {
      ops(req);
      const [merchant] = await db.select().from(merchants).where(eq(merchants.id, req.params.merchantId));
      if (!merchant) throw notFound('merchant');
      const team = await db
        .select({ name: users.name, role: staff.role })
        .from(staff)
        .innerJoin(users, eq(users.id, staff.userId))
        .where(eq(staff.merchantId, merchant.id));
      const recent = await db
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.merchantId, merchant.id))
        .orderBy(desc(paymentIntents.createdAt))
        .limit(10);
      return {
        id: merchant.id,
        name: merchant.name,
        handle: merchant.handle,
        city: merchant.city,
        plan: merchant.plan,
        staff: team,
        recent: recent.map((r) => toIntentDto(r, merchant)),
      };
    },
  );

  app.put(
    '/admin/merchants/:merchantId/plan',
    {
      schema: {
        params: z.object({ merchantId: z.string() }),
        body: z.object({ plan: z.enum(PLANS), reason: Reason }),
      },
    },
    async (req) => {
      const actor = ops(req);
      const out = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(merchants)
          .where(eq(merchants.id, req.params.merchantId))
          .for('update');
        if (!before) throw notFound('merchant');
        await tx.update(merchants).set({ plan: req.body.plan }).where(eq(merchants.id, before.id));
        await audit(tx, {
          actor,
          action: 'merchant.plan',
          target: before.id,
          reason: req.body.reason,
          data: { from: before.plan, to: req.body.plan },
        });
        return { id: before.id, plan: req.body.plan };
      });
      // The merchant's tills refetch /config and unlock (or lock) features within a second.
      publishConfigChanged((await getStoredConfig(db)).version);
      return out;
    },
  );

  /** DATEV-style CSV: `;` separated, decimal comma, UTF-8 with BOM (what German Excel expects). */
  app.get(
    '/admin/merchants/:merchantId/export.csv',
    {
      schema: {
        params: z.object({ merchantId: z.string() }),
        querystring: z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() }),
      },
    },
    async (req, reply) => {
      const actor = ops(req);
      const { csv, rows } = await merchantCsv(db, req.params.merchantId, req.query);
      await audit(db, {
        actor,
        action: 'merchant.export',
        target: req.params.merchantId,
        reason: 'CSV export',
        data: { rows, from: req.query.from ?? null, to: req.query.to ?? null },
      });
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="zahln-${req.params.merchantId}.csv"`)
        .send(csv);
    },
  );

  // ---------- Audit ----------
  app.get(
    '/admin/audit',
    { schema: { querystring: z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) }) } },
    async (req) => {
      ops(req);
      const rows = await db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(req.query.limit);
      return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
    },
  );

  // ---------- Live: every intent change + config versions ----------
  app.get('/admin/events', async (req, reply) => {
    ops(req);
    let cleanup = () => {};
    const send = openSse(req, reply, () => cleanup());
    const offIntents = subscribeAllIntents((intent) => send('intent', intent));
    const offConfig = subscribeConfig((version) => send('config', { version }));
    send('ready', {});
    cleanup = () => {
      offIntents();
      offConfig();
    };
  });

  // ---------- Demo controls (dev only) ----------
  if (deps.chaosEnabled) {
    app.get('/admin/chaos', async (req) => {
      ops(req);
      return { mode: deps.chaos.mode };
    });
    app.put('/admin/chaos', { schema: { body: z.object({ mode: z.enum(CHAOS_MODES) }) } }, async (req) => {
      const actor = ops(req);
      deps.chaos.set(req.body.mode);
      await audit(db, {
        actor,
        action: 'chaos.set',
        target: 'rail',
        reason: 'demo',
        data: { mode: req.body.mode },
      });
      return { mode: deps.chaos.mode };
    });
    app.post('/admin/reset', async (req) => {
      const actor = ops(req);
      await resetDemo(db);
      deps.chaos.set('ok');
      await audit(db, { actor, action: 'demo.reset', target: 'database', reason: 'demo reset' });
      publishConfigChanged((await getStoredConfig(db)).version);
      return { ok: true };
    });
  }
}

/**
 * Rehearsal reset: money, intents, plans and config go back to the seed; the demo phones stay signed in
 * (device sessions are kept for users that still exist) and the audit log is kept as evidence.
 */
export async function resetDemo(db: Db) {
  const keep = await db.select().from(devices);
  const keepWeb = await db.select().from(webSessions).where(isNull(webSessions.revokedAt));
  await seed(db, { history: true });
  const userIds = new Set((await db.select({ id: users.id }).from(users)).map((u) => u.id));
  const survivors = keep.filter((d) => userIds.has(d.userId));
  if (survivors.length) await db.insert(devices).values(survivors).onConflictDoNothing();
  // The dashboard stays signed in too (merchants survive a reset; their IDs are fixed in the seed).
  const webSurvivors = keepWeb.filter((s) => userIds.has(s.userId));
  if (webSurvivors.length) await db.insert(webSessions).values(webSurvivors).onConflictDoNothing();
}
