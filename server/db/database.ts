import { DatabaseSync, StatementSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

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
  if (config.databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  }
  db = new DatabaseSync(config.databasePath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
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
  if (config.databasePath !== ":memory:") throw new Error("resetDbForTests is only allowed with an in-memory database");
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
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, status TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY, value TEXT NOT NULL
);
`;

function migrate(database: DatabaseSync): void {
  database.exec(SCHEMA);
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
    const names = ["id", ...Object.keys(cols), "data", "created_at", ...(this.spec.hasUpdatedAt ? ["updated_at"] : [])];
    const values: Scalar[] = [doc.id, ...Object.values(cols), JSON.stringify(doc), ts, ...(this.spec.hasUpdatedAt ? [ts] : [])];
    const sql = `INSERT INTO ${this.spec.table} (${names.join(",")}) VALUES (${names.map(() => "?").join(",")})`;
    this.prepare(sql).run(...values);
    return doc;
  }

  /** Full replacement of the stored document; indexed columns are re-derived. */
  replace(doc: T): T {
    const cols = this.spec.columns(doc);
    const sets = [...Object.keys(cols).map((c) => `${c} = ?`), "data = ?", ...(this.spec.hasUpdatedAt ? ["updated_at = ?"] : [])];
    const values: Scalar[] = [...Object.values(cols), JSON.stringify(doc), ...(this.spec.hasUpdatedAt ? [nowIso()] : []), doc.id];
    this.prepare(`UPDATE ${this.spec.table} SET ${sets.join(", ")} WHERE id = ?`).run(...values);
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
    const clause = entries.length ? `WHERE ${entries.map(([k]) => `${k} = ?`).join(" AND ")}` : "";
    const order = opts.orderBy || "created_at DESC";
    const limit = opts.limit ? `LIMIT ${Math.max(1, Math.floor(opts.limit))}` : "";
    const rows = this.prepare(`SELECT data FROM ${this.spec.table} ${clause} ORDER BY ${order} ${limit}`).all(
      ...entries.map(([, v]) => v as Scalar)
    );
    return rows.map((r) => this.parse(r) as T);
  }

  findOne(where: Record<string, Scalar | undefined>): T | null {
    return this.list(where, { limit: 1 })[0] || null;
  }

  count(where: Record<string, Scalar | undefined> = {}): number {
    const entries = Object.entries(where).filter(([, v]) => v !== undefined && v !== null);
    const clause = entries.length ? `WHERE ${entries.map(([k]) => `${k} = ?`).join(" AND ")}` : "";
    const row = this.prepare(`SELECT COUNT(*) AS n FROM ${this.spec.table} ${clause}`).get(...entries.map(([, v]) => v as Scalar)) as { n: number };
    return Number(row.n);
  }

  /** Runs `fn` inside a transaction (SQLite is single-writer so this is also our concurrency guard). */
  static transaction<R>(fn: () => R): R {
    const database = getDb();
    database.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      database.exec("COMMIT");
      return result;
    } catch (err) {
      database.exec("ROLLBACK");
      throw err;
    }
  }
}

export function getMeta(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb().prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}
