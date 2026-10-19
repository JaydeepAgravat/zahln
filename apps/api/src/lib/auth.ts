import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import {
  INTENT_TTL_SECONDS,
  type Membership,
  type MeResponse,
  OTP_LENGTH,
  type SessionResponse,
} from '@zaster/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client';
import { accounts, authChallenges, devices, merchants, staff, users } from '../db/schema';
import { ApiError } from './errors';
import { accountId } from './ledger';

const OTP_TTL_SECONDS = INTENT_TTL_SECONDS; // 5 minutes, same as a payment code
const MAX_OTP_ATTEMPTS = 5;

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

export type AuthOptions = {
  /** In development the code is fixed and returned in the response, because no SMS is sent. */
  devOtp: boolean;
};

export async function requestOtp(db: Db, phone: string, opts: AuthOptions) {
  const code = opts.devOtp ? '123456' : String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
  const [challenge] = await db
    .insert(authChallenges)
    .values({
      phone,
      codeHash: sha256(code),
      expiresAt: sql`now() + make_interval(secs => ${OTP_TTL_SECONDS})`,
    })
    .returning({ id: authChallenges.id, expiresAt: authChallenges.expiresAt });
  if (!challenge) throw new Error('failed to create challenge');
  // Production: hand `code` to an SMS provider here. Never log it.
  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt.toISOString(),
    ...(opts.devOtp ? { devCode: code } : {}),
  };
}

async function membershipsOf(db: DbOrTx, userId: string): Promise<Membership[]> {
  const rows = await db
    .select({
      merchantId: merchants.id,
      merchantName: merchants.name,
      handle: merchants.handle,
      role: staff.role,
      plan: merchants.plan,
    })
    .from(staff)
    .innerJoin(merchants, eq(merchants.id, staff.merchantId))
    .where(eq(staff.userId, userId));
  return rows;
}

export async function verifyOtp(db: Db, challengeId: string, code: string) {
  return db.transaction(async (tx) => {
    const [challenge] = await tx
      .select({ row: authChallenges, expired: sql<boolean>`${authChallenges.expiresAt} <= now()` })
      .from(authChallenges)
      .where(eq(authChallenges.id, challengeId))
      .for('update');
    if (!challenge || challenge.row.verifiedAt)
      throw new ApiError(400, 'otp_invalid', 'unknown or used code');
    if (challenge.expired) throw new ApiError(400, 'otp_expired', 'code expired, request a new one');
    if (challenge.row.attempts >= MAX_OTP_ATTEMPTS) {
      throw new ApiError(429, 'otp_too_many_attempts', 'too many attempts, request a new code');
    }

    if (!sameHash(challenge.row.codeHash, sha256(code))) {
      await tx
        .update(authChallenges)
        .set({ attempts: challenge.row.attempts + 1 })
        .where(eq(authChallenges.id, challengeId));
      // Returned, not thrown, so the attempt counter commits.
      return { ok: false as const };
    }

    const verificationToken = token();
    await tx
      .update(authChallenges)
      .set({ verifiedAt: sql`now()`, verificationTokenHash: sha256(verificationToken) })
      .where(eq(authChallenges.id, challengeId));

    const [user] = await tx.select().from(users).where(eq(users.phone, challenge.row.phone));
    return {
      ok: true as const,
      verificationToken,
      isNewUser: !user,
      name: user?.name ?? null,
      memberships: user ? await membershipsOf(tx, user.id) : [],
    };
  });
}

/**
 * Bind this device to the user and issue a session token.
 * A verification token can be used once; a new user is created (with a wallet) on first registration.
 */
export async function registerDevice(
  db: Db,
  input: {
    verificationToken: string;
    deviceId: string;
    platform: 'ios' | 'android';
    name?: string | undefined;
    /** Which app is binding this device. A till (Zettel) may only be bound by staff of a business. */
    app?: 'consumer' | 'merchant';
  },
): Promise<SessionResponse> {
  return db.transaction(async (tx) => {
    const [challenge] = await tx
      .select()
      .from(authChallenges)
      .where(
        and(
          eq(authChallenges.verificationTokenHash, sha256(input.verificationToken)),
          isNull(authChallenges.consumedAt),
          sql`${authChallenges.verifiedAt} > now() - interval '15 minutes'`,
        ),
      )
      .for('update');
    if (!challenge) throw new ApiError(401, 'unauthorized', 'verification expired, start again');
    await tx
      .update(authChallenges)
      .set({ consumedAt: sql`now()` })
      .where(eq(authChallenges.id, challenge.id));

    let [user] = await tx.select().from(users).where(eq(users.phone, challenge.phone));
    if (!user) {
      if (!input.name) throw new ApiError(400, 'name_required', 'name is required for new accounts');
      [user] = await tx
        .insert(users)
        .values({ id: `usr_${randomBytes(6).toString('hex')}`, name: input.name, phone: challenge.phone })
        .returning();
      if (!user) throw new Error('failed to create user');
      await tx
        .insert(accounts)
        .values({ id: accountId.consumer(user.id), kind: 'consumer_wallet', ownerId: user.id });
    }

    // Re-registering the same device replaces its old session.
    const sessionToken = token();
    await tx
      .insert(devices)
      .values({
        id: input.deviceId,
        userId: user.id,
        platform: input.platform,
        sessionTokenHash: sha256(sessionToken),
      })
      .onConflictDoUpdate({
        target: devices.id,
        set: {
          userId: user.id,
          sessionTokenHash: sha256(sessionToken),
          revokedAt: null,
          lastSeenAt: sql`now()`,
        },
      });

    const memberships = await membershipsOf(tx, user.id);
    // Throwing rolls back the whole transaction: the challenge stays unconsumed and no device is bound.
    if (input.app === 'merchant' && memberships.length === 0) {
      throw new ApiError(403, 'wrong_app', 'this number is not staff of any business');
    }

    return {
      sessionToken,
      user: { id: user.id, name: user.name, phone: user.phone },
      memberships,
    };
  });
}

/** Resolve a bearer token to its user, but only from the device it was issued to. */
export async function authenticate(db: Db, sessionToken: string, deviceId: string | undefined) {
  const [row] = await db
    .update(devices)
    .set({ lastSeenAt: sql`now()` })
    .where(and(eq(devices.sessionTokenHash, sha256(sessionToken)), isNull(devices.revokedAt)))
    .returning({ userId: devices.userId, deviceId: devices.id });
  if (!row || (deviceId !== undefined && row.deviceId !== deviceId)) return null;
  return row;
}

export async function revokeDevice(db: Db, deviceId: string) {
  await db.update(devices).set({ revokedAt: sql`now()` }).where(eq(devices.id, deviceId));
}

export async function me(db: Db, userId: string): Promise<MeResponse> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new ApiError(401, 'unauthorized', 'unknown user');
  return {
    user: { id: user.id, name: user.name, phone: user.phone },
    memberships: await membershipsOf(db, user.id),
  };
}
