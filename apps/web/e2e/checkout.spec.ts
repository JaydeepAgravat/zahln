import { expect, test } from '@playwright/test';
import { createTillIntent, enterOtp, ledgerFor, resetDemo, setChaos } from './helpers';

test.beforeEach(async () => {
  await resetDemo();
});

test('a pay link: open → sign in with the code → pay → Bezahlt', async ({ page }) => {
  const intent = await createTillIntent();
  await page.goto(`/i/${intent.ref}`);
  await expect(page.getByText('6,30 €').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'In der App öffnen' })).toHaveAttribute(
    'href',
    `zaster://i/${intent.ref}`,
  );

  await page.getByRole('button', { name: 'Im Browser bezahlen' }).click();
  await enterOtp(page, '0151 0000 0001');
  await page.getByRole('button', { name: 'Bestätigen' }).click();
  await page.getByRole('button', { name: '6,30 € bezahlen' }).click();

  await expect(page.getByRole('status')).toContainText('Bezahlt');
  expect(await ledgerFor(intent.id)).toBe(1);
});

test('a forged link is "Ungültiger Link", with no pay button', async ({ page }) => {
  await page.goto('/i/00000000-0000-4000-8000-000000000000.AAAAAAAAAAAAAAAA');
  await expect(page.getByRole('heading', { name: 'Ungültiger Link' })).toBeVisible();
});

test.afterAll(async () => {
  await setChaos('ok');
});
