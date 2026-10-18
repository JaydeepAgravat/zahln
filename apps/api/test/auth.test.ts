import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { authChallenges, devices } from '../src/db/schema';
import { setupTestApp } from './helpers';

const t = setupTestApp();
const LENA_PHONE = '+4915100000001';
const MILA_PHONE = '+4915100000010';

async function verify(phone: string) {
  const otp = await t.call('POST', '/auth/otp', { body: { phone } });
  const verified = await t.call('POST', '/auth/verify', {
    body: { challengeId: otp.body.challengeId, code: otp.body.devCode },
  });
  return { otp, verified };
}

async function signIn(phone: string, deviceId = randomUUID(), name?: string) {
  const { verified } = await verify(phone);
  const session = await t.call('POST', '/devices', {
    body: { verificationToken: verified.body.verificationToken, deviceId, platform: 'ios', name },
  });
  return { session, deviceId };
}

const bearer = (token: string, deviceId: string) => ({
  authorization: `Bearer ${token}`,
  'x-device-id': deviceId,
});

describe('OTP', () => {
  it('a known number verifies and returns the user and their merchants', async () => {
    const { otp, verified } = await verify(MILA_PHONE);
    expect(otp.status).toBe(201);
    expect(otp.body.devCode).toBe('123456');
    expect(verified.body).toMatchObject({
      isNewUser: false,
      name: 'Mila Schneider',
      memberships: [{ merchantId: 'cafe-mila', role: 'owner', plan: 'business' }],
    });
  });

  it('a wrong code is rejected and counted; after 5 attempts the challenge is locked', async () => {
    const otp = await t.call('POST', '/auth/otp', { body: { phone: LENA_PHONE } });
    for (let i = 0; i < 5; i++) {
      const res = await t.call('POST', '/auth/verify', {
        body: { challengeId: otp.body.challengeId, code: '000000' },
      });
      expect(res.body.error).toBe('otp_invalid');
    }
    const locked = await t.call('POST', '/auth/verify', {
      body: { challengeId: otp.body.challengeId, code: '123456' },
    });
    expect(locked.status).toBe(429);
  });

  it('an expired code is rejected', async () => {
    const otp = await t.call('POST', '/auth/otp', { body: { phone: LENA_PHONE } });
    await t.db
      .update(authChallenges)
      .set({ expiresAt: sql`now() - interval '1 second'` })
      .where(eq(authChallenges.id, otp.body.challengeId));
    const res = await t.call('POST', '/auth/verify', {
      body: { challengeId: otp.body.challengeId, code: '123456' },
    });
    expect(res.body.error).toBe('otp_expired');
  });

  it('a code can only be verified once', async () => {
    const { otp } = await verify(LENA_PHONE);
    const again = await t.call('POST', '/auth/verify', {
      body: { challengeId: otp.body.challengeId, code: '123456' },
    });
    expect(again.body.error).toBe('otp_invalid');
  });

  it('rejects numbers that are not German mobiles', async () => {
    expect((await t.call('POST', '/auth/otp', { body: { phone: '+4930123456' } })).status).toBe(400);
  });
});

describe('device binding and sessions', () => {
  it('registers a device and the session token works from that device only', async () => {
    const { session, deviceId } = await signIn(LENA_PHONE);
    expect(session.status).toBe(201);
    expect(session.body.user).toMatchObject({ id: 'usr_lena', name: 'Lena Hoffmann' });

    const me = await t.call('GET', '/me', { headers: bearer(session.body.sessionToken, deviceId) });
    expect(me.body.user.id).toBe('usr_lena');

    const wallet = await t.call('GET', '/wallets/me', {
      headers: bearer(session.body.sessionToken, deviceId),
    });
    expect(wallet.body.balanceCents).toBe(5000);

    const otherDevice = await t.call('GET', '/me', {
      headers: bearer(session.body.sessionToken, randomUUID()),
    });
    expect(otherDevice.status).toBe(401);
  });

  it('the session token is never stored in plain text', async () => {
    const { session, deviceId } = await signIn(LENA_PHONE);
    const [row] = await t.db.select().from(devices).where(eq(devices.id, deviceId));
    expect(row?.sessionTokenHash).not.toBe(session.body.sessionToken);
    expect(row?.sessionTokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a verification token can be used once', async () => {
    const { verified } = await verify(LENA_PHONE);
    const body = {
      verificationToken: verified.body.verificationToken,
      deviceId: randomUUID(),
      platform: 'ios',
    };
    expect((await t.call('POST', '/devices', { body })).status).toBe(201);
    expect((await t.call('POST', '/devices', { body: { ...body, deviceId: randomUUID() } })).status).toBe(
      401,
    );
  });

  it('a new number creates a user with an empty wallet, and needs a name', async () => {
    const phone = '+4915199999999';
    const { verified } = await verify(phone);
    expect(verified.body.isNewUser).toBe(true);
    const noName = await t.call('POST', '/devices', {
      body: {
        verificationToken: verified.body.verificationToken,
        deviceId: randomUUID(),
        platform: 'android',
      },
    });
    expect(noName.body.error).toBe('name_required');

    const { session, deviceId } = await signIn(phone, randomUUID(), 'Neue Studentin');
    expect(session.body.user.name).toBe('Neue Studentin');
    const wallet = await t.call('GET', '/wallets/me', {
      headers: bearer(session.body.sessionToken, deviceId),
    });
    expect(wallet.body.balanceCents).toBe(0);
  });

  it('signing out revokes the device', async () => {
    const { session, deviceId } = await signIn(LENA_PHONE);
    const headers = bearer(session.body.sessionToken, deviceId);
    expect((await t.call('DELETE', '/devices/current', { headers })).status).toBe(204);
    expect((await t.call('GET', '/me', { headers })).status).toBe(401);
  });

  it('paying with a bearer session works end to end', async () => {
    const { session, deviceId } = await signIn(LENA_PHONE);
    const intent = (await t.api.createIntent({ amountCents: 320 })).body;
    const res = await t.call('POST', `/intents/${intent.id}/pay`, {
      key: randomUUID(),
      body: {},
      headers: bearer(session.body.sessionToken, deviceId),
    });
    expect(res.body.attempt.status).toBe('paid');
  });
});
