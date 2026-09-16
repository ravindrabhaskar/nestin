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
    await expect(page.getByText(/NST-\d{6}/)).toBeVisible();
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
