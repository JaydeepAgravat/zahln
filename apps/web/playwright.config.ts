import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end against the real stack: the API (pnpm api, dev mode with chaos) and this app (pnpm web).
 * Uses the installed Google Chrome, so no browser download is needed. Specs reset the demo data first.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3000',
    channel: 'chrome',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome' }, testMatch: /checkout.*\.spec\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
      testMatch: /(dashboard|a11y).*\.spec\.ts/,
    },
    {
      name: 'console',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: process.env.CONSOLE_URL ?? 'http://localhost:5174',
      },
      testMatch: /console.*\.spec\.ts/,
    },
    // Screenshots for the README gallery: only with SCREENS=1 (`pnpm screens:web`), never in the normal e2e run.
    ...(process.env.SCREENS === '1'
      ? [{ name: 'screens', use: { channel: 'chrome' as const }, testMatch: /screens\.spec\.ts/ }]
      : []),
  ],
  webServer: [
    { command: 'pnpm dev', url: 'http://localhost:3000/login', reuseExistingServer: true, timeout: 120_000 },
    {
      command: 'pnpm --filter @zahln/console dev',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
