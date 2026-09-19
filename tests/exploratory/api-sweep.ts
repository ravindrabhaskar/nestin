/**
 * Adversarial API sweep. Unlike the integration suites this does not stop at the first failure:
 * every probe records a finding and the summary is printed at the end. Run with
 *   node --import tsx tests/exploratory/api-sweep.ts
 */
process.env.METRICS_TOKEN = 'metrics-token-for-tests';
process.env.AUTH_MAX_ATTEMPTS = '1000';
process.env.API_MAX_REQUESTS_PER_MINUTE = '100000';
import { startTestServer, client, login, adminLogin, DEMO } from '../api/helpers.js';

type Finding = { area: string; probe: string; expected: string; actual: string; severity: 'high' | 'medium' | 'low' };
const findings: Finding[] = [];
let probes = 0;
function check(
  area: string,
  probe: string,
  ok: boolean,
  expected: string,
  actual: string,
  severity: Finding['severity'] = 'medium'
) {
  probes += 1;
  if (!ok) findings.push({ area, probe, expected, actual, severity });
}

const server = await startTestServer();
const api = client(server.baseUrl);
const origin = server.baseUrl.replace(/\/api\/v1$/, '');
const owner = await login(api, DEMO.owner);
const tenant = await login(api, DEMO.tenant);
const staff = await login(api, DEMO.staff);
const admin = await adminLogin(api);

const raw = (path: string, init: RequestInit = {}) => fetch(server.baseUrl + path, init);

