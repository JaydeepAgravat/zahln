import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { auditLog, webSessions } from '../src/db/schema';
import { ALI, CART, LENA, MILA, setupTestApp } from './helpers';

const t = setupTestApp();

const PHONE = {
  mila: '+4915100000010',
  tom: '+4915100000011',
  ali: '+4915100000020',
  lena: '+4915100000001',
  jonas: '+4915100000002',
};

type Browser = {
  call: (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    opts?: { body?: unknown; csrf?: string | null; key?: string },
    // biome-ignore lint/suspicious/noExplicitAny: a test browser reads whatever JSON each route returns
  ) => Promise<{ status: number; body: any; headers: Record<string, unknown> }>;
  cookies: Record<string, string>;
};

/** A browser: keeps its cookies and sends the CSRF header on writes (unless told not to). */
async function signIn(phone: string, audience: 'business' | 'consumer' = 'business'): Promise<Browser> {
  const app = await t.app;
  const cookies: Record<string, string> = {};
  const call: Browser['call'] = async (method, url, opts = {}) => {
    const headers: Record<string, string> = {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    };
    const csrf = opts.csrf === undefined ? cookies.zahln_csrf : opts.csrf;
    if (method !== 'GET' && csrf) headers['x-csrf-token'] = csrf;
    if (opts.key) headers['idempotency-key'] = opts.key;
    const res = await app.inject({
      method,
      url,
      headers,
      ...(opts.body !== undefined ? { payload: opts.body as object } : {}),
    });
    for (const c of res.cookies) {
      if (c.value) cookies[c.name] = c.value;
      else delete cookies[c.name];
    }
    const isJson = String(res.headers['content-type'] ?? '').includes('json');
    return { status: res.statusCode, body: isJson && res.body ? res.json() : res.body, headers: res.headers };
  };
  const otp = await call('POST', '/web/auth/otp', { body: { phone } });
  const verify = await call('POST', '/web/auth/verify', {
    body: { challengeId: otp.body.challengeId, code: otp.body.devCode, audience },
  });
  if (verify.status !== 200) throw Object.assign(new Error('sign-in failed'), { res: verify });
  return { call, cookies };
}

/** Make the session's last OTP older than the step-up window. */
const ageSession = () =>
  t.db.execute(sql`UPDATE web_sessions SET authenticated_at = now() - interval '11 minutes'`);

async function stepUp(b: Browser) {
  const otp = await b.call('POST', '/web/auth/step-up/otp');
  return b.call('POST', '/web/auth/step-up', {
    body: { challengeId: otp.body.challengeId, code: otp.body.devCode },
  });
}

async function paidIntent() {
  const intent = (await t.api.createIntent(CART)).body;
  await t.api.pay(intent.id, LENA);
  return intent.id as string;
}

describe('web sessions', () => {
  it('sign-in sets an httpOnly, SameSite=Lax session cookie and a readable CSRF cookie; the token is stored hashed', async () => {
    const app = await t.app;
    const otp = await app.inject({ method: 'POST', url: '/web/auth/otp', payload: { phone: PHONE.mila } });
    const res = await app.inject({
      method: 'POST',
      url: '/web/auth/verify',
      payload: { challengeId: otp.json().challengeId, code: otp.json().devCode },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ merchant: { id: 'cafe-mila' }, role: 'owner' });
    const session = res.cookies.find((c) => c.name === 'zahln_session');
    const csrf = res.cookies.find((c) => c.name === 'zahln_csrf');
    expect(session).toMatchObject({ httpOnly: true, sameSite: 'Lax', secure: true, path: '/' });
    expect(csrf?.httpOnly).toBeFalsy();
    const [row] = await t.db.select().from(webSessions);
    expect(row?.tokenHash).not.toBe(session?.value);
  });

  it('cashiers have no dashboard: the till is their tool', async () => {
    await expect(signIn(PHONE.tom)).rejects.toMatchObject({
      res: { status: 403, body: { error: 'not_a_manager' } },
    });
  });

  it('the dev x-user-id shortcut does not work on the web surface', async () => {
    const res = await t.call('GET', '/web/business/summary', { user: MILA });
    expect(res.status).toBe(401);
  });

  it('a consumer session cannot read business routes', async () => {
    const lena = await signIn(PHONE.lena, 'consumer');
    expect((await lena.call('GET', '/web/session')).body.merchant).toBeNull();
    expect((await lena.call('GET', '/web/business/summary')).status).toBe(403);
  });

  it('sign-out revokes the session on the server, not just the cookie', async () => {
    const mila = await signIn(PHONE.mila);
    const stolen = { ...mila.cookies };
    expect((await mila.call('POST', '/web/auth/logout')).status).toBe(204);
    Object.assign(mila.cookies, stolen);
    expect((await mila.call('GET', '/web/session')).status).toBe(401);
  });

  it('removing someone from the team locks them out on their next request', async () => {
    const mila = await signIn(PHONE.mila);
    await t.db.execute(sql`UPDATE staff SET role = 'staff' WHERE user_id = ${MILA}`);
    expect((await mila.call('GET', '/web/business/summary')).status).toBe(403);
  });
});

