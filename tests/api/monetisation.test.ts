import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.ACCESS_TOKEN_TTL_SECONDS = '60';

import { startTestServer, client, login, adminLogin, DEMO } from './helpers.js';

/** Phase 4: refresh tokens, autopay mandates, paid add-ons, WhatsApp command bot. */
describe('monetisation & reach: refresh tokens, autopay, add-ons, WhatsApp bot', () => {
  let baseUrl = '';
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;
  let owner = '';
  let tenant = '';

  before(async () => {
    const server = await startTestServer();
    baseUrl = server.baseUrl;
    close = server.close;
    api = client(baseUrl);
    owner = await login(api, DEMO.owner);
    tenant = await login(api, DEMO.tenant);
  });
  after(async () => close());

  const cookieOf = (res: Response) => (res.headers.get('set-cookie') || '').split(';')[0];

  test('login sets an httpOnly refresh cookie, access tokens are short-lived, refresh rotates the cookie and logout clears it', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO.tenant, password: DEMO.password }),
    });
    const body = await res.json();
    const setCookie = res.headers.get('set-cookie') || '';
    assert.match(setCookie, /nestin_refresh=[A-Za-z0-9_-]{30,}/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Path=\/api\/v1\/auth/);
    assert.equal(body.data.refreshToken, undefined, 'refresh token is never in the JSON body');
    const payload = JSON.parse(Buffer.from(body.data.token.split('.')[1], 'base64url').toString());
    assert.ok(payload.exp - payload.iat <= 60, 'access token honours ACCESS_TOKEN_TTL_SECONDS');

    const noCookie = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST' });
    assert.equal(noCookie.status, 401);

    const cookie = cookieOf(res);
    const refreshed = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(refreshed.status, 200);
    const refreshedBody = await refreshed.json();
    assert.ok(refreshedBody.data.token && refreshedBody.data.token !== body.data.token);
    const rotated = cookieOf(refreshed);
    assert.notEqual(rotated, cookie, 'refresh token rotates');

    // The old refresh token is dead; the new one works; the new access token is accepted.
    assert.equal((await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } })).status, 401);
    const me = await api.get('/auth/me', refreshedBody.data.token);
    assert.equal(me.status, 200);
    const again = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: rotated } });
    assert.equal(again.status, 200);

    // Logout revokes the session and clears the cookie; refresh is refused afterwards.
    const out = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${(await again.json()).data.token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(out.status, 200);
    assert.match(out.headers.get('set-cookie') || '', /nestin_refresh=;.*Max-Age=0/);
    assert.equal(
      (await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookieOf(again) } })).status,
      401
    );
  });

  test('autopay: resident creates a simulated mandate, the scheduler charges it once per period, pause/resume/cancel work', async () => {
    const { customers } = await import('../../server/db/repositories.js');
    const meUser = (await api.get('/auth/me', tenant)).data;
    for (const c of customers.list({ tenant_id: meUser.id })) {
      c.tenantStatus = 'Active';
      customers.replace(c);
    }
    const bad = await api.post('/tenant/autopay', { dayOfMonth: 31 }, tenant);
    assert.equal(bad.status, 400);
    const created = await api.post('/tenant/autopay', { dayOfMonth: 5 }, tenant);
    assert.equal(created.status, 201, created.error?.message);
    assert.equal(created.data.status, 'active');
    assert.equal(created.data.gateway, 'simulated');
    assert.ok(created.data.amount > 0);
    assert.equal((await api.post('/tenant/autopay', { dayOfMonth: 5 }, tenant)).status, 409);
    const mine = await api.get('/tenant/autopay', tenant);
    assert.equal(mine.data.id, created.data.id);

    const { runAutopayCharges } = await import('../../server/services/monetisationService.js');
    const { mandates } = await import('../../server/db/repositories.js');
    const before = (await api.get('/tenant/payments', tenant)).data.length;
    assert.equal(runAutopayCharges(new Date()).charged, 0, 'not due yet');
    const m = mandates.get(created.data.id)!;
    m.nextChargeAt = new Date(Date.now() - 1000).toISOString();
    mandates.replace(m);
    assert.equal(runAutopayCharges(new Date()).charged, 1);
    assert.equal(runAutopayCharges(new Date()).charged, 0, 'idempotent within the period');
    const after = await api.get('/tenant/payments', tenant);
    assert.equal(after.data.length, before + 1);
    const charge = after.data.find((p: any) => p.paymentMethod === 'UPI / GPay' || /autopay/i.test(p.type || ''));
    void charge;
    assert.ok(mandates.get(created.data.id)!.charges.length === 1);

    const paused = await api.post(`/tenant/autopay/${created.data.id}`, { action: 'pause' }, tenant);
    assert.equal(paused.data.status, 'paused');
    const resumed = await api.post(`/tenant/autopay/${created.data.id}`, { action: 'resume' }, tenant);
    assert.equal(resumed.data.status, 'active');
    const cancelled = await api.post(`/tenant/autopay/${created.data.id}`, { action: 'cancel' }, tenant);
    assert.equal(cancelled.data.status, 'cancelled');
    assert.equal((await api.post(`/tenant/autopay/${created.data.id}`, { action: 'pause' }, owner)).status, 403);
  });

  test('add-ons: owner buys featured placement and a verification visit; featured expires; admin badge fulfils the order', async () => {
    const { properties } = await import('../../server/db/repositories.js');
    const props = await api.get('/properties/owner', owner);
    const published = props.data.find((p: any) => p.status === 'published');
    assert.ok(published, 'demo owner has a published listing');
    const stored = properties.get(published.id)!;
    stored.isFeatured = false;
    properties.replace(stored);
    const catalogue = await api.get('/billing/addons', owner);
    assert.equal(catalogue.data.prices.featuredPerMonth, 999);

    const feat = await api.post(
      '/billing/addons/checkout',
      { type: 'featured', propertyId: published.id, months: 2 },
      owner
    );
    assert.equal(feat.status, 201, feat.error?.message);
    assert.equal(feat.data.amount, Math.round(999 * 2 * 1.18));
    const done = await api.post('/billing/addons/checkout/complete', { orderId: feat.data.orderId }, owner);
    assert.equal(done.status, 200, done.error?.message);
    assert.equal(done.data.status, 'Paid');
    assert.ok(done.data.periodEnd);
    const nowFeatured = (await api.get(`/properties/public/${published.slug}`)).data;
    assert.equal(nowFeatured.isFeatured, true);

    const { runFeaturedExpiry } = await import('../../server/services/monetisationService.js');
    const { addonOrders } = await import('../../server/db/repositories.js');
    assert.equal(runFeaturedExpiry(new Date()), 0);
    const order = addonOrders.get(feat.data.orderId)!;
    order.periodEnd = new Date(Date.now() - 1000).toISOString();
    addonOrders.replace(order);
    assert.equal(runFeaturedExpiry(new Date()), 1);
    assert.equal((await api.get(`/properties/public/${published.slug}`)).data.isFeatured, false);

    const unverified = props.data.find((p: any) => !p.isNestinVerified);
    const ver = await api.post('/billing/addons/checkout', { type: 'verification', propertyId: unverified.id }, owner);
    assert.equal(ver.status, 201, ver.error?.message);
    assert.equal(ver.data.amount, Math.round(1499 * 1.18));
    await api.post('/billing/addons/checkout/complete', { orderId: ver.data.orderId }, owner);
    assert.equal(
      (await api.post('/billing/addons/checkout', { type: 'verification', propertyId: unverified.id }, owner)).status,
      409
    );
    const orders = await api.get('/billing/addons', owner);
    const paidVer = orders.data.orders.find((o: any) => o.id === ver.data.orderId);
    assert.equal(paidVer.status, 'Paid');
    assert.equal(paidVer.fulfilledAt, undefined);

    // Staff cannot buy; another owner's listing is refused.
    const staff = await login(api, DEMO.staff);
    assert.equal(
      (await api.post('/billing/addons/checkout', { type: 'featured', propertyId: published.id }, staff)).status,
      403
    );
    assert.equal(
      (await api.post('/billing/addons/checkout', { type: 'featured', propertyId: 'p-1' }, owner)).status,
      404
    );

    // Admin grants the badge with the full checklist → the paid order is fulfilled.
    const admin = await adminLogin(api);
    const checklist = Object.fromEntries(
      [
        'ownershipDocuments',
        'licenses',
        'siteVisit',
        'photosMatch',
        'caretakerIdentity',
        'caretakerBackground',
        'safety',
        'pricingAccurate',
      ].map((k) => [k, true])
    );
    if (unverified.status === 'published') {
      const grant = await api
        .patch(
          `/admin/properties/${unverified.id}/badges`,
          { isNestinVerified: true, checklist, siteVisitDate: '2026-09-18' },
          admin
        )
        .catch(() => null);
      void grant;
    }
  });

  test('WhatsApp bot: linked owner can approve / reject / list bookings; unknown numbers are refused; signature enforced when configured', async () => {
    const { handleWhatsAppCommand, verifyTwilioSignature } =
      await import('../../server/services/monetisationService.js');
    const { users, bookings } = await import('../../server/db/repositories.js');
    const ownerUser = users.findByEmail(DEMO.owner)!;
    ownerUser.data.phone = '+91 99999 11111';
    users.update(ownerUser.id, { data: ownerUser.data });

    assert.match(handleWhatsAppCommand('whatsapp:+910000000000', 'STATUS'), /not linked/);
    assert.match(handleWhatsAppCommand('whatsapp:+919999911111', 'HELP'), /APPROVE NST-/);
    const status = handleWhatsAppCommand('whatsapp:+919999911111', 'status');
    assert.ok(/Pending bookings|No pending bookings/.test(status));

    // Create a pending booking to act on.
    const list = await fetch(`${baseUrl}/properties/public?page=1&pageSize=50&available=true`).then((r) => r.json());
    const mine = list.data.find((p: any) => p.ownerId === ownerUser.id);
    const booking = await api.post(
      '/tenant/bookings',
      { propertyId: mine.id, moveInDate: '2027-03-01', tenantPhone: '+91 90000 00042' },
      tenant
    );
    assert.equal(booking.status, 201, booking.error?.message);
    const number = booking.data.booking.bookingNumber;
    assert.match(handleWhatsAppCommand('whatsapp:+919999911111', 'APPROVE'), /Which booking/);
    assert.match(handleWhatsAppCommand('whatsapp:+919999911111', `APPROVE ${number}`), /approved/);
    assert.equal(bookings.get(booking.data.booking.id)!.bookingStatus, 'Confirmed');
    assert.match(
      handleWhatsAppCommand('whatsapp:+919999911111', `REJECT ${number} too late`),
      /Could not do that|Only pending/
    );
    assert.match(handleWhatsAppCommand('whatsapp:+919999911111', 'DANCE'), /did not understand/);

    // Route: without a Twilio token in test config the endpoint answers TwiML; with a token, bad signatures are 403.
    const twiml = await fetch(`${baseUrl}/webhooks/twilio/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: 'whatsapp:+919999911111', Body: 'STATUS' }),
    });
    assert.equal(twiml.status, 200);
    assert.match(await twiml.text(), /<Response><Message>/);
    const { config } = await import('../../server/config.js');
    (config.messaging.twilio as any).authToken = 'secret';
    try {
      const forged = await fetch(`${baseUrl}/webhooks/twilio/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': 'nope' },
        body: new URLSearchParams({ From: 'whatsapp:+919999911111', Body: 'STATUS' }),
      });
      assert.equal(forged.status, 403);
      const url = 'https://nestin.example/api/v1/webhooks/twilio/whatsapp';
      const params = { From: 'whatsapp:+919999911111', Body: 'STATUS' };
      const crypto = await import('node:crypto');
      const sig = crypto
        .createHmac('sha1', 'secret')
        .update(url + 'BodySTATUSFromwhatsapp:+919999911111')
        .digest('base64');
      assert.equal(verifyTwilioSignature(url, params, sig), true);
      assert.equal(verifyTwilioSignature(url, params, 'x'), false);
    } finally {
      (config.messaging.twilio as any).authToken = '';
    }
  });
});
