import cookie from '@fastify/cookie';
import {
  type Feature,
  hasFeature,
  IdempotencyKeySchema,
  INTENT_STATUSES,
  OTP_LENGTH,
  type PaymentIntent,
  PayRequestSchema,
  PLAN_STAFF_LIMIT,
  PLANS,
  RequestOtpSchema,
} from '@zahln/shared';
import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  authChallenges,
  devices,
  ledgerTransactions,
  merchants,
  paymentAttempts,
  paymentIntents,
  postings,
  refunds,
  staff,
  users,
} from '../db/schema';
import { audit } from '../lib/audit';
import { requestOtp, sha256, verifyOtp } from '../lib/auth';
import { getStoredConfig } from '../lib/config';
import { ApiError } from '../lib/errors';
import { publishConfigChanged, publishIntent, subscribeAllIntents } from '../lib/eventBus';
import { merchantCsv } from '../lib/export';
import { readIdempotencyKey, withIdempotency } from '../lib/idempotency';
import { accountId, balanceOf, lockAccount, postTransaction } from '../lib/ledger';
import {
  createIntent,
  getAttemptByKey,
  getIntent,
  getWallet,
  markScanned,
  refundIntent,
  requireFeature,
  toIntentDto,
} from '../lib/payments';
import { openSse } from '../lib/sse';
import {
  authenticateWeb,
  CSRF_COOKIE,
  CSRF_HEADER,
  createWebSession,
  csrfValid,
  IDLE_TIMEOUT_HOURS,
  markSteppedUp,
  revokeWebSession,
  SESSION_COOKIE,
  STEP_UP_MINUTES,
  steppedUp,
  type WebSession,
} from '../lib/webSession';
import { type RouteDeps, respondToPay } from './index';

declare module 'fastify' {
  interface FastifyRequest {
    web: WebSession | null;
  }
}

export type WebDeps = Pick<RouteDeps, 'db' | 'rail' | 'chaos' | 'chaosEnabled'> & {
  devOtp: boolean;
  secureCookies: boolean;
};

/** "Lena Hoffmann" → "Lena H.": the merchant sees who paid, not their full name (data minimisation). */
const shortName = (name: string | null) => {
  if (!name) return null;
  const [first, last] = name.split(' ');
  return last ? `${first} ${last[0]}.` : (first ?? null);
};

/** "+4915100000010" → "+49 151 •••• 0010" */
const maskPhone = (phone: string) => `${phone.slice(0, 3)} ${phone.slice(3, 6)} •••• ${phone.slice(-4)}`;

const berlinToday = sql`date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin'`;

/** The next 23:00 in Berlin: when Business plans settle the day's takings automatically. */
function nextSettlement(now = new Date()): string {
  const berlin = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
  const offset = now.getTime() - berlin.getTime();
  const at = new Date(berlin);
  at.setHours(23, 0, 0, 0);
  if (at <= berlin) at.setDate(at.getDate() + 1);
  return new Date(at.getTime() + offset).toISOString();
}

/**
 * Zahln Web (the browser): cookie sessions instead of device-bound bearer tokens.
 * - The session cookie is httpOnly, so script on the page (an XSS) can never read it.
 * - Every write echoes the readable CSRF cookie in `x-csrf-token`; SameSite=Lax already stops most cross-site posts.
 * - A business session is bound to one merchant: routes use the session's merchant, never an ID from the URL.
 * - Money and team actions need a fresh OTP (step-up), like Face ID before a payment on the phone.
 * The `x-user-id` dev shortcut does not exist here: the browser surface is tested the way it runs.
 */
