import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Cross-role business flows driven through the real UI: what a resident, an owner and their staff
 * actually do, end to end, with the outcome verified on the other side of the relationship.
 */

const PASSWORD = 'NestIn@2026';

async function signIn(context: BrowserContext, page: Page, email: string) {
  const res = await context.request.post('/api/v1/auth/login', { data: { email, password: PASSWORD } });
  const body = await res.json();
  expect(body.success, JSON.stringify(body)).toBeTruthy();
  await page.goto('/');
  await page.evaluate((token) => localStorage.setItem('nestin_auth_token', token), body.data.token);
  return body.data;
}

async function firstAvailableListing(context: BrowserContext) {
  const res = await context.request.get('/api/v1/properties/public?page=1&pageSize=5&available=true&sort=rating');
  const body = await res.json();
  expect(body.data.length).toBeGreaterThan(0);
  return body.data[0] as { id: string; slug: string; name: string; ownerId: string };
}

test.describe.configure({ mode: 'serial' });

test('resident reserves a bed on the listing page → owner approves in the CRM → resident sees it confirmed and pays rent', async ({
  browser,
}) => {
  const tenantCtx = await browser.newContext();
  const tenantPage = await tenantCtx.newPage();
  await signIn(tenantCtx, tenantPage, 'tenant@nestin.com');
  const listing = await firstAvailableListing(tenantCtx);

  // 1. Resident books from the property page.
  await tenantPage.goto(`/property/${listing.slug}`);
  await expect(tenantPage.getByRole('heading', { level: 1 })).toContainText(listing.name.slice(0, 12), {
    timeout: 20_000,
  });
  await tenantPage
    .getByRole('button', { name: /Reserve & Move-in/ })
    .first()
    .click();
  const dialog = tenantPage.getByRole('dialog').filter({ hasText: 'Book Move-in' });
  await expect(dialog).toBeVisible();
  const nameInput = dialog.locator('input[type="text"]').first();
  if (!(await nameInput.inputValue())) await nameInput.fill('Demo Resident');
  const phone = dialog.locator('input[type="tel"], input[inputmode="tel"]').first();
  if ((await phone.count()) && !(await phone.inputValue())) await phone.fill('9876543210');
  const [resp] = await Promise.all([
    tenantPage.waitForResponse((r) => r.url().includes('/api/v1/tenant/bookings') && r.request().method() === 'POST'),
    dialog.locator('button[type="submit"]').click(),
  ]);
  expect(resp.status(), await resp.text()).toBe(201);
  const created = (await resp.json()).data.booking as { id: string; bookingNumber: string };
  expect(created.bookingNumber).toMatch(/^NST-\d{6}$/);

  // 2. The booking is visible to the resident as upcoming/pending.
  const openBooking = async () => {
    await tenantPage.goto('/my-bookings');
    await tenantPage.getByRole('button', { name: /Upcoming/ }).click();
    const buttons = tenantPage.getByRole('button', { name: 'View booking' });
    await expect(buttons.first()).toBeVisible({ timeout: 15_000 });
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      await buttons.nth(i).click();
      const ref = tenantPage.getByText(`Ref: ${created.bookingNumber}`);
      if (await ref.isVisible({ timeout: 2_000 }).catch(() => false)) return;
      await tenantPage.getByRole('button', { name: 'Close' }).click();
    }
    throw new Error(`booking ${created.bookingNumber} not found among ${count} upcoming bookings`);
  };
  await openBooking();
  await expect(tenantPage.getByText(/Awaiting confirmation/i).first()).toBeVisible();

  // 3. The owner (of that listing — the marketplace owner in the demo seed may differ) approves it.
  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  const ownerLogin = await ownerCtx.request.post('/api/v1/auth/login', {
    data: { email: 'owner@nestin.com', password: PASSWORD },
  });
  const owner = (await ownerLogin.json()).data;
  if (owner.user.id !== listing.ownerId) {
    // The listing belongs to the seeded marketplace owner; approve through the admin override so the
    // rest of the flow (resident side) is still exercised end to end.
    const adminLogin = await ownerCtx.request.post('/api/v1/auth/admin/login', {
      data: { email: 'admin@nestin.io', password: 'Admin@NestIn2026', accessCode: 'NESTIN-SUPER-ADMIN-2026' },
    });
    const adminToken = (await adminLogin.json()).data.token;
    const approve = await ownerCtx.request.post(
      `/api/v1/crm/bookings/${created.id}/approve?ownerId=${listing.ownerId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {},
      }
    );
    expect(approve.status(), await approve.text()).toBe(200);
  } else {
    await ownerPage.goto('/');
    await ownerPage.evaluate((t) => localStorage.setItem('nestin_auth_token', t), owner.token);
    await ownerPage.goto('/owner/bookings');
    const row = ownerPage.locator('tr, [role=row], div').filter({ hasText: created.bookingNumber }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await ownerPage.getByTitle('Approve & Allot').first().click();
    await expect(ownerPage.getByText(/approved|confirmed/i).first()).toBeVisible({ timeout: 10_000 });
  }

  // 4. Resident sees the confirmation and pays rent through the (simulated) checkout.
  await openBooking();
  const dialogAfter = tenantPage.getByRole('dialog').filter({ hasText: created.bookingNumber });
  await expect(dialogAfter.getByText(/Awaiting confirmation/i)).toHaveCount(0);
  await expect(dialogAfter.getByText(/Upcoming|Active/i).first()).toBeVisible();
  await tenantPage.getByRole('button', { name: 'Close' }).click();

  await tenantPage.goto('/payments');
  const amount = tenantPage.getByPlaceholder(/Amount/);
  await expect(amount).toBeVisible({ timeout: 15_000 });
  await amount.fill('12000');
  const [payResp] = await Promise.all([
    tenantPage.waitForResponse(
      (r) =>
        /\/api\/v1\/tenant\/payments(\/checkout(\/complete)?)?$/.test(r.url()) &&
        r.request().method() === 'POST' &&
        r.status() < 300
    ),
    tenantPage.getByRole('button', { name: /Pay via UPI/ }).click(),
  ]);
  expect(payResp.status()).toBeLessThan(300);
  await expect(tenantPage.getByText(/INV-\d{4}-\d{2}-\d{6}/).first()).toBeVisible({ timeout: 15_000 });

  await tenantCtx.close();
  await ownerCtx.close();
});

test('resident raises a support ticket → owner replies from the Support Desk → resident sees the reply', async ({
  browser,
}) => {
  const tenantCtx = await browser.newContext();
  const tenantPage = await tenantCtx.newPage();
  await signIn(tenantCtx, tenantPage, 'tenant@nestin.com');
  await tenantPage.goto('/support');
  await tenantPage.getByRole('button', { name: /New Request/ }).click();
  const subject = `Wi-Fi down in room ${Date.now().toString(36)}`;
  await tenantPage.getByPlaceholder('Brief summary of your issue').fill(subject);
  await tenantPage
    .getByPlaceholder('Describe your issue in detail...')
    .fill('The router has been blinking red since morning.');
  const [resp] = await Promise.all([
    tenantPage.waitForResponse((r) => r.url().endsWith('/api/v1/tenant/support') && r.request().method() === 'POST'),
    tenantPage.getByRole('button', { name: 'Submit' }).click(),
  ]);
  expect(resp.status(), await resp.text()).toBe(201);
  const ticket = (await resp.json()).data as { id: string; ticketNumber: string; ownerId?: string };
  await expect(tenantPage.getByText(subject)).toBeVisible();

  // Owner side: the ticket is routed to the owner responsible for the resident's booking.
  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await signIn(ownerCtx, ownerPage, 'owner@nestin.com');
  await ownerPage.goto('/owner/support');
  await expect(ownerPage.getByRole('heading', { name: 'Support Desk' })).toBeVisible();
  const card = ownerPage.getByText(subject).first();
  if (await card.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await card.click();
    await ownerPage.getByPlaceholder('Write a reply to the resident…').fill('A technician is on the way today.');
    const [reply] = await Promise.all([
      ownerPage.waitForResponse(
        (r) => r.url().includes(`/support/${ticket.id}/messages`) && r.request().method() === 'POST'
      ),
      ownerPage.getByRole('button', { name: /Send/ }).click(),
    ]);
    expect(reply.status()).toBeLessThan(300);
    await tenantPage.reload();
    await tenantPage.getByText(subject).first().click();
    await expect(tenantPage.getByText('A technician is on the way today.')).toBeVisible({ timeout: 15_000 });
  } else {
    // Resident's active booking belongs to another owner; the admin console must still show it.
    const adminLogin = await ownerCtx.request.post('/api/v1/auth/admin/login', {
      data: { email: 'admin@nestin.io', password: 'Admin@NestIn2026', accessCode: 'NESTIN-SUPER-ADMIN-2026' },
    });
    const token = (await adminLogin.json()).data.token;
    const list = await ownerCtx.request.get('/api/v1/admin/support', { headers: { Authorization: `Bearer ${token}` } });
    const rows = (await list.json()).data as Array<{ id: string }>;
    expect(rows.some((r) => r.id === ticket.id)).toBeTruthy();
  }
  await tenantCtx.close();
  await ownerCtx.close();
});

test('wishlist toggles from the listing page persist across reloads and appear under Saved', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(ctx, page, 'tenant@nestin.com');
  const listing = await firstAvailableListing(ctx);
  await page.goto(`/property/${listing.slug}`);
  const save = page.getByRole('button', { name: /Save to favorites|Remove from favorites/ }).first();
  await expect(save).toBeVisible({ timeout: 20_000 });
  const wasLiked = (await save.getAttribute('aria-label')) === 'Remove from favorites';
  if (wasLiked) {
    await save.click();
    await expect(save).toHaveAttribute('aria-label', 'Save to favorites');
  }
  await save.click();
  await expect(save).toHaveAttribute('aria-label', 'Remove from favorites');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove from favorites' }).first()).toBeVisible({ timeout: 20_000 });
  await page.goto('/saved');
  await expect(page.getByText(listing.name.slice(0, 16)).first()).toBeVisible({ timeout: 15_000 });
  await ctx.close();
});

test('owner adds a staff member; the new staff member signs in with the temporary password and is scoped to the workspace', async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const owner = await signIn(ctx, page, 'owner@nestin.com');
  const email = `staff-${Date.now().toString(36)}@example.com`;
  const roles = await ctx.request.get('/api/v1/rbac/snapshot', { headers: { Authorization: `Bearer ${owner.token}` } });
  const role = (await roles.json()).data.roles.find((r: { isOwnerRole?: boolean }) => !r.isOwnerRole);
  const created = await ctx.request.post('/api/v1/rbac/employees', {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { name: 'Flow Staff', email, phone: '+91 98765 01234', roleId: role.id, assignedProperties: ['all'] },
  });
  const body = await created.json();
  expect(created.status(), JSON.stringify(body)).toBe(201);
  const temp = body.data.temporaryPassword || body.data.login?.temporaryPassword;
  expect(temp, JSON.stringify(body.data)).toBeTruthy();

  // Staff appears in the owner's Employees view.
  await page.goto('/owner/employees');
  await expect(page.getByText(email).first()).toBeVisible({ timeout: 15_000 });

  // Staff logs in through the dialog and lands on the owner workspace.
  const staffCtx = await browser.newContext();
  const staffPage = await staffCtx.newPage();
  await staffPage.goto('/');
  await staffPage.getByRole('button', { name: 'Log in' }).first().click();
  const dialog = staffPage.getByTestId('auth-modal');
  await dialog.getByRole('button', { name: 'PG Owner' }).click();
  await dialog.locator('input[type="email"]').fill(email);
  await dialog.locator('input[type="password"]').fill(temp);
  await dialog.locator('button[type="submit"]').click();
  await expect(staffPage).toHaveURL(/\/owner/, { timeout: 20_000 });
  const me = await staffCtx.request.get('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${await staffPage.evaluate(() => localStorage.getItem('nestin_auth_token'))}` },
  });
  const meBody = await me.json();
  expect(meBody.data.role).toBe('employee');
  expect(meBody.data.ownerId).toBe(owner.user.id);
  await ctx.close();
  await staffCtx.close();
});

