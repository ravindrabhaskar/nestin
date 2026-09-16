import { users, properties, bookings, payments, leads, customers, inboundRequests, auditEvents, sessions, employees, type UserRecord, type InboundRequest } from "../db/repositories.js";
import { conflict, forbidden, notFound } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import * as v from "../lib/validate.js";
import { events, type EventContext } from "../lib/events.js";
import type { AuthUser } from "../middleware/auth.js";

export interface PlatformStats {
  users: { total: number; tenants: number; owners: number; employees: number; admins: number };
  properties: { total: number; published: number; pendingApproval: number; draft: number; rejected: number; archived: number };
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
      tenants: count(allUsers, (u) => u.role === "tenant"),
      owners: count(allUsers, (u) => u.role === "owner"),
      employees: count(allUsers, (u) => u.role === "employee"),
      admins: count(allUsers, (u) => u.role === "super_admin"),
    },
    properties: {
      total: allProps.length,
      published: count(allProps, (p) => p.status === "published"),
      pendingApproval: count(allProps, (p) => p.status === "pending_approval"),
      draft: count(allProps, (p) => p.status === "draft"),
      rejected: count(allProps, (p) => p.status === "rejected"),
      archived: count(allProps, (p) => p.status === "archived"),
    },
    bookings: {
      total: allBookings.length,
      pending: count(allBookings, (b) => b.bookingStatus === "Pending"),
      confirmed: count(allBookings, (b) => b.bookingStatus === "Confirmed"),
      completed: count(allBookings, (b) => b.bookingStatus === "Completed"),
      cancelled: count(allBookings, (b) => b.bookingStatus === "Cancelled" || b.bookingStatus === "Rejected"),
    },
    revenue: {
      totalCollected: allPayments.filter((p) => p.status === "Paid").reduce((a, p) => a + p.amount, 0),
      last30Days: allPayments.filter((p) => p.status === "Paid" && Date.parse(p.createdAt) > cutoff).reduce((a, p) => a + p.amount, 0),
      transactions: allPayments.length,
    },
    leads: leads.count(),
    customers: customers.count(),
    inbound: { newContacts: inboundRequests.count({ kind: "contact", status: "new" }), newDemoRequests: inboundRequests.count({ kind: "owner_demo", status: "new" }) },
    recentEvents: auditEvents.list({ limit: 25 }),
  };
}

export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  role: UserRecord["role"];
  status: UserRecord["status"];
  ownerId: string | null;
  city?: string;
  phone?: string;
  avatar?: string;
  authProvider: string;
  createdAt: string;
  propertiesCount?: number;
  bookingsCount?: number;
}

export function listUsers(filter: { role?: UserRecord["role"] } = {}): AdminUserView[] {
  return users.list(filter, 2000).map((u) => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: u.role,
    status: u.status,
    ownerId: u.role === "owner" ? u.id : u.ownerId,
    city: u.data.city,
    phone: u.data.phone,
    avatar: u.data.avatar,
    authProvider: u.authProvider,
    createdAt: u.createdAt,
    propertiesCount: u.role === "owner" ? properties.count({ owner_id: u.id }) : undefined,
    bookingsCount: u.role === "tenant" ? bookings.count({ tenant_id: u.id }) : undefined,
  }));
}

export function setUserStatus(actor: AuthUser, id: string, status: "active" | "suspended", ctx: EventContext): AdminUserView {
  const user = users.findById(id);
  if (!user) throw notFound("User");
  if (user.role === "super_admin") throw forbidden("Super administrator accounts cannot be suspended here.");
  if (user.id === actor.id) throw conflict("You cannot change your own account status.");
  users.update(id, { status });
  if (status === "suspended") sessions.revokeAllForUser(id);
  if (user.role === "owner" && status === "suspended") {
    for (const e of employees.list({ owner_id: id })) if (e.userId) sessions.revokeAllForUser(e.userId);
  }
  events.publish(status === "suspended" ? "UserSuspended" : "UserReactivated", "User", id, { role: user.role }, { ...ctx, actorId: actor.id, actorRole: actor.role });
  return listUsers().find((u) => u.id === id)!;
}

export function listInbound(kind?: InboundRequest["kind"]): InboundRequest[] {
  return inboundRequests.list(kind ? { kind } : {}, { limit: 1000 });
}

export function updateInbound(actor: AuthUser, id: string, status: InboundRequest["status"], ctx: EventContext): InboundRequest {
  const req = inboundRequests.get(id);
  if (!req) throw notFound("Request");
  req.status = v.oneOf(status, ["new", "in_progress", "closed"] as const, "Status");
  inboundRequests.replace(req);
  events.publish("InboundRequestUpdated", "InboundRequest", id, { status: req.status }, { ...ctx, actorId: actor.id, actorRole: actor.role });
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
    id: newId("inb"),
    kind: "contact",
    status: "new",
    ticketNumber: `NST-${100000 + Math.floor(Math.random() * 900000)}`,
    name: v.str(body.fullName || body.name, "Name", { max: 120 }),
    email: v.email(body.email),
    phone: v.phone(body.phone, "Phone", false) || undefined,
    subject: v.optionalStr(body.subject, "Subject", 200),
    message: v.str(body.message, "Message", { max: 4000 }),
    meta: { userRole: v.optionalStr(body.userRole, "Role", 60) },
    createdAt: new Date().toISOString(),
  };
  inboundRequests.insert(record);
  events.publish("ContactMessageReceived", "InboundRequest", record.id, { subject: record.subject }, ctx);
  return { ticketNumber: record.ticketNumber!, id: record.id };
}

export function submitDemoRequest(body: Record<string, unknown>, ctx: EventContext): { id: string } {
  const record: InboundRequest = {
    id: newId("inb"),
    kind: "owner_demo",
    status: "new",
    name: v.str(body.name || body.fullName, "Name", { max: 120 }),
    email: v.optionalStr(body.email, "Email", 254) ? v.email(body.email) : undefined,
    phone: v.phone(body.phone, "Phone"),
    meta: { city: v.optionalStr(body.city, "City", 80), businessName: v.optionalStr(body.business_name || body.businessName, "Business", 120), propertyCount: v.optionalStr(body.property_count || body.propertyCount, "Property count", 40) },
    createdAt: new Date().toISOString(),
  };
  inboundRequests.insert(record);
  events.publish("OwnerDemoRequested", "InboundRequest", record.id, {}, ctx);
  return { id: record.id };
}

export function subscribeNewsletter(body: Record<string, unknown>, ctx: EventContext): { subscribed: boolean } {
  const email = v.email(body.email);
  const existing = inboundRequests.list({ kind: "newsletter" }).find((r) => r.email === email);
  if (!existing) {
    inboundRequests.insert({ id: newId("inb"), kind: "newsletter", status: "new", email, createdAt: new Date().toISOString() });
    events.publish("NewsletterSubscribed", "InboundRequest", email, {}, ctx);
  }
  return { subscribed: true };
}
