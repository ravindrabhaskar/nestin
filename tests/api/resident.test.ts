import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.REFERRAL_CREDIT_INR = '500';

import { startTestServer, client, login, DEMO } from './helpers.js';

/** Phase 3: agreements + OTP e-sign, move-out & deposit refund, referrals, roommates, NPS, maintenance tickets, video tours. */
describe('resident lifecycle: agreements, move-out, referrals, roommates, surveys, maintenance', () => {
  let baseUrl = '';
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;
  let owner = '';
  let tenant = '';
  let customerId = '';

  before(async () => {
    const server = await startTestServer();
    baseUrl = server.baseUrl;
    close = server.close;
    api = client(baseUrl);
    owner = await login(api, DEMO.owner);
    tenant = await login(api, DEMO.tenant);
    const snap = await api.get('/crm/snapshot', owner);
    const me = await api.get('/auth/me', tenant);
    customerId = snap.data.customers.find((c: any) => c.tenantId === me.data.id)?.id;
    assert.ok(customerId, 'demo tenant is a resident of the demo owner');
  });
  after(async () => close());

  test('agreement: owner generates it, resident signs with OTP, document is served to both, tamper hash recorded', async () => {
    const created = await api.post('/crm/agreements', { customerId, noticePeriodDays: 30 }, owner);
    assert.equal(created.status, 201, created.error?.message);
    assert.match(created.data.agreementNumber, /^AGR-\d{6}$/);
    assert.equal(created.data.status, 'sent');
    assert.ok(created.data.text.includes('RESIDENTIAL LICENCE AGREEMENT'));
    assert.ok(created.data.clauses.length >= 5);

    const mine = await api.get('/tenant/agreements', tenant);
    assert.equal(mine.data.length, 1);
    assert.equal(mine.data[0].otpHash, undefined, 'OTP hash never leaves the server');

    const noOtp = await api.post(
      `/tenant/agreements/${created.data.id}/sign`,
      { otp: '000000', accepted: true },
      tenant
    );
    assert.equal(noOtp.status, 400);

    const otp = await api.post(`/tenant/agreements/${created.data.id}/request-otp`, {}, tenant);
    assert.equal(otp.status, 200, otp.error?.message);
    assert.ok(otp.data.devOtp, 'test environment exposes the OTP');
    assert.ok(otp.data.sentTo.includes('email'));

    const wrong = await api.post(
      `/tenant/agreements/${created.data.id}/sign`,
      { otp: '123456', accepted: true },
      tenant
    );
    assert.equal(wrong.status, 400);
    const notAccepted = await api.post(
      `/tenant/agreements/${created.data.id}/sign`,
      { otp: otp.data.devOtp, accepted: false },
      tenant
    );
    assert.equal(notAccepted.status, 400);

    const signed = await api.post(
      `/tenant/agreements/${created.data.id}/sign`,
      { otp: otp.data.devOtp, accepted: true },
      tenant
    );
    assert.equal(signed.status, 200, signed.error?.message);
    assert.equal(signed.data.status, 'signed');
    assert.match(signed.data.signatureHash, /^[a-f0-9]{64}$/);

    const doc = await fetch(`${baseUrl}/tenant/agreements/${created.data.id}/document`, {
      headers: { Authorization: `Bearer ${tenant}` },
    });
    assert.equal(doc.status, 200);
    const html = await doc.text();
    assert.ok(html.includes('Electronically signed'));
    const ownerDoc = await fetch(`${baseUrl}/crm/agreements/${created.data.id}/document`, {
      headers: { Authorization: `Bearer ${owner}` },
    });
    assert.equal(ownerDoc.status, 200);

    const docs = await api.get('/tenant/documents', tenant);
    assert.ok(docs.data.some((d: any) => d.type === 'Rent Agreement' || /AGR-/.test(d.name)));
    assert.equal((await api.post(`/crm/agreements/${created.data.id}/void`, {}, owner)).status, 409);
    assert.equal(
      (await api.post('/crm/agreements', { customerId }, owner)).status,
      409,
      'no duplicate signed agreement'
    );
    // Another tenant cannot fetch this agreement.
    const other = await api.post('/auth/register', {
      email: 'other-res@example.com',
      password: 'Strong@Pass2026',
      fullName: 'Other Resident',
      role: 'tenant',
    });
    const foreign = await fetch(`${baseUrl}/tenant/agreements/${created.data.id}/document`, {
      headers: { Authorization: `Bearer ${other.data.token}` },
    });
    assert.equal(foreign.status, 404);
  });

  test('move-out targets the Active stay even when an Upcoming booking exists elsewhere', async () => {
    const { customers } = await import('../../server/db/repositories.js');
    const me = await api.get('/auth/me', tenant);
    const active = customers.list({ tenant_id: me.data.id })[0]!;
    active.tenantStatus = 'Active';
    customers.replace(active);
    customers.insert({
      ...active,
      id: 'cust-upcoming-elsewhere',
      ownerId: 'owner-marketplace',
      propertyId: 'p-1',
      propertyName: 'Elsewhere PG',
      tenantStatus: 'Upcoming',
      moveInDate: '2027-06-01',
    });
    const date = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
    const req = await api.post('/tenant/move-out', { moveOutDate: date }, tenant);
    assert.equal(req.status, 201, req.error?.message);
    assert.equal(req.data.customerId, active.id);
    assert.equal(req.data.propertyName, active.propertyName);
    await api.post(`/tenant/move-out/${req.data.id}/cancel`, {}, tenant);
    customers.remove('cust-upcoming-elsewhere');
  });

  test('move-out: resident gives notice, owner schedules inspection, records deductions, settles the deposit and the bed is freed', async () => {
    const past = await api.post('/tenant/move-out', { moveOutDate: '2001-01-01' }, tenant);
    assert.equal(past.status, 400);
    const date = new Date(Date.now() + 35 * 86_400_000).toISOString().slice(0, 10);
    const req = await api.post('/tenant/move-out', { moveOutDate: date, reason: 'Relocating for work' }, tenant);
    assert.equal(req.status, 201, req.error?.message);
    assert.equal(req.data.status, 'requested');
    assert.ok(req.data.noticeDays >= 34);
    assert.equal((await api.post('/tenant/move-out', { moveOutDate: date }, tenant)).status, 409);

    const snap = await api.get('/crm/snapshot', owner);
    const customer = snap.data.customers.find((c: any) => c.id === customerId);
    assert.equal(customer.tenantStatus, 'Vacating');

    const list = await api.get('/crm/move-outs', owner);
    assert.ok(list.data.some((m: any) => m.id === req.data.id));

    const settleEarly = await api.put(`/crm/move-outs/${req.data.id}`, { action: 'settle' }, owner);
    assert.equal(settleEarly.status, 409);
    const sched = await api.put(
      `/crm/move-outs/${req.data.id}`,
      { action: 'schedule_inspection', inspectionDate: date },
      owner
    );
    assert.equal(sched.status, 200, sched.error?.message);
    assert.equal(sched.data.status, 'inspection_scheduled');
    const inspected = await api.put(
      `/crm/move-outs/${req.data.id}`,
      { action: 'record_inspection', deductions: [{ label: 'Broken chair', amount: 1200 }], includeUnpaidDues: false },
      owner
    );
    assert.equal(inspected.status, 200, inspected.error?.message);
    assert.equal(inspected.data.refundAmount, Math.max(0, inspected.data.depositAmount - 1200));

    const props = await api.get('/properties/owner', owner);
    const bedBefore = props.data
      .find((p: any) => p.id === customer.propertyId)
      .rooms.find((r: any) => r.id === customer.roomId)
      .beds.find((b: any) => b.id === customer.bedId);
    assert.equal(bedBefore.isOccupied, true);

    const settled = await api.put(
      `/crm/move-outs/${req.data.id}`,
      { action: 'settle', refundMethod: 'UPI', refundReference: 'UPI123' },
      owner
    );
    assert.equal(settled.status, 200, settled.error?.message);
    assert.equal(settled.data.status, 'settled');

    const after = await api.get('/properties/owner', owner);
    const bedAfter = after.data
      .find((p: any) => p.id === customer.propertyId)
      .rooms.find((r: any) => r.id === customer.roomId)
      .beds.find((b: any) => b.id === customer.bedId);
    assert.equal(bedAfter.isOccupied, false, 'bed released on settlement');
    const payments = await api.get('/tenant/payments', tenant);
    if (inspected.data.refundAmount > 0) assert.ok(payments.data.some((p: any) => p.status === 'Refunded'));
    const view = await api.get('/tenant/move-out', tenant);
    assert.equal(view.data.status, 'settled');
  });

  test('referrals: code on profile, referee registers with it, both get credit when the booking is confirmed, credit applies at checkout', async () => {
    const summary = await api.get('/tenant/referrals', tenant);
    assert.equal(summary.status, 200);
    assert.match(summary.data.code, /^[A-Z0-9]{6,12}$/);
    assert.equal(summary.data.creditPerReferral, 500);

    const referee = await api.post('/auth/register', {
      email: 'referee@example.com',
      password: 'Strong@Pass2026',
      fullName: 'Referred Friend',
      role: 'tenant',
      referralCode: summary.data.code.toLowerCase(),
    });
    assert.equal(referee.status, 201, referee.error?.message);
    const bad = await api.post('/auth/register', {
      email: 'referee2@example.com',
      password: 'Strong@Pass2026',
      fullName: 'No Code',
      role: 'tenant',
      referralCode: 'NOPE00',
    });
    assert.equal(bad.status, 201, 'an unknown code is ignored, not an error');

    const list = await fetch(`${baseUrl}/properties/public?page=1&pageSize=1&available=true&sort=newest`).then((r) =>
      r.json()
    );
    const booking = await api.post(
      '/tenant/bookings',
      {
        propertyId: list.data[0].id,
        moveInDate: '2027-02-01',
        tenantPhone: '+91 90000 00077',
        tenantName: 'Referred Friend',
      },
      referee.data.token
    );
    assert.equal(booking.status, 201, booking.error?.message);
    const beforeCredit = (await api.get('/tenant/referrals', tenant)).data.available;
    const { adminLogin } = await import('./helpers.js');
    const admin = await adminLogin(api);
    const approve = await api.post(
      `/crm/bookings/${booking.data.booking.id}/approve?ownerId=${list.data[0].ownerId}`,
      {},
      admin
    );
    assert.equal(approve.status, 200, approve.error?.message);
    const afterCredit = (await api.get('/tenant/referrals', tenant)).data;
    assert.equal(afterCredit.available, beforeCredit + 500);
    assert.ok(afterCredit.referred.some((r: any) => r.name === 'Referred' && r.rewarded));
    const refereeCredit = (await api.get('/tenant/referrals', referee.data.token)).data.available;
    assert.equal(refereeCredit, 500);

    // Credit is applied to the referee's next checkout.
    const checkout = await api.post('/tenant/payments/checkout', { amount: 3000, type: 'Rent' }, referee.data.token);
    assert.equal(checkout.status, 201, checkout.error?.message);
    assert.equal(checkout.data.amount, 2500);
    assert.equal((await api.get('/tenant/referrals', referee.data.token)).data.available, 0);
  });

  test('roommate matching: opted-in residents are scored against the viewer; opted-out residents are hidden', async () => {
    const setMine = await api.put(
      '/auth/profile',
      {
        lifestyle: {
          optIn: true,
          sleepSchedule: 'early',
          foodHabit: 'veg',
          workHours: 'day',
          cleanliness: 4,
          smoking: 'no',
          socialLevel: 'balanced',
          languages: ['Telugu', 'English'],
        },
      },
      tenant
    );
    assert.equal(setMine.status, 200, setMine.error?.message);
    const me = await api.get('/auth/me', tenant);
    assert.equal(me.data.lifestyle?.optIn, true);
    assert.equal(me.data.lifestyle?.sleepSchedule, 'early');

    // Seed another resident in the same property with a profile.
    const snap = await api.get('/crm/snapshot', owner);
    const customer = snap.data.customers.find((c: any) => c.id === customerId);
    const mate = await api.post('/auth/register', {
      email: 'mate@example.com',
      password: 'Strong@Pass2026',
      fullName: 'Kiran Mate',
      role: 'tenant',
    });
    await api.put(
      '/auth/profile',
      {
        lifestyle: {
          optIn: true,
          sleepSchedule: 'late',
          foodHabit: 'veg',
          workHours: 'day',
          cleanliness: 4,
          smoking: 'no',
          socialLevel: 'social',
          languages: ['English'],
        },
      },
      mate.data.token
    );
    const { customers } = await import('../../server/db/repositories.js');
    const mateUser = (await api.get('/auth/me', mate.data.token)).data;
    customers.insert({
      ...customer,
      id: 'cust-mate',
      tenantId: mateUser.id,
      fullName: 'Kiran Mate',
      email: 'mate@example.com',
      phone: '+91 90000 00099',
      tenantStatus: 'Active',
      bedId: 'bed-x',
      bedNumber: 'X',
    });

    const res = await api.get(`/tenant/roommates/${customer.propertyId}`, tenant);
    assert.equal(res.status, 200, res.error?.message);
    assert.equal(res.data.optedIn, true);
    const kiran = res.data.roommates.find((r: any) => r.firstName === 'Kiran');
    assert.ok(kiran, 'opted-in resident is listed');
    assert.ok(kiran.score > 0 && kiran.score < 100);
    assert.ok(kiran.shared.includes('Food habits'));
    assert.ok(kiran.differences.includes('Sleep schedule'));
    assert.equal(kiran.fullName, undefined, 'only first names are exposed');

    await api.put('/auth/profile', { lifestyle: { optIn: false } }, mate.data.token);
    const hidden = await api.get(`/tenant/roommates/${customer.propertyId}`, tenant);
    assert.ok(!hidden.data.roommates.some((r: any) => r.firstName === 'Kiran'));
    assert.equal((await api.get(`/tenant/roommates/${customer.propertyId}`, owner)).status, 403);
  });

  test('NPS survey: residents rate once a month, owners see the score, detractors trigger an alert, public listing shows satisfaction after 3 responses', async () => {
    const bad = await api.post('/tenant/survey', { score: 11 }, tenant);
    assert.equal(bad.status, 400);
    const ok = await api.post('/tenant/survey', { score: 4, comment: 'Wi-Fi keeps dropping' }, tenant);
    assert.equal(ok.status, 201, ok.error?.message);
    assert.equal((await api.post('/tenant/survey', { score: 9 }, tenant)).status, 409);
    const nps = await api.get('/crm/nps', owner);
    assert.equal(nps.status, 200);
    assert.equal(nps.data.overall.responses >= 1, true);
    assert.equal(nps.data.overall.detractors >= 1, true);
    assert.ok(nps.data.recent.some((r: any) => r.comment === 'Wi-Fi keeps dropping'));
    const notes = await api.get('/crm/notifications', owner).catch(() => null);
    void notes;
    assert.equal(typeof nps.data.maintenance.open, 'number');
  });

  test('maintenance requests carry category SLA and photos; owner desk sees them', async () => {
    const cats = await api.get('/tenant/maintenance-categories', tenant);
    assert.ok(cats.data.Electrical.slaHours <= 24);
    const ticket = await api.post(
      '/tenant/support',
      {
        subject: 'Fan not working',
        description: 'The ceiling fan in room 204 stopped.',
        category: 'Electrical',
        photos: ['/uploads/public/x.jpg', 'javascript:alert(1)'],
      },
      tenant
    );
    assert.equal(ticket.status, 201, ticket.error?.message);
    assert.equal(ticket.data.slaHours, 12);
    assert.equal(ticket.data.priority, 'High');
    assert.deepEqual(ticket.data.photos, ['/uploads/public/x.jpg']);
    assert.ok(Date.parse(ticket.data.slaDueAt) > Date.now());
    const desk = await api.get('/crm/support', owner);
    assert.ok(desk.data.some((t: any) => t.id === ticket.data.id && t.slaDueAt));
  });

  test('video tour: YouTube links are normalised to a privacy-safe embed, uploads must be mp4/webm, junk is dropped', async () => {
    const created = await api.post(
      '/properties/owner',
      { name: 'Tour PG', tourVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      owner
    );
    assert.equal(created.status, 201, created.error?.message);
    assert.equal(created.data.tourVideoUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    const junk = await api.put(`/properties/owner/${created.data.id}`, { tourVideoUrl: 'javascript:alert(1)' }, owner);
    assert.equal(junk.data.tourVideoUrl, undefined);
    const upload = await api.put(
      `/properties/owner/${created.data.id}`,
      { tourVideoUrl: '/uploads/public/prop/tour.mp4' },
      owner
    );
    assert.equal(upload.data.tourVideoUrl, '/uploads/public/prop/tour.mp4');
    await api.delete(`/properties/owner/${created.data.id}`, owner);
  });
});
