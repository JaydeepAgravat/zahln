import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { createTillIntent, payFromPhone, resetDemo } from './helpers';

async function noViolations(page: Page) {
  await page.waitForTimeout(300);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    page.url(),
  ).toEqual([]);
}

test.beforeEach(async () => {
  await resetDemo();
});

test('support finds a payment by amount, refunds 1,00 € with a reason, and the audit log shows it', async ({
  page,
}) => {
  const intent = await createTillIntent();
  await payFromPhone(intent.id);

  await page.goto('/');
  await page.getByLabel('Your name').fill('E2E Support');
  await page.getByLabel('Ops token').fill(process.env.ADMIN_TOKEN ?? 'dev-admin-token-change-me-please');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
  await noViolations(page);

  await page.getByLabel('Search payments').fill('6,30');
  await page
    .getByRole('row')
    .filter({ hasText: intent.id.slice(0, 8) })
    .click();
  await expect(page.getByRole('heading', { name: /6,30/ })).toBeVisible();
  await noViolations(page);

  await page.getByRole('button', { name: 'Refund…' }).click();
  await page.getByLabel('Amount').fill('1,00');
  await page.getByRole('button', { name: 'Customer called support' }).click();
  await page.getByRole('button', { name: /Refund 1,00/ }).click();
  await expect(page.getByText('Part refunded').first()).toBeVisible();

  await page.getByRole('link', { name: 'Audit log' }).click();
  // Append-only: older demo runs are still there, newest first.
  const row = page.getByRole('row').filter({ hasText: 'Customer called support' }).first();
  await expect(row).toContainText('E2E Support');
  await expect(row).toContainText('Refund');
  await noViolations(page);

  for (const link of ['Merchants', 'Control room']) {
    await page.getByRole('link', { name: link }).click();
    await expect(page.getByRole('heading', { name: link })).toBeVisible();
    await noViolations(page);
  }
});
