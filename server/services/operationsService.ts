import {
  properties,
  customers,
  payments,
  bookings,
  employees,
  users,
  supportTickets,
  expenses,
  utilityReadings,
  tasks,
  type ExpenseRecord,
  type UtilityReadingRecord,
  type TaskRecord,
  type StoredCustomer,
} from '../db/repositories.js';
import { Collection } from '../db/database.js';
import { badRequest, notFound, conflict } from '../lib/errors.js';
import { newId } from '../lib/ids.js';
import * as v from '../lib/validate.js';
import { events, type EventContext } from '../lib/events.js';
import type { AuthUser } from '../middleware/auth.js';
import { notifyUser, recordPayment } from './crmService.js';
import { setBedStatus, syncBedAvailability } from './propertyService.js';

/**
 * Owner operations beyond the CRM: money out (expenses), utilities billed back to residents,
 * a task board for staff, and the derived reports (P&L, occupancy forecast, property comparison).
 * Everything is scoped to one owner workspace.
 */

const nowIso = () => new Date().toISOString();
const DAY_MS = 86_400_000;

export const EXPENSE_CATEGORIES = [
  'Rent / Lease',
  'Salaries',
  'Electricity',
  'Water',
  'Internet',
  'Food & Groceries',
  'Maintenance & Repairs',
  'Housekeeping',
  'Marketing',
  'Insurance',
  'Taxes & Fees',
  'Other',
] as const;

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function ownedProperty(ownerId: string, propertyId: string | undefined) {
  if (!propertyId) return null;
  const prop = properties.get(propertyId);
  if (!prop || prop.ownerId !== ownerId) throw notFound('Property');
  return prop;
}

// ---------------------------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------------------------

