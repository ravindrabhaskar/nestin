import {
  users,
  properties,
  bookings,
  payments,
  leads,
  customers,
  visitors,
  inboundRequests,
  auditEvents,
  sessions,
  employees,
  type UserRecord,
  type InboundRequest,
} from '../db/repositories.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { newId, ticketNumber } from '../lib/ids.js';
import * as v from '../lib/validate.js';
import { events, type EventContext } from '../lib/events.js';
import type { AuthUser } from '../middleware/auth.js';

export interface PlatformStats {
  users: { total: number; tenants: number; owners: number; employees: number; admins: number };
  properties: {
    total: number;
    published: number;
    pendingApproval: number;
    draft: number;
    rejected: number;
    archived: number;
  };
  bookings: { total: number; pending: number; confirmed: number; completed: number; cancelled: number };
  revenue: { totalCollected: number; last30Days: number; transactions: number };
  leads: number;
  customers: number;
  inbound: { newContacts: number; newDemoRequests: number };
  recentEvents: ReturnType<typeof auditEvents.list>;
}

export function stats(): PlatformStats {
  const allUsers = users.list({}, 100000);
  const allProps = properties.list();
  const allBookings = bookings.list();
  const allPayments = payments.list();
  const cutoff = Date.now() - 30 * 86400000;
  const count = <T>(arr: T[], pred: (x: T) => boolean) => arr.filter(pred).length;
  return {
    users: {
      total: allUsers.length,
      tenants: count(allUsers, (u) => u.role === 'tenant'),
      owners: count(allUsers, (u) => u.role === 'owner'),
      employees: count(allUsers, (u) => u.role === 'employee'),
      admins: count(allUsers, (u) => u.role === 'super_admin'),
    },
    properties: {
      total: allProps.length,
      published: count(allProps, (p) => p.status === 'published'),
      pendingApproval: count(allProps, (p) => p.status === 'pending_approval'),
      draft: count(allProps, (p) => p.status === 'draft'),
      rejected: count(allProps, (p) => p.status === 'rejected'),
      archived: count(allProps, (p) => p.status === 'archived'),
    },
    bookings: {
      total: allBookings.length,
      pending: count(allBookings, (b) => b.bookingStatus === 'Pending'),
      confirmed: count(allBookings, (b) => b.bookingStatus === 'Confirmed'),
      completed: count(allBookings, (b) => b.bookingStatus === 'Completed'),
      cancelled: count(allBookings, (b) => b.bookingStatus === 'Cancelled' || b.bookingStatus === 'Rejected'),
    },
    revenue: {
      totalCollected: allPayments.filter((p) => p.status === 'Paid').reduce((a, p) => a + p.amount, 0),
      last30Days: allPayments
        .filter((p) => p.status === 'Paid' && Date.parse(p.createdAt) > cutoff)
        .reduce((a, p) => a + p.amount, 0),
      transactions: allPayments.length,
    },
    leads: leads.count(),
    customers: customers.count(),
    inbound: {
      newContacts: inboundRequests.count({ kind: 'contact', status: 'new' }),
      newDemoRequests: inboundRequests.count({ kind: 'owner_demo', status: 'new' }),
    },
    recentEvents: auditEvents.list({ limit: 25 }),
  };
}

export interface PublicStats {
  publishedListings: number;
  verifiedListings: number;
  cities: number;
  bedsListed: number;
  residentsHoused: number;
  ownersOnboarded: number;
  citiesBreakdown: Array<{ city: string; listings: number; minRent: number | null }>;
  generatedAt: string;
}

let publicStatsCache: { value: PublicStats; expires: number } | null = null;

/**
 * Honest marketing numbers for the landing page, derived from live data (cached for a minute).
 * Never inflates: a brand-new deployment shows zeros until real listings exist.
 */