export async function webRoutes(fastify: FastifyInstance, deps: WebDeps) {
  const { db } = deps;
  await fastify.register(cookie);
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.decorateRequest('web', null);

  const cookieOpts = {
    path: '/',
    sameSite: 'lax' as const,
    secure: deps.secureCookies,
    maxAge: IDLE_TIMEOUT_HOURS * 3600,
  };
  const setSessionCookies = (reply: FastifyReply, t: { sessionToken: string; csrfToken: string }) => {
    reply.setCookie(SESSION_COOKIE, t.sessionToken, { ...cookieOpts, httpOnly: true });
    // Readable on purpose: the page copies it into the header (double submit).
    reply.setCookie(CSRF_COOKIE, t.csrfToken, { ...cookieOpts, httpOnly: false });
  };
  const clearSessionCookies = (reply: FastifyReply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    reply.clearCookie(CSRF_COOKIE, { path: '/' });
  };

  const OPEN = new Set(['/web/auth/otp', '/web/auth/verify']);
  app.addHook('onRequest', async (req) => {
    const path = req.url.split('?')[0] ?? '';
    if (!path.startsWith('/web/') || OPEN.has(path)) return;
    const raw = req.cookies[SESSION_COOKIE];
    req.web = raw ? await authenticateWeb(db, raw) : null;
    if (!req.web) throw new ApiError(401, 'unauthorized', 'sign in required');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (!csrfValid(req.web, req.cookies[CSRF_COOKIE], req.headers[CSRF_HEADER])) {
        throw new ApiError(403, 'csrf', 'missing or invalid CSRF token');
      }
    }
  });

  const session = (req: FastifyRequest) => {
    if (!req.web) throw new ApiError(401, 'unauthorized', 'sign in required');
    return req.web;
  };
  /** A business session whose user is still on this merchant's team, with one of these roles. */
  const business = (req: FastifyRequest, roles: ('owner' | 'manager')[] = ['owner', 'manager']) => {
    const s = session(req);
    if (!s.merchant) throw new ApiError(403, 'forbidden', 'not a business session');
    if (!s.role || !(roles as string[]).includes(s.role))
      throw new ApiError(403, 'forbidden', `requires role ${roles.join(' or ')}`);
    return { ...s, merchant: s.merchant, role: s.role };
  };
  const requireStepUp = (s: WebSession) => {
    if (!steppedUp(s)) {
      throw new ApiError(403, 'step_up_required', `confirm with a code (valid ${STEP_UP_MINUTES} minutes)`);
    }
  };
  const feature = (s: { merchant: { plan: (typeof PLANS)[number] } }, f: Feature) =>
    requireFeature(s.merchant, f);

  const sessionBody = (s: WebSession) => ({
    user: { id: s.user.id, name: s.user.name, phone: maskPhone(s.user.phone) },
    merchant: s.merchant,
    role: s.role,
    stepUpUntil: new Date(s.authenticatedAt.getTime() + STEP_UP_MINUTES * 60_000).toISOString(),
  });

  // ---------- Sign in ----------

  app.post('/web/auth/otp', { schema: { body: RequestOtpSchema } }, async (req, reply) => {
    return reply.status(201).send(await requestOtp(db, req.body.phone, { devOtp: deps.devOtp }));
  });

  app.post(
    '/web/auth/verify',
    {
      schema: {
        body: z.object({
          challengeId: z.uuid(),
          code: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`)),
          audience: z.enum(['business', 'consumer']).default('business'),
          merchantId: z.string().optional(),
        }),
      },
    },
    async (req, reply) => {
      const result = await verifyOtp(db, req.body.challengeId, req.body.code);
      if (!result.ok) throw new ApiError(400, 'otp_invalid', 'wrong code');
      // The code is spent: mark the challenge consumed so it can't also bind a phone.
      await db
        .update(authChallenges)
        .set({ consumedAt: sql`now()` })
        .where(eq(authChallenges.verificationTokenHash, sha256(result.verificationToken)));
      if (result.isNewUser) throw new ApiError(404, 'no_account', 'no Zahln account for this number');
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .innerJoin(authChallenges, eq(authChallenges.phone, users.phone))
        .where(eq(authChallenges.id, req.body.challengeId));
      if (!user) throw new ApiError(404, 'no_account', 'no Zahln account for this number');

      let merchantId: string | null = null;
      if (req.body.audience === 'business') {
        // Cashiers run the till; the dashboard is for owners and managers.
        const eligible = result.memberships.filter((m) => m.role === 'owner' || m.role === 'manager');
        const pick = req.body.merchantId
          ? eligible.find((m) => m.merchantId === req.body.merchantId)
          : eligible[0];
        if (!pick) throw new ApiError(403, 'not_a_manager', 'only owners and managers can use the dashboard');
        merchantId = pick.merchantId;
      }
      const tokens = await createWebSession(db, { userId: user.id, merchantId });
      setSessionCookies(reply, tokens);
      const s = await authenticateWeb(db, tokens.sessionToken);
      if (!s) throw new Error('session vanished');
      return sessionBody(s);
    },
  );

  app.get('/web/session', async (req) => sessionBody(session(req)));

  app.post('/web/auth/logout', async (req, reply) => {
    await revokeWebSession(db, session(req).id);
    clearSessionCookies(reply);
    return reply.status(204).send();
  });

  /** Step-up: a fresh code to the signed-in user's own phone, never to a number from the request. */
  app.post('/web/auth/step-up/otp', async (req, reply) => {
    return reply.status(201).send(await requestOtp(db, session(req).user.phone, { devOtp: deps.devOtp }));
  });

  app.post(
    '/web/auth/step-up',
    { schema: { body: z.object({ challengeId: z.uuid(), code: z.string() }) } },
    async (req) => {
      const s = session(req);
      const [challenge] = await db
        .select({ phone: authChallenges.phone })
        .from(authChallenges)
        .where(eq(authChallenges.id, req.body.challengeId));
      if (!challenge || challenge.phone !== s.user.phone)
        throw new ApiError(400, 'otp_invalid', 'unknown or used code');
      const result = await verifyOtp(db, req.body.challengeId, req.body.code);
      if (!result.ok) throw new ApiError(400, 'otp_invalid', 'wrong code');
      await db
        .update(authChallenges)
        .set({ consumedAt: sql`now()` })
        .where(eq(authChallenges.id, req.body.challengeId));
      await markSteppedUp(db, s.id);
      const fresh = await authenticateWeb(db, req.cookies[SESSION_COOKIE] ?? '');
      if (!fresh) throw new ApiError(401, 'unauthorized', 'sign in required');
      return sessionBody(fresh);
    },
  );

  // ---------- Today ----------

  app.get('/web/business/summary', async (req) => {
    const s = business(req);
    const paidToday = and(
      eq(paymentIntents.merchantId, s.merchant.id),
      gte(paymentIntents.paidAt, berlinToday),
    );
    const [today] = await db
      .select({
        cents: sql<number>`coalesce(sum(${paymentIntents.amountCents}), 0)::int`,
        count: sql<number>`count(*)::int`,
        refundedCents: sql<number>`coalesce(sum(${paymentIntents.refundedCents}), 0)::int`,
      })
      .from(paymentIntents)
      .where(paidToday);
    const [tips] = await db
      .select({ cents: sql<number>`coalesce(sum(${paymentAttempts.tipCents}), 0)::int` })
      .from(paymentAttempts)
      .innerJoin(paymentIntents, eq(paymentIntents.id, paymentAttempts.intentId))
      .where(and(paidToday, eq(paymentAttempts.status, 'paid')));
    const byHour = await db
      .select({
        hour: sql<number>`extract(hour from ${paymentIntents.paidAt} AT TIME ZONE 'Europe/Berlin')::int`,
        cents: sql<number>`sum(${paymentIntents.amountCents})::int`,
      })
      .from(paymentIntents)
      .where(paidToday)
      .groupBy(sql`1`);
    const week = await db
      .select({
        day: sql<string>`to_char(${paymentIntents.paidAt} AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD')`,
        cents: sql<number>`sum(${paymentIntents.amountCents})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.merchantId, s.merchant.id),
          gte(paymentIntents.paidAt, sql`${berlinToday} - interval '6 days'`),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);
    const byStaff = await db
      .select({
        name: users.name,
        cents: sql<number>`sum(${paymentIntents.amountCents})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(paymentIntents)
      .innerJoin(users, eq(users.id, paymentIntents.createdByUserId))
      .where(paidToday)
      .groupBy(users.name)
      .orderBy(desc(sql`2`));
    const hours = Array.from({ length: 24 }, (_, h) => byHour.find((r) => r.hour === h)?.cents ?? 0);
    return {
      today: { ...today, tipCents: tips?.cents ?? 0 },
      byHour: hours,
      week,
      byStaff,
      live: hasFeature(s.merchant.plan, 'live_dashboard'),
    };
  });

  // ---------- Transactions ----------

  const TxQuery = z.object({
    cursor: z.string().optional(),
    status: z.enum(INTENT_STATUSES).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    q: z.string().max(40).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  });
  app.get('/web/business/transactions', { schema: { querystring: TxQuery } }, async (req) => {
    const s = business(req);
    const { cursor, status, from, to, q, limit } = req.query;
    const conds = [eq(paymentIntents.merchantId, s.merchant.id)];
    if (status) conds.push(eq(paymentIntents.status, status));
    if (from)
      conds.push(gte(paymentIntents.createdAt, sql`(${from}::date)::timestamp AT TIME ZONE 'Europe/Berlin'`));
    if (to)
      conds.push(
        lt(paymentIntents.createdAt, sql`((${to}::date + 1)::timestamp) AT TIME ZONE 'Europe/Berlin'`),
      );
    if (q?.trim()) {
      const term = q.trim();
      const cents = /^\d+([.,]\d{1,2})?$/.test(term)
        ? Math.round(Number(term.replace(',', '.')) * 100)
        : null;
      conds.push(
        cents !== null
          ? eq(paymentIntents.amountCents, cents)
          : sql`(${paymentIntents.receiptNumber}::text = ${term} OR ${paymentIntents.id}::text ILIKE ${`${term}%`})`,
      );
    }
    // Keyset pagination on (created_at, id): stable while new payments arrive at the top.
    if (cursor) {
      const [at, id] = Buffer.from(cursor, 'base64url').toString().split('|');
      if (!at || !id) throw new ApiError(400, 'bad_request', 'bad cursor');
      conds.push(
        sql`(${paymentIntents.createdAt}, ${paymentIntents.id}) < (${at}::timestamptz, ${id}::uuid)`,
      );
    }
    const rows = await db
      .select({
        intent: paymentIntents,
        merchant: merchants,
        staffName: users.name,
        payerName: sql<
          string | null
        >`(SELECT u.name FROM ${paymentAttempts} pa JOIN ${users} u ON u.id = pa.payer_user_id
          WHERE pa.intent_id = ${paymentIntents.id} AND pa.status = 'paid')`,
        tipCents: sql<number>`coalesce((SELECT pa.tip_cents FROM ${paymentAttempts} pa
          WHERE pa.intent_id = ${paymentIntents.id} AND pa.status = 'paid'), 0)::int`,
      })
      .from(paymentIntents)
      .innerJoin(merchants, eq(merchants.id, paymentIntents.merchantId))
      .innerJoin(users, eq(users.id, paymentIntents.createdByUserId))
      .where(and(...conds))
      .orderBy(desc(paymentIntents.createdAt), desc(paymentIntents.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page.map((r) => ({
        ...toIntentDto(r.intent, r.merchant),
        staffName: r.staffName,
        payerName: shortName(r.payerName),
        tipCents: r.tipCents,
      })),
      nextCursor:
        rows.length > limit && last
          ? Buffer.from(`${last.intent.createdAt.toISOString()}|${last.intent.id}`).toString('base64url')
          : null,
    };
  });

  const IntentParams = z.object({ intentId: z.uuid() });

  /** One receipt with what GoBD asks for: sequence number, timestamp, VAT per rate. */
  app.get('/web/business/transactions/:intentId', { schema: { params: IntentParams } }, async (req) => {
    const s = business(req);
    const intent = await getIntent(db, req.params.intentId);
    if (intent.merchant.id !== s.merchant.id) throw new ApiError(404, 'not_found', 'payment not found');
    const [paid] = await db
      .select({ tipCents: paymentAttempts.tipCents, payer: users.name })
      .from(paymentAttempts)
      .innerJoin(users, eq(users.id, paymentAttempts.payerUserId))
      .where(and(eq(paymentAttempts.intentId, intent.id), eq(paymentAttempts.status, 'paid')));
    const [creator] = await db
      .select({ name: users.name })
      .from(paymentIntents)
      .innerJoin(users, eq(users.id, paymentIntents.createdByUserId))
      .where(eq(paymentIntents.id, intent.id));
    const refundRows = await db
      .select({ refund: refunds, by: users.name })
      .from(refunds)
      .leftJoin(users, eq(users.id, refunds.createdByUserId))
      .where(eq(refunds.intentId, intent.id))
      .orderBy(refunds.createdAt);
    return {
      intent,
      staffName: creator?.name ?? null,
      payerName: shortName(paid?.payer ?? null),
      tipCents: paid?.tipCents ?? 0,
      refunds: refundRows.map((r) => ({
        id: r.refund.id,
        amountCents: r.refund.amountCents,
        reason: r.refund.reason,
        // Ops refunds show as "Zahln Support", never the operator's name.
        by: r.by ?? 'Zahln Support',
        createdAt: r.refund.createdAt.toISOString(),
      })),
    };
  });

  app.post(
    '/web/business/transactions/:intentId/refunds',
    {
      schema: {
        params: IntentParams,
        body: z.object({
          amountCents: z.number().int().positive(),
          reason: z.string().trim().min(1).max(200),
        }),
      },
    },
    async (req, reply) => {
      const s = business(req);
      requireStepUp(s);
      const config = await getStoredConfig(db);
      if (config.data.killSwitches.refunds)
        throw new ApiError(503, 'feature_disabled', 'refunds are temporarily switched off');
      const key = readIdempotencyKey(req);
      const result = await withIdempotency(
        db,
        { scope: s.user.id, key, route: `POST /web/refunds/${req.params.intentId}`, body: req.body },
        async (tx) => {
          const intent = await getIntent(tx, req.params.intentId);
          if (intent.merchant.id !== s.merchant.id) throw new ApiError(404, 'not_found', 'payment not found');
          const out = await refundIntent(tx, { intentId: intent.id, by: { userId: s.user.id }, ...req.body });
          await audit(tx, {
            actor: `web:${s.user.id}`,
            action: 'payment.refund',
            target: intent.id,
            reason: req.body.reason,
            data: { amountCents: req.body.amountCents, refundId: out.refund.id },
          });
          return { statusCode: 201, body: out };
        },
      );
      const body = result.body as { intent?: PaymentIntent } | null;
      if (result.statusCode < 300 && body?.intent) publishIntent(body.intent);
      return reply.status(result.statusCode).send(result.body);
    },
  );

  // ---------- Payouts ----------

  app.get('/web/business/payouts', async (req) => {
    const s = business(req);
    const account = accountId.merchant(s.merchant.id);
    const history = await db
      .select({
        id: ledgerTransactions.id,
        amountCents: sql<number>`(-${postings.amountCents})::int`,
        createdAt: ledgerTransactions.createdAt,
      })
      .from(postings)
      .innerJoin(ledgerTransactions, eq(ledgerTransactions.id, postings.transactionId))
      .where(and(eq(postings.accountId, account), eq(ledgerTransactions.kind, 'payout')))
      .orderBy(desc(ledgerTransactions.createdAt))
      .limit(30);
    return {
      balanceCents: await balanceOf(db, account),
      automatic: hasFeature(s.merchant.plan, 'daily_auto_settlement'),
      nextSettlementAt: nextSettlement(),
      history: history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
    };
  });

  /** "Jetzt auszahlen": the whole balance to the merchant's bank account, over the (simulated) instant rail. */
  app.post('/web/business/payouts', async (req, reply) => {
    const s = business(req, ['owner']);
    requireStepUp(s);
    const key = readIdempotencyKey(req);
    const result = await withIdempotency(
      db,
      { scope: s.user.id, key, route: 'POST /web/business/payouts', body: {} },
      async (tx) => {
        const account = accountId.merchant(s.merchant.id);
        await lockAccount(tx, account);
        const amountCents = await balanceOf(tx, account);
        if (amountCents <= 0) throw new ApiError(409, 'nothing_to_pay_out', 'the balance is zero');
        const id = await postTransaction(tx, {
          kind: 'payout',
          reference: `payout:${s.merchant.id}:${key}`,
          postings: [
            { accountId: account, amountCents: -amountCents },
            { accountId: accountId.settlementOutbound, amountCents },
          ],
        });
        await audit(tx, {
          actor: `web:${s.user.id}`,
          action: 'merchant.payout',
          target: s.merchant.id,
          reason: 'Jetzt auszahlen',
          data: { amountCents, transactionId: id },
        });
        return { statusCode: 201, body: { id, amountCents, balanceCents: 0 } };
      },
    );
    return reply.status(result.statusCode).send(result.body);
  });

  // ---------- Team ----------

  app.get('/web/business/staff', async (req) => {
    const s = business(req);
    const team = await db
      .select({
        userId: users.id,
        name: users.name,
        phone: users.phone,
        role: staff.role,
        since: staff.createdAt,
      })
      .from(staff)
      .innerJoin(users, eq(users.id, staff.userId))
      .where(eq(staff.merchantId, s.merchant.id))
      .orderBy(staff.createdAt);
    const limit = PLAN_STAFF_LIMIT[s.merchant.plan];
    return {
      members: team.map((m) => ({ ...m, phone: maskPhone(m.phone), since: m.since.toISOString() })),
      limit: Number.isFinite(limit) ? limit : null,
      canManage: s.role === 'owner',
    };
  });

  const Role = z.enum(['manager', 'staff']);
  app.post(
    '/web/business/staff',
    { schema: { body: z.object({ phone: RequestOtpSchema.shape.phone, role: Role }) } },
    async (req, reply) => {
      const s = business(req, ['owner']);
      requireStepUp(s);
      if (req.body.role === 'manager') feature(s, 'staff_roles');
      const out = await db.transaction(async (tx) => {
        const [count] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(staff)
          .where(eq(staff.merchantId, s.merchant.id));
        if ((count?.n ?? 0) >= PLAN_STAFF_LIMIT[s.merchant.plan])
          throw new ApiError(403, 'plan_required', `the ${s.merchant.plan} plan allows ${count?.n} people`);
        const [user] = await tx.select().from(users).where(eq(users.phone, req.body.phone));
        // Production: send an invite SMS and create the membership when they sign up.
        if (!user) throw new ApiError(404, 'no_account', 'this number has no Zahln account yet');
        const [added] = await tx
          .insert(staff)
          .values({ merchantId: s.merchant.id, userId: user.id, role: req.body.role })
          .onConflictDoNothing()
          .returning();
        if (!added) throw new ApiError(409, 'already_member', 'already on the team');
        await audit(tx, {
          actor: `web:${s.user.id}`,
          action: 'staff.add',
          target: s.merchant.id,
          reason: 'Team',
          data: { userId: user.id, role: req.body.role },
        });
        return { userId: user.id, name: user.name, role: added.role };
      });
      return reply.status(201).send(out);
    },
  );

  const MemberParams = z.object({ userId: z.string().min(1) });
  const changeMember = async (
    s: ReturnType<typeof business>,
    userId: string,
    role: 'manager' | 'staff' | null,
  ) => {
    if (userId === s.user.id) throw new ApiError(409, 'own_role', "you can't change your own role");
    return db.transaction(async (tx) => {
      const [member] = await tx
        .select()
        .from(staff)
        .where(and(eq(staff.merchantId, s.merchant.id), eq(staff.userId, userId)))
        .for('update');
      if (!member) throw new ApiError(404, 'not_found', 'not on the team');
      if (member.role === 'owner') throw new ApiError(409, 'owner_locked', "the owner can't be changed here");
      if (role)
        await tx
          .update(staff)
          .set({ role })
          .where(and(eq(staff.merchantId, s.merchant.id), eq(staff.userId, userId)));
      else await tx.delete(staff).where(and(eq(staff.merchantId, s.merchant.id), eq(staff.userId, userId)));
      await audit(tx, {
        actor: `web:${s.user.id}`,
        action: role ? 'staff.role' : 'staff.remove',
        target: s.merchant.id,
        reason: 'Team',
        data: { userId, from: member.role, to: role },
      });
      return { userId, role };
    });
  };

  app.put(
    '/web/business/staff/:userId',
    { schema: { params: MemberParams, body: z.object({ role: Role }) } },
    async (req) => {
      const s = business(req, ['owner']);
      requireStepUp(s);
      if (req.body.role === 'manager') feature(s, 'staff_roles');
      return changeMember(s, req.params.userId, req.body.role);
    },
  );

  app.delete('/web/business/staff/:userId', { schema: { params: MemberParams } }, async (req, reply) => {
    const s = business(req, ['owner']);
    requireStepUp(s);
    await changeMember(s, req.params.userId, null);
    return reply.status(204).send();
  });

  // ---------- Plan ----------

  app.put('/web/business/plan', { schema: { body: z.object({ plan: z.enum(PLANS) }) } }, async (req) => {
    const s = business(req, ['owner']);
    requireStepUp(s);
    const from = s.merchant.plan;
    await db.transaction(async (tx) => {
      await tx.update(merchants).set({ plan: req.body.plan }).where(eq(merchants.id, s.merchant.id));
      await audit(tx, {
        actor: `web:${s.user.id}`,
        action: 'merchant.plan',
        target: s.merchant.id,
        reason: 'Changed by the owner on Zahln Web',
        data: { from, to: req.body.plan },
      });
    });
    // The tills refetch /config and unlock (or lock) features within a second.
    publishConfigChanged((await getStoredConfig(db)).version);
    return { plan: req.body.plan };
  });

  // ---------- Export ----------

  app.get(
    '/web/business/export.csv',
    { schema: { querystring: z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() }) } },
    async (req, reply) => {
      const s = business(req);
      feature(s, 'csv_export');
      const { csv } = await merchantCsv(db, s.merchant.id, req.query);
      const name = `zahln-${s.merchant.handle}-${req.query.from ?? 'alle'}-${req.query.to ?? 'heute'}.csv`;
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${name}"`)
        .header('cache-control', 'no-store')
        .send(csv);
    },
  );

  // ---------- Live ----------

  /** Every payment change at this merchant, as it happens (Pro: "live dashboard"). */
  app.get('/web/business/events', async (req, reply) => {
    const s = business(req);
    feature(s, 'live_dashboard');
    let cleanup = () => {};
    const send = openSse(req, reply, () => cleanup());
    cleanup = subscribeAllIntents((intent) => {
      if (intent.merchant.id === s.merchant.id) send('intent', intent);
    });
    send('ready', {});
  });

  // ---------- Payment requests (a pay link that lives 24 hours) ----------

  app.post(
    '/web/business/requests',
    {
      schema: {
        body: z.object({
          amountCents: z.number().int().positive().max(1_000_000),
          description: z.string().trim().max(80).optional(),
        }),
      },
    },
    async (req, reply) => {
      const s = business(req);
      const key = readIdempotencyKey(req);
      const result = await withIdempotency(
        db,
        { scope: s.user.id, key, route: 'POST /web/business/requests', body: req.body },
        async (tx) => ({
          statusCode: 201,
          body: await createIntent(tx, {
            merchantId: s.merchant.id,
            userId: s.user.id,
            request: { amountCents: req.body.amountCents, description: req.body.description },
            ttlSeconds: 24 * 3600,
          }),
        }),
      );
      return reply.status(result.statusCode).send(result.body);
    },
  );

  // ---------- Consumer on the web: pay a link, see the wallet ----------

  /** A consumer session (the checkout or the web wallet). A business session pays nothing. */
  const consumer = (req: FastifyRequest) => {
    const s = session(req);
    if (s.merchant) throw new ApiError(403, 'forbidden', 'not a consumer session');
    return s;
  };

  app.post(
    '/web/pay/:intentId/scanned',
    { schema: { params: z.object({ intentId: z.uuid() }) } },
    async (req) => {
      consumer(req);
      const intent = await db.transaction((tx) => markScanned(tx, req.params.intentId));
      publishIntent(intent);
      return intent;
    },
  );

  app.post(
    '/web/pay/:intentId',
    { schema: { params: z.object({ intentId: z.uuid() }), body: PayRequestSchema } },
    async (req, reply) => {
      const s = consumer(req);
      // Like Face ID before every payment on the phone: a code from the last 10 minutes.
      requireStepUp(s);
      // The same handler as the app: same idempotency scope (the user), same replay, same chaos.
      return respondToPay(deps, req, reply, {
        userId: s.user.id,
        intentId: req.params.intentId,
        tipCents: req.body.tipCents,
      });
    },
  );

  app.get(
    '/web/pay/attempts/:key',
    { schema: { params: z.object({ key: IdempotencyKeySchema }) } },
    async (req) => getAttemptByKey(db, consumer(req).user.id, req.params.key.toLowerCase()),
  );

  app.get('/web/wallet', async (req) => {
    const s = consumer(req);
    return {
      user: { name: s.user.name, phone: maskPhone(s.user.phone) },
      wallet: await getWallet(db, accountId.consumer(s.user.id), 50),
    };
  });

  /** A receipt the signed-in person paid (or was refunded). Anything else looks like it doesn't exist. */
  app.get('/web/wallet/receipts/:intentId', { schema: { params: IntentParams } }, async (req) => {
    const s = consumer(req);
    const [mine] = await db
      .select({ tipCents: paymentAttempts.tipCents })
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.intentId, req.params.intentId),
          eq(paymentAttempts.payerUserId, s.user.id),
          eq(paymentAttempts.status, 'paid'),
        ),
      );
    if (!mine) throw new ApiError(404, 'not_found', 'receipt not found');
    return { intent: await getIntent(db, req.params.intentId), tipCents: mine.tipCents };
  });

  app.get('/web/wallet/devices', async (req) => {
    const s = consumer(req);
    const rows = await db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, s.user.id), isNull(devices.revokedAt)))
      .orderBy(desc(devices.lastSeenAt));
    return rows.map((d) => ({
      id: d.id,
      platform: d.platform,
      createdAt: d.createdAt.toISOString(),
      lastSeenAt: d.lastSeenAt.toISOString(),
    }));
  });

  /** Lost phone: sign it out from a laptop. The next request from that phone gets 401 and it locks itself. */
  app.delete(
    '/web/wallet/devices/:deviceId',
    { schema: { params: z.object({ deviceId: z.uuid() }) } },
    async (req, reply) => {
      const s = consumer(req);
      requireStepUp(s);
      const [row] = await db
        .update(devices)
        .set({ revokedAt: sql`now()` })
        .where(
          and(eq(devices.id, req.params.deviceId), eq(devices.userId, s.user.id), isNull(devices.revokedAt)),
        )
        .returning({ id: devices.id });
      if (!row) throw new ApiError(404, 'not_found', 'device not found');
      return reply.status(204).send();
    },
  );

  /** GDPR Art. 15/20: everything we hold about you, as JSON. Needs a fresh code, like any data export. */
  app.get('/web/wallet/export.json', async (req, reply) => {
    const s = consumer(req);
    requireStepUp(s);
    const [user] = await db.select().from(users).where(eq(users.id, s.user.id));
    const attempts = await db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.payerUserId, s.user.id));
    const myDevices = await db
      .select({
        id: devices.id,
        platform: devices.platform,
        createdAt: devices.createdAt,
        lastSeenAt: devices.lastSeenAt,
        revokedAt: devices.revokedAt,
      })
      .from(devices)
      .where(eq(devices.userId, s.user.id));
    const memberships = await db.select().from(staff).where(eq(staff.userId, s.user.id));
    const wallet = await getWallet(db, accountId.consumer(s.user.id), 10_000);
    return reply
      .header(
        'content-disposition',
        `attachment; filename="zahln-daten-${new Date().toISOString().slice(0, 10)}.json"`,
      )
      .header('cache-control', 'no-store')
      .send({
        exportedAt: new Date().toISOString(),
        user,
        memberships,
        devices: myDevices,
        wallet,
        paymentAttempts: attempts,
        note: 'Ledger entries are kept for 10 years (German commercial and tax law, § 147 AO) even after deletion.',
      });
  });
}
