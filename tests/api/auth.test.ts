import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, client, login, adminLogin, DEMO } from './helpers.js';

describe('auth & authorization', () => {
  let baseUrl = '';
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
    api = client(baseUrl);
  });
  after(() => close());

  test('health endpoint reports UP', async () => {
    const res = await api.get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'UP');
  });

  test('demo owner can log in and receives a session-bound JWT', async () => {
    const res = await api.post('/auth/login', { email: DEMO.owner, password: DEMO.password });
    assert.equal(res.status, 200);
    assert.equal(res.data.user.role, 'owner');
    assert.equal(res.data.user.ownerId, res.data.user.id);
    assert.ok(res.data.token.split('.').length === 3);
    assert.ok(!('passwordHash' in res.data.user));
  });

  test('wrong password and unknown email both fail with 401 and identical messages', async () => {
    const bad = await api.post('/auth/login', { email: DEMO.owner, password: 'nope-nope-1' });
    const unknown = await api.post('/auth/login', { email: 'ghost@example.com', password: 'nope-nope-1' });
    assert.equal(bad.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(bad.error?.message, unknown.error?.message);
  });

  test('login without a password is rejected (no auto-provisioning)', async () => {
    const res = await api.post('/auth/login', { email: 'anyone@example.com' });
    assert.equal(res.status, 400);
    const stillUnknown = await api.post('/auth/login', { email: 'anyone@example.com', password: 'Whatever123' });
    assert.equal(stillUnknown.status, 401);
  });

  test('registration enforces password strength and cannot create privileged roles', async () => {
    const weak = await api.post('/auth/register', {
      email: 'weak@example.com',
      password: 'short',
      fullName: 'Weak Pass',
    });
    assert.equal(weak.status, 400);

    const escalate = await api.post('/auth/register', {
      email: 'admin-wannabe@example.com',
      password: 'Strong123',
      fullName: 'Wannabe',
      role: 'super_admin',
    });
    assert.equal(escalate.status, 400, 'unknown role values are rejected');

    const ok = await api.post('/auth/register', {
      email: 'new.user@example.com',
      password: 'Strong123',
      fullName: 'New User',
      role: 'tenant',
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.data.user.role, 'tenant');

    const dup = await api.post('/auth/register', {
      email: 'new.user@example.com',
      password: 'Strong123',
      fullName: 'Again',
    });
    assert.equal(dup.status, 409);
  });

  test('forged, tampered and unsigned tokens are rejected', async () => {
    const token = await login(api, DEMO.tenant);
    const [header, payload] = token.split('.');

    assert.equal((await api.get('/auth/me', 'tenant-001')).status, 401, 'opaque string is not a token');
    assert.equal((await api.get('/auth/me', `${header}.${payload}.`)).status, 401, 'missing signature');
    assert.equal(
      (await api.get('/auth/me', `${header}.${payload}.sig-legacy`)).status,
      401,
      'legacy sig- prefix is not accepted'
    );

    const forgedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), role: 'super_admin' })
    ).toString('base64url');
    assert.equal(
      (await api.get('/auth/me', `${header}.${forgedPayload}.${token.split('.')[2]}`)).status,
      401,
      'payload tampering breaks the signature'
    );

    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    assert.equal((await api.get('/auth/me', `${noneHeader}.${payload}.`)).status, 401, 'alg=none is rejected');
  });

  test('profile updates cannot change role, email or owner scope', async () => {
    const token = await login(api, DEMO.tenant);
    const res = await api.put(
      '/auth/profile',
      { role: 'super_admin', email: 'hijack@example.com', ownerId: 'owner-001', city: 'Pune' },
      token
    );
    assert.equal(res.status, 200);
    assert.equal(res.data.role, 'tenant');
    assert.equal(res.data.email, DEMO.tenant);
    assert.equal(res.data.city, 'Pune');
  });

  test('logout revokes the session; the token can no longer be used', async () => {
    const token = await login(api, DEMO.tenant);
    assert.equal((await api.get('/auth/me', token)).status, 200);
    assert.equal((await api.post('/auth/logout', {}, token)).status, 200);
    assert.equal((await api.get('/auth/me', token)).status, 401);
  });

  test('changing the password signs out other devices', async () => {
    const phone = await login(api, DEMO.tenant);
    const laptop = await login(api, DEMO.tenant);
    const res = await api.post(
      '/auth/change-password',
      { currentPassword: DEMO.password, newPassword: 'Rotated123' },
      laptop
    );
    assert.equal(res.status, 200);
    assert.equal((await api.get('/auth/me', phone)).status, 401);
    assert.equal((await api.get('/auth/me', laptop)).status, 200);
    // restore for other tests
    await api.post('/auth/change-password', { currentPassword: 'Rotated123', newPassword: DEMO.password }, laptop);
  });

  test('super admin must use the admin console login with an access code', async () => {
    const viaNormal = await api.post('/auth/login', { email: DEMO.admin.email, password: DEMO.admin.password });
    assert.equal(viaNormal.status, 403);
    const badCode = await api.post('/auth/admin/login', { ...DEMO.admin, accessCode: 'WRONG' });
    assert.equal(badCode.status, 401);
    const token = await adminLogin(api);
    assert.equal((await api.get('/admin/stats', token)).status, 200);
  });

  test('role boundaries: tenant → CRM 403, owner → admin 403, staff without permission 403', async () => {
    const tenant = await login(api, DEMO.tenant);
    const owner = await login(api, DEMO.owner);
    const staff = await login(api, DEMO.staff);
    assert.equal((await api.get('/crm/snapshot', tenant)).status, 403);
    assert.equal((await api.get('/admin/stats', owner)).status, 403);
    assert.equal((await api.get('/crm/snapshot', staff)).status, 200, 'property manager can read the CRM');
    assert.equal(
      (await api.post('/rbac/roles', { name: 'Escalate', permissions: { 'roles.manage': true } }, staff)).status,
      403
    );
  });

  test('deactivating a staff member locks them out immediately', async () => {
    const owner = await login(api, DEMO.owner);
    const staff = await login(api, DEMO.staff);
    const snap = await api.get('/rbac/snapshot', owner);
    const emp = snap.data.employees.find((e: any) => e.email === DEMO.staff);
    assert.ok(emp);
    assert.equal((await api.put(`/rbac/employees/${emp.id}`, { ...emp, status: 'inactive' }, owner)).status, 200);
    assert.equal((await api.get('/crm/snapshot', staff)).status, 401);
    assert.equal((await api.post('/auth/login', { email: DEMO.staff, password: DEMO.password })).status, 403);
    await api.put(`/rbac/employees/${emp.id}`, { ...emp, status: 'active' }, owner);
  });

  test('login attempts are rate limited', async () => {
    const results: number[] = [];
    for (let i = 0; i < 25; i++) {
      results.push(
        (await api.post('/auth/login', { email: 'bruteforce@example.com', password: `guess-${i}-xx` })).status
      );
    }
    assert.ok(results.includes(429), 'expected a 429 after repeated failures');
  });
});