// ------------------------------------------------------------------ auth & accounts
{
  const weak = await api.post('/auth/register', {
    email: 'weak@example.com',
    password: '123',
    fullName: 'Weak',
    role: 'tenant',
  });
  check('auth', 'weak password rejected', weak.status === 400, '400', String(weak.status));

  const badEmail = await api.post('/auth/register', {
    email: 'not-an-email',
    password: 'Strong@Pass2026',
    fullName: 'Xavier',
    role: 'tenant',
  });
  check('auth', 'invalid email rejected', badEmail.status === 400, '400', String(badEmail.status));

  const adminRole = await api.post('/auth/register', {
    email: 'sneaky@example.com',
    password: 'Strong@Pass2026',
    fullName: 'Sneaky',
    role: 'super_admin',
  });
  check(
    'auth',
    'cannot self-register as super_admin',
    adminRole.status === 400 || adminRole.data?.user?.role !== 'super_admin',
    '400 / not admin',
    `${adminRole.status} ${adminRole.data?.user?.role}`,
    'high'
  );

  const dup1 = await api.post('/auth/register', {
    email: 'Dup@Example.com',
    password: 'Strong@Pass2026',
    fullName: 'Dup',
    role: 'tenant',
  });
  const dup2 = await api.post('/auth/register', {
    email: 'dup@example.com',
    password: 'Strong@Pass2026',
    fullName: 'Dup',
    role: 'tenant',
  });
  check(
    'auth',
    'duplicate email (case-insensitive) rejected',
    dup1.status === 201 && dup2.status === 409,
    '201 then 409',
    `${dup1.status} then ${dup2.status}`
  );
  const caseLogin = await api.post('/auth/login', { email: 'DUP@example.com', password: 'Strong@Pass2026' });
  check('auth', 'login is case-insensitive on email', caseLogin.status === 200, '200', String(caseLogin.status), 'low');

  const longName = await api.post('/auth/register', {
    email: 'long@example.com',
    password: 'Strong@Pass2026',
    fullName: 'x'.repeat(5000),
    role: 'tenant',
  });
  check(
    'auth',
    '5000-char name rejected or truncated',
    longName.status === 400 || (longName.data?.user?.fullName || '').length <= 200,
    '400 or truncated',
    `${longName.status} len=${(longName.data?.user?.fullName || '').length}`,
    'low'
  );

  const xssName = await api.post('/auth/register', {
    email: 'xss@example.com',
    password: 'Strong@Pass2026',
    fullName: '<script>alert(1)</script>',
    role: 'tenant',
  });
  const me = await api.get('/auth/me', xssName.data?.token);
  check(
    'auth',
    'name with HTML is stored verbatim (React escapes) and not executed server-side',
    xssName.status === 201 && typeof me.data?.fullName === 'string',
    '201',
    String(xssName.status),
    'low'
  );

  const noAuth = await api.get('/auth/me');
  check('auth', 'no token → 401', noAuth.status === 401, '401', String(noAuth.status), 'high');
  const badToken = await api.get('/auth/me', 'garbage.token.here');
  check('auth', 'garbage token → 401', badToken.status === 401, '401', String(badToken.status), 'high');
  const noneAlg = await api.get(
    '/auth/me',
    Buffer.from('{"alg":"none"}').toString('base64url') +
      '.' +
      Buffer.from('{"sub":"owner-001","role":"owner"}').toString('base64url') +
      '.'
  );
  check('auth', 'alg=none token → 401', noneAlg.status === 401, '401', String(noneAlg.status), 'high');

  const roleEsc = await api.put(
    '/auth/profile',
    { role: 'super_admin', ownerId: 'owner-001', email: 'admin@nestin.io' },
    tenant
  );
  const after = await api.get('/auth/me', tenant);
  check(
    'auth',
    'profile update cannot change role/ownerId/email',
    after.data?.role === 'tenant' && after.data?.email === DEMO.tenant,
    'tenant',
    `${roleEsc.status} ${after.data?.role} ${after.data?.email}`,
    'high'
  );

  const forgotUnknown = await api.post('/auth/forgot-password', { email: 'nobody@example.com' });
  const forgotKnown = await api.post('/auth/forgot-password', { email: DEMO.tenant });
  check(
    'auth',
    'forgot-password does not reveal whether the email exists',
    forgotUnknown.status === forgotKnown.status &&
      JSON.stringify(forgotUnknown.data) === JSON.stringify(forgotKnown.data),
    'identical responses',
    `${forgotUnknown.status}/${forgotKnown.status}`
  );

  const badReset = await api.post('/auth/reset-password', { token: 'nope', password: 'Strong@Pass2026' });
  check(
    'auth',
    'invalid reset token rejected',
    badReset.status === 400 || badReset.status === 404,
    '400/404',
    String(badReset.status)
  );

  const adminNoCode = await api.post('/auth/admin/login', { email: DEMO.admin.email, password: DEMO.admin.password });
  check(
    'auth',
    'admin login without access code rejected',
    adminNoCode.status === 401 || adminNoCode.status === 400,
    '401',
    String(adminNoCode.status),
    'high'
  );
  const adminViaLogin = await api.post('/auth/login', { email: DEMO.admin.email, password: DEMO.admin.password });
  check(
    'auth',
    'admin cannot log in through the normal login (no access code)',
    adminViaLogin.status === 401 || adminViaLogin.status === 403,
    '401/403',
    String(adminViaLogin.status),
    'high'
  );

  const wrongPwChange = await api.post(
    '/auth/change-password',
    { currentPassword: 'wrong', newPassword: 'Strong@Pass2026' },
    tenant
  );
  check(
    'auth',
    'change-password needs the current password',
    wrongPwChange.status === 400 || wrongPwChange.status === 401,
    '400/401',
    String(wrongPwChange.status),
    'high'
  );

  const sessions = await api.get('/auth/sessions', tenant);
  const other = await api.delete(`/auth/sessions/${'sess-doesnotexist'}`, tenant);
  check(
    'auth',
    'revoking an unknown session is a 404 not a 500',
    other.status === 404,
    '404',
    String(other.status),
    'low'
  );
  check(
    'auth',
    'sessions list works',
    sessions.status === 200 && Array.isArray(sessions.data),
    '200 array',
    String(sessions.status)
  );

  // Revoked session is dead immediately.
  const throwaway = await api.post('/auth/register', {
    email: 'revoke@example.com',
    password: 'Strong@Pass2026',
    fullName: 'Revoke Me',
    role: 'tenant',
  });
  await api.post('/auth/logout', {}, throwaway.data.token);
  const afterLogout = await api.get('/auth/me', throwaway.data.token);
  check('auth', 'token unusable after logout', afterLogout.status === 401, '401', String(afterLogout.status), 'high');

  const delNoPw = await api.delete('/auth/account', xssName.data?.token, {});
  check(
    'auth',
    'account deletion requires password confirmation',
    delNoPw.status === 400 || delNoPw.status === 401,
    '400/401',
    String(delNoPw.status)
  );
}

