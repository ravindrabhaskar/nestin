import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Route crawl: every page of the app, signed out and as each role, on desktop and phone widths.
 * For each page it records console errors, page errors, failed same-origin requests, horizontal
 * overflow, missing <h1>, and broken internal links. Findings are aggregated so one run reports
 * everything, then asserted empty.
 */

const PASSWORD = 'NestIn@2026';
const PUBLIC_ROUTES = [
  '/',
  '/find-pg',
  '/find-pg?city=Bengaluru&view=map',
  '/cities',
  '/cities/hyderabad',
  '/for-owners',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/refund-policy',
  '/reset-password?token=bogus',
  '/verify-email?token=bogus',
  '/this-route-does-not-exist',
  '/property/does-not-exist',
];
const TENANT_ROUTES = [
  '/my-bookings',
  '/payments',
  '/documents',
  '/support',
  '/saved',
  '/my-profile',
  '/settings',
  '/settings/security',
  '/settings/notifications',
  '/settings/preferences',
  '/settings/privacy',
];
const OWNER_ROUTES = [
  '/owner/dashboard',
  '/owner/properties',
  '/owner/leads',
  '/owner/visitors',
  '/owner/bookings',
  '/owner/customers',
  '/owner/reports',
  '/owner/analytics',
  '/owner/employees',
  '/owner/roles',
  '/owner/notifications',
  '/owner/subscription',
  '/owner/support',
];
const ADMIN_ROUTES = ['/admin'];

type Problem = { route: string; kind: string; detail: string };

const IGNORED_CONSOLE = [
  /favicon/i,
  /third-party cookie/i,
  /net::ERR_(ABORTED|FAILED)/,
  /Download the React DevTools/,
  /\[vite\]/,
  /HMR/,
  /WebSocket/,
  /basemaps\.cartocdn\.com/,
  /tile/i,
];

async function loginApi(context: BrowserContext, page: Page, email: string, password = PASSWORD, admin = false) {
  const res = await context.request.post(admin ? '/api/v1/auth/admin/login' : '/api/v1/auth/login', {
    data: admin ? { email, password, accessCode: 'NESTIN-SUPER-ADMIN-2026' } : { email, password },
  });
  const body = await res.json();
  expect(body.success, JSON.stringify(body)).toBeTruthy();
  await page.goto('/');
  await page.evaluate((token) => localStorage.setItem('nestin_auth_token', token), body.data.token);
}

async function crawl(page: Page, routes: string[], label: string): Promise<Problem[]> {
  const problems: Problem[] = [];
  let current = '';
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    // Routes that deliberately target missing resources produce an expected 4xx network log line.
    if (/Failed to load resource.*(404|400)/.test(text) && /does-not-exist|bogus/.test(current)) return;
    problems.push({ route: current, kind: 'console', detail: text.slice(0, 300) });
  });
  page.on('pageerror', (err) =>
    problems.push({ route: current, kind: 'pageerror', detail: err.message.slice(0, 300) })
  );
  page.on('response', (res) => {
    const url = res.url();
    if (!url.startsWith(page.url().split('/').slice(0, 3).join('/')) && !url.includes('localhost')) return;
    if (res.status() >= 500) problems.push({ route: current, kind: 'http-5xx', detail: `${res.status()} ${url}` });
    if (
      res.status() === 404 &&
      !/does-not-exist|bogus|sw\.js/.test(url) &&
      !/\/api\/v1\/properties\/public\//.test(url)
    )
      problems.push({ route: current, kind: 'http-404', detail: url });
  });

  const viewport = page.viewportSize()!;
  for (const route of routes) {
    current = `${label} ${viewport.width}px ${route}`;
    await page
      .goto(route, { waitUntil: 'networkidle' })
      .catch((e) => problems.push({ route: current, kind: 'navigation', detail: String(e).slice(0, 200) }));
    await page.waitForTimeout(400);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (overflow > 2)
      problems.push({ route: current, kind: 'horizontal-overflow', detail: `${overflow}px wider than viewport` });

    const h1s = await page.locator('h1:visible').count();
    if (h1s === 0 && !route.startsWith('/admin'))
      problems.push({ route: current, kind: 'a11y', detail: 'no visible <h1>' });

    const brokenImgs = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => img.complete && img.naturalWidth === 0 && img.src && !img.loading)
        .map((img) => img.src)
        .slice(0, 5)
    );
    for (const src of brokenImgs)
      if (!/unsplash|cartocdn/.test(src)) problems.push({ route: current, kind: 'broken-image', detail: src });

    const unlabeled = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input:not([type=hidden]), select, textarea'))
        .filter((el) => {
          const e = el as HTMLInputElement;
          if (e.type === 'submit' || e.type === 'button' || e.type === 'checkbox' || e.type === 'radio') return false;
          const id = e.id;
          return !(
            e.getAttribute('aria-label') ||
            e.getAttribute('aria-labelledby') ||
            e.placeholder ||
            e.title ||
            (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
            e.closest('label')
          );
        })
        .map((e) => (e as HTMLElement).outerHTML.slice(0, 120))
        .slice(0, 3)
    );
    for (const u of unlabeled) problems.push({ route: current, kind: 'a11y', detail: `unlabeled form control ${u}` });
  }
  return problems;
}

async function checkInternalLinks(page: Page): Promise<Problem[]> {
  const problems: Problem[] = [];
  const hrefs = new Set<string>();
  for (const route of ['/', '/for-owners', '/about', '/contact', '/cities', '/find-pg']) {
    await page.goto(route, { waitUntil: 'networkidle' });
    for (const h of await page
      .locator('a[href^="/"]')
      .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''))) {
      if (h && !h.startsWith('/#') && !h.startsWith('/api/')) hrefs.add(h.split('#')[0]);
    }
  }
  for (const href of hrefs) {
    await page.goto(href, { waitUntil: 'domcontentloaded' });
    const notFound = await page
      .getByText(/page not found|404/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (notFound) problems.push({ route: href, kind: 'broken-link', detail: 'internal link lands on the 404 page' });
  }
  return problems;
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 375, height: 667 },
]) {
  test.describe(`crawl @ ${viewport.width}px`, () => {
    test.use({ viewport });

    test('public routes', async ({ page }) => {
      const problems = await crawl(page, PUBLIC_ROUTES, 'anon');
      expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
    });

    test('tenant routes', async ({ page, context }) => {
      await loginApi(context, page, 'tenant@nestin.com');
      const problems = await crawl(page, TENANT_ROUTES, 'tenant');
      expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
    });

    test('owner routes', async ({ page, context }) => {
      await loginApi(context, page, 'owner@nestin.com');
      const problems = await crawl(page, OWNER_ROUTES, 'owner');
      expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
    });

    test('staff routes', async ({ page, context }) => {
      await loginApi(context, page, 'staff@nestin.com');
      const problems = await crawl(page, OWNER_ROUTES, 'staff');
      expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
    });

    test('admin routes', async ({ page, context }) => {
      await loginApi(context, page, 'admin@nestin.io', 'Admin@NestIn2026', true);
      const problems = await crawl(page, ADMIN_ROUTES, 'admin');
      expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
    });
  });
}

test('every internal link on the marketing pages resolves', async ({ page }) => {
  const problems = await checkInternalLinks(page);
  expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
});
