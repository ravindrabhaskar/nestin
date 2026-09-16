import { test, expect } from '@playwright/test';

test.describe('Owner Modals & Navigation E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Should navigate to For Owners page from Navbar', async ({ page }) => {
    const forOwnersLink = page.getByRole('button', { name: 'For Owners' }).first();
    await forOwnersLink.click();

    await expect(page).toHaveURL(/\/for-owners/);
    await expect(page.getByRole('heading', { name: 'Run your PG business' })).toBeVisible();
  });

  test('2. Should trigger Owner Authentication modal from For Owners hero button', async ({ page }) => {
    await page.goto('/for-owners');

    const signupBtn = page.getByRole('button', { name: 'Sign up as owner' }).first();
    await signupBtn.click();

    // Verify auth modal opens with form inputs
    const modalInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
    await expect(modalInput).toBeVisible({ timeout: 5000 });
  });
});