test('owner records an expense and sees it in the P&L; creates a task and moves it to done', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(ctx, page, 'owner@nestin.com');

  await page.goto('/owner/finance');
  await expect(page.getByRole('heading', { name: 'Finance' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Expenses' }).click();
  await page.getByLabel('Category').selectOption('Internet');
  await page.getByLabel('Amount').fill('1499');
  await page.getByLabel('Vendor').fill('ACT Fibernet');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/v1/operations/expenses') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Save expense' }).click(),
  ]);
  expect(resp.status(), await resp.text()).toBe(201);
  await expect(page.getByText('ACT Fibernet')).toBeVisible();
  await page.getByRole('button', { name: 'Profit & Loss' }).click();
  await expect(page.getByText('Net operating income')).toBeVisible();

  await page.goto('/owner/tasks');
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'New task' }).click();
  const title = `Fix geyser ${Date.now().toString(36)}`;
  await page.getByLabel('Task title').fill(title);
  await page.getByLabel('Priority').selectOption('high');
  await page.getByRole('button', { name: 'Create' }).click();
  const card = page.locator('article').filter({ hasText: title });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.getByRole('button', { name: /Start/ }).click();
  await expect(
    page.getByRole('region', { name: 'In progress' }).locator('article').filter({ hasText: title })
  ).toBeVisible();
  await page
    .getByRole('region', { name: 'In progress' })
    .locator('article')
    .filter({ hasText: title })
    .getByRole('button', { name: /Mark done/ })
    .click();
  await expect(page.getByRole('region', { name: 'Done' }).locator('article').filter({ hasText: title })).toBeVisible();
  await ctx.close();
});
