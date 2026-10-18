import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { users } from '../src/db/schema';
import { LENA, MILA, setupTestApp } from './helpers';

const t = setupTestApp();

/** A brand-new account on a fresh phone: empty wallet, one bound device. */
async function newAccount(phone: string) {
  const app = await t.app;
  const otp = (await app.inject({ method: 'POST', url: '/auth/otp', payload: { phone } })).json();
  const v = (
    await app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: { challengeId: otp.challengeId, code: otp.devCode },
    })
  ).json();
  const deviceId = randomUUID();
  const bound = (
    await app.inject({
      method: 'POST',
      url: '/devices',
      payload: { verificationToken: v.verificationToken, deviceId, platform: 'android', name: 'Kim Neu' },
    })
  ).json();
  const headers = { authorization: `Bearer ${bound.sessionToken}`, 'x-device-id': deviceId };
  return { userId: bound.user.id as string, headers, phone };
}

describe('GDPR: export and delete', () => {
  it('exports everything about the signed-in person, and nothing about anyone else', async () => {
    const res = await t.call('GET', '/me/export', { user: LENA });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: LENA, name: 'Lena Hoffmann' });
    expect(res.body.wallet.balanceCents).toBe(5000);
    expect(JSON.stringify(res.body)).not.toContain('usr_jonas');
  });

  it('refuses while money is left, and refuses a business owner', async () => {
    expect((await t.call('DELETE', '/me', { user: LENA })).body.error).toBe('balance_not_zero');
    expect((await t.call('DELETE', '/me', { user: MILA })).body.error).toBe('owner_cannot_delete');
  });

  it('deletes: the person is gone, the phone signs out, the number is free again', async () => {
    const app = await t.app;
    const kim = await newAccount('+4915112345678');
    expect((await app.inject({ method: 'DELETE', url: '/me', headers: kim.headers })).statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: '/me', headers: kim.headers })).statusCode).toBe(401);

    const [row] = await t.db.select().from(users).where(eq(users.id, kim.userId));
    expect(row).toMatchObject({ name: 'Gelöschtes Konto', phone: `deleted:${kim.userId}` });
    expect(row?.deletedAt).toBeInstanceOf(Date);

    const otp = (
      await app.inject({ method: 'POST', url: '/auth/otp', payload: { phone: kim.phone } })
    ).json();
    const again = (
      await app.inject({
        method: 'POST',
        url: '/auth/verify',
        payload: { challengeId: otp.challengeId, code: otp.devCode },
      })
    ).json();
    expect(again.isNewUser).toBe(true);
  });
});