export function publicStats(): PublicStats {
  if (publicStatsCache && publicStatsCache.expires > Date.now()) return publicStatsCache.value;
  const published = properties.list({ status: 'published' });
  const byCity = new Map<string, { listings: number; minRent: number | null }>();
  let beds = 0;
  for (const p of published) {
    const city = p.location?.city?.trim();
    beds += p.details?.totalBeds || (p.rooms || []).reduce((n, r) => n + (r.capacity || 0), 0);
    if (!city) continue;
    const entry = byCity.get(city) || { listings: 0, minRent: null };
    entry.listings += 1;
    const rent = Math.min(p.pricing?.minRent || Infinity, ...(p.rooms || []).map((r) => r.monthlyRent || Infinity));
    if (Number.isFinite(rent) && rent > 0)
      entry.minRent = entry.minRent === null ? rent : Math.min(entry.minRent, rent);
    byCity.set(city, entry);
  }
  const value: PublicStats = {
    publishedListings: published.length,
    verifiedListings: published.filter((p) => p.isNestinVerified).length,
    cities: byCity.size,
    bedsListed: beds,
    residentsHoused: customers.count({ status: 'Active' }),
    ownersOnboarded: users.list({ role: 'owner' }, 100000).length,
    citiesBreakdown: [...byCity.entries()].map(([city, v]) => ({ city, ...v })).sort((a, b) => b.listings - a.listings),
    generatedAt: new Date().toISOString(),
  };
  publicStatsCache = { value, expires: Date.now() + 60_000 };
  return value;
}

export function invalidatePublicStats(): void {
  publicStatsCache = null;
}

export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  role: UserRecord['role'];
  status: UserRecord['status'];
  ownerId: string | null;
  city?: string;
  phone?: string;
  avatar?: string;
  authProvider: string;
  createdAt: string;
  propertiesCount?: number;
  bookingsCount?: number;
}

export function listUsers(filter: { role?: UserRecord['role'] } = {}): AdminUserView[] {
  return users.list(filter, 2000).map((u) => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: u.role,
    status: u.status,
    ownerId: u.role === 'owner' ? u.id : u.ownerId,
    city: u.data.city,
    phone: u.data.phone,
    avatar: u.data.avatar,
    authProvider: u.authProvider,
    createdAt: u.createdAt,
    propertiesCount: u.role === 'owner' ? properties.count({ owner_id: u.id }) : undefined,
    bookingsCount: u.role === 'tenant' ? bookings.count({ tenant_id: u.id }) : undefined,
  }));
}

export function setUserStatus(
  actor: AuthUser,
  id: string,
  status: 'active' | 'suspended',
  ctx: EventContext
): AdminUserView {
  const user = users.findById(id);
  if (!user) throw notFound('User');
  if (user.role === 'super_admin') throw forbidden('Super administrator accounts cannot be suspended here.');
  if (user.id === actor.id) throw conflict('You cannot change your own account status.');
  users.update(id, { status });
  if (status === 'suspended') sessions.revokeAllForUser(id);
  if (user.role === 'owner' && status === 'suspended') {
    for (const e of employees.list({ owner_id: id })) if (e.userId) sessions.revokeAllForUser(e.userId);
  }
  events.publish(
    status === 'suspended' ? 'UserSuspended' : 'UserReactivated',
    'User',
    id,
    { role: user.role },
    { ...ctx, actorId: actor.id, actorRole: actor.role }
  );
  return listUsers().find((u) => u.id === id)!;
}

export function listInbound(kind?: InboundRequest['kind']): InboundRequest[] {
  return inboundRequests.list(kind ? { kind } : {}, { limit: 1000 });
}

export function updateInbound(
  actor: AuthUser,
  id: string,
  status: InboundRequest['status'],
  ctx: EventContext
): InboundRequest {
  const req = inboundRequests.get(id);
  if (!req) throw notFound('Request');
  req.status = v.oneOf(status, ['new', 'in_progress', 'closed'] as const, 'Status');
  inboundRequests.replace(req);
  events.publish(
    'InboundRequestUpdated',
    'InboundRequest',
    id,
    { status: req.status },
    { ...ctx, actorId: actor.id, actorRole: actor.role }
  );
  return req;
}

export function listAllBookings() {
  return bookings.list({}, { limit: 2000 });
}

export function auditLog(filter: { ownerId?: string; type?: string; limit?: number }) {
  return auditEvents.list(filter);
}

// ---------------------------------------------------------------------------------------------
// Public inbound forms
// ---------------------------------------------------------------------------------------------

