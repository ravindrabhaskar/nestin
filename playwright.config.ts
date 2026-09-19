import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the real app (Express + Vite middleware + SQLite). The server is
 * started with a fresh database seeded with demo data so journeys are deterministic.
 */
// A fresh SQLite file per run; global-setup.ts removes the ones left by earlier runs.
const E2E_DB = `./data/e2e-${Date.now().toString(36)}.db`;
process.env.E2E_DB = E2E_DB;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  // Visual snapshots are OS/font specific; opt in with VISUAL=true (baselines are committed for win32).
  testIgnore: process.env.VISUAL === 'true' ? [] : ['**/visual.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 667 } },
      testMatch: /visual\.spec\.ts/,
    },
    // Cross-browser runs of the journeys and flows (not the crawl, which is viewport-focused).
    // Enabled with BROWSERS=all (CI nightly); needs `npx playwright install firefox webkit`.
    ...(process.env.BROWSERS === 'all'
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } },
            testMatch: /(journeys|flows)\.spec\.ts/,
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } },
            testMatch: /(journeys|flows)\.spec\.ts/,
          },
        ]
      : []),
  ],
  webServer: {
    command: 'npx tsx server.ts',
    url: 'http://localhost:3100/api/v1/health',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: '3100',
      NODE_ENV: 'development',
      DATABASE_PATH: E2E_DB,
      JWT_SECRET: 'e2e-secret-e2e-secret-e2e-secret-1234567890',
      DISABLE_HMR: 'true',
      // Deterministic demo credentials regardless of the developer's local .env
      SEED_DEMO_DATA: 'true',
      DEMO_PASSWORD: 'NestIn@2026',
      SUPER_ADMIN_EMAIL: 'admin@nestin.io',
      SUPER_ADMIN_PASSWORD: 'Admin@NestIn2026',
      SUPER_ADMIN_ACCESS_CODE: 'NESTIN-SUPER-ADMIN-2026',
      DISABLE_BACKUPS: 'true',
      // One IP drives every role and viewport in the crawl; the per-IP limiter is not what is under test.
      API_MAX_REQUESTS_PER_MINUTE: '100000',
      AUTH_MAX_ATTEMPTS: '1000',
    },
  },
});
