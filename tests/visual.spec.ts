import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Regression', () => {
  test('should match desktop homepage visual snapshot', async ({ page }) => {
    // Set desktop viewport size
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to homepage
    await page.goto('/');

    // Wait for main hero section and network idle to ensure assets are rendered
    await page.waitForSelector('h1');
    await page.waitForLoadState('networkidle');

    // Capture visual snapshot of full page or viewport
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('should match mobile homepage visual snapshot', async ({ page }) => {
    // Set mobile viewport size
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to homepage
    await page.goto('/');

    // Wait for page layout to stabilize
    await page.waitForSelector('h1');
    await page.waitForLoadState('networkidle');

    // Capture visual snapshot for mobile breakpoint
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
