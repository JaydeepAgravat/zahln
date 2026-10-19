import { randomUUID } from 'node:crypto';
import { INITIAL_ADMIN_CONFIG } from '@zaster/shared';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { auditLog, refunds } from '../src/db/schema';
import { ALI, CART, LENA, MILA, setupTestApp } from './helpers';

const t = setupTestApp();
const OPS = { 'x-admin-token': 'dev-admin-token-change-me-please', 'x-admin-name': 'Jaydeep' };

const putConfig = (data: unknown, reason = 'Demo: Act 3') =>
  t.call('PUT', '/admin/config', { headers: OPS, body: { data, reason } });

const withConfig = (patch: (c: typeof INITIAL_ADMIN_CONFIG) => void) => {
  const next: typeof INITIAL_ADMIN_CONFIG = JSON.parse(JSON.stringify(INITIAL_ADMIN_CONFIG));
  patch(next);
  return next;
};

describe('remote config', () => {
  it('works signed out, so the forced-update gate works before login', async () => {
    const res = await t.call('GET', '/config', { headers: { 'x-app': 'consumer' } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      app: 'consumer',
      minSupportedVersion: '0.1.0',
      plan: null,
      features: [],
    });
  });

  it("a till gets its merchant's plan and features; a consumer never does", async () => {
    const till = await t.call('GET', '/config', { user: MILA, headers: { 'x-app': 'merchant' } });
    expect(till.body.plan).toBe('business');
    expect(till.body.features).toContain('dynamic_qr');
    const wallet = await t.call('GET', '/config', { user: MILA, headers: { 'x-app': 'consumer' } });
    expect(wallet.body.plan).toBeNull();
  });

  it('each app has its own release window', async () => {
    await putConfig(withConfig((c) => (c.apps.merchant.minSupportedVersion = '9.0.0')));
    const merchant = await t.call('GET', '/config', { headers: { 'x-app': 'merchant' } });
    const consumer = await t.call('GET', '/config', { headers: { 'x-app': 'consumer' } });
    expect(merchant.body.minSupportedVersion).toBe('9.0.0');
    expect(consumer.body.minSupportedVersion).toBe('0.1.0');
  });
});

describe('console: config writes', () => {
  it('needs the ops token, a reason and a valid config; every change is audited with what changed', async () => {
    expect(
      (await t.call('PUT', '/admin/config', { body: { data: INITIAL_ADMIN_CONFIG, reason: 'x' } })).status,
    ).toBe(401);
    expect((await putConfig(INITIAL_ADMIN_CONFIG, '')).status).toBe(400);
    expect((await putConfig(withConfig((c) => (c.apps.consumer.minSupportedVersion = '1.0')))).status).toBe(
      400,
    );

    const before = (await t.call('GET', '/admin/config', { headers: OPS })).body.version;
    const res = await putConfig(
      withConfig((c) => (c.killSwitches.nfc_pay = true)),
      'NFC broken on Android 16',
    );
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(before + 1);

    const [entry] = await t.db.select().from(auditLog).orderBy(sql`${auditLog.id} desc`).limit(1);
    expect(entry).toMatchObject({
      actor: 'console:Jaydeep',
      action: 'config.update',
      reason: 'NFC broken on Android 16',
      data: { changed: ['killSwitches.nfc_pay'] },
    });
  });

  it('the audit log is append-only in the database itself', async () => {
    await putConfig(withConfig((c) => (c.flags.discreet_mode_default = true)));
    await expect(t.db.execute(sql`UPDATE audit_log SET reason = 'oops'`)).rejects.toThrow();
    await expect(t.db.execute(sql`DELETE FROM audit_log`)).rejects.toThrow();
  });
});

describe('kill switches', () => {
  it('refunds switched off: the app is refused (503), the console can still refund, and it is audited', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    await t.api.pay(intent.id);
    await putConfig(
      withConfig((c) => (c.killSwitches.refunds = true)),
      'Refund bug, investigating',
    );

    const fromApp = await t.api.refund(intent.id, 100);
    expect(fromApp.status).toBe(503);
    expect(fromApp.body.error).toBe('feature_disabled');

    const fromConsole = await t.call('POST', `/admin/payments/${intent.id}/refunds`, {
      headers: OPS,
      key: randomUUID(),
      body: { amountCents: 100, reason: 'Customer called support' },
    });
    expect(fromConsole.status).toBe(201);
    const [row] = await t.db.select().from(refunds).where(eq(refunds.intentId, intent.id));
    expect(row).toMatchObject({ createdByOps: 'console:Jaydeep', createdByUserId: null });
    expect(await t.api.balance(LENA)).toBe(5000 - 630 + 100);
  });

  it('top-ups switched off are refused by the server too', async () => {
    await putConfig(withConfig((c) => (c.killSwitches.topup = true)));
    const res = await t.call('POST', '/wallets/me/topups', {
      user: LENA,
      key: randomUUID(),
      body: { amountCents: 1000 },
    });
    expect(res.body.error).toBe('feature_disabled');
  });
});

