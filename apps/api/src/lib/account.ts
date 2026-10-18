import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { devices, paymentAttempts, staff, users, webSessions } from '../db/schema';
import { audit } from './audit';
import { ApiError } from './errors';
import { accountId, balanceOf, lockAccount } from './ledger';
import { getWallet } from './payments';

/** GDPR Art. 15/20: everything we hold about this person, as one JSON document. */
export async function exportAccount(db: Db, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new ApiError(404, 'not_found', 'account not found');
  return {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, phone: user.phone, createdAt: user.createdAt.toISOString() },
    memberships: await db.select().from(staff).where(eq(staff.userId, userId)),
    devices: await db
      .select({
        id: devices.id,
        platform: devices.platform,
        createdAt: devices.createdAt,
        lastSeenAt: devices.lastSeenAt,
        revokedAt: devices.revokedAt,
      })
      .from(devices)
      .where(eq(devices.userId, userId)),
    wallet: await getWallet(db, accountId.consumer(userId), 10_000),
    paymentAttempts: await db.select().from(paymentAttempts).where(eq(paymentAttempts.payerUserId, userId)),
    note: 'Ledger entries are kept for 10 years (§ 147 AO) even after the account is deleted.',
  };
}

/**
 * GDPR Art. 17, within what payment law allows: the person is gone (name, phone, sessions, team memberships),
 * the money trail stays (ledger and payment records, anonymised by the cleared user row) for the retention period.
 * Refused while money is left in the wallet (pay it out first) or while the person owns a business.
 */
export async function deleteAccount(db: Db, userId: string) {
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .select()
      .from(staff)
      .where(and(eq(staff.userId, userId), eq(staff.role, 'owner')));
    if (owner) throw new ApiError(409, 'owner_cannot_delete', 'hand over or close the business first');
    const wallet = accountId.consumer(userId);
    await lockAccount(tx, wallet);
    const balance = await balanceOf(tx, wallet);
    if (balance !== 0) throw new ApiError(409, 'balance_not_zero', 'pay out the remaining balance first');

    const [user] = await tx
      .update(users)
      // The phone is freed (it's unique) so the number can open a new account later.
      .set({ name: 'Gelöschtes Konto', phone: `deleted:${userId}`, deletedAt: sql`now()` })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({ id: users.id });
    if (!user) throw new ApiError(404, 'not_found', 'account not found');
    await tx
      .update(devices)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(devices.userId, userId), isNull(devices.revokedAt)));
    await tx
      .update(webSessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(webSessions.userId, userId), isNull(webSessions.revokedAt)));
    await tx.delete(staff).where(eq(staff.userId, userId));
    await audit(tx, {
      actor: `user:${userId}`,
      action: 'account.delete',
      target: userId,
      reason: 'Deleted by the user',
    });
  });
}