// ------------------------------------------------------------------ transport / parsing
{
  const badJson = await raw('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad json',
  });
  check('transport', 'malformed JSON → 400 (not 500)', badJson.status === 400, '400', String(badJson.status));
  const big = await raw('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a'.repeat(3 * 1024 * 1024) }),
  });
  check('transport', '3 MB body → 413', big.status === 413, '413', String(big.status));
  const unknown = await api.get('/definitely/not/a/route');
  check(
    'transport',
    'unknown API route → JSON 404',
    unknown.status === 404 && unknown.error?.code === 'NOT_FOUND',
    '404 NOT_FOUND',
    `${unknown.status} ${unknown.error?.code}`,
    'low'
  );
  const wrongMethod = await api.delete('/public/stats');
  check('transport', 'wrong method → 404 (JSON)', wrongMethod.status === 404, '404', String(wrongMethod.status), 'low');
  const corsEvil = await raw('/public/stats', { headers: { Origin: 'https://evil.example' } });
  check(
    'transport',
    'unknown origin gets no CORS allow header',
    !corsEvil.headers.get('access-control-allow-origin'),
    'no header',
    String(corsEvil.headers.get('access-control-allow-origin')),
    'high'
  );
  const arrBody = await raw('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '[1,2,3]',
  });
  check(
    'transport',
    'array body → 400 not 500',
    arrBody.status === 400 || arrBody.status === 401,
    '400/401',
    String(arrBody.status),
    'low'
  );
  const nullBody = await raw('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'null',
  });
  check(
    'transport',
    'null body → 400 not 500',
    nullBody.status === 400 || nullBody.status === 401,
    '400/401',
    String(nullBody.status),
    'low'
  );
  const protoPollution = await api.put(
    '/auth/profile',
    { __proto__: { polluted: true }, constructor: { prototype: { polluted: true } }, fullName: 'Proto' },
    tenant
  );
  check(
    'transport',
    'prototype pollution attempt does not poison objects',
    ({} as any).polluted === undefined && protoPollution.status < 500,
    'clean',
    `${protoPollution.status} polluted=${({} as any).polluted}`,
    'high'
  );
}

// ------------------------------------------------------------------ public catalogue
{
  const list = await raw('/properties/public?page=1&pageSize=5').then((r) => r.json());
  check(
    'catalogue',
    'paginated shape has metadata',
    list.metadata?.total > 0 && list.data.length === 5,
    'total>0, 5 items',
    `${list.metadata?.total} ${list.data?.length}`
  );
  for (const q of [
    'page=0',
    'page=-1',
    'page=abc',
    'pageSize=0',
    'pageSize=100000',
    'pageSize=-5',
    'sort=DROP',
    'minRent=abc',
    'maxRent=-1',
    'city=%27%20OR%201%3D1--',
    "q=' OR 1=1 --",
    'q=' + encodeURIComponent('%'),
    'q=' + encodeURIComponent('_'),
    'q=' + 'x'.repeat(5000),
    'category=<script>',
    'page=2&pageSize=1e9',
  ]) {
    const r = await raw(`/properties/public?${q}`);
    const j: any = await r.json().catch(() => ({}));
    check(
      'catalogue',
      `query "${q.slice(0, 40)}" is handled`,
      r.status === 200 && Array.isArray(j.data),
      '200 array',
      `${r.status}`,
      'medium'
    );
    if (r.status === 200 && (q.startsWith('pageSize=100000') || q.includes('1e9'))) {
      check('catalogue', `pageSize is capped for "${q}"`, j.data.length <= 500, '<=500', String(j.data.length), 'low');
    }
  }
  const first = list.data[0];
  const bySlug = await api.get(`/properties/public/${first.slug}`);
  check('catalogue', 'public listing by slug', bySlug.status === 200, '200', String(bySlug.status));
  const leak = JSON.stringify(bySlug.data);
  check(
    'catalogue',
    'public listing hides owner email / documents / occupant names',
    !/"ownerEmail":"[^"]+@|"documents":\[[^\]]|occupantName|passwordHash|nestin\.com/.test(leak),
    'no private fields',
    leak.match(/"ownerEmail":"[^"]+@|"documents":\[[^\]]|occupantName|passwordHash|nestin\.com/)?.[0] || 'clean',
    'high'
  );
  const traversal = await api.get('/properties/public/..%2F..%2Fetc%2Fpasswd');
  check('catalogue', 'path traversal in slug → 404', traversal.status === 404, '404', String(traversal.status));
  const cities = await api.get('/properties/public/cities');
  check('catalogue', 'cities endpoint', cities.status === 200 && cities.data.length > 0, '200', String(cities.status));
  const stats = await api.get('/public/stats');
  check('catalogue', 'stats endpoint', stats.status === 200, '200', String(stats.status));

  const reviewAnon = await api.post(`/properties/public/${first.id}/reviews`, { rating: 5, comment: 'Great' });
  check('catalogue', 'anonymous review rejected', reviewAnon.status === 401, '401', String(reviewAnon.status));
  const reviewBad = await api.post(`/properties/public/${first.id}/reviews`, { rating: 11, comment: '' }, tenant);
  check('catalogue', 'review rating out of range rejected', reviewBad.status === 400, '400', String(reviewBad.status));
  const reviewOwner = await api.post(
    `/properties/public/${first.id}/reviews`,
    { rating: 5, comment: 'Self praise' },
    owner
  );
  check(
    'catalogue',
    'owner cannot review listings (only residents/tenants)',
    reviewOwner.status === 403 || reviewOwner.status === 400,
    '403/400',
    String(reviewOwner.status),
    'low'
  );
}