describe('console: merchants and payments', () => {
  it('upgrading Döner Ali from Free to Pro unlocks the one-time QR immediately, and is audited', async () => {
    expect((await t.api.createIntent({ amountCents: 850 }, ALI, 'doener-ali')).status).toBe(403);
    const res = await t.call('PUT', '/admin/merchants/doener-ali/plan', {
      headers: OPS,
      body: { plan: 'pro', reason: 'Signed the Pro plan' },
    });
    expect(res.body).toEqual({ id: 'doener-ali', plan: 'pro' });
    expect((await t.api.createIntent({ amountCents: 850 }, ALI, 'doener-ali')).status).toBe(201);
    const till = await t.call('GET', '/config', { user: ALI, headers: { 'x-app': 'merchant' } });
    expect(till.body.features).toContain('dynamic_qr');
    const [entry] = await t.db.select().from(auditLog).orderBy(sql`${auditLog.id} desc`).limit(1);
    expect(entry).toMatchObject({
      action: 'merchant.plan',
      target: 'doener-ali',
      data: { from: 'free', to: 'pro' },
    });
  });

  it('finds a payment by amount, merchant or payer, and shows its timeline and ledger', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    await t.api.pay(intent.id);
    for (const q of ['6,30', 'mila', 'Lena', intent.id.slice(0, 8)]) {
      const res = await t.call('GET', `/admin/payments?q=${encodeURIComponent(q)}`, { headers: OPS });
      expect(res.body.map((p: { id: string }) => p.id)).toContain(intent.id);
    }
    const detail = (await t.call('GET', `/admin/payments/${intent.id}`, { headers: OPS })).body;
    expect(detail.timeline.map((e: { type: string }) => e.type)).toEqual(['intent.created', 'intent.paid']);
    expect(detail.ledger.reduce((s: number, p: { amountCents: number }) => s + p.amountCents, 0)).toBe(0);
    expect(detail.attempts[0]).toMatchObject({ status: 'paid', payerName: 'Lena Hoffmann' });
  });

  it("lists merchants with their team size and today's takings", async () => {
    const intent = (await t.api.createIntent(CART)).body;
    await t.api.pay(intent.id);
    const res = await t.call('GET', '/admin/merchants', { headers: OPS });
    expect(res.status).toBe(200);
    expect(res.body.find((m: { id: string }) => m.id === 'cafe-mila')).toMatchObject({
      staffCount: 2,
      todayCents: 630,
    });
  });

  it('exports a DATEV-style CSV German Excel can open', async () => {
    const intent = (await t.api.createIntent(CART)).body;
    await t.api.pay(intent.id);
    const res = await t.app.then((app) =>
      app.inject({ method: 'GET', url: '/admin/merchants/cafe-mila/export.csv', headers: OPS }),
    );
    expect(res.headers['content-type']).toContain('text/csv');
    const [header, row] = res.body.replace('﻿', '').split('\r\n');
    expect(res.body.startsWith('﻿')).toBe(true);
    expect(header).toBe('Datum;Beleg-Nr.;Betrag;MwSt.-Satz;MwSt.;Zahlungs-ID;Status');
    expect(row).toMatch(/^\d{4}-\d{2}-\d{2};1;6,30;7 %;0,41;/);
  });
});

describe('live config stream', () => {
  it('nudges connected apps when the config changes', async () => {
    const app = await t.app;
    const base = await app.listen({ port: 0, host: '127.0.0.1' }).catch(() => {
      const a = app.server.address();
      return a && typeof a === 'object' ? `http://127.0.0.1:${a.port}` : '';
    });
    const controller = new AbortController();
    const res = await fetch(`${base}/config/events`, { signal: controller.signal });
    if (!res.body) throw new Error('no body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    const until = async (needle: string) => {
      while (!text.includes(needle)) text += decoder.decode((await reader.read()).value, { stream: true });
    };
    await until('"version":1');
    await putConfig(
      withConfig((c) => (c.banner = { de: 'Wartung heute 22 Uhr', en: 'Maintenance at 10 pm' })),
    );
    await until('"version":2');
    controller.abort();
  });
});
