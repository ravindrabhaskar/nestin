import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.METRICS_TOKEN = 'metrics-token-for-tests';

import { startTestServer, client, login, adminLogin, DEMO } from './helpers.js';

/**
 * Regression guards for the 19 Sep 2026 hardening pass. Each test pins one behaviour that was
 * found broken or unguarded in the audit, so a future change cannot silently reintroduce it.
 */
describe('hardening: production guards, billing correctness, headers, push and serials', () => {
  let baseUrl = '';
  let origin = '';
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;
  let admin = '';

  before(async () => {
    const server = await startTestServer();
    baseUrl = server.baseUrl;
    origin = baseUrl.replace(/\/api\/v1$/, '');
    close = server.close;
    api = client(baseUrl);
    admin = await adminLogin(api);
  });
  after(async () => close());

  const registerOwner = async (suffix: string) => {
    const res = await api.post('/auth/register', {
      email: `owner-${suffix}@example.com`,
      password: 'Owner@Pass2026',
      fullName: `Owner ${suffix}`,
      role: 'owner',
    });
    assert.equal(res.status, 201, res.error?.message);
    return { token: res.data.token as string, id: res.data.user.id as string };
  };

  test('production refuses to start with demo data on the default password, no gateway, or no metrics token', async () => {
    const { assertProductionConfig, config } = await import('../../server/config.js');
    const prod = (overrides: Record<string, unknown>) =>
      ({
        ...config,
        isProduction: true,
        superAdmin: { ...config.superAdmin, password: 'x', accessCode: 'y' },
        razorpay: { keyId: 'k', keySecret: 's', webhookSecret: 'w', enabled: true },
        seedDemoData: false,
        allowSimulatedPayments: false,
        ...overrides,
      }) as typeof config;

    const savedToken = process.env.METRICS_TOKEN;
    process.env.METRICS_TOKEN = 'set';
    try {
      assert.doesNotThrow(() => assertProductionConfig(prod({})));
      assert.throws(
        () => assertProductionConfig(prod({ seedDemoData: true, demoPassword: 'NestIn@2026' })),
        /DEMO_PASSWORD/
      );
      assert.throws(
        () =>
          assertProductionConfig(prod({ razorpay: { keyId: '', keySecret: '', webhookSecret: '', enabled: false } })),
        /RAZORPAY_KEY_ID/
      );
      assert.throws(
        () =>
          assertProductionConfig(prod({ razorpay: { keyId: 'k', keySecret: 's', webhookSecret: '', enabled: true } })),
        /RAZORPAY_WEBHOOK_SECRET/
      );
      assert.throws(
        () => assertProductionConfig(prod({ superAdmin: { email: 'a', password: '', accessCode: '' } })),
        /SUPER_ADMIN/
      );
      delete process.env.METRICS_TOKEN;
      assert.throws(() => assertProductionConfig(prod({})), /METRICS_TOKEN/);
      // Staging escape hatch: simulated payments are allowed only with the explicit flag.
      process.env.METRICS_TOKEN = 'set';
      assert.doesNotThrow(() =>
        assertProductionConfig(
          prod({
            razorpay: { keyId: '', keySecret: '', webhookSecret: '', enabled: false },
            allowSimulatedPayments: true,
          })
        )
      );
    } finally {
      process.env.METRICS_TOKEN = savedToken;
    }
  });

  test('checkout endpoints answer 503 when neither a gateway nor simulation is available', async () => {
    const { config } = await import('../../server/config.js');
    const owner = await registerOwner('nogateway');
    const tenant = await login(api, DEMO.tenant);
    (config as { allowSimulatedPayments: boolean }).allowSimulatedPayments = false;
    try {
      const sub = await api.post('/billing/checkout', { plan: 'professional' }, owner.token);
      assert.equal(sub.status, 503);
      assert.equal(sub.error?.code, 'PAYMENTS_UNAVAILABLE');
      const rent = await api.post('/tenant/payments/checkout', { amount: 1000, type: 'Rent' }, tenant);
      assert.equal(rent.status, 503);
      const legacy = await api.post('/tenant/payments', { amount: 1000, type: 'Rent' }, tenant);
      assert.equal(legacy.status, 503);
    } finally {
      (config as { allowSimulatedPayments: boolean }).allowSimulatedPayments = true;
    }
  });

  test('only the workspace owner can complete a subscription checkout', async () => {
    const owner = await login(api, DEMO.owner);
    const staff = await login(api, DEMO.staff);
    const checkout = await api.post('/billing/checkout', { plan: 'professional' }, owner);
    assert.equal(checkout.status, 201, checkout.error?.message);
    const byStaff = await api.post('/billing/checkout/complete', { invoiceId: checkout.data.invoiceId }, staff);
    assert.equal(byStaff.status, 403);
    const byOwner = await api.post('/billing/checkout/complete', { invoiceId: checkout.data.invoiceId }, owner);
    assert.equal(byOwner.status, 200, byOwner.error?.message);
  });

  test('invoice, booking and ticket numbers are sequential and never collide', async () => {
    const { invoiceNumber, bookingNumber, ticketNumber } = await import('../../server/lib/ids.js');
    const fy = new Date('2026-09-19');
    const a = invoiceNumber('TST', fy);
    const b = invoiceNumber('TST', fy);
    assert.match(a, /^TST-2026-27-\d{6}$/);
    assert.equal(Number(b.slice(-6)), Number(a.slice(-6)) + 1);
    // Financial year rolls over in April, not January.
    assert.match(invoiceNumber('TST', new Date('2027-02-01')), /^TST-2026-27-/);
    assert.match(invoiceNumber('TST', new Date('2027-04-01')), /^TST-2027-28-000001$/);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(bookingNumber());
      seen.add(ticketNumber());
    }
    assert.equal(seen.size, 400);
  });

  test('MRR counts an annual plan as one twelfth per month', async () => {
    const owner = await registerOwner('mrr');
    await api.put(`/admin/billing/${owner.id}`, { plan: 'starter' }, admin);
    const before = (await api.get('/admin/billing', admin)).data.stats.mrr as number;
    const checkout = await api.post('/billing/checkout', { plan: 'business', interval: 'yearly' }, owner.token);
    assert.equal(checkout.status, 201, checkout.error?.message);
    await api.post('/billing/checkout/complete', { invoiceId: checkout.data.invoiceId }, owner.token);
    const { PLANS } = await import('../../src/lib/domain/plans.js');
    const after = (await api.get('/admin/billing', admin)).data.stats.mrr as number;
    assert.equal(after - before, Math.round(PLANS.business.yearlyPrice / 12));
  });

  test('a captured webhook with the wrong amount never marks a payment or invoice paid', async () => {
    const { handleRazorpayWebhook } = await import('../../server/services/tenantService.js');
    const { subscriptionInvoices, payments } = await import('../../server/db/repositories.js');

    const owner = await registerOwner('webhook');
    const checkout = await api.post('/billing/checkout', { plan: 'professional' }, owner.token);
    const invoice = subscriptionInvoices.get(checkout.data.invoiceId)!;
    invoice.gateway = 'razorpay';
    invoice.gatewayOrderId = 'order_test_sub';
    subscriptionInvoices.replace(invoice);

    const short = handleRazorpayWebhook({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_test_sub', amount: 100, currency: 'INR' } } },
    });
    assert.equal(short.handled, false);
    assert.equal(subscriptionInvoices.get(invoice.id)!.status, 'Pending');

    const exact = handleRazorpayWebhook({
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_2', order_id: 'order_test_sub', amount: invoice.amount * 100, currency: 'INR' } },
      },
    });
    assert.equal(exact.handled, true);
    assert.equal(subscriptionInvoices.get(invoice.id)!.status, 'Paid');

    // Tenant payments resolve the order through the indexed column, not a table scan.
    const tenant = await login(api, DEMO.tenant);
    const rent = await api.post('/tenant/payments/checkout', { amount: 5000, type: 'Rent' }, tenant);
    assert.equal(rent.status, 201, rent.error?.message);
    const record = payments.get(rent.data.paymentId)!;
    record.gateway = 'razorpay';
    record.gatewayOrderId = 'order_test_rent';
    payments.replace(record);
    assert.equal(payments.findOne({ gateway_order_id: 'order_test_rent' })?.id, record.id);
    const wrong = handleRazorpayWebhook({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_3', order_id: 'order_test_rent', amount: 1, currency: 'INR' } } },
    });
    assert.equal(wrong.handled, false);
    assert.equal(payments.get(record.id)!.status, 'Pending');
  });

  test('security headers and a CSP are sent on every response, not only under /api', async () => {
    const health = await fetch(`${baseUrl}/health`);
    const rootLike = await fetch(`${origin}/metrics`); // outside the API router
    for (const res of [health, rootLike]) {
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(res.headers.get('x-frame-options'), 'DENY');
      const csp = res.headers.get('content-security-policy') || '';
      assert.match(csp, /default-src 'self'/);
      assert.match(csp, /frame-ancestors 'none'/);
      assert.match(csp, /script-src 'self' https:\/\/accounts\.google\.com\/gsi\/ https:\/\/checkout\.razorpay\.com/);
      assert.match(csp, /object-src 'none'/);
    }
  });

  test('metrics token comparison rejects near-misses and prefixes', async () => {
    const ok = await fetch(`${origin}/metrics`, { headers: { Authorization: 'Bearer metrics-token-for-tests' } });
    assert.equal(ok.status, 200);
    for (const bad of ['metrics-token-for-test', 'metrics-token-for-tests-extra', '']) {
      const res = await fetch(`${origin}/metrics`, { headers: { Authorization: `Bearer ${bad}` } });
      assert.equal(res.status, 404, bad);
    }
  });

  test('a push endpoint registered by another account is taken away from them', async () => {
    const { pushSubscriptions } = await import('../../server/db/repositories.js');
    const tenant = await login(api, DEMO.tenant);
    const owner = await login(api, DEMO.owner);
    const endpoint = 'https://push.example.com/shared-device';
    const first = await api.post('/push/subscribe', { endpoint, keys: { p256dh: 'p', auth: 'a' } }, tenant);
    assert.equal(first.status, 201, first.error?.message);
    const second = await api.post('/push/subscribe', { endpoint, keys: { p256dh: 'p2', auth: 'a2' } }, owner);
    assert.equal(second.status, 201, second.error?.message);
    const rows = pushSubscriptions.list({}, { limit: 1000 }).filter((s) => s.endpoint === endpoint);
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].id, first.data.id);
    // The previous account can no longer remove it (it is not theirs any more).
    const un = await api.post('/push/unsubscribe', { endpoint }, tenant);
    assert.equal(un.data.unsubscribed, false);
  });

  test('sweep regressions: owner role immutable, past move-in refused, paise rounding, oversized upload is 413', async () => {
    const owner = await login(api, DEMO.owner);
    const tenant = await login(api, DEMO.tenant);
    const snap = await api.get('/rbac/snapshot', owner);
    const ownerRole = snap.data.roles.find((r: any) => r.isOwnerRole);
    const wipe = await api.put(`/rbac/roles/${ownerRole.id}`, { permissions: {} }, owner);
    assert.equal(wipe.status, 409);
    const after = await api.get('/rbac/snapshot', owner);
    assert.ok(Object.keys(after.data.roles.find((r: any) => r.id === ownerRole.id).permissions).length > 0);

    const list = await fetch(`${baseUrl}/properties/public?page=1&pageSize=1&available=true`).then((r) => r.json());
    const past = await api.post('/tenant/bookings', { propertyId: list.data[0].id, moveInDate: '2001-01-01' }, tenant);
    assert.equal(past.status, 400);

    const frac = await api.post('/tenant/payments/checkout', { amount: 100.999, type: 'Rent' }, tenant);
    assert.equal(frac.status, 201, frac.error?.message);
    assert.equal(frac.data.amount, 101);

    const fd = new FormData();
    fd.append('file', new Blob([new Uint8Array(11 * 1024 * 1024)], { type: 'image/png' }), 'big.png');
    fd.append('purpose', 'listing-photo');
    const big = await fetch(`${baseUrl}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenant}` },
      body: fd,
    });
    assert.equal(big.status, 413);
    const body = await big.json();
    assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
  });

  test('a pending reservation is subtracted from the advertised availability and restored on cancel', async () => {
    const tenant = await login(api, DEMO.tenant);
    const list = await fetch(`${baseUrl}/properties/public?page=1&pageSize=1&available=true&sort=newest`).then((r) =>
      r.json()
    );
    const prop = list.data[0];
    const before = (await api.get(`/properties/public/${prop.slug}`)).data.rooms.reduce(
      (n: number, r: any) => n + r.availableBedsCount,
      0
    );
    const booking = await api.post('/tenant/bookings', { propertyId: prop.id, moveInDate: '2027-01-15' }, tenant);
    assert.equal(booking.status, 201, booking.error?.message);
    const during = (await api.get(`/properties/public/${prop.slug}`)).data.rooms.reduce(
      (n: number, r: any) => n + r.availableBedsCount,
      0
    );
    assert.equal(during, before - 1);
    const cancel = await api.post(`/tenant/bookings/${booking.data.booking.id}/cancel`, { reason: 'test' }, tenant);
    assert.equal(cancel.status, 200, cancel.error?.message);
    const after = (await api.get(`/properties/public/${prop.slug}`)).data.rooms.reduce(
      (n: number, r: any) => n + r.availableBedsCount,
      0
    );
    assert.equal(after, before);
  });

  test('super admins are not sent owner-scoped snapshots (the UI must not request them)', async () => {
    // The API contract the contexts rely on: an admin without ?ownerId is refused, an owner is served.
    assert.equal((await api.get('/rbac/snapshot', admin)).status, 403);
    assert.equal((await api.get('/crm/snapshot', admin)).status, 403);
    const owner = await login(api, DEMO.owner);
    assert.equal((await api.get('/rbac/snapshot', owner)).status, 200);
  });
});
