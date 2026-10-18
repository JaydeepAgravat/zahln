import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Plan } from '@zahln/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { merchants, staff, users, webSessions } from '../db/schema';
import { sha256 } from './auth';

export const SESSION_COOKIE = 'zahln_session';
export const CSRF_COOKIE = 'zahln_csrf';
export const CSRF_HEADER = 'x-csrf-token';
/** Signed out after 12 hours without a request. */
export const IDLE_TIMEOUT_HOURS = 12;
/** Owner actions (refunds, payouts, plan, team) need an OTP from the last 10 minutes. */
export const STEP_UP_MINUTES = 10;

const token = () => randomBytes(32).toString('base64url');

export type WebSession = {
  id: string;
  user: { id: string; name: string; phone: string };
  /** Set for a business session: the one merchant this browser may see. */
  merchant: { id: string; name: string; handle: string; city: string; plan: Plan } | null;
  role: 'owner' | 'manager' | 'staff' | null;
  authenticatedAt: Date;
  csrfHash: string;
};

export async function createWebSession(db: DbOrTx, input: { userId: string; merchantId: string | null }) {
  const sessionToken = token();
  const csrfToken = token();
  await db.insert(webSessions).values({
    tokenHash: sha256(sessionToken),
    csrfHash: sha256(csrfToken),
    userId: input.userId,
    merchantId: input.merchantId,
  });
  return { sessionToken, csrfToken };
}

/**
 * Resolve a session cookie. The role is read fresh on every request, so removing someone from the team
 * (or demoting them) takes effect on their next click, not when their cookie expires.
 */
export async function authenticateWeb(db: DbOrTx, sessionToken: string): Promise<WebSession | null> {
  const [row] = await db
    .update(webSessions)
    .set({ lastSeenAt: sql`now()` })
    .where(
      and(
        eq(webSessions.tokenHash, sha256(sessionToken)),
        isNull(webSessions.revokedAt),
        sql`${webSessions.lastSeenAt} > now() - make_interval(hours => ${IDLE_TIMEOUT_HOURS})`,
      ),
    )
    .returning();
  if (!row) return null;
  const [user] = await db.select().from(users).where(eq(users.id, row.userId));
  if (!user) return null;
  let merchant: WebSession['merchant'] = null;
  let role: WebSession['role'] = null;
  if (row.merchantId) {
    const [m] = await db
      .select({ merchant: merchants, role: staff.role })
      .from(merchants)
      .leftJoin(staff, and(eq(staff.merchantId, merchants.id), eq(staff.userId, user.id)))
      .where(eq(merchants.id, row.merchantId));
    if (!m) return null;
    merchant = {
      id: m.merchant.id,
      name: m.merchant.name,
      handle: m.merchant.handle,
      city: m.merchant.city,
      plan: m.merchant.plan,
    };
    role = m.role;
  }
  return {
    id: row.id,
    user: { id: user.id, name: user.name, phone: user.phone },
    merchant,
    role,
    authenticatedAt: row.authenticatedAt,
    csrfHash: row.csrfHash,
  };
}

/** Double submit, bound to the session: the header must equal the cookie, and both must be this session's. */
export function csrfValid(
  session: Pick<WebSession, 'csrfHash'>,
  cookie: string | undefined,
  header: unknown,
) {
  if (typeof header !== 'string' || !cookie || header.length === 0) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(cookie);
  return a.length === b.length && timingSafeEqual(a, b) && sha256(header) === session.csrfHash;
}

export const steppedUp = (session: Pick<WebSession, 'authenticatedAt'>, now = Date.now()) =>
  now - session.authenticatedAt.getTime() < STEP_UP_MINUTES * 60_000;

export async function markSteppedUp(db: DbOrTx, sessionId: string) {
  await db.update(webSessions).set({ authenticatedAt: sql`now()` }).where(eq(webSessions.id, sessionId));
}

export async function revokeWebSession(db: DbOrTx, sessionId: string) {
  await db.update(webSessions).set({ revokedAt: sql`now()` }).where(eq(webSessions.id, sessionId));
}
