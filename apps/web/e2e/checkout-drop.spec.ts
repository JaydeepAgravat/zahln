import { expect, test } from '@playwright/test';
import { createTillIntent, enterOtp, ledgerFor, resetDemo } from './helpers';

test.beforeEach(async () => {
  await resetDemo();
});

/**
 * The server takes the payment, but the answer never reaches the browser. (The API's chaos mode drops the
 * socket too, but Chrome silently retries a POST on a dead keep-alive socket; the retry carries the same
 * idempotency key, so the server just replays the result. Good for users, useless for seeing "checking".
 * So here the request really goes through and the browser is told the connection reset.)
 */
test('Act 2 in the browser: the answer is lost, the page checks, a reload keeps checking, then Bezahlt, charged once', async ({
  page,
}) => {
  const intent = await createTillIntent();
  await page.goto(`/i/${intent.ref}`);
  await page.getByRole('button', { name: 'Im Browser bezahlen' }).click();
  await enterOtp(page, '0151 0000 0001');
  await page.getByRole('button', { name: 'Bestätigen' }).click();
  const pay = page.getByRole('button', { name: '6,30 € bezahlen' });
  await expect(pay).toBeVisible();

  await page.route(`**/web/pay/${intent.id}`, async (route) => {
    await route.fetch(); // the money moves on the server…
    await route.abort('connectionreset'); // …and the phone never hears back.
  });
  // Status checks hang (a dead network), so the page has to sit in "checking".
  let networkDown = true;
  await page.route('**/web/pay/attempts/**', (route) =>
    networkDown ? new Promise<void>(() => {}) : route.continue(),
  );
  const firstCheck = page.waitForRequest('**/web/pay/attempts/**');
  await pay.click();
  await expect(page.getByRole('status')).toContainText('Wird geprüft');
  await firstCheck; // the page is asking by key, and that request hangs
  await expect(page.getByRole('status')).toContainText('Dein Geld ist sicher');

  // Reload in the middle of it: the key saved in this tab means "checking" resumes; nothing is sent twice.
  // The network comes back only for requests made after the reload; the hung check dies with the page.
  networkDown = false;
  await page.reload();
  await expect(page.getByRole('status')).toHaveText(/^Bezahlt/, { timeout: 10_000 });

  expect(await ledgerFor(intent.id)).toBe(1);
});
