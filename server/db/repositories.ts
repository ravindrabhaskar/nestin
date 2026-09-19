import { Collection, getDb, getMeta, nowIso, setMeta } from './database.js';
import type { OwnerPropertyListing } from '../../src/types/property';
import type {
  LeadItem,
  BookingItem,
  VisitorItem,
  CustomerItem,
  CRMActivityLog,
  OwnerCRMNotification,
} from '../../src/types/crm';
import type { Role, Employee, AuditLog } from '../../src/types/rbac';
import type { TenantDocument, TenantSupportTicket } from '../../src/types';
import type { AppRole } from '../lib/jwt.js';
import type { PlanId, BillingInterval } from '../../src/lib/domain/plans';

// ---------------------------------------------------------------------------------------------
// Users & sessions (relational, not document-based, because they are security-sensitive)
// ---------------------------------------------------------------------------------------------

export interface UserProfileData {
  phone?: string;
  avatar?: string;
  city?: string;
  dob?: string;
  gender?: string;
  occupation?: string;
  collegeOrCompany?: string;
  bio?: string;
  language?: string;
  livingPreferences?: object;
  notificationSettings?: object;
  privacySettings?: object;
  searchPreferences?: object;
  /** For employees: the id of the RBAC employee record. */
  employeeId?: string;
  emailVerified?: boolean;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  role: AppRole;
  ownerId: string | null;
  fullName: string;
  status: 'active' | 'suspended';
  authProvider: 'email' | 'google' | 'system';
  data: UserProfileData;
  createdAt: string;
  updatedAt: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  role: AppRole;
  owner_id: string | null;
  full_name: string;
  status: 'active' | 'suspended';
  auth_provider: 'email' | 'google' | 'system';
  data: string;
  created_at: string;
  updated_at: string;
}