describe('CSRF', () => {
  it('a write without the token, or with a token from another session, is refused', async () => {
    const mila = await signIn(PHONE.mila);
    const other = await signIn(PHONE.mila);
    const id = await paidIntent();
    const url = `/web/business/transactions/${id}/refunds`;
    const body = { amountCents: 100, reason: 'Falsche Bestellung' };
    expect((await mila.call('POST', url, { body, csrf: null, key: randomUUID() })).body.error).toBe('csrf');
    // Header and cookie agree, but they belong to a different session: still refused.
    const forged = other.cookies.zahln_csrf;
    mila.cookies.zahln_csrf = forged ?? '';
    expect((await mila.call('POST', url, { body, csrf: forged, key: randomUUID() })).body.error).toBe('csrf');
  });
});

describe('step-up', () => {
  it('a refund needs a code from the last 10 minutes; after the step-up it works and reaches the payer', async () => {
    const mila = await signIn(PHONE.mila);
    const id = await paidIntent();
    await ageSession();
    const url = `/web/business/transactions/${id}/refunds`;
    const body = { amountCents: 250, reason: 'Croissant war alle' };
    const refused = await mila.call('POST', url, { body, key: randomUUID() });
    expect(refused).toMatchObject({ status: 403, body: { error: 'step_up_required' } });
    expect((await stepUp(mila)).status).toBe(200);
    const key = randomUUID();
    expect((await mila.call('POST', url, { body, key })).status).toBe(201);
    // Same key again: replayed, not refunded twice.
    expect((await mila.call('POST', url, { body, key })).status).toBe(201);
    expect(await t.api.balance(LENA)).toBe(5000 - 630 + 250);
    // The console's audit log sees it, under the owner's web identity.
    const [entry] = await t.db.select().from(auditLog).orderBy(sql`${auditLog.id} desc`).limit(1);
    expect(entry).toMatchObject({ actor: `web:${MILA}`, action: 'payment.refund', target: id });
  });

  it('a step-up code must belong to the signed-in user', async () => {
    const mila = await signIn(PHONE.mila);
    const app = await t.app;
    const otp = (
      await app.inject({ method: 'POST', url: '/web/auth/otp', payload: { phone: PHONE.jonas } })
    ).json();
    const res = await mila.call('POST', '/web/auth/step-up', {
      body: { challengeId: otp.challengeId, code: otp.devCode },
    });
    expect(res.body.error).toBe('otp_invalid');
  });
});