export function listExpenses(
  ownerId: string,
  filter: { propertyId?: string; month?: string; category?: string } = {}
): ExpenseRecord[] {
  return expenses
    .list({ owner_id: ownerId, property_id: filter.propertyId, category: filter.category }, { limit: 5000 })
    .filter((e) => !filter.month || monthKey(e.date) === filter.month)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function addExpense(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): ExpenseRecord {
  const prop = ownedProperty(ownerId, v.optionalStr(body.propertyId, 'Property', 80) || undefined);
  const record: ExpenseRecord = {
    id: newId('exp'),
    ownerId,
    propertyId: prop?.id,
    propertyName: prop?.name,
    category: v.oneOf(body.category, EXPENSE_CATEGORIES, 'Category', 'Other'),
    amount: v.money(body.amount, 'Amount', { min: 1, max: 100_000_000 }),
    date: v.isoDate(body.date ?? nowIso().slice(0, 10), 'Date'),
    description: v.optionalStr(body.description, 'Description', 500) || '',
    vendor: v.optionalStr(body.vendor, 'Vendor', 120) || undefined,
    receiptUrl: v.optionalStr(body.receiptUrl, 'Receipt', 500) || undefined,
    recurring: body.recurring === 'monthly' ? 'monthly' : undefined,
    createdBy: actor.fullName,
    createdAt: nowIso(),
  };
  if (record.receiptUrl && !/^(\/api\/v1\/files\/|\/uploads\/|https:\/\/)/.test(record.receiptUrl))
    throw badRequest('Receipt must be an uploaded file');
  expenses.insert(record);
  events.publish(
    'ExpenseRecorded',
    'Expense',
    record.id,
    { amount: record.amount, category: record.category },
    {
      ...ctx,
      actorId: actor.id,
      actorRole: actor.role,
      ownerId,
    }
  );
  return record;
}

export function updateExpense(ownerId: string, id: string, body: Record<string, unknown>): ExpenseRecord {
  const existing = expenses.get(id);
  if (!existing || existing.ownerId !== ownerId) throw notFound('Expense');
  const prop =
    body.propertyId !== undefined
      ? ownedProperty(ownerId, v.optionalStr(body.propertyId, 'Property', 80) || undefined)
      : undefined;
  const updated: ExpenseRecord = {
    ...existing,
    ...(prop !== undefined ? { propertyId: prop?.id, propertyName: prop?.name } : {}),
    category:
      body.category !== undefined
        ? v.oneOf(body.category, EXPENSE_CATEGORIES, 'Category', existing.category)
        : existing.category,
    amount: body.amount !== undefined ? v.money(body.amount, 'Amount', { min: 1, max: 100_000_000 }) : existing.amount,
    date: body.date !== undefined ? v.isoDate(body.date, 'Date') : existing.date,
    description:
      body.description !== undefined ? v.optionalStr(body.description, 'Description', 500) || '' : existing.description,
    vendor: body.vendor !== undefined ? v.optionalStr(body.vendor, 'Vendor', 120) || undefined : existing.vendor,
    recurring:
      body.recurring !== undefined ? (body.recurring === 'monthly' ? 'monthly' : undefined) : existing.recurring,
  };
  return expenses.replace(updated);
}

export function deleteExpense(ownerId: string, id: string): boolean {
  const existing = expenses.get(id);
  if (!existing || existing.ownerId !== ownerId) throw notFound('Expense');
  return expenses.remove(id);
}

// ---------------------------------------------------------------------------------------------
// Profit & loss
// ---------------------------------------------------------------------------------------------

export interface PropertyPnL {
  propertyId: string;
  propertyName: string;
  income: number;
  expenses: number;
  netOperatingIncome: number;
  margin: number;
  incomeByType: Record<string, number>;
  expensesByCategory: Record<string, number>;
}

export interface ProfitAndLoss {
  month: string;
  income: number;
  expenses: number;
  netOperatingIncome: number;
  margin: number;
  platformFees: number;
  properties: PropertyPnL[];
  expensesByCategory: Record<string, number>;
  incomeByType: Record<string, number>;
  /** Trailing six months for the chart. */
  trend: Array<{ month: string; income: number; expenses: number; net: number }>;
}

function sumBy<T>(rows: T[], key: (r: T) => string, amount: (r: T) => number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[key(r)] = (out[key(r)] || 0) + amount(r);
  return out;
}

export function profitAndLoss(ownerId: string, month = nowIso().slice(0, 7)): ProfitAndLoss {
  const paid = payments.list({ owner_id: ownerId, status: 'Paid' }, { limit: 100000 });
  const spent = expenses.list({ owner_id: ownerId }, { limit: 100000 });
  const inMonth = (iso: string) => monthKey(iso) === month;
  const incomeRows = paid.filter((p) => inMonth(p.date || p.createdAt) && p.type !== 'Subscription');
  const expenseRows = spent.filter((e) => inMonth(e.date));
  const income = incomeRows.reduce((a, p) => a + p.amount, 0);
  const platformFees = incomeRows.reduce((a, p) => a + (p.platformFee || 0), 0);
  const expenseTotal = expenseRows.reduce((a, e) => a + e.amount, 0);
  const props = properties.list({ owner_id: ownerId }, { limit: 5000 });
  const perProperty: PropertyPnL[] = props.map((prop) => {
    const inc = incomeRows.filter((p) => p.propertyId === prop.id);
    const exp = expenseRows.filter((e) => e.propertyId === prop.id);
    const i = inc.reduce((a, p) => a + p.amount, 0);
    const e = exp.reduce((a, x) => a + x.amount, 0);
    return {
      propertyId: prop.id,
      propertyName: prop.name,
      income: i,
      expenses: e,
      netOperatingIncome: i - e,
      margin: i > 0 ? Math.round(((i - e) / i) * 100) : 0,
      incomeByType: sumBy(
        inc,
        (p) => p.type,
        (p) => p.amount
      ),
      expensesByCategory: sumBy(
        exp,
        (x) => x.category,
        (x) => x.amount
      ),
    };
  });
  const trend: ProfitAndLoss['trend'] = [];
  const [y, m] = month.split('-').map(Number);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const inc = paid
      .filter((p) => monthKey(p.date || p.createdAt) === key && p.type !== 'Subscription')
      .reduce((a, p) => a + p.amount, 0);
    const exp = spent.filter((e) => monthKey(e.date) === key).reduce((a, e) => a + e.amount, 0);
    trend.push({ month: key, income: inc, expenses: exp, net: inc - exp });
  }
  return {
    month,
    income,
    expenses: expenseTotal,
    netOperatingIncome: income - expenseTotal,
    margin: income > 0 ? Math.round(((income - expenseTotal) / income) * 100) : 0,
    platformFees,
    properties: perProperty,
    expensesByCategory: sumBy(
      expenseRows,
      (e) => e.category,
      (e) => e.amount
    ),
    incomeByType: sumBy(
      incomeRows,
      (p) => p.type,
      (p) => p.amount
    ),
    trend,
  };
}

