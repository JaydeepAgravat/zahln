import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { createTillIntent, enterOtp, resetDemo } from './helpers';

/** WCAG 2.2 A and AA, in both colour schemes. Zero violations is the bar, not "few". */
async function audit(page: Page, scheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: scheme });
  // Colours transition for 150 ms after a scheme switch; measure the settled page, not a frame in between.
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary, `${page.url()} (${scheme})`).toEqual([]);
}

test.beforeAll(async () => {
  await resetDemo();
});

test('login and the pay link are accessible', async ({ page }) => {
  await page.goto('/login');
  for (const s of ['light', 'dark'] as const) await audit(page, s);
  const intent = await createTillIntent();
  await page.goto(`/i/${intent.ref}`);
  for (const s of ['light', 'dark'] as const) await audit(page, s);
});

test('every dashboard page is accessible', async ({ page }) => {
  await page.goto('/login');
  await enterOtp(page, '0151 0000 0010');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible();
  for (const path of ['', '/transactions', '/requests', '/payouts', '/team', '/plan', '/export', '/poster']) {
    await page.goto(`/business${path}`);
    await page.waitForLoadState('networkidle');
    for (const s of ['light', 'dark'] as const) await audit(page, s);
  }
});

test('the web wallet is accessible', async ({ page }) => {
  await page.goto('/login?for=wallet');
  await enterOtp(page, '0151 0000 0001');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForURL('**/wallet');
  await expect(page.getByText('Guthaben')).toBeVisible();
  for (const path of ['/wallet', '/wallet/devices']) {
    await page.goto(path);
    for (const s of ['light', 'dark'] as const) await audit(page, s);
  }
});