describe('dashboard', () => {
  it("summarises today's takings, by hour and by staff", async () => {
    await paidIntent();
    const mila = await signIn(PHONE.mila);
    const { body } = await mila.call('GET', '/web/business/summary');
    expect(body.today).toMatchObject({ cents: 630, count: 1 });
    expect(body.byHour.reduce((a: number, b: number) => a + b, 0)).toBe(630);
    expect(body.byStaff[0]).toMatchObject({ name: 'Mila Schneider', cents: 630 });
    expect(body.live).toBe(true);
  });

  it('pages transactions with a stable cursor and shows payers as "Lena H."', async () => {
    for (let i = 0; i < 3; i++) await paidIntent();
    const mila = await signIn(PHONE.mila);
    const first = (await mila.call('GET', '/web/business/transactions?limit=2')).body;
    expect(first.items).toHaveLength(2);
    expect(first.items[0].payerName).toBe('Lena H.');
    const second = (await mila.call('GET', `/web/business/transactions?limit=2&cursor=${first.nextCursor}`))
      .body;
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });

  it("another merchant's payment looks like it doesn't exist", async () => {
    const id = await paidIntent();
    const ali = await signIn(PHONE.ali);
    expect((await ali.call('GET', `/web/business/transactions/${id}`)).status).toBe(404);
  });

  it('pays out the whole balance once, to the settlement account, and audits it', async () => {
    await paidIntent();
    const mila = await signIn(PHONE.mila);
    const before = (await mila.call('GET', '/web/business/payouts')).body.balanceCents;
    const key = randomUUID();
    const res = await mila.call('POST', '/web/business/payouts', { key });
    expect(res.body.amountCents).toBe(before);
    expect((await mila.call('POST', '/web/business/payouts', { key })).body.amountCents).toBe(before);
    const after = (await mila.call('GET', '/web/business/payouts')).body;
    expect(after.balanceCents).toBe(0);
    expect(after.history[0].amountCents).toBe(before);
    expect((await mila.call('POST', '/web/business/payouts', { key: randomUUID() })).body.error).toBe(
      'nothing_to_pay_out',
    );
  });

  it('the owner upgrades Free → Pro and the till unlocks the one-time QR', async () => {
    const ali = await signIn(PHONE.ali);
    expect((await t.api.createIntent({ amountCents: 850 }, ALI, 'doener-ali')).status).toBe(403);
    expect((await ali.call('PUT', '/web/business/plan', { body: { plan: 'pro' } })).body.plan).toBe('pro');
    expect((await t.api.createIntent({ amountCents: 850 }, ALI, 'doener-ali')).status).toBe(201);
    const [entry] = await t.db.select().from(auditLog).orderBy(sql`${auditLog.id} desc`).limit(1);
    expect(entry).toMatchObject({
      actor: `web:${ALI}`,
      action: 'merchant.plan',
      data: { from: 'free', to: 'pro' },
    });
  });

  it('team: the owner adds an existing user, changes the role, removes them; plan limits apply', async () => {
    const mila = await signIn(PHONE.mila);
    const add = await mila.call('POST', '/web/business/staff', {
      body: { phone: PHONE.jonas, role: 'staff' },
    });
    expect(add.status).toBe(201);
    expect(
      (await mila.call('PUT', `/web/business/staff/${add.body.userId}`, { body: { role: 'manager' } })).body
        .role,
    ).toBe('manager');
    expect(
      (await mila.call('PUT', `/web/business/staff/${MILA}`, { body: { role: 'staff' } })).body.error,
    ).toBe('own_role');
    expect((await mila.call('DELETE', `/web/business/staff/${add.body.userId}`)).status).toBe(204);
    expect(
      (await mila.call('POST', '/web/business/staff', { body: { phone: '+4915199999999', role: 'staff' } }))
        .body.error,
    ).toBe('no_account');

    // Döner Ali is on Free: one person (the owner) is the limit.
    const ali = await signIn(PHONE.ali);
    expect(
      (await ali.call('POST', '/web/business/staff', { body: { phone: PHONE.jonas, role: 'staff' } })).body
        .error,
    ).toBe('plan_required');
  });

  it('exports DATEV CSV for Business, and Free gets plan_required', async () => {
    await paidIntent();
    const mila = await signIn(PHONE.mila);
    const res = await mila.call('GET', '/web/business/export.csv');
    expect(String(res.headers['content-type'])).toContain('text/csv');
    expect(String(res.body).split('\r\n')[0]).toBe(
      '﻿Datum;Beleg-Nr.;Betrag;MwSt.-Satz;MwSt.;Zahlungs-ID;Status',
    );
    const ali = await signIn(PHONE.ali);
    expect((await ali.call('GET', '/web/business/export.csv')).status).toBe(403);
  });
});