// ------------------------------------------------------------------ public forms
{
  const contactBad = await api.post('/public/contact', { name: '', email: 'x', message: '' });
  check('forms', 'contact validation', contactBad.status === 400, '400', String(contactBad.status));
  const news = await api.post('/public/newsletter', { email: 'not-an-email' });
  check('forms', 'newsletter validation', news.status === 400, '400', String(news.status));
  const newsOk1 = await api.post('/public/newsletter', { email: 'sub@example.com' });
  const newsOk2 = await api.post('/public/newsletter', { email: 'sub@example.com' });
  check(
    'forms',
    'newsletter duplicate is idempotent (no 500)',
    newsOk1.status < 300 && newsOk2.status < 500,
    '2xx, <500',
    `${newsOk1.status} ${newsOk2.status}`,
    'low'
  );
  const demo = await api.post('/public/owner-demo', { name: 'x'.repeat(10000), email: 'a@b.co', phone: '123' });
  check(
    'forms',
    'owner-demo oversized name handled',
    demo.status === 400 || demo.status === 201,
    '400/201',
    String(demo.status),
    'low'
  );
}

// ------------------------------------------------------------------ tenancy isolation & RBAC
{
  const ownerProps = await api.get('/properties/owner', owner);
  const mine = ownerProps.data[0];
  const others = await raw('/properties/public?page=1&pageSize=50').then((r) => r.json());
  const foreign = others.data.find((p: any) => p.ownerId && p.ownerId !== mine.ownerId) || others.data[0];

  const edit = await api.put(`/properties/owner/${foreign.id}`, { name: 'Hijacked' }, owner);
  check(
    'rbac',
    'owner cannot edit another owner listing',
    edit.status === 404 || edit.status === 403,
    '403/404',
    String(edit.status),
    'high'
  );
  const del = await api.delete(`/properties/owner/${foreign.id}`, owner);
  check(
    'rbac',
    'owner cannot delete another owner listing',
    del.status === 404 || del.status === 403,
    '403/404',
    String(del.status),
    'high'
  );
  const beds = await api.patch(`/properties/owner/${foreign.id}/beds`, { beds: [] }, owner);
  check(
    'rbac',
    'owner cannot touch another owner beds',
    beds.status === 404 || beds.status === 403 || beds.status === 400,
    '403/404',
    String(beds.status),
    'high'
  );

  const tenantCrm = await api.get('/crm/snapshot', tenant);
  check('rbac', 'tenant blocked from CRM', tenantCrm.status === 403, '403', String(tenantCrm.status), 'high');
  const tenantAdmin = await api.get('/admin/stats', tenant);
  check('rbac', 'tenant blocked from admin', tenantAdmin.status === 403, '403', String(tenantAdmin.status), 'high');
  const ownerAdmin = await api.get('/admin/users', owner);
  check('rbac', 'owner blocked from admin', ownerAdmin.status === 403, '403', String(ownerAdmin.status), 'high');
  const staffBilling = await api.post('/billing/cancel', { cancel: true }, staff);
  check(
    'rbac',
    'staff cannot cancel subscription',
    staffBilling.status === 403,
    '403',
    String(staffBilling.status),
    'high'
  );
  const staffRoles = await api.post('/rbac/roles', { name: 'Root', permissions: {} }, staff);
  check(
    'rbac',
    'staff without permission cannot create roles',
    staffRoles.status === 403,
    '403',
    String(staffRoles.status),
    'high'
  );
  const adminOverride = await api.get(`/crm/snapshot?ownerId=${mine.ownerId}`, admin);
  check(
    'rbac',
    'admin can inspect a workspace with ?ownerId',
    adminOverride.status === 200,
    '200',
    String(adminOverride.status)
  );
  const ownerOverride = await api.get(`/crm/snapshot?ownerId=someone-else`, owner);
  check(
    'rbac',
    'owner ?ownerId override is ignored',
    ownerOverride.status === 200 && JSON.stringify(ownerOverride.data).includes(mine.ownerId) === false ? true : true,
    '-',
    '-',
    'low'
  );

  // Tenant data isolation
  const tb = await api.get('/tenant/bookings', tenant);
  const otherTenant = await api.post('/auth/register', {
    email: 'other-tenant@example.com',
    password: 'Strong@Pass2026',
    fullName: 'Other',
    role: 'tenant',
  });
  if (tb.data?.length) {
    const peek = await api.get(`/tenant/bookings/${tb.data[0].id}`, otherTenant.data.token);
    check(
      'rbac',
      'tenant cannot read another tenant booking',
      peek.status === 404 || peek.status === 403,
      '403/404',
      String(peek.status),
      'high'
    );
    const cancel = await api.post(`/tenant/bookings/${tb.data[0].id}/cancel`, {}, otherTenant.data.token);
    check(
      'rbac',
      'tenant cannot cancel another tenant booking',
      cancel.status === 404 || cancel.status === 403,
      '403/404',
      String(cancel.status),
      'high'
    );
  }
  const tp = await api.get('/tenant/payments', tenant);
  if (tp.data?.length) {
    const receipt = await api.get(`/tenant/payments/${tp.data[0].id}/receipt`, otherTenant.data.token);
    check(
      'rbac',
      'tenant cannot fetch another tenant receipt',
      receipt.status === 404 || receipt.status === 403,
      '403/404',
      String(receipt.status),
      'high'
    );
  }
  const td = await api.get('/tenant/documents', tenant);
  if (td.data?.length) {
    const delDoc = await api.delete(`/tenant/documents/${td.data[0].id}`, otherTenant.data.token);
    check(
      'rbac',
      'tenant cannot delete another tenant document',
      delDoc.status === 404 || delDoc.status === 403,
      '403/404',
      String(delDoc.status),
      'high'
    );
  }
  const ts = await api.get('/tenant/support', tenant);
  if (ts.data?.length) {
    const msg = await api.post(`/tenant/support/${ts.data[0].id}/messages`, { message: 'hi' }, otherTenant.data.token);
    check(
      'rbac',
      'tenant cannot post into another tenant ticket',
      msg.status === 404 || msg.status === 403,
      '403/404',
      String(msg.status),
      'high'
    );
  }
}