// ---------------------------------------------------------------------------------------------
// Utility billing (meter readings split across a room's residents)
// ---------------------------------------------------------------------------------------------

export function listUtilityReadings(ownerId: string, propertyId?: string): UtilityReadingRecord[] {
  return utilityReadings
    .list({ owner_id: ownerId, property_id: propertyId }, { limit: 5000 })
    .sort((a, b) => (a.readingDate < b.readingDate ? 1 : -1));
}

function activeResidentsInRoom(ownerId: string, propertyId: string, roomId: string): StoredCustomer[] {
  return customers
    .list({ owner_id: ownerId, property_id: propertyId })
    .filter((c) => c.roomId === roomId && (c.tenantStatus === 'Active' || c.tenantStatus === 'Vacating'));
}

export function addUtilityReading(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): UtilityReadingRecord {
  const prop = ownedProperty(ownerId, v.str(body.propertyId, 'Property', { max: 80 }));
  if (!prop) throw notFound('Property');
  const roomId = v.str(body.roomId, 'Room', { max: 80 });
  const room = prop.rooms.find((r) => r.id === roomId);
  if (!room) throw notFound('Room');
  const meter = v.oneOf(body.meter, ['electricity', 'water', 'gas'] as const, 'Meter', 'electricity');
  const previousAuto = listUtilityReadings(ownerId, prop.id).find((r) => r.roomId === roomId && r.meter === meter);
  const previousReading = v.num(body.previousReading ?? previousAuto?.currentReading ?? 0, 'Previous reading', {
    min: 0,
    max: 1e9,
  });
  const currentReading = v.num(body.currentReading, 'Current reading', { min: 0, max: 1e9 });
  if (currentReading < previousReading) throw badRequest('Current reading cannot be lower than the previous reading');
  const ratePerUnit = v.money(body.ratePerUnit ?? prop.pricing?.electricity?.amount ?? 8, 'Rate per unit', {
    min: 0,
    max: 10000,
  });
  const fixedCharges = v.money(body.fixedCharges ?? 0, 'Fixed charges', { min: 0, max: 1_000_000, required: false });
  const units = Math.round((currentReading - previousReading) * 100) / 100;
  const amount = Math.round((units * ratePerUnit + fixedCharges) * 100) / 100;
  const residents = activeResidentsInRoom(ownerId, prop.id, roomId);
  const splitAmong = Math.max(
    1,
    v.num(body.splitAmong ?? residents.length ?? 1, 'Split among', { min: 1, max: 20, integer: true })
  );
  const record: UtilityReadingRecord = {
    id: newId('util'),
    ownerId,
    propertyId: prop.id,
    propertyName: prop.name,
    roomId,
    roomName: room.name,
    meter,
    readingDate: v.isoDate(body.readingDate ?? nowIso().slice(0, 10), 'Reading date'),
    previousReading,
    currentReading,
    unitsConsumed: units,
    ratePerUnit,
    fixedCharges,
    amount,
    splitAmong,
    perResident: Math.round((amount / splitAmong) * 100) / 100,
    status: 'draft',
    billedPaymentIds: [],
    recordedBy: actor.fullName,
    createdAt: nowIso(),
  };
  utilityReadings.insert(record);
  events.publish(
    'UtilityReadingRecorded',
    'UtilityReading',
    record.id,
    { meter, units, amount },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return record;
}

/** Raises a pending Electricity/Water charge for every active resident of the room and notifies them. */
export function billUtilityReading(
  actor: AuthUser,
  ownerId: string,
  id: string,
  ctx: EventContext
): UtilityReadingRecord {
  const reading = utilityReadings.get(id);
  if (!reading || reading.ownerId !== ownerId) throw notFound('Utility reading');
  if (reading.status === 'billed') throw conflict('This reading has already been billed');
  const residents = activeResidentsInRoom(ownerId, reading.propertyId, reading.roomId);
  if (!residents.length) throw badRequest('No active residents in this room to bill');
  const share = Math.round((reading.amount / residents.length) * 100) / 100;
  return Collection.transaction(() => {
    const ids: string[] = [];
    for (const resident of residents) {
      const payment = recordPayment({
        ownerId,
        tenantId: resident.tenantId,
        customerId: resident.id,
        bookingId: resident.bookingId,
        propertyId: reading.propertyId,
        propertyName: reading.propertyName,
        tenantName: resident.fullName,
        amount: share,
        type: 'Electricity',
        method: 'UPI / GPay',
        status: 'Pending',
        gateway: 'manual',
        description: `${reading.meter[0].toUpperCase()}${reading.meter.slice(1)} for ${reading.roomName} — ${reading.unitsConsumed} units × ₹${reading.ratePerUnit}${reading.fixedCharges ? ` + ₹${reading.fixedCharges} fixed` : ''}, split ${residents.length} ways`,
      });
      ids.push(payment.id);
      if (resident.tenantId)
        notifyUser(resident.tenantId, {
          title: `${reading.meter[0].toUpperCase()}${reading.meter.slice(1)} bill: ₹${share.toLocaleString('en-IN')}`,
          message: `Your share of the ${reading.roomName} ${reading.meter} bill (${reading.unitsConsumed} units) is due. Pay from the Payments page.`,
          type: 'payment',
          linkTo: '/payments',
        });
    }
    reading.status = 'billed';
    reading.billedAt = nowIso();
    reading.splitAmong = residents.length;
    reading.perResident = share;
    reading.billedPaymentIds = ids;
    utilityReadings.replace(reading);
    events.publish(
      'UtilityBilled',
      'UtilityReading',
      reading.id,
      { residents: ids.length, share },
      { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
    );
    return reading;
  });
}

export function deleteUtilityReading(ownerId: string, id: string): boolean {
  const reading = utilityReadings.get(id);
  if (!reading || reading.ownerId !== ownerId) throw notFound('Utility reading');
  if (reading.status === 'billed') throw conflict('Billed readings cannot be deleted');
  return utilityReadings.remove(id);
}

// ---------------------------------------------------------------------------------------------
// Task board
// ---------------------------------------------------------------------------------------------

export function listTasks(ownerId: string, filter: { assigneeId?: string; status?: string } = {}): TaskRecord[] {
  return tasks
    .list({ owner_id: ownerId, assignee_id: filter.assigneeId, status: filter.status }, { limit: 5000 })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      if (a.status !== b.status) return a.status === 'done' ? 1 : b.status === 'done' ? -1 : 0;
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
      return (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1;
    });
}

function resolveAssignee(ownerId: string, assigneeId: string | undefined) {
  if (!assigneeId) return null;
  const emp = employees.get(assigneeId);
  if (!emp || emp.ownerId !== ownerId) throw notFound('Employee');
  // Staff records created before login accounts existed may lack the link; resolve it by email.
  if (!emp.userId && emp.email) emp.userId = users.findByEmail(emp.email)?.id;
  return emp;
}

export function createTask(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): TaskRecord {
  const prop = ownedProperty(ownerId, v.optionalStr(body.propertyId, 'Property', 80) || undefined);
  const assignee = resolveAssignee(ownerId, v.optionalStr(body.assigneeId, 'Assignee', 80) || undefined);
  const task: TaskRecord = {
    id: newId('task'),
    ownerId,
    title: v.str(body.title, 'Title', { max: 160 }),
    description: v.optionalStr(body.description, 'Description', 2000) || '',
    propertyId: prop?.id,
    propertyName: prop?.name,
    assigneeId: assignee?.id,
    assigneeName: assignee?.name,
    assigneeUserId: assignee?.userId,
    priority: v.oneOf(body.priority, ['low', 'medium', 'high'] as const, 'Priority', 'medium'),
    status: 'todo',
    dueDate: body.dueDate ? v.isoDate(body.dueDate, 'Due date') : undefined,
    category: v.oneOf(
      body.category,
      ['cleaning', 'maintenance', 'collection', 'visit', 'inspection', 'other'] as const,
      'Category',
      'other'
    ),
    createdBy: actor.fullName,
    createdByUserId: actor.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  tasks.insert(task);
  if (task.assigneeUserId && task.assigneeUserId !== actor.id)
    notifyUser(task.assigneeUserId, {
      title: 'New task assigned',
      message: `${task.title}${task.propertyName ? ` at ${task.propertyName}` : ''}${task.dueDate ? ` — due ${task.dueDate}` : ''}.`,
      type: 'system',
      linkTo: '/owner/tasks',
    });
  events.publish(
    'TaskCreated',
    'Task',
    task.id,
    { title: task.title, assigneeId: task.assigneeId },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return task;
}

export function updateTask(
  actor: AuthUser,
  ownerId: string,
  id: string,
  body: Record<string, unknown>,
  ctx: EventContext
): TaskRecord {
  const task = tasks.get(id);
  if (!task || task.ownerId !== ownerId) throw notFound('Task');
  // Staff may only move their own tasks; owners and permitted managers may edit anything.
  if (actor.role === 'employee' && !actor.permissions?.['customers.edit'] && task.assigneeUserId !== actor.id)
    throw badRequest('You can only update tasks assigned to you');
  const assignee =
    body.assigneeId !== undefined
      ? resolveAssignee(ownerId, v.optionalStr(body.assigneeId, 'Assignee', 80) || undefined)
      : undefined;
  const status =
    body.status !== undefined
      ? v.oneOf(body.status, ['todo', 'in_progress', 'done'] as const, 'Status', task.status)
      : task.status;
  const updated: TaskRecord = {
    ...task,
    title: body.title !== undefined ? v.str(body.title, 'Title', { max: 160 }) : task.title,
    description:
      body.description !== undefined ? v.optionalStr(body.description, 'Description', 2000) || '' : task.description,
    priority:
      body.priority !== undefined
        ? v.oneOf(body.priority, ['low', 'medium', 'high'] as const, 'Priority', task.priority)
        : task.priority,
    dueDate:
      body.dueDate !== undefined ? (body.dueDate ? v.isoDate(body.dueDate, 'Due date') : undefined) : task.dueDate,
    ...(assignee !== undefined
      ? { assigneeId: assignee?.id, assigneeName: assignee?.name, assigneeUserId: assignee?.userId }
      : {}),
    status,
    completedAt: status === 'done' ? task.completedAt || nowIso() : undefined,
    completedBy: status === 'done' ? task.completedBy || actor.fullName : undefined,
    updatedAt: nowIso(),
  };
  tasks.replace(updated);
  events.publish('TaskUpdated', 'Task', id, { status }, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId });
  return updated;
}

export function deleteTask(ownerId: string, id: string): boolean {
  const task = tasks.get(id);
  if (!task || task.ownerId !== ownerId) throw notFound('Task');
  return tasks.remove(id);
}

// ---------------------------------------------------------------------------------------------
// Occupancy forecast & property comparison
// ---------------------------------------------------------------------------------------------

export interface OccupancyForecast {
  totalBeds: number;
  occupiedNow: number;
  occupancyNow: number;
  horizons: Array<{
    days: number;
    expectedMoveOuts: number;
    expectedMoveIns: number;
    projectedOccupied: number;
    projectedOccupancy: number;
    vacatingResidents: Array<{
      customerId: string;
      name: string;
      propertyName: string;
      roomName: string;
      date: string;
    }>;
  }>;
  byProperty: Array<{
    propertyId: string;
    propertyName: string;
    totalBeds: number;
    occupied: number;
    occupancy: number;
    projected90: number;
  }>;
}

export function occupancyForecast(ownerId: string, now = new Date()): OccupancyForecast {
  const props = properties.list({ owner_id: ownerId }, { limit: 5000 }).filter((p) => p.status !== 'archived');
  const residents = customers.list({ owner_id: ownerId }, { limit: 100000 });
  const upcoming = bookings
    .list({ owner_id: ownerId }, { limit: 100000 })
    .filter((b) => b.bookingStatus === 'Confirmed' && Date.parse(b.moveInDate) > now.getTime());
  const bedsOf = (p: (typeof props)[number]) => p.rooms.reduce((n, r) => n + r.beds.length, 0);
  const occupiedOf = (p: (typeof props)[number]) =>
    p.rooms.reduce((n, r) => n + r.beds.filter((b) => b.isOccupied).length, 0);
  const totalBeds = props.reduce((n, p) => n + bedsOf(p), 0);
  const occupiedNow = props.reduce((n, p) => n + occupiedOf(p), 0);
  const horizons = [30, 60, 90].map((days) => {
    const until = now.getTime() + days * DAY_MS;
    const vacating = residents.filter(
      (c) =>
        (c.tenantStatus === 'Active' || c.tenantStatus === 'Vacating') &&
        c.expectedMoveOutDate &&
        Date.parse(c.expectedMoveOutDate) <= until &&
        Date.parse(c.expectedMoveOutDate) >= now.getTime()
    );
    const moveIns = upcoming.filter((b) => Date.parse(b.moveInDate) <= until).length;
    const projected = Math.max(0, Math.min(totalBeds, occupiedNow - vacating.length + moveIns));
    return {
      days,
      expectedMoveOuts: vacating.length,
      expectedMoveIns: moveIns,
      projectedOccupied: projected,
      projectedOccupancy: totalBeds ? Math.round((projected / totalBeds) * 100) : 0,
      vacatingResidents: vacating.slice(0, 20).map((c) => ({
        customerId: c.id,
        name: c.fullName,
        propertyName: c.propertyName,
        roomName: c.roomName,
        date: c.expectedMoveOutDate!,
      })),
    };
  });
  const byProperty = props.map((p) => {
    const beds = bedsOf(p);
    const occ = occupiedOf(p);
    const outs = residents.filter(
      (c) =>
        c.propertyId === p.id &&
        c.expectedMoveOutDate &&
        Date.parse(c.expectedMoveOutDate) <= now.getTime() + 90 * DAY_MS &&
        Date.parse(c.expectedMoveOutDate) >= now.getTime()
    ).length;
    const ins = upcoming.filter(
      (b) => b.propertyId === p.id && Date.parse(b.moveInDate) <= now.getTime() + 90 * DAY_MS
    ).length;
    return {
      propertyId: p.id,
      propertyName: p.name,
      totalBeds: beds,
      occupied: occ,
      occupancy: beds ? Math.round((occ / beds) * 100) : 0,
      projected90: beds ? Math.round((Math.max(0, Math.min(beds, occ - outs + ins)) / beds) * 100) : 0,
    };
  });
  return {
    totalBeds,
    occupiedNow,
    occupancyNow: totalBeds ? Math.round((occupiedNow / totalBeds) * 100) : 0,
    horizons,
    byProperty,
  };
}

export interface PropertyComparisonRow {
  propertyId: string;
  propertyName: string;
  city: string;
  status: string;
  totalBeds: number;
  occupancy: number;
  expectedRent: number;
  collectedThisMonth: number;
  collectionRate: number;
  overdueResidents: number;
  revenue30d: number;
  expenses30d: number;
  openTickets: number;
  rating: number;
  reviews: number;
  views: number;
  leads30d: number;
}

export function propertyComparison(ownerId: string, now = new Date()): PropertyComparisonRow[] {
  const month = monthKey(now.toISOString());
  const since30 = now.getTime() - 30 * DAY_MS;
  const props = properties.list({ owner_id: ownerId }, { limit: 5000 });
  const residents = customers.list({ owner_id: ownerId }, { limit: 100000 });
  const paid = payments.list({ owner_id: ownerId, status: 'Paid' }, { limit: 100000 });
  const spent = expenses.list({ owner_id: ownerId }, { limit: 100000 });
  const tickets = supportTickets.list({ owner_id: ownerId }, { limit: 100000 });
  const leadRows = bookings.list({ owner_id: ownerId }, { limit: 100000 });
  return props.map((p) => {
    const beds = p.rooms.reduce((n, r) => n + r.beds.length, 0);
    const occ = p.rooms.reduce((n, r) => n + r.beds.filter((b) => b.isOccupied).length, 0);
    const active = residents.filter(
      (c) => c.propertyId === p.id && (c.tenantStatus === 'Active' || c.tenantStatus === 'Vacating')
    );
    const expectedRent = active.reduce((n, c) => n + (c.monthlyRent || 0), 0);
    const collected = paid
      .filter((x) => x.propertyId === p.id && x.type === 'Rent' && monthKey(x.date || x.createdAt) === month)
      .reduce((n, x) => n + x.amount, 0);
    return {
      propertyId: p.id,
      propertyName: p.name,
      city: p.location?.city || '',
      status: p.status,
      totalBeds: beds,
      occupancy: beds ? Math.round((occ / beds) * 100) : 0,
      expectedRent,
      collectedThisMonth: collected,
      collectionRate: expectedRent ? Math.min(100, Math.round((collected / expectedRent) * 100)) : 0,
      overdueResidents: active.filter((c) => c.paymentStatus === 'Overdue' || c.paymentStatus === 'Pending').length,
      revenue30d: paid
        .filter((x) => x.propertyId === p.id && Date.parse(x.date || x.createdAt) >= since30)
        .reduce((n, x) => n + x.amount, 0),
      expenses30d: spent
        .filter((e) => e.propertyId === p.id && Date.parse(e.date) >= since30)
        .reduce((n, e) => n + e.amount, 0),
      openTickets: tickets.filter((t) => t.pgName === p.name && !/resolved/i.test(t.status)).length,
      rating: p.systemMetrics?.averageRating || 0,
      reviews: p.systemMetrics?.totalReviews || 0,
      views: p.systemMetrics?.viewsCount || 0,
      leads30d: leadRows.filter((b) => b.propertyId === p.id && Date.parse(b.createdAt) >= since30).length,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// CSV import of existing residents
// ---------------------------------------------------------------------------------------------

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  customers: StoredCustomer[];
}

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const IMPORT_HEADERS = [
  'fullName',
  'phone',
  'email',
  'property',
  'room',
  'bed',
  'monthlyRent',
  'securityDeposit',
  'moveInDate',
  'expectedMoveOutDate',
];

export function importResidentsCsv(actor: AuthUser, ownerId: string, csv: string, ctx: EventContext): ImportResult {
  if (typeof csv !== 'string' || !csv.trim()) throw badRequest('CSV content is required');
  if (csv.length > 2 * 1024 * 1024) throw badRequest('CSV is too large (2 MB max)');
  const rows = parseCsv(csv);
  if (rows.length < 2) throw badRequest('CSV needs a header row and at least one resident');
  const header = rows[0].map((h) =>
    h
      .trim()
      .replace(/\s+/g, '')
      .replace(/^./, (c) => c.toLowerCase())
  );
  const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const idx = Object.fromEntries(IMPORT_HEADERS.map((h) => [h, col(h)])) as Record<string, number>;
  for (const required of ['fullName', 'phone', 'property', 'room']) {
    if (idx[required] < 0)
      throw badRequest(`CSV is missing the "${required}" column. Expected: ${IMPORT_HEADERS.join(', ')}`);
  }
  const props = properties.list({ owner_id: ownerId }, { limit: 5000 });
  const existing = customers.list({ owner_id: ownerId }, { limit: 100000 });
  const result: ImportResult = { imported: 0, skipped: 0, errors: [], customers: [] };

  Collection.transaction(() => {
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const get = (name: string) => (idx[name] >= 0 ? (cells[idx[name]] || '').trim() : '');
      try {
        const fullName = v.str(get('fullName'), 'Full name', { max: 120 });
        const phone = v.str(get('phone'), 'Phone', { max: 20 });
        const email = get('email') ? v.email(get('email')) : '';
        const propKey = get('property').toLowerCase();
        const prop = props.find(
          (p) => p.id.toLowerCase() === propKey || p.name.toLowerCase() === propKey || p.slug === propKey
        );
        if (!prop) throw new Error(`Unknown property "${get('property')}"`);
        const roomKey = get('room').toLowerCase();
        const room = prop.rooms.find((x) => x.id.toLowerCase() === roomKey || x.name.toLowerCase() === roomKey);
        if (!room) throw new Error(`Unknown room "${get('room')}" in ${prop.name}`);
        const bedKey = get('bed').toLowerCase();
        const bed = bedKey
          ? room.beds.find((b) => b.id.toLowerCase() === bedKey || b.bedNumber.toLowerCase() === bedKey)
          : room.beds.find((b) => !b.isOccupied);
        if (!bed) throw new Error(bedKey ? `Unknown bed "${get('bed')}"` : `No free bed in ${room.name}`);
        if (existing.some((c) => c.phone === phone && (c.tenantStatus === 'Active' || c.tenantStatus === 'Upcoming'))) {
          result.skipped += 1;
          continue;
        }
        if (bed.isOccupied) throw new Error(`${room.name} / ${bed.bedNumber} is already occupied`);
        const monthlyRent = v.money(get('monthlyRent') || room.monthlyRent, 'Monthly rent', {
          min: 0,
          max: 10_000_000,
        });
        const securityDeposit = v.money(get('securityDeposit') || room.securityDeposit || 0, 'Security deposit', {
          min: 0,
          max: 10_000_000,
        });
        const moveInDate = v.isoDate(get('moveInDate') || nowIso().slice(0, 10), 'Move-in date');
        const expectedMoveOutDate = get('expectedMoveOutDate')
          ? v.isoDate(get('expectedMoveOutDate'), 'Move-out date')
          : undefined;
        const customer: StoredCustomer = {
          id: newId('cust'),
          ownerId,
          fullName,
          phone,
          email,
          propertyId: prop.id,
          propertyName: prop.name,
          propertyAddress: prop.location?.formattedAddress,
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          bedId: bed.id,
          bedNumber: bed.bedNumber,
          moveInDate,
          expectedMoveOutDate,
          monthlyRent,
          securityDeposit,
          paymentStatus: 'Paid',
          tenantStatus: Date.parse(moveInDate) > Date.now() ? 'Upcoming' : 'Active',
          notes: `Imported from CSV by ${actor.fullName} on ${nowIso().slice(0, 10)}.`,
          createdAt: nowIso(),
          documents: [],
          paymentHistory: [],
          visitHistory: [],
          timeline: [],
        };
        customers.insert(customer);
        const updatedProp = properties.get(prop.id)!;
        properties.replace(setBedStatus(updatedProp, room.id, bed.id, true, fullName));
        bed.isOccupied = true; // keep the in-memory copy consistent for later rows
        existing.push(customer);
        result.customers.push(customer);
        result.imported += 1;
      } catch (err) {
        result.errors.push({ row: r + 1, message: err instanceof Error ? err.message : String(err) });
      }
    }
  });
  for (const prop of props) syncBedAvailability(prop.id);
  events.publish(
    'ResidentsImported',
    'Workspace',
    ownerId,
    { imported: result.imported, skipped: result.skipped, errors: result.errors.length },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return result;
}

export const importTemplateCsv = () =>
  `${IMPORT_HEADERS.join(',')}\nAsha Rao,+91 98765 43210,asha@example.com,Banyan Stay Premium,Single Sharing Premium Suite,A,16500,33000,2026-10-01,2027-09-30\n`;
