import { test, expect, type Page } from '@playwright/test';

const PASSWORD = 'NestIn@2026';

/** Opens the auth dialog from the navbar and signs in through the real API. */
async function loginViaModal(page: Page, role: 'tenant' | 'owner', email: string, password = PASSWORD) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).first().click();
  const dialog = page.getByTestId('auth-modal');
  await expect(dialog).toBeVisible();
  if (role === 'owner') await dialog.getByRole('button', { name: 'PG Owner' }).click();
  await dialog.locator('input[type="email"]').fill(email);
  await dialog.locator('input[type="password"]').fill(password);
  await dialog.locator('button[type="submit"]').click();
  return dialog;
}

test.describe('Marketing site & marketplace', () => {
  test('API health and seeded catalogue are reachable', async ({ request }) => {
    const health = await request.get('/api/v1/health');
    expect(health.ok()).toBeTruthy();
    const list = await request.get('/api/v1/properties/public');
    const body = await list.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(100);
  });

  test('For Owners page renders hero and CTAs', async ({ page }) => {
    await page.goto('/for-owners');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Smarter Business');
    await expect(page.getByRole('button', { name: 'List Your PG' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request a Demo' }).first()).toBeVisible();
  });

  test('"List Your PG" opens the owner auth dialog', async ({ page }) => {
    await page.goto('/for-owners');
    await page.getByRole('button', { name: 'List Your PG' }).first().click();
    const dialog = page.getByTestId('auth-modal');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[type="email"]')).toBeVisible();
  });

  test('Find PG renders API listings and opens a property page', async ({ page }) => {
    await page.goto('/find-pg');
    await expect(page.getByText(/Banyan Stay Premium/i).first()).toBeVisible({ timeout: 20_000 });
    await page.goto('/property/banyan-stay-premium-kukatpally');
    await expect(page.getByRole('heading', { name: /Banyan Stay Premium/i }).first()).toBeVisible({ timeout: 20_000 });
  });

  test('contact form creates a ticket through the API', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('input[name="fullName"]').fill('E2E Visitor');
    await page.locator('input[name="email"]').fill('e2e.visitor@example.com');
    await page.locator('textarea[name="message"]').fill('Hello from the end-to-end suite.');
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/v1/public/contact')),
      page
        .locator('form')
        .filter({ has: page.locator('textarea[name="message"]') })
        .locator('button[type="submit"]')
        .click(),
    ]);
    expect(resp.status()).toBe(201);
    await expect(page.getByText(/TKT-\d{6}/)).toBeVisible();
  });
});