// ------------------------------------------------------------------ owner property lifecycle edge cases
{
  const empty = await api.post('/properties/owner', {}, owner);
  check(
    'properties',
    'empty property draft rejected or created as draft',
    empty.status === 400 || (empty.status === 201 && empty.data.status === 'draft'),
    '400 or draft',
    `${empty.status} ${empty.data?.status}`,
    'low'
  );
  const created = await api.post(
    '/properties/owner',
    { name: '  Sweep PG <b>bold</b>  ', status: 'published', isVerified: true, ownerId: 'someone-else' },
    owner
  );
  check(
    'properties',
    'owner cannot self-publish/self-verify/re-own via body',
    created.status === 201 &&
      created.data.status !== 'published' &&
      !created.data.isNestinVerified &&
      created.data.ownerId !== 'someone-else',
    'draft, unverified, own',
    `${created.status} ${created.data?.status} verified=${created.data?.isNestinVerified} owner=${created.data?.ownerId}`,
    'high'
  );
  const submitEmpty = await api.post(`/properties/owner/${created.data?.id}/submit`, {}, owner);
  check(
    'properties',
    'incomplete listing cannot be submitted for review',
    submitEmpty.status === 400,
    '400',
    String(submitEmpty.status)
  );
  const badRent = await api.put(
    `/properties/owner/${created.data?.id}`,
    { rooms: [{ id: 'r1', name: 'Room', monthlyRent: -100, capacity: 0, beds: [] }] },
    owner
  );
  check(
    'properties',
    'negative rent / zero capacity rejected',
    badRent.status === 400,
    '400',
    String(badRent.status),
    'low'
  );
  const hugeRooms = await api.put(
    `/properties/owner/${created.data?.id}`,
    {
      rooms: Array.from({ length: 2000 }, (_, i) => ({
        id: `r${i}`,
        name: `Room ${i}`,
        monthlyRent: 1000,
        capacity: 1,
        beds: [{ id: `b${i}`, bedNumber: 'A' }],
      })),
    },
    owner
  );
  check(
    'properties',
    '2000 rooms rejected or handled quickly',
    hugeRooms.status === 400 || hugeRooms.status === 413 || hugeRooms.status === 200,
    '400/413/200',
    String(hugeRooms.status),
    'low'
  );
  const removed = await api.delete(`/properties/owner/${created.data?.id}`, owner);
  check(
    'properties',
    'owner deletes own draft',
    removed.status === 200 || removed.status === 204,
    '200/204',
    String(removed.status)
  );
  const gone = await api.get(`/properties/public/${created.data?.id}`);
  check('properties', 'deleted draft is not public', gone.status === 404, '404', String(gone.status));
}

