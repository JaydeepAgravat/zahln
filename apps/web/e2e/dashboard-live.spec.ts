import { expect, test } from '@playwright/test';
import { createTillIntent, enterOtp, payFromPhone, resetDemo } from './helpers';

test.beforeEach(async () => {
  await resetDemo();
});

test('the dashboard is open; a customer pays at the till; the payment appears without a refresh', async ({
  page,
}) => {
  await page.goto('/login');
  await enterOtp(page, '0151 0000 0010');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible();
  await expect(page.getByText('Live', { exact: true }).first()).toBeVisible();

  const intent = await createTillIntent();
  const started = Date.now();
  await payFromPhone(intent.id);
  await expect(page.getByText('6,30 €').first()).toBeVisible({ timeout: 2000 });
  expect(Date.now() - started).toBeLessThan(2000);
  await expect(page.getByText('1 Zahlung', { exact: true })).toBeVisible();
});
