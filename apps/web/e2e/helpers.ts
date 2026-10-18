import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

export const API = process.env.API_URL ?? 'http://localhost:4000';
const OPS = {
  'x-admin-token': process.env.ADMIN_TOKEN ?? 'dev-admin-token-change-me-please',
  'x-admin-name': 'e2e',
};

/** Demo data back to the seed, and the rail back to normal. */
export async function resetDemo() {
  const res = await fetch(`${API}/admin/reset`, { method: 'POST', headers: OPS });
  expect(res.ok).toBe(true);
}

export async function setChaos(mode: 'ok' | 'drop_after_settle' | 'slow' | 'reject') {
  await fetch(`${API}/admin/chaos`, {
    method: 'PUT',
    headers: { ...OPS, 'content-type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
}

/** The till: Mila creates a one-time QR for a cappuccino and a croissant (6,30 €). */
export async function createTillIntent(): Promise<{ id: string; ref: string }> {
  const res = await fetch(`${API}/merchants/cafe-mila/intents`, {
    method: 'POST',
    headers: { 'x-user-id': 'usr_mila', 'idempotency-key': randomUUID(), 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [
        { sku: 'cappuccino', qty: 1 },
        { sku: 'croissant', qty: 1 },
      ],
    }),
  });
  return (await res.json()) as { id: string; ref: string };
}

/** A phone pays it (the app's API path), for the dashboard spec. */
export async function payFromPhone(intentId: string) {
  const res = await fetch(`${API}/intents/${intentId}/pay`, {
    method: 'POST',
    headers: { 'x-user-id': 'usr_lena', 'idempotency-key': randomUUID(), 'content-type': 'application/json' },
    body: '{}',
  });
  expect(res.status).toBe(201);
}

/** Phone → dev code, on either the checkout or the dashboard sign-in. */
export async function enterOtp(page: Page, phone: string) {
  await page.getByLabel(/Handynummer/).fill(phone);
  await page.getByRole('button', { name: 'Code senden' }).click();
  const hint = page.getByText(/Der Code ist \d{6}/);
  const code = (await hint.textContent())?.match(/\d{6}/)?.[0] ?? '';
  await page.getByLabel(/Code aus der SMS/).fill(code);
}

/** How many ledger transactions this intent produced (via the console API, as ops would check). */
export async function ledgerFor(intentId: string): Promise<number> {
  const res = await fetch(`${API}/admin/payments/${intentId}`, { headers: OPS });
  const body = (await res.json()) as { ledger: { transactionId: string }[] };
  return new Set(body.ledger.map((l) => l.transactionId)).size;
}
