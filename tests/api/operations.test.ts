import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { startTestServer, client, login, adminLogin, DEMO } from './helpers.js';

/** Phase 2: expenses & P&L, utility billing, task board, forecast, comparison, CSV import, admin funnel. */
describe('operations: expenses, P&L, utilities, tasks, forecast, comparison, import, growth analytics', () => {
  let close: () => Promise<void>;
  let api: ReturnType<typeof client>;
  let owner = '';
  let staff = '';
  let tenant = '';
  let admin = '';
  let propertyId = '';
  let roomId = '';

  before(async () => {
    const server = await startTestServer();
    close = server.close;
    api = client(server.baseUrl);
    owner = await login(api, DEMO.owner);
    staff = await login(api, DEMO.staff);
    tenant = await login(api, DEMO.tenant);
    admin = await adminLogin(api);
    const props = await api.get('/properties/owner', owner);
    const withResident = props.data.find((p: any) => p.rooms.some((r: any) => r.beds.some((b: any) => b.isOccupied)));
    propertyId = withResident.id;
    roomId = withResident.rooms.find((r: any) => r.beds.some((b: any) => b.isOccupied)).id;
  });
  after(async () => close());

  test('expenses are validated, scoped, and roll up into the monthly P&L per property', async () => {
    const bad = await api.post('/operations/expenses', { amount: -5, category: 'Bribes' }, owner);
    assert.equal(bad.status, 400);
    const month = new Date().toISOString().slice(0, 7);
    const e1 = await api.post(
      '/operations/expenses',
      {
        propertyId,
        category: 'Electricity',
        amount: 4200.5,
        date: `${month}-03`,
        description: 'BESCOM bill',
        vendor: 'BESCOM',
      },
      owner
    );
    assert.equal(e1.status, 201, e1.error?.message);
    const e2 = await api.post(
      '/operations/expenses',
      { category: 'Salaries', amount: 18000, date: `${month}-01` },
      owner
    );
    assert.equal(e2.status, 201);
    const foreign = await api.post('/operations/expenses', { propertyId: 'p-1', category: 'Other', amount: 10 }, owner);
    assert.equal(foreign.status, 404, 'cannot attach an expense to another owner listing');

    const list = await api.get(`/operations/expenses?month=${month}`, owner);
    assert.equal(list.data.expenses.length, 2);
    assert.ok(list.data.categories.includes('Electricity'));

    const pnl = await api.get(`/operations/pnl?month=${month}`, owner);
    assert.equal(pnl.status, 200);
    assert.equal(pnl.data.expenses, 22200.5);
    assert.equal(pnl.data.expensesByCategory.Electricity, 4200.5);
    const row = pnl.data.properties.find((p: any) => p.propertyId === propertyId);
    assert.equal(row.expenses, 4200.5);
    assert.equal(pnl.data.netOperatingIncome, pnl.data.income - pnl.data.expenses);
    assert.equal(pnl.data.trend.length, 6);

    const upd = await api.put(`/operations/expenses/${e1.data.id}`, { amount: 4000 }, owner);
    assert.equal(upd.data.amount, 4000);
    const del = await api.delete(`/operations/expenses/${e2.data.id}`, owner);
    assert.equal(del.data.deleted, true);

    // Staff without payments.manage cannot write; the tenant cannot read.
    assert.equal((await api.post('/operations/expenses', { category: 'Other', amount: 1 }, staff)).status, 403);
    assert.equal((await api.get('/operations/pnl', tenant)).status, 403);
  });

  test('utility readings compute units and amount, bill each active resident, and notify them', async () => {
    const reading = await api.post(
      '/operations/utilities',
      {
        propertyId,
        roomId,
        meter: 'electricity',
        previousReading: 1000,
        currentReading: 1120,
        ratePerUnit: 8,
        fixedCharges: 40,
      },
      owner
    );
    assert.equal(reading.status, 201, reading.error?.message);
    assert.equal(reading.data.unitsConsumed, 120);
    assert.equal(reading.data.amount, 1000);
    assert.equal(reading.data.status, 'draft');

    const lower = await api.post(
      '/operations/utilities',
      { propertyId, roomId, previousReading: 1120, currentReading: 1100 },
      owner
    );
    assert.equal(lower.status, 400);

    const before = (await api.get('/tenant/payments', tenant)).data.length;
    const billed = await api.post(`/operations/utilities/${reading.data.id}/bill`, {}, owner);
    assert.equal(billed.status, 200, billed.error?.message);
    assert.equal(billed.data.status, 'billed');
    assert.ok(billed.data.billedPaymentIds.length >= 1);
    assert.equal(billed.data.perResident, Math.round((1000 / billed.data.splitAmong) * 100) / 100);
    const again = await api.post(`/operations/utilities/${reading.data.id}/bill`, {}, owner);
    assert.equal(again.status, 409);
    assert.equal((await api.delete(`/operations/utilities/${reading.data.id}`, owner)).status, 409);

    // The demo resident lives in that room, so a pending Electricity charge appears on their Payments page.
    const after = await api.get('/tenant/payments', tenant);
    if (after.data.length > before) {
      const charge = after.data.find((p: any) => p.type === 'Electricity' && p.status === 'Pending');
      assert.ok(charge, 'resident sees a pending electricity charge');
    }
    // The next reading defaults its previous value to the last current reading.
    const next = await api.post('/operations/utilities', { propertyId, roomId, currentReading: 1200 }, owner);
    assert.equal(next.data.previousReading, 1120);
  });

  test('task board: owner assigns, staff can only move their own tasks, assignee is notified', async () => {
    const snap = await api.get('/rbac/snapshot', owner);
    const staffEmp = snap.data.employees.find((e: any) => e.email === DEMO.staff);
    const task = await api.post(
      '/operations/tasks',
      {
        title: 'Deep clean room 204',
        propertyId,
        assigneeId: staffEmp.id,
        priority: 'high',
        dueDate: '2026-12-01',
        category: 'cleaning',
      },
      owner
    );
    assert.equal(task.status, 201, task.error?.message);
    assert.equal(task.data.assigneeName, staffEmp.name);
    const other = await api.post('/operations/tasks', { title: 'Unassigned chore' }, owner);
    assert.equal(other.status, 201);

    const mine = await api.get('/operations/tasks?mine=true', staff);
    assert.ok(mine.data.some((t: any) => t.id === task.data.id));
    const move = await api.put(`/operations/tasks/${task.data.id}`, { status: 'in_progress' }, staff);
    assert.equal(move.status, 200, move.error?.message);
    // A staff member without customers.edit can only move their own tasks.
    const snapRoles = snap.data.roles as any[];
    const limitedRole = snapRoles.find((r: any) => !r.isOwnerRole && !r.permissions?.['customers.edit']);
    if (limitedRole) {
      const limited = await api.post(
        '/rbac/employees',
        {
          name: 'Limited Staff',
          email: 'limited-staff@example.com',
          phone: '+91 91111 11111',
          roleId: limitedRole.id,
          assignedProperties: ['all'],
        },
        owner
      );
      assert.equal(limited.status, 201, limited.error?.message);
      const limitedToken = await login(api, 'limited-staff@example.com', limited.data.temporaryPassword);
      const notMine = await api.put(`/operations/tasks/${other.data.id}`, { status: 'done' }, limitedToken);
      assert.ok(notMine.status === 400 || notMine.status === 403, String(notMine.status));
    }
    const done = await api.put(`/operations/tasks/${task.data.id}`, { status: 'done' }, owner);
    assert.ok(done.data.completedAt);

    const bad = await api.post('/operations/tasks', { title: '' }, owner);
    assert.equal(bad.status, 400);
    assert.equal((await api.delete(`/operations/tasks/${other.data.id}`, tenant)).status, 403);
    assert.equal((await api.delete(`/operations/tasks/${other.data.id}`, owner)).data.deleted, true);
  });

  test('occupancy forecast and property comparison are consistent with inventory', async () => {
    const forecast = await api.get('/operations/forecast', owner);
    assert.equal(forecast.status, 200);
    assert.ok(forecast.data.totalBeds > 0);
    assert.deepEqual(
      forecast.data.horizons.map((h: any) => h.days),
      [30, 60, 90]
    );
    for (const h of forecast.data.horizons) {
      assert.ok(h.projectedOccupied >= 0 && h.projectedOccupied <= forecast.data.totalBeds);
    }
    const props = await api.get('/properties/owner', owner);
    const beds = props.data.reduce(
      (n: number, p: any) => n + p.rooms.reduce((m: number, r: any) => m + r.beds.length, 0),
      0
    );
    assert.equal(forecast.data.totalBeds, beds);

    const cmp = await api.get('/operations/comparison', owner);
    assert.equal(cmp.status, 200);
    assert.equal(cmp.data.length, props.data.length);
    const row = cmp.data.find((r: any) => r.propertyId === propertyId);
    assert.ok(row.occupancy >= 0 && row.occupancy <= 100);
    assert.ok(row.collectionRate >= 0 && row.collectionRate <= 100);
    assert.equal(typeof row.expenses30d, 'number');
  });

  test('CSV import onboards residents onto free beds, reports row errors, and skips duplicates', async () => {
    const props = await api.get('/properties/owner', owner);
    const freeCount = (r: any) => r.beds.filter((b: any) => !b.isOccupied).length;
    const prop = props.data.find((p: any) => p.rooms.some((r: any) => freeCount(r) >= 2));
    const room = prop.rooms.find((r: any) => freeCount(r) >= 2);
    const freeBed = room.beds.find((b: any) => !b.isOccupied);
    const csv = [
      'fullName,phone,email,property,room,bed,monthlyRent,moveInDate',
      `Imported One,+91 90000 00001,one@example.com,${prop.name},${room.name},${freeBed.bedNumber},9000,2026-09-01`,
      `Imported One,+91 90000 00001,one@example.com,${prop.name},${room.name},,9000,2026-09-01`,
      `Broken Row,+91 90000 00002,,Nonexistent PG,${room.name},,9000,2026-09-01`,
      `"Quoted, Name",+91 90000 00003,q@example.com,${prop.id},${room.id},,,`,
    ].join('\n');
    const res = await api.post('/operations/import/residents', { csv }, owner);
    assert.equal(res.status, 201, res.error?.message);
    assert.equal(res.data.imported, 2);
    assert.equal(res.data.skipped, 1);
    assert.equal(res.data.errors.length, 1);
    assert.match(res.data.errors[0].message, /Unknown property/);
    assert.ok(res.data.customers.some((c: any) => c.fullName === 'Quoted, Name'));

    const after = await api.get('/properties/owner', owner);
    const bed = after.data
      .find((p: any) => p.id === prop.id)
      .rooms.find((r: any) => r.id === room.id)
      .beds.find((b: any) => b.id === freeBed.id);
    assert.equal(bed.isOccupied, true);
    assert.equal(bed.occupantName, 'Imported One');

    const missing = await api.post('/operations/import/residents', { csv: 'name,phone\nX,1' }, owner);
    assert.equal(missing.status, 400);
    assert.equal((await api.post('/operations/import/residents', { csv }, tenant)).status, 403);
  });

  test('admin growth analytics: funnel, churn, LTV, per-city and weekly series', async () => {
    const res = await api.get('/admin/analytics?days=30', admin);
    assert.equal(res.status, 200, res.error?.message);
    const a = res.data;
    assert.equal(a.windowDays, 30);
    for (const k of ['views', 'leads', 'visits', 'bookings', 'confirmed', 'movedIn'])
      assert.equal(typeof a.funnel[k], 'number');
    assert.ok(a.conversion.bookingToConfirmed >= 0 && a.conversion.bookingToConfirmed <= 100);
    assert.ok(a.churn.churnRate >= 0 && a.churn.churnRate <= 100);
    assert.ok(a.byCity.length > 0);
    assert.ok(a.weekly.length >= 4 && a.weekly.length <= 12);
    assert.equal((await api.get('/admin/analytics', owner)).status, 403);
  });
});
