import { DatabaseSync, StatementSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

/**
 * Persistence layer built on Node's built-in SQLite (no native add-ons to compile).
 *
 * Design: every domain aggregate (property, lead, booking, ...) is stored as a JSON document with a
 * handful of indexed columns extracted from it (owner, tenant, status, ...). This keeps the rich,
 * deeply nested frontend domain model as the single source of truth while still allowing the server
 * to enforce ownership, filter efficiently, and evolve the schema without rewriting 40 tables.
 */

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  if (config.databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  }
  db = new DatabaseSync(config.databasePath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Resets the in-memory database (tests only). */
export function resetDbForTests(): void {
  if (config.databasePath !== ':memory:') throw new Error('resetDbForTests is only allowed with an in-memory database');
  closeDb();
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin','owner','employee','tenant')),
  owner_id TEXT,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  auth_provider TEXT NOT NULL DEFAULT 'email',
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_owner ON users(owner_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device TEXT NOT NULL DEFAULT '',
  browser TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, property_id TEXT, stage TEXT NOT NULL DEFAULT 'New',
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, tenant_id TEXT, property_id TEXT NOT NULL,
  room_id TEXT, bed_id TEXT, status TEXT NOT NULL DEFAULT 'Pending',
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_bed ON bookings(property_id, bed_id);

CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, tenant_id TEXT, property_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Scheduled',
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visitors_owner ON visitors(owner_id);
CREATE INDEX IF NOT EXISTS idx_visitors_tenant ON visitors(tenant_id);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, tenant_id TEXT, property_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Active',
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

CREATE TABLE IF NOT EXISTS crm_activity (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, type TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_activity_owner ON crm_activity(owner_id, created_at);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_roles_owner ON roles(owner_id);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, user_id TEXT, email TEXT NOT NULL, role_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employees_owner ON employees(owner_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

CREATE TABLE IF NOT EXISTS rbac_audit (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_owner ON rbac_audit(owner_id, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, tenant_id TEXT, booking_id TEXT, customer_id TEXT,
  status TEXT NOT NULL, amount REAL NOT NULL, idempotency_key TEXT UNIQUE,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, owner_id TEXT, tenant_id TEXT, property_id TEXT, customer_id TEXT, status TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, owner_id TEXT, status TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON support_tickets(tenant_id);

CREATE TABLE IF NOT EXISTS wishlist (
  user_id TEXT NOT NULL, property_id TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, property_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS inbound_requests (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('contact','owner_demo','newsletter')), status TEXT NOT NULL DEFAULT 'new',
  data TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, actor_id TEXT, actor_role TEXT, owner_id TEXT,
  aggregate_type TEXT, aggregate_id TEXT, correlation_id TEXT, payload TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_owner ON audit_events(owner_id);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, uploader_id TEXT NOT NULL, owner_id TEXT, purpose TEXT NOT NULL, is_public INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_uploader ON files(uploader_id);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK (kind IN ('reset','verify')),
  token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, kind);

CREATE TABLE IF NOT EXISTS agreements (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, tenant_id TEXT NOT NULL, customer_id TEXT NOT NULL, status TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agreements_owner ON agreements(owner_id);
CREATE INDEX IF NOT EXISTS idx_agreements_tenant ON agreements(tenant_id);

CREATE TABLE IF NOT EXISTS move_outs (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, tenant_id TEXT NOT NULL, customer_id TEXT NOT NULL, status TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_move_outs_owner ON move_outs(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_move_outs_tenant ON move_outs(tenant_id);

CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, status TEXT NOT NULL, amount REAL NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credits_user ON credits(user_id, status);

CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, owner_id TEXT NOT NULL, property_id TEXT NOT NULL, score INTEGER NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_surveys_property ON surveys(property_id);
CREATE INDEX IF NOT EXISTS idx_surveys_owner ON surveys(owner_id);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, property_id TEXT, category TEXT NOT NULL, amount REAL NOT NULL, date TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner_id, date);

CREATE TABLE IF NOT EXISTS utility_readings (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, property_id TEXT NOT NULL, room_id TEXT NOT NULL, meter TEXT NOT NULL, status TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_utility_owner ON utility_readings(owner_id, property_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, property_id TEXT, assignee_id TEXT, status TEXT NOT NULL, priority TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id, status);

CREATE TABLE IF NOT EXISTS job_queue (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5, run_at TEXT NOT NULL, dedupe_key TEXT, payload TEXT NOT NULL,
  last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_queue_due ON job_queue(status, run_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_dedupe ON job_queue(dedupe_key);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY, channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp')), recipient TEXT NOT NULL, status TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbox_created ON outbox(created_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE, plan TEXT NOT NULL, status TEXT NOT NULL,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, status TEXT NOT NULL, amount REAL NOT NULL, gateway_order_id TEXT,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_owner ON subscription_invoices(owner_id, created_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, endpoint TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY, value TEXT NOT NULL
);
`;

function migrate(database: DatabaseSync): void {
  database.exec(SCHEMA);
  // Additive column migrations for databases created by earlier versions.
  const ticketCols = (database.prepare('PRAGMA table_info(support_tickets)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  if (!ticketCols.includes('owner_id')) database.exec('ALTER TABLE support_tickets ADD COLUMN owner_id TEXT');
  database.exec('CREATE INDEX IF NOT EXISTS idx_tickets_owner ON support_tickets(owner_id)');
  // Catalogue query columns (server-side search/sort) for databases created before v3.1.
  const propCols = (database.prepare('PRAGMA table_info(properties)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  for (const [col, ddl] of [
    ['category', 'TEXT'],
    ['type', 'TEXT'],
    ['area', 'TEXT'],
    ['min_rent', 'REAL'],
    ['rating', 'REAL'],
    ['is_verified', 'INTEGER'],
    ['is_featured', 'INTEGER'],
    ['available_beds', 'INTEGER'],
    ['search_text', 'TEXT'],
    // v3.2 facets: food, sharing types, amenities and coordinates so Find PG filters run in SQL.
    ['has_food', 'INTEGER'],
    ['room_types', 'TEXT'],
    ['amenities_text', 'TEXT'],
    ['latitude', 'REAL'],
    ['longitude', 'REAL'],
  ] as const) {
    if (!propCols.includes(col)) database.exec(`ALTER TABLE properties ADD COLUMN ${col} ${ddl}`);
  }
  database.exec('CREATE INDEX IF NOT EXISTS idx_properties_city_status ON properties(status, city)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_properties_rent ON properties(status, min_rent)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_properties_geo ON properties(status, latitude, longitude)');
  const paymentCols = (database.prepare('PRAGMA table_info(payments)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  if (!paymentCols.includes('platform_fee'))
    database.exec('ALTER TABLE payments ADD COLUMN platform_fee REAL NOT NULL DEFAULT 0');
  if (!paymentCols.includes('gateway_order_id')) database.exec('ALTER TABLE payments ADD COLUMN gateway_order_id TEXT');
  database.exec('CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON payments(gateway_order_id)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_sub_invoices_gateway_order ON subscription_invoices(gateway_order_id)');
}

/** Size of the database file on disk (0 for in-memory). */
export function databaseSizeBytes(): number {
  if (config.databasePath === ':memory:') return 0;
  try {
    return fs.statSync(config.databasePath).size;
  } catch {
    return 0;
  }
}

/**
 * Consistent online backup using SQLite's `VACUUM INTO` (safe under WAL while readers/writers continue).
 * Returns the written file path.
 */
export function backupDatabaseTo(filePath: string): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  getDb().exec(`VACUUM INTO '${filePath.replace(/'/g, "''")}'`);
  return filePath;
}

export const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------------------------
// Generic JSON document collection
// ---------------------------------------------------------------------------------------------

type Scalar = string | number | null;

export interface CollectionSpec<T extends { id: string }> {
  table: string;
  /** Maps a document to the indexed columns stored beside it. */
  columns: (doc: T) => Record<string, Scalar>;
  hasUpdatedAt?: boolean;
}

export class Collection<T extends { id: string }> {
  private readonly spec: Required<CollectionSpec<T>>;
  private stmtCache = new Map<string, StatementSync>();

  constructor(spec: CollectionSpec<T>) {
    this.spec = { hasUpdatedAt: true, ...spec };
  }

  private prepare(sql: string): StatementSync {
    let stmt = this.stmtCache.get(sql);
    if (!stmt) {
      stmt = getDb().prepare(sql);
      this.stmtCache.set(sql, stmt);
    }
    return stmt;
  }

  private parse(row: unknown): T | null {
    if (!row) return null;
    return JSON.parse((row as { data: string }).data) as T;
  }

  get(id: string): T | null {
    return this.parse(this.prepare(`SELECT data FROM ${this.spec.table} WHERE id = ?`).get(id));
  }

  exists(id: string): boolean {
    return !!this.prepare(`SELECT 1 FROM ${this.spec.table} WHERE id = ?`).get(id);
  }

  insert(doc: T): T {
    const cols = this.spec.columns(doc);
    const ts = nowIso();
    const names = ['id', ...Object.keys(cols), 'data', 'created_at', ...(this.spec.hasUpdatedAt ? ['updated_at'] : [])];
    const values: Scalar[] = [
      doc.id,
      ...Object.values(cols),
      JSON.stringify(doc),
      ts,
      ...(this.spec.hasUpdatedAt ? [ts] : []),
    ];
    const sql = `INSERT INTO ${this.spec.table} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`;
    this.prepare(sql).run(...values);
    return doc;
  }

  /** Full replacement of the stored document; indexed columns are re-derived. */
  replace(doc: T): T {
    const cols = this.spec.columns(doc);
    const sets = [
      ...Object.keys(cols).map((c) => `${c} = ?`),
      'data = ?',
      ...(this.spec.hasUpdatedAt ? ['updated_at = ?'] : []),
    ];
    const values: Scalar[] = [
      ...Object.values(cols),
      JSON.stringify(doc),
      ...(this.spec.hasUpdatedAt ? [nowIso()] : []),
      doc.id,
    ];
    this.prepare(`UPDATE ${this.spec.table} SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return doc;
  }

  upsert(doc: T): T {
    return this.exists(doc.id) ? this.replace(doc) : this.insert(doc);
  }

  remove(id: string): boolean {
    const result = this.prepare(`DELETE FROM ${this.spec.table} WHERE id = ?`).run(id);
    return Number(result.changes) > 0;
  }

  /**
   * Lists documents matching all provided column equalities (null values are ignored).
   * Results are ordered by creation time, newest first.
   */
  list(where: Record<string, Scalar | undefined> = {}, opts: { limit?: number; orderBy?: string } = {}): T[] {
    const entries = Object.entries(where).filter(([, v]) => v !== undefined && v !== null);
    const clause = entries.length ? `WHERE ${entries.map(([k]) => `${k} = ?`).join(' AND ')}` : '';
    const order = opts.orderBy || 'created_at DESC';
    const limit = opts.limit ? `LIMIT ${Math.max(1, Math.floor(opts.limit))}` : '';
    const rows = this.prepare(`SELECT data FROM ${this.spec.table} ${clause} ORDER BY ${order} ${limit}`).all(
      ...entries.map(([, v]) => v as Scalar)
    );
    return rows.map((r) => this.parse(r) as T);
  }

  /**
   * Paginated query with raw SQL predicates over the indexed columns (used by the public catalogue).
   * `where` entries are ANDed; `params` are bound positionally.
   */
  search(opts: { where?: string[]; params?: Scalar[]; orderBy?: string; limit?: number; offset?: number }): {
    items: T[];
    total: number;
  } {
    const clause = opts.where && opts.where.length ? `WHERE ${opts.where.join(' AND ')}` : '';
    const params = opts.params || [];
    const total = Number(
      (this.prepare(`SELECT COUNT(*) AS n FROM ${this.spec.table} ${clause}`).get(...params) as { n: number }).n
    );
    const order = opts.orderBy || 'created_at DESC';
    const limit = Math.max(1, Math.floor(opts.limit || 50));
    const offset = Math.max(0, Math.floor(opts.offset || 0));
    const rows = this.prepare(
      `SELECT data FROM ${this.spec.table} ${clause} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`
    ).all(...params);
    return { items: rows.map((r) => this.parse(r) as T), total };
  }

  findOne(where: Record<string, Scalar | undefined>): T | null {
    return this.list(where, { limit: 1 })[0] || null;
  }

  count(where: Record<string, Scalar | undefined> = {}): number {
    const entries = Object.entries(where).filter(([, v]) => v !== undefined && v !== null);
    const clause = entries.length ? `WHERE ${entries.map(([k]) => `${k} = ?`).join(' AND ')}` : '';
    const row = this.prepare(`SELECT COUNT(*) AS n FROM ${this.spec.table} ${clause}`).get(
      ...entries.map(([, v]) => v as Scalar)
    ) as { n: number };
    return Number(row.n);
  }

  /** Runs `fn` inside a transaction (SQLite is single-writer so this is also our concurrency guard). */
  static transaction<R>(fn: () => R): R {
    const database = getDb();
    database.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      database.exec('COMMIT');
      return result;
    } catch (err) {
      database.exec('ROLLBACK');
      throw err;
    }
  }
}

export function getMeta(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

/**
 * Atomically increments and returns a named counter (stored in `meta`). Used for document serials
 * that must be unique and gap-free per series, e.g. GST invoice numbers.
 */
export function nextSequence(name: string): number {
  const row = getDb()
    .prepare(
      `INSERT INTO meta (key, value) VALUES (?, '1')
       ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)
       RETURNING CAST(value AS INTEGER) AS n`
    )
    .get(`seq:${name}`) as { n: number };
  return row.n;
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value);
}
