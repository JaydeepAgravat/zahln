import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import { API, createTillIntent, payFromPhone, resetDemo } from './helpers';

/**
 * The README gallery (docs/screenshots/<surface>/NN-name.png), regenerated with `pnpm screens:web`.
 * Not a test of behaviour: the other specs do that. This one walks every page with realistic data and shoots it,
 * in English (the `zaster_locale` cookie), so the gallery reads for anyone.
 */
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/screenshots');
const CONSOLE = process.env.CONSOLE_URL ?? 'http://localhost:5174';
const LANDING = process.env.LANDING_URL ?? 'http://localhost:3001';
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const OPS = {
  'x-admin-token': process.env.ADMIN_TOKEN ?? 'dev-admin-token-change-me-please',
  'x-admin-name': 'Jaydeep',
};

async function english(page: Page) {
  await page.context().addCookies([{ name: 'zaster_locale', value: 'en', url: WEB }]);
  return page;
}

/** The dev build prints the one-time code on the page; read it from there. */
async function signInCode(page: Page, phone: string, phoneLabel: RegExp) {
  await page.getByLabel(phoneLabel).fill(phone);
  await page.getByRole('button', { name: 'Send code' }).click();
  const hint = page.getByText(/the code is \d{6}/);
  await expect(hint).toBeVisible();
  return (await hint.textContent())?.match(/\d{6}/)?.[0] ?? '';
}

async function shot(page: Page, dir: string, name: string, fullPage = false) {
  mkdirSync(resolve(OUT, dir), { recursive: true });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600); // count-ups, fades and the live dot settle
  // The Next.js dev-mode badge isn't part of the product.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' }).catch(() => {});
  await page.screenshot({ path: resolve(OUT, dir, `${name}.png`), fullPage });
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.beforeAll(async () => {
  await resetDemo();
  // Today needs takings: three payments at Café Mila, one of them partly refunded later in the dashboard.
  for (let i = 0; i < 3; i++) await payFromPhone((await createTillIntent()).id);
});

test('merchant dashboard (Zaster Web)', async ({ browser }) => {
  const page = await english(
    await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' }),
  );
  await page.goto('/login');
  await shot(page, 'web', '01-login');
  const code = await signInCode(page, '0151 0000 0010', /Mobile number/);
  await page.getByLabel(/Code from the text message/).fill(code);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await shot(page, 'web', '02-today');

  await page.goto('/business/transactions');
  await shot(page, 'web', '03-transactions');
  await page.getByRole('row').nth(1).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, 'web', '04-receipt');
  await page.keyboard.press('Escape');

  await page.goto('/business/requests');
  await page.getByPlaceholder('45,00').fill('45');
  await page.getByPlaceholder('Catering Friday').fill('Catering Friday');
  await page.getByRole('button', { name: 'Create link' }).click();
  await expect(page.getByText(/Valid until/)).toBeVisible();
  await shot(page, 'web', '05-payment-request');

  for (const [path, name] of [
    ['/business/payouts', '06-payouts'],
    ['/business/team', '07-team'],
    ['/business/plan', '08-plan'],
    ['/business/export', '09-export'],
    ['/business/poster', '10-qr-poster'],
  ] as const) {
    await page.goto(path);
    await shot(page, 'web', name);
  }

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/business');
  await shot(page, 'web', '11-today-dark');
  await page.close();
});

test('pay link and web wallet (phone)', async ({ browser }) => {
  const page = await english(
    await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light',
    }),
  );
  const intent = await createTillIntent();
  await page.goto(`/i/${intent.ref}`);
  await shot(page, 'checkout', '01-pay-link');
  await page.getByRole('button', { name: 'Pay in the browser' }).click();
  const code = await signInCode(page, '0151 0000 0001', /mobile number/);
  await shot(page, 'checkout', '02-code');
  await page.getByLabel(/Code from the text message/).fill(code);
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.getByRole('button', { name: 'Pay €6.30' }).click();
  await expect(page.getByRole('status')).toContainText('Paid');
  await page.waitForTimeout(700); // the flood finishes rising
  await shot(page, 'checkout', '03-paid');

  await page.goto('/i/00000000-0000-4000-8000-000000000000.AAAAAAAAAAAAAAAA');
  await shot(page, 'checkout', '04-invalid');

  // The checkout signed Lena in as a consumer: the web wallet opens straight away.
  await page.goto('/wallet');
  await expect(page.getByText('Balance')).toBeVisible();
  await shot(page, 'checkout', '05-wallet');
  await page.goto('/wallet/devices');
  await shot(page, 'checkout', '06-devices');
  await page.close();
});

test('Zaster Ops console', async ({ browser }) => {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    baseURL: CONSOLE,
  });
  await page.goto('/');
  await shot(page, 'console', '01-login');
  await page.getByLabel('Your name').fill('Jaydeep');
  await page.getByLabel('Ops token').fill(OPS['x-admin-token']);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
  await shot(page, 'console', '02-payments');

  // A plan change and a refund first, so the audit log has a story to tell.
  await fetch(`${API}/admin/merchants/doener-ali/plan`, {
    method: 'PUT',
    headers: { ...OPS, 'content-type': 'application/json' },
    body: JSON.stringify({ plan: 'pro', reason: 'Signed the Pro plan' }),
  });
  await page.getByRole('row').nth(1).click();
  await expect(page.getByRole('heading', { name: /€/ })).toBeVisible();
  await shot(page, 'console', '03-payment-detail');
  await page.getByRole('button', { name: 'Refund…' }).click();
  await page.getByLabel('Amount').fill('1,00');
  await page.getByRole('button', { name: 'Customer called support' }).click();
  await shot(page, 'console', '04-refund');
  await page.getByRole('button', { name: /Refund 1,00/ }).click();
  await expect(page.getByText('Part refunded').first()).toBeVisible();

  await page.getByRole('link', { name: 'Merchants' }).click();
  await expect(page.getByRole('heading', { name: 'Merchants' })).toBeVisible();
  await shot(page, 'console', '05-merchants');
  await page.getByRole('row').filter({ hasText: 'Café Mila' }).click();
  await shot(page, 'console', '06-merchant');
  await page.getByRole('link', { name: 'Control room' }).click();
  await expect(page.getByRole('heading', { name: 'Control room' })).toBeVisible();
  await shot(page, 'console', '07-control-room');
  await page.getByRole('link', { name: 'Audit log' }).click();
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
  await shot(page, 'console', '08-audit');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByRole('link', { name: 'Control room' }).click();
  await shot(page, 'console', '09-control-room-dark');
  await page.close();
});

test('landing (The Zaster Edition)', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const up = await fetch(LANDING)
    .then((r) => r.ok)
    .catch(() => false);
  test.skip(!up, `landing not running at ${LANDING}`);
  await page.goto(`${LANDING}/en/`);
  await page.waitForTimeout(2500); // the intro frame draws itself
  await shot(page, 'landing', '01-edition');
  await page.close();
});

test.afterAll(async () => {
  await resetDemo();
});