function rowToUser(row: UserRow | undefined): UserRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    ownerId: row.owner_id,
    fullName: row.full_name,
    status: row.status,
    authProvider: row.auth_provider,
    data: JSON.parse(row.data || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const users = {
  findById(id: string): UserRecord | null {
    return rowToUser(getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow | undefined);
  },
  findByEmail(emailAddress: string): UserRecord | null {
    return rowToUser(
      getDb().prepare('SELECT * FROM users WHERE email = ?').get(emailAddress.toLowerCase()) as unknown as
        UserRow | undefined
    );
  },
  insert(user: Omit<UserRecord, 'createdAt' | 'updatedAt'>): UserRecord {
    const ts = nowIso();
    getDb()
      .prepare(
        `INSERT INTO users (id, email, password_hash, role, owner_id, full_name, status, auth_provider, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        user.id,
        user.email.toLowerCase(),
        user.passwordHash,
        user.role,
        user.ownerId,
        user.fullName,
        user.status,
        user.authProvider,
        JSON.stringify(user.data),
        ts,
        ts
      );
    return { ...user, createdAt: ts, updatedAt: ts };
  },
  update(
    id: string,
    patch: Partial<
      Pick<UserRecord, 'passwordHash' | 'role' | 'ownerId' | 'fullName' | 'status' | 'authProvider' | 'data' | 'email'>
    >
  ): UserRecord | null {
    const existing = users.findById(id);
    if (!existing) return null;
    const merged: UserRecord = { ...existing, ...patch, updatedAt: nowIso() };
    getDb()
      .prepare(
        `UPDATE users SET email = ?, password_hash = ?, role = ?, owner_id = ?, full_name = ?, status = ?, auth_provider = ?, data = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        merged.email.toLowerCase(),
        merged.passwordHash,
        merged.role,
        merged.ownerId,
        merged.fullName,
        merged.status,
        merged.authProvider,
        JSON.stringify(merged.data),
        merged.updatedAt,
        id
      );
    return merged;
  },
  list(filter: { role?: AppRole; ownerId?: string } = {}, limit = 500): UserRecord[] {
    const clauses: string[] = [];
    const params: string[] = [];
    if (filter.role) {
      clauses.push('role = ?');
      params.push(filter.role);
    }
    if (filter.ownerId) {
      clauses.push('owner_id = ?');
      params.push(filter.ownerId);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = getDb()
      .prepare(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ${Math.floor(limit)}`)
      .all(...params) as unknown as UserRow[];
    return rows.map((r) => rowToUser(r) as UserRecord);
  },
  count(): number {
    return Number((getDb().prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n);
  },
};

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
}

const rowToSession = (r: SessionRow | undefined): SessionRecord | null =>
  r
    ? {
        id: r.id,
        userId: r.user_id,
        tokenHash: r.token_hash,
        device: r.device,
        browser: r.browser,
        ip: r.ip,
        location: r.location,
        createdAt: r.created_at,
        lastActiveAt: r.last_active_at,
        expiresAt: r.expires_at,
        revokedAt: r.revoked_at,
      }
    : null;

export const sessions = {
  insert(s: Omit<SessionRecord, 'createdAt' | 'lastActiveAt' | 'revokedAt'>): SessionRecord {
    const ts = nowIso();
    getDb()
      .prepare(
        `INSERT INTO sessions (id, user_id, token_hash, device, browser, ip, location, created_at, last_active_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
      )
      .run(s.id, s.userId, s.tokenHash, s.device, s.browser, s.ip, s.location, ts, ts, s.expiresAt);
    return { ...s, createdAt: ts, lastActiveAt: ts, revokedAt: null };
  },
  get(id: string): SessionRecord | null {
    return rowToSession(
      getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as unknown as SessionRow | undefined
    );
  },
  touch(id: string): void {
    getDb().prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?').run(nowIso(), id);
  },
  revoke(id: string): void {
    getDb().prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(nowIso(), id);
  },
  revokeAllForUser(userId: string, exceptId?: string): void {
    getDb()
      .prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND id != ?')
      .run(nowIso(), userId, exceptId || '');
  },
  listActiveForUser(userId: string): SessionRecord[] {
    const rows = getDb()
      .prepare(
        'SELECT * FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY last_active_at DESC'
      )
      .all(userId, nowIso()) as unknown as SessionRow[];
    return rows.map((r) => rowToSession(r) as SessionRecord);
  },
  purgeExpired(): void {
    getDb()
      .prepare('DELETE FROM sessions WHERE expires_at < ? OR revoked_at IS NOT NULL')
      .run(new Date(Date.now() - 7 * 86400000).toISOString());
  },
};

// ---------------------------------------------------------------------------------------------
// Document collections (domain aggregates)
// ---------------------------------------------------------------------------------------------

/** The rent shown on cards: the listing's headline `pricing.minRent`, else the cheapest room. */
export function propertyMinRent(p: OwnerPropertyListing): number {
  if (p.pricing?.minRent && p.pricing.minRent > 0) return p.pricing.minRent;
  const rents = (p.rooms || []).map((r) => r.monthlyRent).filter((n) => Number.isFinite(n) && n > 0);
  return rents.length ? Math.min(...rents) : 0;
}

export const properties = new Collection<OwnerPropertyListing>({
  table: 'properties',
  columns: (p) => ({
    owner_id: p.ownerId,
    slug: p.slug,
    status: p.status,
    city: p.location?.city || '',
    category: p.category || '',
    type: p.type || '',
    area: p.location?.area || '',
    min_rent: propertyMinRent(p),
    rating: p.systemMetrics?.averageRating || 0,
    is_verified: p.isNestinVerified ? 1 : 0,
    is_featured: p.isFeatured ? 1 : 0,
    available_beds: (p.rooms || []).reduce((n, r) => n + (r.availableBedsCount || 0), 0),
    search_text: [p.name, p.location?.area, p.location?.city, p.location?.formattedAddress, ...(p.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
    has_food: p.pricing?.foodMess?.type && p.pricing.foodMess.type !== 'Not Available' ? 1 : 0,
    // "|single|double|" so a room-type filter is a single indexed LIKE per selected type.
    room_types: `|${Array.from(new Set((p.rooms || []).map((r) => roomTypeKey(r.type)))).join('|')}|`,
    amenities_text: `|${(p.amenities || [])
      .filter((a) => a.isAvailable)
      .map((a) => a.name.toLowerCase())
      .join('|')}|`,
    latitude: Number.isFinite(p.location?.latitude) ? p.location.latitude : null,
    longitude: Number.isFinite(p.location?.longitude) ? p.location.longitude : null,
  }),
});

/** Normalises "Single Sharing" / "Private Room" / "Dormitory" into the keys the search filter uses. */
export function roomTypeKey(type: string | undefined): string {
  const t = (type || '').toLowerCase();
  if (t.includes('single') || t.includes('private')) return 'single';
  if (t.includes('double') || t.includes('twin')) return 'double';
  if (t.includes('triple')) return 'triple';
  if (t.includes('four') || t.includes('quad')) return 'four';
  if (t.includes('dorm')) return 'dormitory';
  return t.replace(/[^a-z]+/g, '-') || 'custom';
}

/** Re-derives indexed catalogue columns once after upgrading a database created before v3.1. */
export function backfillCatalogueColumns(): number {
  let touched = 0;
  if (!getMeta('migration:catalogue-columns-v2')) {
    const all = properties.list({}, { limit: 100000 });
    Collection.transaction(() => {
      for (const p of all) properties.replace(p);
    });
    setMeta('migration:catalogue-columns-v2', new Date().toISOString());
    touched += all.length;
  }
  // payments.gateway_order_id was added later; rewrite once so webhooks can look orders up by index.
  if (!getMeta('migration:payments-gateway-order-v1')) {
    const all = payments.list({}, { limit: 1000000 });
    Collection.transaction(() => {
      for (const p of all) payments.replace(p);
    });
    setMeta('migration:payments-gateway-order-v1', new Date().toISOString());
    touched += all.length;
  }
  return touched;
}

/**
 * One-time: fold active reservations into each listing's advertised availability (see
 * propertyService.syncBedAvailability). Runs after seeding so demo data is consistent too.
 */
export function backfillReservedAvailability(sync: (propertyId: string) => unknown): number {
  if (getMeta('migration:reserved-availability-v2')) return 0;
  // Every listing, not only those with bookings: imported/seeded data may carry stale counts.
  const ids = properties.list({}, { limit: 100000 }).map((p) => p.id);
  Collection.transaction(() => {
    for (const id of ids) sync(id);
  });
  setMeta('migration:reserved-availability-v2', new Date().toISOString());
  return ids.length;
}

export const leads = new Collection<LeadItem & { ownerId: string }>({
  table: 'leads',
  columns: (l) => ({ owner_id: l.ownerId, property_id: l.propertyId || null, stage: l.stage }),
});

export type StoredBooking = BookingItem & {
  ownerId: string;
  tenantId?: string;
  propertyCity?: string;
  propertySlug?: string;
};
export const bookings = new Collection<StoredBooking>({
  table: 'bookings',
  columns: (b) => ({
    owner_id: b.ownerId,
    tenant_id: b.tenantId || null,
    property_id: b.propertyId,
    room_id: b.roomId || null,
    bed_id: b.bedId || null,
    status: b.bookingStatus,
  }),
});

export type StoredVisitor = VisitorItem & { ownerId: string; tenantId?: string };
export const visitors = new Collection<StoredVisitor>({
  table: 'visitors',
  columns: (v) => ({ owner_id: v.ownerId, tenant_id: v.tenantId || null, property_id: v.propertyId, status: v.status }),
});

export type StoredCustomer = CustomerItem & { ownerId: string; tenantId?: string };
export const customers = new Collection<StoredCustomer>({
  table: 'customers',
  columns: (c) => ({
    owner_id: c.ownerId,
    tenant_id: c.tenantId || null,
    property_id: c.propertyId,
    status: c.tenantStatus,
  }),
});

export const crmActivity = new Collection<CRMActivityLog & { ownerId: string }>({
  table: 'crm_activity',
  columns: (a) => ({ owner_id: a.ownerId, type: a.type }),
  hasUpdatedAt: false,
});

export const roles = new Collection<Role & { ownerId: string }>({
  table: 'roles',
  columns: (r) => ({ owner_id: r.ownerId, name: r.name }),
});

export type StoredEmployee = Employee & { ownerId: string; userId?: string };
export const employees = new Collection<StoredEmployee>({
  table: 'employees',
  columns: (e) => ({
    owner_id: e.ownerId,
    user_id: e.userId || null,
    email: e.email.toLowerCase(),
    role_id: e.roleId,
    status: e.status,
  }),
});

export const rbacAudit = new Collection<AuditLog & { ownerId: string }>({
  table: 'rbac_audit',
  columns: (a) => ({ owner_id: a.ownerId }),
  hasUpdatedAt: false,
});

export interface PaymentRecord {
  id: string;
  ownerId: string;
  tenantId?: string;
  customerId?: string;
  bookingId?: string;
  propertyId?: string;
  propertyName: string;
  tenantName: string;
  amount: number;
  currency: 'INR';
  type: 'Rent' | 'Security Deposit' | 'Token Booking' | 'Maintenance' | 'Electricity' | 'Subscription';
  method: 'UPI / GPay' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Cash' | 'Auto-Debit' | 'Razorpay';
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  gateway: 'razorpay' | 'manual' | 'simulated';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  invoiceNumber: string;
  transactionId: string;
  idempotencyKey?: string;
  month?: string;
  description?: string;
  date: string;
  createdAt: string;
  /** Platform commission retained from this payment (INR); the owner receives `amount - platformFee`. */
  platformFee?: number;
  platformFeePercent?: number;
}

export const payments = new Collection<PaymentRecord>({
  table: 'payments',
  columns: (p) => ({
    owner_id: p.ownerId,
    tenant_id: p.tenantId || null,
    booking_id: p.bookingId || null,
    customer_id: p.customerId || null,
    status: p.status,
    amount: p.amount,
    idempotency_key: p.idempotencyKey || null,
    platform_fee: p.platformFee || 0,
    gateway_order_id: p.gatewayOrderId || null,
  }),
});

// ---------------------------------------------------------------------------------------------
// Billing (owner subscriptions) & push notifications
// ---------------------------------------------------------------------------------------------

export interface SubscriptionRecord {
  id: string;
  ownerId: string;
  plan: PlanId;
  interval: BillingInterval;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  cancelAtPeriodEnd: boolean;
  /** Set by an operator (complimentary / enterprise deals) — bypasses payment. */
  grantedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const subscriptions = new Collection<SubscriptionRecord>({
  table: 'subscriptions',
  columns: (s) => ({ owner_id: s.ownerId, plan: s.plan, status: s.status }),
});

export interface SubscriptionInvoice {
  id: string;
  ownerId: string;
  plan: PlanId;
  interval: BillingInterval;
  invoiceNumber: string;
  subtotal: number;
  gstPercent: number;
  gst: number;
  amount: number;
  currency: 'INR';
  status: 'Pending' | 'Paid' | 'Failed';
  gateway: 'razorpay' | 'simulated' | 'manual';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  createdAt: string;
}

export const subscriptionInvoices = new Collection<SubscriptionInvoice>({
  table: 'subscription_invoices',
  columns: (i) => ({
    owner_id: i.ownerId,
    status: i.status,
    amount: i.amount,
    gateway_order_id: i.gatewayOrderId || null,
  }),
});

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt: string;
}

export const pushSubscriptions = new Collection<PushSubscriptionRecord>({
  table: 'push_subscriptions',
  columns: (p) => ({ user_id: p.userId, endpoint: p.endpoint }),
});

export type StoredDocument = TenantDocument & {
  ownerId?: string;
  tenantId?: string;
  propertyId?: string;
  customerId?: string;
};
export const documents = new Collection<StoredDocument>({
  table: 'documents',
  columns: (d) => ({
    owner_id: d.ownerId || null,
    tenant_id: d.tenantId || null,
    property_id: d.propertyId || null,
    customer_id: d.customerId || null,
    status: d.status,
  }),
});

export type StoredTicket = TenantSupportTicket & {
  tenantId: string;
  ownerId?: string;
  tenantName?: string;
  tenantEmail?: string;
};
export const supportTickets = new Collection<StoredTicket>({
  table: 'support_tickets',
  columns: (t) => ({ tenant_id: t.tenantId, owner_id: t.ownerId || null, status: t.status }),
});

export interface FileRecord {
  id: string;
  key: string;
  uploaderId: string;
  ownerId?: string;
  purpose: 'avatar' | 'property' | 'document';
  isPublic: boolean;
  fileName: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
}
export const files = new Collection<FileRecord>({
  table: 'files',
  columns: (f) => ({
    key: f.key,
    uploader_id: f.uploaderId,
    owner_id: f.ownerId || null,
    purpose: f.purpose,
    is_public: f.isPublic ? 1 : 0,
  }),
  hasUpdatedAt: false,
});

export interface AuthTokenRecord {
  id: string;
  userId: string;
  kind: 'reset' | 'verify';
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}
export const authTokens = {
  insert(t: Omit<AuthTokenRecord, 'createdAt' | 'usedAt'>): void {
    getDb()
      .prepare(
        'INSERT INTO auth_tokens (id, user_id, kind, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)'
      )
      .run(t.id, t.userId, t.kind, t.tokenHash, t.expiresAt, nowIso());
  },
  findValid(kind: AuthTokenRecord['kind'], tokenHash: string): AuthTokenRecord | null {
    const r = getDb()
      .prepare('SELECT * FROM auth_tokens WHERE kind = ? AND token_hash = ? AND used_at IS NULL AND expires_at > ?')
      .get(kind, tokenHash, nowIso()) as unknown as Record<string, string> | undefined;
    return r
      ? {
          id: r.id,
          userId: r.user_id,
          kind: r.kind as AuthTokenRecord['kind'],
          tokenHash: r.token_hash,
          expiresAt: r.expires_at,
          usedAt: r.used_at || null,
          createdAt: r.created_at,
        }
      : null;
  },
  consume(id: string): void {
    getDb().prepare('UPDATE auth_tokens SET used_at = ? WHERE id = ?').run(nowIso(), id);
  },
  invalidateAll(userId: string, kind: AuthTokenRecord['kind']): void {
    getDb()
      .prepare('UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND kind = ? AND used_at IS NULL')
      .run(nowIso(), userId, kind);
  },
};

export interface OutboxMessage {
  id: string;
  channel: 'email' | 'whatsapp';
  recipient: string;
  status: 'sent' | 'logged' | 'failed';
  subject?: string;
  body: string;
  provider: string;
  error?: string;
  createdAt: string;
}
export const outbox = new Collection<OutboxMessage>({
  table: 'outbox',
  columns: (m) => ({ channel: m.channel, recipient: m.recipient, status: m.status }),
  hasUpdatedAt: false,
});

export interface NotificationRecord extends OwnerCRMNotification {
  userId: string;
}
export const notifications = new Collection<NotificationRecord>({
  table: 'notifications',
  columns: (n) => ({ user_id: n.userId, is_read: n.isRead ? 1 : 0 }),
  hasUpdatedAt: false,
});

export interface InboundRequest {
  id: string;
  kind: 'contact' | 'owner_demo' | 'newsletter';
  status: 'new' | 'in_progress' | 'closed';
  ticketNumber?: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}
export const inboundRequests = new Collection<InboundRequest>({
  table: 'inbound_requests',
  columns: (r) => ({ kind: r.kind, status: r.status }),
  hasUpdatedAt: false,
});

export interface AuditEvent {
  id: string;
  type: string;
  actorId?: string;
  actorRole?: string;
  ownerId?: string;
  aggregateType?: string;
  aggregateId?: string;
  correlationId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export const auditEvents = {
  insert(e: AuditEvent): void {
    getDb()
      .prepare(
        `INSERT INTO audit_events (id, type, actor_id, actor_role, owner_id, aggregate_type, aggregate_id, correlation_id, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        e.id,
        e.type,
        e.actorId || null,
        e.actorRole || null,
        e.ownerId || null,
        e.aggregateType || null,
        e.aggregateId || null,
        e.correlationId || null,
        JSON.stringify(e.payload),
        e.createdAt
      );
  },
  list(filter: { ownerId?: string; type?: string; limit?: number } = {}): AuditEvent[] {
    const clauses: string[] = [];
    const params: (string | number)[] = [];
    if (filter.ownerId) {
      clauses.push('owner_id = ?');
      params.push(filter.ownerId);
    }
    if (filter.type) {
      clauses.push('type LIKE ?');
      params.push(`%${filter.type}%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = getDb()
      .prepare(`SELECT * FROM audit_events ${where} ORDER BY created_at DESC LIMIT ${Math.floor(filter.limit || 100)}`)
      .all(...params) as Array<Record<string, string>>;
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      actorId: r.actor_id || undefined,
      actorRole: r.actor_role || undefined,
      ownerId: r.owner_id || undefined,
      aggregateType: r.aggregate_type || undefined,
      aggregateId: r.aggregate_id || undefined,
      correlationId: r.correlation_id || undefined,
      payload: JSON.parse(r.payload || '{}'),
      createdAt: r.created_at,
    }));
  },
};

export const wishlist = {
  list(userId: string): string[] {
    return (
      getDb()
        .prepare('SELECT property_id FROM wishlist WHERE user_id = ? ORDER BY created_at DESC')
        .all(userId) as Array<{ property_id: string }>
    ).map((r) => r.property_id);
  },
  add(userId: string, propertyId: string): void {
    getDb()
      .prepare('INSERT OR IGNORE INTO wishlist (user_id, property_id, created_at) VALUES (?, ?, ?)')
      .run(userId, propertyId, nowIso());
  },
  remove(userId: string, propertyId: string): void {
    getDb().prepare('DELETE FROM wishlist WHERE user_id = ? AND property_id = ?').run(userId, propertyId);
  },
  clear(userId: string): void {
    getDb().prepare('DELETE FROM wishlist WHERE user_id = ?').run(userId);
  },
};