export function submitContact(body: Record<string, unknown>, ctx: EventContext): { ticketNumber: string; id: string } {
  const record: InboundRequest = {
    id: newId('inb'),
    kind: 'contact',
    status: 'new',
    ticketNumber: ticketNumber(),
    name: v.str(body.fullName || body.name, 'Name', { max: 120 }),
    email: v.email(body.email),
    phone: v.phone(body.phone, 'Phone', false) || undefined,
    subject: v.optionalStr(body.subject, 'Subject', 200),
    message: v.str(body.message, 'Message', { max: 4000 }),
    meta: { userRole: v.optionalStr(body.userRole, 'Role', 60) },
    createdAt: new Date().toISOString(),
  };
  inboundRequests.insert(record);
  events.publish('ContactMessageReceived', 'InboundRequest', record.id, { subject: record.subject }, ctx);
  return { ticketNumber: record.ticketNumber!, id: record.id };
}

export function submitDemoRequest(body: Record<string, unknown>, ctx: EventContext): { id: string } {
  const record: InboundRequest = {
    id: newId('inb'),
    kind: 'owner_demo',
    status: 'new',
    name: v.str(body.name || body.fullName, 'Name', { max: 120 }),
    email: v.optionalStr(body.email, 'Email', 254) ? v.email(body.email) : undefined,
    phone: v.phone(body.phone, 'Phone'),
    meta: {
      city: v.optionalStr(body.city, 'City', 80),
      businessName: v.optionalStr(body.business_name || body.businessName, 'Business', 120),
      propertyCount: v.optionalStr(body.property_count || body.propertyCount, 'Property count', 40),
    },
    createdAt: new Date().toISOString(),
  };
  inboundRequests.insert(record);
  events.publish('OwnerDemoRequested', 'InboundRequest', record.id, {}, ctx);
  return { id: record.id };
}

export function subscribeNewsletter(body: Record<string, unknown>, ctx: EventContext): { subscribed: boolean } {
  const email = v.email(body.email);
  const existing = inboundRequests.list({ kind: 'newsletter' }).find((r) => r.email === email);
  if (!existing) {
    inboundRequests.insert({
      id: newId('inb'),
      kind: 'newsletter',
      status: 'new',
      email,
      createdAt: new Date().toISOString(),
    });
    events.publish('NewsletterSubscribed', 'InboundRequest', email, {}, ctx);
  }
  return { subscribed: true };
}

// ---------------------------------------------------------------------------------------------
// Growth analytics: funnel, churn, LTV — per city, over a trailing window
// ---------------------------------------------------------------------------------------------

export interface FunnelAnalytics {
  windowDays: number;
  funnel: { views: number; leads: number; visits: number; bookings: number; confirmed: number; movedIn: number };
  conversion: { leadToBooking: number; bookingToConfirmed: number; confirmedToMoveIn: number };
  churn: { activeResidents: number; movedOut: number; churnRate: number };
  ltv: { avgRevenuePerResident: number; avgTenureMonths: number; estimatedLtv: number };
  byCity: Array<{
    city: string;
    listings: number;
    views: number;
    bookings: number;
    confirmed: number;
    revenue: number;
    residents: number;
    avgRevenuePerResident: number;
  }>;
  weekly: Array<{ week: string; bookings: number; confirmed: number; revenue: number; signups: number }>;
}