test.describe('Authenticated journeys (real backend)', () => {
  test('tenant signs in and sees API-backed bookings', async ({ page }) => {
    const dialog = await loginViaModal(page, 'tenant', 'tenant@nestin.com');
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await page.goto('/my-bookings');
    // The seeded resident has a confirmed stay: it appears under Active (move-in date has passed).
    await page.getByRole('button', { name: /^Active/ }).click();
    await expect(page.getByRole('heading', { name: /Banyan Stay Premium/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'View booking' }).first().click();
    await expect(page.getByText(/Ref: NST-/)).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('nestin_auth_token'));
    expect(token?.split('.').length).toBe(3);
  });

  test('owner signs in and the CRM shows API-backed leads', async ({ page }) => {
    const dialog = await loginViaModal(page, 'owner', 'owner@nestin.com');
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await page.waitForURL(/\/owner\/dashboard/, { timeout: 20_000 });
    await page.goto('/owner/leads');
    await expect(page.getByText(/Rahul Kumar|Priya Sundaram|Aditya Reddy/).first()).toBeVisible({ timeout: 20_000 });
  });

  test('wrong password is rejected by the server', async ({ page }) => {
    const dialog = await loginViaModal(page, 'tenant', 'tenant@nestin.com', 'definitely-wrong-1');
    await expect(dialog.getByText(/invalid email or password/i)).toBeVisible({ timeout: 15_000 });
  });

  test('protected owner route blocks anonymous users', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await expect(page.getByText(/Access Restricted/i)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Go-to-market surfaces', () => {
  test('landing stats and city cards show live numbers, never seed figures', async ({ page, request }) => {
    const stats = (await (await request.get('/api/v1/public/stats')).json()).data;
    await page.goto('/');
    const section = page.getByLabel('Platform statistics');
    await expect(section).toContainText('Verified stays');
    await section.scrollIntoViewIfNeeded(); // counters animate once in view
    await expect(section).toContainText(Number(stats.verifiedListings).toLocaleString('en-IN'), { timeout: 15_000 });
    await expect(page.getByText(/15,000\+|2L\+ Happy/)).toHaveCount(0);
    await page.goto('/cities');
    await expect(page.getByText(/\d+ properties|Launching soon/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/2,000\+ properties/)).toHaveCount(0);
  });

  test('pricing section and legal pages render', async ({ page }) => {
    await page.goto('/for-owners');
    await expect(page.getByRole('heading', { name: /Start free/ })).toBeVisible();
    await expect(page.getByText('₹799').first()).toBeVisible(); // yearly is the default
    await page.getByRole('button', { name: 'Monthly', exact: true }).click();
    await expect(page.getByText('₹999').first()).toBeVisible();
    for (const [path, heading] of [
      ['/terms', 'Terms of Service'],
      ['/privacy', 'Privacy Policy'],
      ['/refund-policy', 'Refund & Cancellation Policy'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    }
    const manifest = await page.request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBeTruthy();
  });

  test('owner sees their subscription and usage; simulated upgrade activates the plan', async ({ page }) => {
    const dialog = await loginViaModal(page, 'owner', 'owner@nestin.com');
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await page.goto('/owner/subscription');
    await expect(page.getByRole('heading', { name: 'Subscription & Billing' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Current plan')).toBeVisible();
    await expect(page.getByText(/Properties/).first()).toBeVisible();
    await page
      .getByTestId('plan-card-business')
      .getByRole('button', { name: /Upgrade|Switch|Renew|Activate now/ })
      .click();
    await expect(page.getByText(/Business plan is now active|Business plan active/).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/SUB-\d{4}-\d{2}-\d{6}/).first()).toBeVisible();
  });

  test('admin verification requires the checklist; billing and ops tabs load', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder('admin@nestin.io').fill('admin@nestin.io');
    await page.locator('input[type="password"]').fill('Admin@NestIn2026');
    await page.getByPlaceholder('NESTIN-SUPER-ADMIN-2026').fill('NESTIN-SUPER-ADMIN-2026');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname.startsWith('/admin') && !url.pathname.includes('login'), {
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /All Properties/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /All Properties/ }).click();
    // Pick a listing that is not yet verified, so granting the badge requires the checklist.
    const unverifiedRow = page
      .locator('tr')
      .filter({ hasNot: page.getByText('Verified') })
      .filter({ has: page.getByRole('button', { name: 'Audit' }) })
      .first();
    await unverifiedRow.getByRole('button', { name: 'Audit' }).click();
    await expect(page.getByText('Verification checklist')).toBeVisible();
    await page.getByRole('button', { name: /Verify & Publish Live/ }).click();
    await expect(page.getByRole('alert')).toContainText(/checklist/i);
    await page.keyboard.press('Escape');
    await expect(page.getByText('Verification checklist')).toBeHidden();
    await page.getByRole('button', { name: 'Billing' }).click();
    await expect(page.getByText('MRR')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Operations' }).click();
    await expect(page.getByText('Backup history')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Hardening guards', () => {
  test('no Content-Security-Policy violations or console errors on the main surfaces', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') problems.push(msg.text());
    });
    page.on('pageerror', (err) => problems.push(err.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/find-pg?city=Hyderabad');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/terms');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Signing in exercises the API, contexts and (for admins) the dashboards that used to 403.
    await loginViaModal(page, 'owner', 'owner@nestin.com');
    await expect(page).toHaveURL(/\/owner/);

    const csp = problems.filter((p) => /Content Security Policy|Refused to/i.test(p));
    expect(csp, csp.join('\n')).toEqual([]);
    const fatal = problems.filter((p) => !/favicon|third-party cookie|net::ERR_/.test(p));
    expect(fatal, fatal.join('\n')).toEqual([]);
  });

  test('super admin console loads without owner-scoped 403 errors', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() === 403) failed.push(res.url());
    });
    await page.goto('/admin/login');
    await page.getByPlaceholder('admin@nestin.io').fill('admin@nestin.io');
    await page.locator('input[type="password"]').fill('Admin@NestIn2026');
    await page.getByPlaceholder('NESTIN-SUPER-ADMIN-2026').fill('NESTIN-SUPER-ADMIN-2026');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname.startsWith('/admin') && !url.pathname.includes('login'), {
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /All Properties/ })).toBeVisible({ timeout: 20_000 });
    expect(failed, failed.join('\n')).toEqual([]);
  });
});
