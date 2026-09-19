import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Config is read once at import time, so platform settings for this suite go first.
process.env.PLATFORM_FEE_PERCENT = '2';
process.env.PLAN_TRIAL_DAYS = '14';
process.env.METRICS_TOKEN = 'metrics-token-for-tests';

import { startTestServer, client, login, adminLogin, DEMO } from './helpers.js';

const FULL_CHECKLIST = {
  ownershipDocuments: true,
  licenses: true,
  siteVisit: true,
  photosMatch: true,
  caretakerIdentity: true,
  caretakerBackground: true,
  safety: true,
  pricingAccurate: true,
};

describe('billing, plan limits, platform fee, verification lifecycle and ops', () => {
  let baseUrl = '';
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;
  let admin = '';

  before(async () => {
    const server = await startTestServer();
    baseUrl = server.baseUrl;
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

  test('public stats are derived from live data and expose no fabricated figures', async () => {
    const res = await api.get('/public/stats');
    assert.equal(res.status, 200);
    assert.ok(res.data.publishedListings >= 240);
    assert.ok(res.data.cities >= 5);
    assert.equal(typeof res.data.residentsHoused, 'number');
    assert.ok(res.data.citiesBreakdown.every((c: any) => c.listings > 0 && typeof c.city === 'string'));
  });

  test('catalogue paginates, sorts and filters in SQL', async () => {
    const page1 = await fetch(`${baseUrl}/properties/public?page=1&pageSize=10&sort=rent_asc&city=Bengaluru`).then(
      (r) => r.json()
    );
    assert.equal(page1.data.length, 10);
    assert.ok(page1.metadata.total > 10);
    assert.equal(page1.metadata.page, 1);
    assert.ok(page1.metadata.totalPages >= 2);
    assert.ok(page1.data.every((p: any) => p.location.city === 'Bengaluru'));
    const rents = page1.data.map((p: any) => p.pricing.minRent);
    assert.deepEqual(
      rents,
      [...rents].sort((a: number, b: number) => a - b)
    );

    const page2 = await fetch(`${baseUrl}/properties/public?page=2&pageSize=10&sort=rent_asc&city=Bengaluru`).then(
      (r) => r.json()
    );
    assert.equal(page2.metadata.page, 2);
    assert.notEqual(page2.data[0]?.id, page1.data[0]?.id);

    const capped = await fetch(`${baseUrl}/properties/public?maxRent=7000&verified=true&pageSize=50&page=1`).then((r) =>
      r.json()
    );
    assert.ok(capped.data.every((p: any) => p.isNestinVerified && p.pricing.minRent <= 7000));

    const legacy = await api.get('/properties/public');
    assert.ok(legacy.data.length > 100, 'unpaged mode still returns the whole catalogue');
  });

  test('new owners start on a Professional trial; lapsed trials fall back to Starter limits', async () => {
    const owner = await registerOwner('trial');
    const view = await api.get('/billing', owner.token);
    assert.equal(view.status, 200);
    assert.equal(view.data.subscription.plan, 'professional');
    assert.equal(view.data.subscription.status, 'trialing');
    assert.equal(view.data.usage.properties.limit, 10);
    assert.equal(view.data.plans.length, 3);
  });

  test('Starter plan limits properties and staff with a 402 that names the limit', async () => {
    const owner = await registerOwner('starter');
    // Operator moves them to Starter (e.g. trial abuse) — no payment needed.
    const set = await api.put(`/admin/billing/${owner.id}`, { plan: 'starter' }, admin);
    assert.equal(set.status, 200, set.error?.message);
    assert.equal(set.data.plan, 'starter');

    const first = await api.post('/properties/owner', { name: 'First PG' }, owner.token);
    assert.equal(first.status, 201, first.error?.message);
    const second = await api.post('/properties/owner', { name: 'Second PG' }, owner.token);
    assert.equal(second.status, 402);
    assert.equal(second.error?.code, 'PLAN_LIMIT');
    assert.equal((second.error?.details as any).resource, 'properties');

    const roles = (await api.get('/rbac/snapshot', owner.token)).data.roles as any[];
    const roleId = roles.find((r: any) => !r.isOwnerRole).id;
    const staff1 = await api.post(
      '/rbac/employees',
      { name: 'Manager One', email: `m1-${Date.now()}@example.com`, roleId, phone: '+91 9876500001' },
      owner.token
    );
    assert.equal(staff1.status, 201, staff1.error?.message);
    const staff2 = await api.post(
      '/rbac/employees',
      { name: 'Manager Two', email: `m2-${Date.now()}@example.com`, roleId, phone: '+91 9876500002' },
      owner.token
    );
    assert.equal(staff2.status, 402);
    assert.equal((staff2.error?.details as any).resource, 'staff');
  });

  test('simulated upgrade checkout activates the plan, issues a GST invoice and lifts limits', async () => {
    const owner = await registerOwner('upgrade');
    await api.put(`/admin/billing/${owner.id}`, { plan: 'starter' }, admin);

    const bad = await api.post('/billing/checkout', { plan: 'starter' }, owner.token);
    assert.equal(bad.status, 400);

    const checkout = await api.post('/billing/checkout', { plan: 'professional', interval: 'yearly' }, owner.token);
    assert.equal(checkout.status, 201, checkout.error?.message);
    assert.equal(checkout.data.simulated, true);
    assert.equal(checkout.data.amount, Math.round(799 * 12 * 1.18));

    const done = await api.post('/billing/checkout/complete', { invoiceId: checkout.data.invoiceId }, owner.token);
    assert.equal(done.status, 200, done.error?.message);
    assert.equal(done.data.subscription.plan, 'professional');
    assert.equal(done.data.subscription.status, 'active');
    assert.equal(done.data.subscription.interval, 'yearly');
    assert.equal(done.data.invoices[0].status, 'Paid');
    assert.equal(done.data.invoices[0].gst, Math.round(799 * 12 * 0.18));

    // Idempotent completion.
    const again = await api.post('/billing/checkout/complete', { invoiceId: checkout.data.invoiceId }, owner.token);
    assert.equal(again.data.invoices.filter((i: any) => i.status === 'Paid').length, 1);

    for (let i = 0; i < 3; i++) {
      const created = await api.post('/properties/owner', { name: `PG ${i}` }, owner.token);
      assert.equal(created.status, 201, created.error?.message);
    }

    const cancel = await api.post('/billing/cancel', { cancel: true }, owner.token);
    assert.equal(cancel.data.subscription.cancelAtPeriodEnd, true);

    // Staff cannot change the subscription.
    const staff = await login(api, DEMO.staff);
    assert.equal((await api.post('/billing/checkout', { plan: 'business' }, staff)).status, 403);

    const adminView = await api.get('/admin/billing', admin);
    assert.equal(adminView.status, 200);
    assert.ok(adminView.data.stats.subscriptionRevenue.total >= checkout.data.amount);
    assert.ok(adminView.data.subscriptions.some((s: any) => s.ownerId === owner.id && s.plan === 'professional'));
  });

  test('platform fee is recorded on online tenant payments', async () => {
    const tenant = await login(api, DEMO.tenant);
    const checkout = await api.post('/tenant/payments/checkout', { amount: 10000, type: 'Rent' }, tenant);
    assert.equal(checkout.status, 201, checkout.error?.message);
    const paid = await api.post(
      '/tenant/payments/checkout/complete',
      { paymentId: checkout.data.paymentId, paymentMethod: 'UPI / GPay' },
      tenant
    );
    assert.equal(paid.status, 200, paid.error?.message);
    const stats = await api.get('/admin/billing', admin);
    assert.ok(stats.data.stats.platformFees.total >= 200, '2% of ₹10,000 retained');
  });

  test('verification can be revoked and expires after its validity window', async () => {
    const owner = await login(api, DEMO.owner);
    const listing = (await api.get('/properties/owner', owner)).data.find((p: any) => p.isNestinVerified);
    assert.ok(listing, 'demo owner has a verified listing');

    const revoked = await api.post(
      `/admin/properties/${listing.id}/revoke-verification`,
      { reason: 'Safety complaint' },
      admin
    );
    assert.equal(revoked.status, 200, revoked.error?.message);
    assert.equal(revoked.data.isNestinVerified, false);
    assert.equal(revoked.data.verification.status, 'revoked');
    const publicView = await api.get(`/properties/public/${listing.slug}`);
    assert.equal(publicView.data.isNestinVerified, false);

    // Re-verify with a full checklist, then make sure the sweep does not expire a fresh badge.
    const approved = await api.post(
      `/admin/properties/${listing.id}/approve`,
      { checklist: FULL_CHECKLIST, siteVisitDate: '2026-09-16' },
      admin
    );
    assert.equal(approved.status, 200, approved.error?.message);
    assert.equal(approved.data.verification.status, 'verified');
    const sweep = await api.post('/admin/properties/verification-sweep', {}, admin);
    assert.equal(sweep.status, 200);
    assert.equal(sweep.data.expired, 0);
  });

  test('push subscriptions are stored per device and removable', async () => {
    const tenant = await login(api, DEMO.tenant);
    const cfg = await api.get('/push/config');
    assert.equal(cfg.data.enabled, false);
    const sub = await api.post(
      '/push/subscribe',
      { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } },
      tenant
    );
    assert.equal(sub.status, 201, sub.error?.message);
    const bad = await api.post('/push/subscribe', { endpoint: 'http://insecure', keys: {} }, tenant);
    assert.equal(bad.status, 400);
    const un = await api.post('/push/unsubscribe', { endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }, tenant);
    assert.equal(un.data.unsubscribed, true);
  });

  test('metrics endpoint requires the token and reports per-route counters; ops panel is admin-only', async () => {
    const root = baseUrl.replace(/\/api\/v1$/, '');
    assert.equal((await fetch(`${root}/metrics`)).status, 404);
    const ok = await fetch(`${root}/metrics`, { headers: { Authorization: 'Bearer metrics-token-for-tests' } });
    assert.equal(ok.status, 200);
    const text = await ok.text();
    assert.match(text, /nestin_http_requests_total\{method="GET",route="\/public\/stats",status="200"\} \d+/);
    assert.match(text, /nestin_process_rss_bytes \d+/);

    const tenant = await login(api, DEMO.tenant);
    assert.equal((await api.get('/admin/ops/metrics', tenant)).status, 403);
    const snapshot = await api.get('/admin/ops/metrics', admin);
    assert.equal(snapshot.status, 200);
    assert.ok(snapshot.data.requestsTotal > 10);
    const backups = await api.get('/admin/ops/backups', admin);
    assert.equal(backups.status, 200);
    assert.equal(backups.data.enabled, false, 'backups are off for in-memory test databases');
  });
});
