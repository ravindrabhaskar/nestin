import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.API_MAX_REQUESTS_PER_MINUTE = '100000';
process.env.AUTH_MAX_ATTEMPTS = '1000';

import { startTestServer, client } from './helpers.js';

/** Phase 1 platform work: SQL-backed search facets, durable job queue, persistent rate limits. */
describe('platform: server-side search facets, job queue, persistent rate limits', () => {
  let baseUrl = '';
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;

  before(async () => {
    const server = await startTestServer();
    baseUrl = server.baseUrl;
    close = server.close;
    api = client(baseUrl);
  });
  after(async () => close());

  const search = async (qs: string) => fetch(`${baseUrl}/properties/public?${qs}`).then((r) => r.json());

  test('room type, food, amenity, rating and gender facets are applied in SQL', async () => {
    const all = await search('page=1&pageSize=500');
    assert.ok(all.metadata.total > 200);

    const single = await search('page=1&pageSize=500&roomTypes=single');
    assert.ok(single.metadata.total > 0);
    assert.ok(single.data.every((p: any) => p.rooms.some((r: any) => /single|private/i.test(r.type))));
    // A type nobody offers yields nothing, proving the filter is applied rather than ignored.
    const { properties } = await import('../../server/db/repositories.js');
    const probe = properties.list({ status: 'published' }, { limit: 1 })[0];
    probe.rooms = probe.rooms.map((r: any) => ({ ...r, type: 'Custom' }));
    properties.replace(probe);
    const custom = await search('page=1&pageSize=500&roomTypes=single');
    assert.equal(custom.metadata.total, single.metadata.total - 1);

    const food = await search('page=1&pageSize=500&food=true');
    assert.ok(food.data.every((p: any) => p.pricing.foodMess.type !== 'Not Available'));

    const wifi = await search('page=1&pageSize=500&amenities=wifi');
    assert.ok(wifi.metadata.total > 0);
    assert.ok(wifi.data.every((p: any) => p.amenities.some((a: any) => a.isAvailable && /wi-?fi/i.test(a.name))));

    const rated = await search('page=1&pageSize=500&minRating=4.5');
    assert.ok(rated.data.every((p: any) => p.systemMetrics.averageRating >= 4.5));

    const women = await search('page=1&pageSize=500&category=Women');
    assert.ok(women.data.every((p: any) => p.category === 'Women'));

    // Facets combine (AND) and pagination metadata stays consistent.
    const combo = await search('page=1&pageSize=5&roomTypes=single,double&food=true&minRating=4');
    assert.ok(combo.metadata.total <= all.metadata.total);
    assert.ok(combo.data.length <= 5);
    assert.equal(combo.metadata.totalPages, Math.max(1, Math.ceil(combo.metadata.total / 5)));
  });

  test('nearest sort orders by distance from the given point and respects the radius', async () => {
    const hyd = await search('page=1&pageSize=500&city=Hyderabad');
    const anchor = hyd.data.find((p: any) => p.location.latitude && p.location.longitude);
    assert.ok(anchor, 'seed listings carry coordinates');
    const { latitude: lat, longitude: lng } = anchor.location;
    const near = await search(`page=1&pageSize=50&lat=${lat}&lng=${lng}&radiusKm=10&sort=nearest`);
    assert.ok(near.metadata.total > 0);
    const dist = (p: any) =>
      Math.hypot(p.location.latitude - lat, (p.location.longitude - lng) * Math.cos((lat * Math.PI) / 180));
    for (let i = 1; i < near.data.length; i++) assert.ok(dist(near.data[i - 1]) <= dist(near.data[i]) + 1e-9);
    assert.ok(near.data.every((p: any) => dist(p) * 111 <= 10 * 1.5));
    // Without coordinates the sort silently falls back to relevance rather than erroring.
    const fallback = await search('page=1&pageSize=5&sort=nearest');
    assert.equal(fallback.success, true);
  });

  test('job queue: jobs run, retry with backoff, exhaust to failed, and dedupe by key', async () => {
    const { enqueue, registerJob, runQueueOnce, getJob, queueStats } = await import('../../server/lib/queue.js');
    const { getDb } = await import('../../server/db/database.js');
    let calls = 0;
    registerJob('test.flaky', async (payload) => {
      calls += 1;
      if (calls < Number(payload.succeedOn)) throw new Error(`boom ${calls}`);
    });
    const job = enqueue('test.flaky', { succeedOn: 2 }, { maxAttempts: 3 });
    await runQueueOnce();
    let state = getJob(job.id)!;
    assert.equal(state.status, 'pending');
    assert.equal(state.attempts, 1);
    assert.match(state.lastError || '', /boom 1/);
    assert.ok(Date.parse(state.runAt) > Date.now(), 'backoff scheduled in the future');
    // Force it due and run again → succeeds.
    getDb().prepare('UPDATE job_queue SET run_at = ? WHERE id = ?').run(new Date(0).toISOString(), job.id);
    await runQueueOnce();
    state = getJob(job.id)!;
    assert.equal(state.status, 'done');
    assert.equal(state.attempts, 2);

    // Exhaustion → failed.
    calls = 0;
    const doomed = enqueue('test.flaky', { succeedOn: 99 }, { maxAttempts: 2 });
    for (let i = 0; i < 2; i++) {
      getDb().prepare('UPDATE job_queue SET run_at = ? WHERE id = ?').run(new Date(0).toISOString(), doomed.id);
      await runQueueOnce();
    }
    assert.equal(getJob(doomed.id)!.status, 'failed');

    // Dedupe.
    const a = enqueue('test.flaky', { succeedOn: 1 }, { dedupeKey: 'same', delayMs: 60_000 });
    const b = enqueue('test.flaky', { succeedOn: 1 }, { dedupeKey: 'same', delayMs: 60_000 });
    assert.equal(a.id, b.id);
    assert.ok(queueStats().done >= 1);
  });

  test('notifications are delivered through the queue and recorded in the outbox', async () => {
    const { enqueue, runQueueOnce } = await import('../../server/lib/queue.js');
    const { outbox, users } = await import('../../server/db/repositories.js');
    const tenant = users.findByEmail('tenant@nestin.com')!;
    const before = outbox.count({ recipient: tenant.email });
    enqueue('notification.deliver', {
      userId: tenant.id,
      notif: { title: 'Queue test', message: 'Delivered via the job queue', type: 'system' },
    });
    await runQueueOnce();
    assert.equal(outbox.count({ recipient: tenant.email }), before + 1);
  });

  test('rate limits persist in the database and reset after the window', async () => {
    const { rateLimit } = await import('../../server/lib/rateLimit.js');
    const { getDb } = await import('../../server/db/database.js');
    const limiter = rateLimit({ name: 'unit', windowMs: 60_000, max: 2 });
    const fakeReq = { headers: {}, socket: { remoteAddress: '10.0.0.9' }, app: { get: () => false } } as any;
    const headers: Record<string, string> = {};
    const fakeRes = { setHeader: (k: string, v: string) => (headers[k] = v) } as any;
    const outcomes: Array<string | undefined> = [];
    for (let i = 0; i < 3; i++) limiter(fakeReq, fakeRes, (err?: any) => outcomes.push(err?.code));
    assert.deepEqual(outcomes, [undefined, undefined, 'RATE_LIMITED']);
    const row = getDb().prepare("SELECT count FROM rate_limits WHERE key LIKE 'unit:10.0.0.9:%'").get() as any;
    assert.equal(row.count, 3);
    // Expire the window → counter restarts.
    getDb()
      .prepare("UPDATE rate_limits SET reset_at = ? WHERE key LIKE 'unit:%'")
      .run(Date.now() - 1);
    outcomes.length = 0;
    limiter(fakeReq, fakeRes, (err?: any) => outcomes.push(err?.code));
    assert.deepEqual(outcomes, [undefined]);
  });

  test('health reports the queue and error-tracking status', async () => {
    const health = await api.get('/health');
    assert.equal(typeof health.data.queue.pending, 'number');
    assert.equal(health.data.errorTracking, false);
  });
});