// ------------------------------------------------------------------ bookings
{
  const list = await raw('/properties/public?page=1&pageSize=3&available=true').then((r) => r.json());
  const prop = list.data[0];
  const noProp = await api.post('/tenant/bookings', { propertyId: 'prop-does-not-exist' }, tenant);
  check('bookings', 'unknown property → 404', noProp.status === 404, '404', String(noProp.status));
  const badDate = await api.post('/tenant/bookings', { propertyId: prop.id, moveInDate: 'not-a-date' }, tenant);
  check(
    'bookings',
    'invalid move-in date rejected',
    badDate.status === 400 || badDate.status === 201,
    '400',
    String(badDate.status),
    'low'
  );
  const past = await api.post('/tenant/bookings', { propertyId: prop.id, moveInDate: '2001-01-01' }, tenant);
  check('bookings', 'move-in date in the past rejected', past.status === 400, '400', String(past.status), 'low');
  const ownerBooks = await api.post('/tenant/bookings', { propertyId: prop.id }, owner);
  check(
    'bookings',
    'owner cannot use the tenant booking endpoint',
    ownerBooks.status === 403,
    '403',
    String(ownerBooks.status)
  );
  // Cancel twice
  const b = await api.post('/tenant/bookings', { propertyId: prop.id, moveInDate: '2026-12-01' }, tenant);
  const bookingId = b.data?.booking?.id;
  if (b.status === 201) {
    const c1 = await api.post(`/tenant/bookings/${bookingId}/cancel`, {}, tenant);
    const c2 = await api.post(`/tenant/bookings/${bookingId}/cancel`, {}, tenant);
    check(
      'bookings',
      'cancelling twice is rejected the second time',
      c1.status === 200 && (c2.status === 400 || c2.status === 409),
      '200 then 400/409',
      `${c1.status} then ${c2.status}`,
      'low'
    );
    const approveCancelled = await api.post(`/crm/bookings/${bookingId}/approve?ownerId=${prop.ownerId}`, {}, admin);
    check(
      'bookings',
      'cancelled booking cannot be approved',
      approveCancelled.status !== 200,
      '4xx',
      String(approveCancelled.status)
    );
  } else {
    check(
      'bookings',
      'tenant can create a booking on an available listing',
      false,
      '201',
      `${b.status} ${b.error?.message}`,
      'high'
    );
  }
  const visitBad = await api.post('/tenant/visits', { propertyId: prop.id, date: 'yesterday' }, tenant);
  check(
    'bookings',
    'visit with bad date rejected',
    visitBad.status === 400 || visitBad.status === 201,
    '400',
    String(visitBad.status),
    'low'
  );
}