export function funnelAnalytics(windowDays = 30, now = new Date()): FunnelAnalytics {
  const since = now.getTime() - windowDays * 86_400_000;
  const inWindow = (iso?: string) => !!iso && Date.parse(iso) >= since;
  const props = properties.list({}, { limit: 100000 });
  const cityOf = new Map(props.map((p) => [p.id, p.location?.city || 'Unknown']));
  const allLeads = leads.list({}, { limit: 100000 });
  const allVisits = visitors.list({}, { limit: 100000 });
  const allBookings = bookings.list({}, { limit: 100000 });
  const allCustomers = customers.list({}, { limit: 100000 });
  const paid = payments.list({ status: 'Paid' }, { limit: 100000 }).filter((p) => p.type !== 'Subscription');
  const allUsers = users.list({}, 100000);

  const bookingsW = allBookings.filter((b) => inWindow(b.createdAt));
  const confirmedW = bookingsW.filter((b) => b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed');
  const movedInW = allCustomers.filter((c) => inWindow(c.moveInDate) && Date.parse(c.moveInDate) <= now.getTime());
  const views = props.reduce((n, p) => n + (p.systemMetrics?.viewsCount || 0), 0);
  const funnel = {
    views,
    leads: allLeads.filter((l) => inWindow(l.createdAt)).length,
    visits: allVisits.filter((vv) => inWindow(vv.createdAt)).length,
    bookings: bookingsW.length,
    confirmed: confirmedW.length,
    movedIn: movedInW.length,
  };
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  const active = allCustomers.filter((c) => c.tenantStatus === 'Active' || c.tenantStatus === 'Vacating');
  const movedOut = allCustomers.filter((c) => c.tenantStatus === 'Inactive' && inWindow(c.expectedMoveOutDate));
  const revenueByResident = new Map<string, number>();
  for (const p of paid)
    if (p.customerId) revenueByResident.set(p.customerId, (revenueByResident.get(p.customerId) || 0) + p.amount);
  const residentsWithRevenue = [...revenueByResident.values()];
  const avgRevenuePerResident = residentsWithRevenue.length
    ? Math.round(residentsWithRevenue.reduce((a, b) => a + b, 0) / residentsWithRevenue.length)
    : 0;
  const tenures = allCustomers
    .map((c) => {
      const end =
        c.tenantStatus === 'Inactive' && c.expectedMoveOutDate ? Date.parse(c.expectedMoveOutDate) : now.getTime();
      return Math.max(0, (end - Date.parse(c.moveInDate)) / (30 * 86_400_000));
    })
    .filter((m) => Number.isFinite(m));
  const avgTenureMonths = tenures.length
    ? Math.round((tenures.reduce((a, b) => a + b, 0) / tenures.length) * 10) / 10
    : 0;
  const avgMonthlyRent = active.length ? active.reduce((n, c) => n + (c.monthlyRent || 0), 0) / active.length : 0;

  const cities = new Map<string, FunnelAnalytics['byCity'][number]>();
  const cityRow = (city: string) => {
    if (!cities.has(city))
      cities.set(city, {
        city,
        listings: 0,
        views: 0,
        bookings: 0,
        confirmed: 0,
        revenue: 0,
        residents: 0,
        avgRevenuePerResident: 0,
      });
    return cities.get(city)!;
  };
  for (const p of props.filter((x) => x.status === 'published')) {
    const row = cityRow(cityOf.get(p.id)!);
    row.listings += 1;
    row.views += p.systemMetrics?.viewsCount || 0;
  }
  for (const b of bookingsW) {
    const row = cityRow(cityOf.get(b.propertyId) || 'Unknown');
    row.bookings += 1;
    if (b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed') row.confirmed += 1;
  }
  for (const p of paid.filter((x) => inWindow(x.date || x.createdAt))) {
    cityRow(cityOf.get(p.propertyId || '') || 'Unknown').revenue += p.amount;
  }
  for (const c of active) cityRow(cityOf.get(c.propertyId) || 'Unknown').residents += 1;
  for (const row of cities.values())
    row.avgRevenuePerResident = row.residents ? Math.round(row.revenue / row.residents) : 0;

  const weekly: FunnelAnalytics['weekly'] = [];
  const weeks = Math.min(12, Math.max(1, Math.ceil(windowDays / 7)));
  for (let w = weeks - 1; w >= 0; w--) {
    const end = now.getTime() - w * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    const within = (iso?: string) => !!iso && Date.parse(iso) >= start && Date.parse(iso) < end;
    weekly.push({
      week: new Date(start).toISOString().slice(0, 10),
      bookings: allBookings.filter((b) => within(b.createdAt)).length,
      confirmed: allBookings.filter(
        (b) => within(b.createdAt) && (b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed')
      ).length,
      revenue: paid.filter((p) => within(p.date || p.createdAt)).reduce((n, p) => n + p.amount, 0),
      signups: allUsers.filter((u) => within(u.createdAt)).length,
    });
  }

  return {
    windowDays,
    funnel,
    conversion: {
      leadToBooking: pct(funnel.bookings, funnel.leads),
      bookingToConfirmed: pct(funnel.confirmed, funnel.bookings),
      confirmedToMoveIn: pct(funnel.movedIn, funnel.confirmed),
    },
    churn: {
      activeResidents: active.length,
      movedOut: movedOut.length,
      churnRate: pct(movedOut.length, active.length + movedOut.length),
    },
    ltv: {
      avgRevenuePerResident,
      avgTenureMonths,
      estimatedLtv: Math.round(avgMonthlyRent * Math.max(avgTenureMonths, 1)),
    },
    byCity: [...cities.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings),
    weekly,
  };
}
