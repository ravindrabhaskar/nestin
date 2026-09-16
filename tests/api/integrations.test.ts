import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, client, login, adminLogin, DEMO } from './helpers.js';

describe('uploads, checkout, password reset, support desk, webhooks', () => {
  let baseUrl = '';
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;
  let tenant = '';
  let owner = '';
  let admin = '';

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
    api = client(baseUrl);
    tenant = await login(api, DEMO.tenant);
    owner = await login(api, DEMO.owner);
    admin = await adminLogin(api);
  });
  after(() => close());

  const upload = async (token: string, purpose: string, name: string, type: string, bytes: Buffer) => {
    const form = new FormData();
    form.append('purpose', purpose);
    form.append('file', new Blob([bytes], { type }), name);
    const res = await fetch(`${baseUrl}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return { status: res.status, ...(await res.json()) } as any;
  };

  test('file upload: validates type, stores privately for documents and publicly for photos, enforces access', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const bad = await upload(tenant, 'document', 'evil.exe', 'application/x-msdownload', png);
    assert.equal(bad.status, 400);

    const doc = await upload(tenant, 'document', 'aadhaar.png', 'image/png', png);
    assert.equal(doc.status, 201, doc.error?.message);
    assert.match(doc.data.url, /^\/api\/v1\/files\//);

    const asTenant = await fetch(`${baseUrl}${doc.data.url.replace('/api/v1', '')}`, {
      headers: { Authorization: `Bearer ${tenant}` },
    });
    assert.equal(asTenant.status, 200);
    assert.equal(asTenant.headers.get('content-type'), 'image/png');
    const other = await api.post('/auth/register', {
      email: 'peek@example.com',
      password: 'Strong123',
      fullName: 'Peeker',
    });
    const asOther = await fetch(`${baseUrl}${doc.data.url.replace('/api/v1', '')}`, {
      headers: { Authorization: `Bearer ${other.data.token}` },
    });
    assert.equal(asOther.status, 403);
    const anon = await fetch(`${baseUrl}${doc.data.url.replace('/api/v1', '')}`);
    assert.equal(anon.status, 401);

    assert.equal(
      (await upload(tenant, 'property', 'room.png', 'image/png', png)).status,
      403,
      'tenants cannot upload listing photos'
    );
    const photo = await upload(owner, 'property', 'room.png', 'image/png', png);
    assert.equal(photo.status, 201);
    assert.match(photo.data.url, /^\/uploads\/public\//);

    // Attaching the document links it to the responsible owner, who can then view the file.
    const attached = await api.post(
      '/tenant/documents',
      {
        name: 'Aadhaar',
        type: 'govt_id',
        fileName: 'aadhaar.png',
        fileUrl: doc.data.url,
        fileSize: doc.data.sizeLabel,
      },
      tenant
    );
    assert.equal(attached.status, 201);
    const asOwner = await fetch(`${baseUrl}${doc.data.url.replace('/api/v1', '')}`, {
      headers: { Authorization: `Bearer ${owner}` },
    });
    assert.equal(asOwner.status, 200, "owner of the tenant's booking can view the KYC file");
  });

  test('checkout without a gateway is simulated end-to-end and idempotent', async () => {
    const order = await api.post('/tenant/payments/checkout', { amount: 12000, type: 'Rent' }, tenant);
    assert.equal(order.status, 201, order.error?.message);
    assert.equal(order.data.simulated, true);
    assert.ok(order.data.paymentId);
    const done = await api.post(
      '/tenant/payments/checkout/complete',
      { paymentId: order.data.paymentId, paymentMethod: 'UPI / GPay' },
      tenant
    );
    assert.equal(done.status, 200, done.error?.message);
    assert.equal(done.data.status, 'Paid');
    const again = await api.post('/tenant/payments/checkout/complete', { paymentId: order.data.paymentId }, tenant);
    assert.equal(again.data.id, done.data.id);
    const other = await api.post('/auth/register', {
      email: 'thief@example.com',
      password: 'Strong123',
      fullName: 'Thief',
    });
    assert.equal(
      (await api.post('/tenant/payments/checkout/complete', { paymentId: order.data.paymentId }, other.data.token))
        .status,
      404
    );
  });

  test('razorpay webhook rejects unsigned payloads', async () => {
    const res = await fetch(`${baseUrl}/webhooks/razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'payment.captured', payload: {} }),
    });
    assert.equal(res.status, 401);
  });

  test('password reset: request is silent, token resets the password once and signs out other sessions', async () => {
    const { outbox } = await import('../../server/db/repositories.js');
    const { hashToken } = await import('../../server/lib/jwt.js');
    const { getDb } = await import('../../server/db/database.js');

    assert.equal((await api.post('/auth/forgot-password', { email: 'nobody@example.com' })).status, 200);
    const before = outbox.list().length;
    assert.equal((await api.post('/auth/forgot-password', { email: DEMO.tenant })).status, 200);
    const mail = outbox.list().find((m) => m.recipient === DEMO.tenant && m.subject?.includes('Reset'));
    assert.ok(mail, 'reset email recorded in outbox');
    assert.ok(outbox.list().length > before);
    const token = mail!.body.match(/token=([A-Za-z0-9_-]+)/)?.[1];
    assert.ok(token, 'email contains the reset link');
    // sanity: the stored token is hashed
    const row = getDb()
      .prepare("SELECT token_hash FROM auth_tokens WHERE kind='reset' ORDER BY created_at DESC LIMIT 1")
      .get() as { token_hash: string };
    assert.equal(row.token_hash, hashToken(token!));
    assert.notEqual(row.token_hash, token);

    assert.equal((await api.post('/auth/reset-password', { token, newPassword: 'weak' })).status, 400);
    const reset = await api.post('/auth/reset-password', { token, newPassword: 'Reset1234' });
    assert.equal(reset.status, 200, reset.error?.message);
    assert.equal((await api.get('/auth/me', tenant)).status, 401, 'old sessions are revoked');
    assert.equal(
      (await api.post('/auth/reset-password', { token, newPassword: 'Reset5678' })).status,
      400,
      'token is single-use'
    );
    assert.equal((await api.post('/auth/login', { email: DEMO.tenant, password: DEMO.password })).status, 401);
    const fresh = await api.post('/auth/login', { email: DEMO.tenant, password: 'Reset1234' });
    assert.equal(fresh.status, 200);
    tenant = fresh.data.token;
    await api.post('/auth/change-password', { currentPassword: 'Reset1234', newPassword: DEMO.password }, tenant);
    tenant = await login(api, DEMO.tenant);
  });

  test('email verification: new accounts get a token; verifying flips the flag', async () => {
    const { outbox } = await import('../../server/db/repositories.js');
    const reg = await api.post('/auth/register', {
      email: 'verify.me@example.com',
      password: 'Strong123',
      fullName: 'Verify Me',
    });
    assert.equal(reg.status, 201);
    assert.equal(reg.data.user.emailVerified, false);
    await new Promise((r) => setTimeout(r, 50));
    const mail = outbox.list().find((m) => m.recipient === 'verify.me@example.com');
    assert.ok(mail);
    const token = mail!.body.match(/token=([A-Za-z0-9_-]+)/)?.[1];
    const verified = await api.post('/auth/verify-email', { token });
    assert.equal(verified.status, 200, verified.error?.message);
    assert.equal(verified.data.emailVerified, true);
    assert.equal((await api.post('/auth/verify-email', { token })).status, 400);
  });

  test('support desk: resident ticket reaches the responsible owner, who replies; admin sees everything', async () => {
    const created = await api.post(
      '/tenant/support',
      { subject: 'WiFi down', category: 'Maintenance', description: 'No internet since morning.' },
      tenant
    );
    assert.equal(created.status, 201);
    const ownerTickets = await api.get('/crm/support', owner);
    assert.equal(ownerTickets.status, 200);
    const mine = ownerTickets.data.find((t: any) => t.id === created.data.id);
    assert.ok(mine, "ticket is scoped to the owner of the resident's booking");
    assert.equal(mine.tenantEmail, DEMO.tenant);

    const marketplaceOwner = await login(api, 'marketplace@nestin.com');
    assert.equal(
      (await api.post(`/crm/support/${created.data.id}/messages`, { message: 'hi' }, marketplaceOwner)).status,
      404
    );

    const reply = await api.post(
      `/crm/support/${created.data.id}/messages`,
      { message: 'Technician is on the way.' },
      owner
    );
    assert.equal(reply.status, 200, reply.error?.message);
    assert.equal(reply.data.status, 'In Progress');
    const tenantView = (await api.get('/tenant/support', tenant)).data.find((t: any) => t.id === created.data.id);
    assert.equal(tenantView.messages.at(-1).sender, 'support');
    const notes = await api.get('/tenant/notifications', tenant);
    assert.ok(notes.data.some((n: any) => n.title.startsWith('Reply on ticket')));

    const resolved = await api.post(`/admin/support/${created.data.id}/resolve`, {}, admin);
    assert.equal(resolved.status, 200);
    assert.equal(resolved.data.status, 'Resolved');
    assert.ok((await api.get('/admin/support', admin)).data.some((t: any) => t.id === created.data.id));
    const integrations = await api.get('/admin/integrations', admin);
    assert.deepEqual(integrations.data, {
      messaging: { email: 'log', whatsapp: 'log' },
      storage: 'local',
      payments: 'simulated',
    });
  });

  test('rent reminders notify unpaid active residents once per month', async () => {
    const { runRentReminders } = await import('../../server/jobs/index.js');
    const { notifications } = await import('../../server/db/repositories.js');
    const first = runRentReminders(new Date(2027, 2, 10));
    assert.ok(first.reminded >= 1);
    const second = runRentReminders(new Date(2027, 2, 11));
    assert.equal(second.reminded, 0, 'idempotent per month');
    const ownerNotes = notifications.list({ user_id: 'owner-001' });
    assert.ok(
      ownerNotes.some((n) => /rent payment/.test(n.title)),
      'owner receives the pending-rent summary'
    );
  });
});