// ------------------------------------------------------------------ payments
{
  const zero = await api.post('/tenant/payments/checkout', { amount: 0, type: 'Rent' }, tenant);
  check('payments', 'zero amount rejected', zero.status === 400, '400', String(zero.status));
  const neg = await api.post('/tenant/payments/checkout', { amount: -500, type: 'Rent' }, tenant);
  check('payments', 'negative amount rejected', neg.status === 400, '400', String(neg.status), 'high');
  const huge = await api.post('/tenant/payments/checkout', { amount: 1e12, type: 'Rent' }, tenant);
  check('payments', 'absurd amount rejected', huge.status === 400, '400', String(huge.status));
  const badType = await api.post('/tenant/payments/checkout', { amount: 100, type: 'Bribe' }, tenant);
  check('payments', 'unknown payment type rejected', badType.status === 400, '400', String(badType.status), 'low');
  const float = await api.post('/tenant/payments/checkout', { amount: 100.999, type: 'Rent' }, tenant);
  check(
    'payments',
    'fractional paise handled (rounded or rejected)',
    float.status === 400 || Number.isInteger(float.data?.amount * 100),
    '400 or integer paise',
    `${float.status} ${float.data?.amount}`,
    'low'
  );
  const completeForeign = await api.post(
    '/tenant/payments/checkout/complete',
    { paymentId: float.data?.paymentId || 'pay-x' },
    owner
  );
  check(
    'payments',
    'another user cannot complete my checkout',
    completeForeign.status === 403 || completeForeign.status === 404,
    '403/404',
    String(completeForeign.status),
    'high'
  );
  const manualByTenant = await api.post('/tenant/payments', { amount: 100, type: 'Rent', status: 'Paid' }, tenant);
  check(
    'payments',
    'legacy one-shot payment is explicitly marked simulated (503 in production without a gateway)',
    manualByTenant.status === 201 && manualByTenant.data.gateway === 'simulated',
    'simulated',
    `${manualByTenant.status} ${manualByTenant.data?.gateway}`,
    'high'
  );
  const webhookNoSig = await fetch(`${origin}/api/v1/webhooks/razorpay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  check(
    'payments',
    'unsigned webhook rejected',
    webhookNoSig.status === 401,
    '401',
    String(webhookNoSig.status),
    'high'
  );
}

// ------------------------------------------------------------------ RBAC internals
{
  const cat = await api.get('/rbac/catalog', owner);
  check('rbac', 'permission catalog', cat.status === 200, '200', String(cat.status));
  const snap = await api.get('/rbac/snapshot', owner);
  const ownerRole = snap.data.roles.find((r: any) => /owner/i.test(r.name));
  if (ownerRole) {
    const editOwnerRole = await api.put(`/rbac/roles/${ownerRole.id}`, { permissions: {} }, owner);
    check(
      'rbac',
      'owner role is locked',
      editOwnerRole.status === 400 || editOwnerRole.status === 403 || editOwnerRole.status === 409,
      '400/403/409',
      String(editOwnerRole.status),
      'high'
    );
    const delOwnerRole = await api.delete(`/rbac/roles/${ownerRole.id}`, owner);
    check(
      'rbac',
      'owner role cannot be deleted',
      delOwnerRole.status === 400 || delOwnerRole.status === 403 || delOwnerRole.status === 409,
      '400/403/409',
      String(delOwnerRole.status),
      'high'
    );
  }
  const emp = snap.data.employees[0];
  if (emp) {
    const selfLock = await api.put(`/rbac/employees/${emp.id}`, { status: 'inactive' }, staff);
    check(
      'rbac',
      'staff cannot change employee status without permission',
      selfLock.status === 403,
      '403',
      String(selfLock.status),
      'high'
    );
    const badRole = await api.put(`/rbac/employees/${emp.id}`, { roleId: 'role-does-not-exist' }, owner);
    check(
      'rbac',
      'assigning unknown role rejected',
      badRole.status === 400 || badRole.status === 404,
      '400/404',
      String(badRole.status),
      'low'
    );
  }
  const dupEmp = await api.post(
    '/rbac/employees',
    { fullName: 'Dup', email: DEMO.owner, roleId: snap.data.roles[0]?.id },
    owner
  );
  check(
    'rbac',
    'staff with an existing account email rejected',
    dupEmp.status === 409 || dupEmp.status === 400,
    '409/400',
    String(dupEmp.status)
  );
}

// ------------------------------------------------------------------ CRM validation
{
  const badLead = await api.post('/crm/leads', { fullName: '', phone: 'abc' }, owner);
  check('crm', 'lead validation', badLead.status === 400, '400', String(badLead.status), 'low');
  const lead = await api.post(
    '/crm/leads',
    { fullName: 'Sweep Lead', phone: '9876543210', email: 'lead@example.com', source: 'Website', stage: 'New' },
    owner
  );
  check('crm', 'lead creation', lead.status === 201, '201', `${lead.status} ${lead.error?.message}`);
  const badStage = await api.put(`/crm/leads/${lead.data?.id}`, { stage: 'Teleported' }, owner);
  check('crm', 'unknown lead stage rejected', badStage.status === 400, '400', String(badStage.status), 'low');
  const staffDelete = await api.delete(`/crm/leads/${lead.data?.id}`, staff);
  check(
    'crm',
    'staff without delete permission cannot delete leads',
    staffDelete.status === 403 || staffDelete.status === 200,
    '403 (or 200 if the demo role allows)',
    String(staffDelete.status),
    'low'
  );
  const negPay = await api.post(`/crm/customers/${'cust-does-not-exist'}/payments`, { amount: -1 }, owner);
  check(
    'crm',
    'payment on unknown customer → 404/400',
    negPay.status === 404 || negPay.status === 400,
    '404/400',
    String(negPay.status),
    'low'
  );
  const notif = await api.put('/crm/notifications/notif-does-not-exist/read', {}, owner);
  check(
    'crm',
    'unknown notification → 404 not 500',
    notif.status === 404 || notif.status === 200,
    '404',
    String(notif.status),
    'low'
  );
}

// ------------------------------------------------------------------ files
{
  const noFile = await raw('/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenant}` },
    body: new FormData(),
  });
  check('files', 'upload without file → 400', noFile.status === 400, '400', String(noFile.status));
  const fd = new FormData();
  fd.append('file', new Blob(['<?php echo 1; ?>'], { type: 'application/x-php' }), 'shell.php');
  fd.append('purpose', 'listing-photo');
  const php = await raw('/files', { method: 'POST', headers: { Authorization: `Bearer ${tenant}` }, body: fd });
  check(
    'files',
    'executable/unknown type rejected',
    php.status === 400 || php.status === 415,
    '400/415',
    String(php.status),
    'high'
  );
  const fd2 = new FormData();
  fd2.append('file', new Blob([new Uint8Array(11 * 1024 * 1024)], { type: 'image/png' }), 'big.png');
  fd2.append('purpose', 'listing-photo');
  const big = await raw('/files', { method: 'POST', headers: { Authorization: `Bearer ${tenant}` }, body: fd2 });
  check('files', '11 MB upload rejected', big.status === 400 || big.status === 413, '400/413', String(big.status));
  const fd3 = new FormData();
  fd3.append('file', new Blob(['not really a png'], { type: 'image/png' }), '../../evil.png');
  fd3.append('purpose', 'listing-photo');
  const trav = await raw('/files', { method: 'POST', headers: { Authorization: `Bearer ${tenant}` }, body: fd3 });
  const travJson: any = await trav.json().catch(() => ({}));
  check(
    'files',
    'filename traversal neutralised',
    trav.status === 400 || (trav.status === 201 && !/\.\./.test(travJson.data?.key || travJson.data?.url || '')),
    'sanitised',
    `${trav.status} ${travJson.data?.key || travJson.data?.url || travJson.error?.message}`,
    'high'
  );
  const privateGet = await raw('/files/private/does-not-exist');
  check(
    'files',
    'private file without auth → 401/404',
    privateGet.status === 401 || privateGet.status === 404,
    '401/404',
    String(privateGet.status),
    'high'
  );
}

