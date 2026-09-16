import { test, expect } from '@playwright/test';

test.describe("Nestin 'For Owners' Page - End-to-End Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/for-owners');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Hero Section - Renders headline, value prop, and call-to-action buttons', async ({ page }) => {
    // Check main headline
    const headline = page.locator('h1');
    await expect(headline).toContainText('Run your PG business');
    await expect(headline).toContainText('like a brand.');

    // Check CTAs visibility
    const signupBtn = page.getByRole('button', { name: 'Sign up as owner' }).first();
    const loginBtn = page.getByRole('button', { name: 'Owner login' }).first();
    const demoBtn = page.getByRole('button', { name: 'Request a demo' }).first();

    await expect(signupBtn).toBeVisible();
    await expect(loginBtn).toBeVisible();
    await expect(demoBtn).toBeVisible();
  });

  test('2. Feature Grid - Displays all 6 owner core capabilities', async ({ page }) => {
    const featureHeading = page.getByRole('heading', { name: 'Everything an owner needs' });
    await expect(featureHeading).toBeVisible();

    const expectedFeatures = [
      'Properties & vacancies',
      'Lead inbox',
      'Payments & invoices',
      'Team & permissions',
      'Analytics & reports',
      'Verified demand',
    ];

    for (const title of expectedFeatures) {
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }
  });

  test('3. Pricing Matrix - Handles Monthly, Quarterly, and Yearly billing toggles', async ({ page }) => {
    const pricingHeading = page.getByRole('heading', { name: 'Simple owner pricing' });
    await expect(pricingHeading).toBeVisible();

    // Default: Monthly prices ₹999, ₹2,999, ₹8,999
    await expect(page.getByText('₹999')).toBeVisible();
    await expect(page.getByText('₹2,999')).toBeVisible();
    await expect(page.getByText('₹8,999')).toBeVisible();

    // Switch to Quarterly (10% discount): ₹899, ₹2,699, ₹8,099
    const quarterlyBtn = page.getByRole('button', { name: /Quarterly/i });
    await quarterlyBtn.click();
    await expect(page.getByText('₹899')).toBeVisible();
    await expect(page.getByText('₹2,699')).toBeVisible();

    // Switch to Yearly (20% discount): ₹799, ₹2,399, ₹7,199
    const yearlyBtn = page.getByRole('button', { name: /Yearly/i });
    await yearlyBtn.click();
    await expect(page.getByText('₹799')).toBeVisible();
    await expect(page.getByText('₹2,399')).toBeVisible();
  });

  test('4. Testimonials Section - Displays customer reviews and ratings', async ({ page }) => {
    await expect(page.getByText('Ramesh Iyer')).toBeVisible();
    await expect(page.getByText('Farah Shaikh')).toBeVisible();
    await expect(page.getByText('Vikram Desai')).toBeVisible();
  });

  test('5. Signup Modal Interaction Flow - Opens, toggles tabs, fills multi-step registration, and closes', async ({ page }) => {
    // Click "Sign up as owner" CTA
    const signupCta = page.getByRole('button', { name: 'Sign up as owner' }).first();
    await signupCta.click();

    // Verify modal heading
    await expect(page.getByRole('heading', { name: 'Partner With NestIn' })).toBeVisible();

    // Fill Step 1: Owner Contact Details
    await page.fill('input[placeholder="e.g. Rajesh Kumar"]', 'Anand Verma');
    await page.fill('input[placeholder="rajesh@starlaystais.com"]', 'anand.verma@pgowners.in');
    await page.fill('input[placeholder="9876543210"]', '9812345678');

    // Click "Next: Property & Password"
    const nextBtn = page.getByRole('button', { name: /Next: Property/i });
    await nextBtn.click();

    // Verify Step 2 inputs are visible
    const passwordInput = page.locator('input[placeholder="At least 8 chars"]');
    await expect(passwordInput).toBeVisible();

    // Fill Step 2 details
    await passwordInput.fill('SecurePassword123!');
    await page.fill('input[placeholder="Re-enter password"]', 'SecurePassword123!');

    // Select city
    await page.selectOption('select:has-text("Bengaluru")', 'Hyderabad');

    // Switch tabs to Owner Login inside modal
    const loginTabBtn = page.locator('button:has-text("Owner Login")').last();
    await loginTabBtn.click();
    await expect(page.getByRole('heading', { name: 'Owner Portal Login' })).toBeVisible();

    // Close modal via Close (X) button
    const closeBtn = page.getByRole('button', { name: 'Close modal' });
    await closeBtn.click();
    await expect(page.getByRole('heading', { name: 'Owner Portal Login' })).toBeHidden();
  });

  test('6. Demo Request Submission Flow - Fills form and verifies confirmation alert', async ({ page }) => {
    // Scroll to demo section
    const demoSection = page.locator('#request-demo-section');
    await demoSection.scrollIntoViewIfNeeded();

    const inputs = page.locator('#request-demo-section form input');
    await inputs.nth(0).fill('Verma Luxury Stays'); // Full / Business name
    await inputs.nth(1).fill('9876543210'); // Mobile number
    await inputs.nth(2).fill('4'); // Number of properties

    // Click submit
    const submitBtn = page.getByRole('button', { name: 'Book my demo' });
    await submitBtn.click();

    // Verify confirmation message
    await expect(page.getByText('Demo Requested Successfully!')).toBeVisible({ timeout: 5000 });
  });
});