describe('CORS with cookies', () => {
  it('only listed origins get credentialed responses', async () => {
    const app = await t.app;
    const ok = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const evil = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('pay links (Day 8)', () => {
  it('the public intent shows merchant and amount to anyone with the link, and nothing for a forged one', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const res = await t.call('GET', `/public/intents/${intent.ref}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: intent.id, amountCents: 630, merchant: { name: 'Café Mila' } });
    expect(JSON.stringify(res.body)).not.toMatch(/usr_|payer|balance/);
    const forged = `${intent.id}.AAAAAAAAAAAAAAAA`;
    expect((await t.call('GET', `/public/intents/${forged}`)).status).toBe(404);
  });

  it('a link opened after expiry says expired (and the till hears about it)', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    await t.db.execute(
      sql`UPDATE payment_intents SET expires_at = now() - interval '1 second' WHERE id = ${intent.id}`,
    );
    expect((await t.call('GET', `/public/intents/${intent.ref}`)).body.status).toBe('expired');
  });

  it('pays in the browser with a consumer session; a business session cannot pay', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const mila = await signIn(PHONE.mila);
    expect((await mila.call('POST', `/web/pay/${intent.id}`, { body: {}, key: randomUUID() })).status).toBe(
      403,
    );
    const lena = await signIn(PHONE.lena, 'consumer');
    const res = await lena.call('POST', `/web/pay/${intent.id}`, { body: {}, key: randomUUID() });
    expect(res).toMatchObject({ status: 201, body: { attempt: { status: 'paid' } } });
    expect(await t.api.balance(LENA)).toBe(5000 - 630);
    // A session whose last code is older than 10 minutes must confirm again before paying.
    const next = (await t.api.createIntent(CART)).body;
    await ageSession();
    expect((await lena.call('POST', `/web/pay/${next.id}`, { body: {}, key: randomUUID() })).body.error).toBe(
      'step_up_required',
    );
  });

  it('Act 2 on the web: the response is dropped, the key finds the outcome, a resend replays it (one charge)', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    const lena = await signIn(PHONE.lena, 'consumer');
    const key = randomUUID();
    expect((await lena.call('GET', `/web/pay/attempts/${key}`)).status).toBe(404);
    t.chaos.set('drop_after_settle');
    await expect(lena.call('POST', `/web/pay/${intent.id}`, { body: {}, key })).rejects.toThrow();
    t.chaos.set('ok');
    expect((await lena.call('GET', `/web/pay/attempts/${key}`)).body.status).toBe('paid');
    const replay = await lena.call('POST', `/web/pay/${intent.id}`, { body: {}, key });
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(await t.api.balance(LENA)).toBe(5000 - 630);
  });

  it('a payment request lives 24 hours and opens as a normal pay link', async () => {
    const mila = await signIn(PHONE.mila);
    const res = await mila.call('POST', '/web/business/requests', {
      body: { amountCents: 4500, description: 'Catering Freitag' },
      key: randomUUID(),
    });
    expect(res.status).toBe(201);
    const hours = (Date.parse(res.body.expiresAt) - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23.9);
    expect((await t.call('GET', `/public/intents/${res.body.ref}`)).body.description).toBe(
      'Catering Freitag',
    );
  });
});

describe('web wallet (Day 8)', () => {
  it('shows only your own receipts', async () => {
    const id = await paidIntent();
    const lena = await signIn(PHONE.lena, 'consumer');
    expect((await lena.call('GET', `/web/wallet/receipts/${id}`)).status).toBe(200);
    const jonas = await signIn(PHONE.jonas, 'consumer');
    expect((await jonas.call('GET', `/web/wallet/receipts/${id}`)).status).toBe(404);
    expect((await lena.call('GET', '/web/wallet')).body.wallet.balanceCents).toBe(5000 - 630);
  });

  it('revoking a phone and exporting your data both need a fresh code', async () => {
    const app = await t.app;
    const otp = (
      await app.inject({ method: 'POST', url: '/auth/otp', payload: { phone: PHONE.lena } })
    ).json();
    const verified = (
      await app.inject({
        method: 'POST',
        url: '/auth/verify',
        payload: { challengeId: otp.challengeId, code: otp.devCode },
      })
    ).json();
    const deviceId = randomUUID();
    const bound = await app.inject({
      method: 'POST',
      url: '/devices',
      payload: { verificationToken: verified.verificationToken, deviceId, platform: 'ios' },
    });
    const phoneToken = bound.json().sessionToken as string;

    const lena = await signIn(PHONE.lena, 'consumer');
    expect((await lena.call('GET', '/web/wallet/devices')).body.map((d: { id: string }) => d.id)).toContain(
      deviceId,
    );
    await ageSession();
    expect((await lena.call('GET', '/web/wallet/export.json')).body.error).toBe('step_up_required');
    expect((await lena.call('DELETE', `/web/wallet/devices/${deviceId}`)).body.error).toBe(
      'step_up_required',
    );
    await stepUp(lena);
    expect((await lena.call('DELETE', `/web/wallet/devices/${deviceId}`)).status).toBe(204);
    const fromPhone = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${phoneToken}`, 'x-device-id': deviceId },
    });
    expect(fromPhone.statusCode).toBe(401);
    const data = await lena.call('GET', '/web/wallet/export.json');
    expect(data.body.user.id).toBe(LENA);
  });
});