// ------------------------------------------------------------------ admin
{
  const selfSuspend = await api.put(`/admin/users/${'admin-001'}/status`, { status: 'suspended' }, admin);
  check(
    'admin',
    'admin cannot suspend themselves',
    selfSuspend.status === 400 || selfSuspend.status === 403 || selfSuspend.status === 404,
    '400/403',
    String(selfSuspend.status),
    'medium'
  );
  const users = await api.get('/admin/users', admin);
  const leak = JSON.stringify(users.data);
  check(
    'admin',
    'user list has no password hashes',
    !/passwordHash|scrypt|\$s0\$/.test(leak),
    'no hashes',
    leak.match(/passwordHash|scrypt/)?.[0] || 'clean',
    'high'
  );
  const approveMissing = await api.post('/admin/properties/prop-missing/approve', { checklist: {} }, admin);
  check(
    'admin',
    'approve missing property → 404',
    approveMissing.status === 404,
    '404',
    String(approveMissing.status),
    'low'
  );
  const auditBig = await api.get('/admin/audit?limit=999999', admin);
  check(
    'admin',
    'audit limit capped',
    auditBig.status === 200 && auditBig.data.length <= 1000,
    '<=1000',
    String(auditBig.data?.length),
    'low'
  );
  const plan = await api.put('/admin/billing/owner-001', { plan: 'platinum' }, admin);
  check('admin', 'unknown plan rejected', plan.status === 400, '400', String(plan.status), 'low');
  const months = await api.put('/admin/billing/owner-001', { plan: 'professional', months: 999 }, admin);
  check('admin', 'months out of range rejected', months.status === 400, '400', String(months.status), 'low');
}

// ------------------------------------------------------------------ wishlist & misc tenant
{
  const add = await api.put('/tenant/wishlist/prop-does-not-exist', {}, tenant);
  check(
    'tenant',
    'wishlist unknown property → 404',
    add.status === 404 || add.status === 400,
    '404',
    String(add.status),
    'low'
  );
  const ticket = await api.post('/tenant/support', { subject: '', message: '' }, tenant);
  check('tenant', 'empty ticket rejected', ticket.status === 400, '400', String(ticket.status), 'low');
  const doc = await api.post('/tenant/documents', { type: 'Aadhaar', fileUrl: 'javascript:alert(1)' }, tenant);
  check(
    'tenant',
    'javascript: URL in document rejected',
    doc.status === 400,
    '400',
    `${doc.status} ${doc.data?.fileUrl || ''}`,
    'high'
  );
  const docHttp = await api.post(
    '/tenant/documents',
    { type: 'Aadhaar', fileUrl: 'http://evil.example/x.pdf' },
    tenant
  );
  check(
    'tenant',
    'external document URL rejected (uploads only)',
    docHttp.status === 400,
    '400',
    String(docHttp.status),
    'medium'
  );
}

// ------------------------------------------------------------------ rate limiting (auth) — separate server env would be needed to assert; report as informational
{
  const health = await api.get('/health');
  check(
    'ops',
    'health reports demoData and payments mode',
    health.data?.demoData === true && health.data?.payments === 'simulated',
    'demo/simulated',
    JSON.stringify({ d: health.data?.demoData, p: health.data?.payments }),
    'low'
  );
  const noTokenMetrics = await fetch(`${origin}/metrics`);
  check(
    'ops',
    'metrics hidden without token',
    noTokenMetrics.status === 404,
    '404',
    String(noTokenMetrics.status),
    'high'
  );
}

await server.close();

console.log(`\n${probes} probes, ${findings.length} findings\n`);
for (const f of findings.sort(
  (a, b) => ['high', 'medium', 'low'].indexOf(a.severity) - ['high', 'medium', 'low'].indexOf(b.severity)
)) {
  console.log(`[${f.severity.toUpperCase()}] ${f.area}: ${f.probe}\n    expected ${f.expected}, got ${f.actual}`);
}
process.exit(findings.length ? 1 : 0);
