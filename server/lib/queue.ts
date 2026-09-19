import { getDb } from '../db/database.js';
import { newId } from './ids.js';
import { log } from './logger.js';
import { config } from '../config.js';

/**
 * Durable background job queue on the `job_queue` table. Work that must not slow a request
 * (email/WhatsApp/push delivery, PDF generation, gateway calls) is enqueued and processed by the
 * in-process worker with exponential-backoff retries. Jobs survive restarts, and a crash mid-job
 * leaves it `running` past its lease so the next tick reclaims it.
 *
 * Multiple instances can share the table safely: claiming a job is a single conditional UPDATE.
 */

export type JobHandler = (payload: Record<string, unknown>, job: JobRecord) => Promise<void> | void;

export interface JobRecord {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'done' | 'failed';
  attempts: number;
  maxAttempts: number;
  runAt: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

const handlers = new Map<string, JobHandler>();
const LEASE_MS = 5 * 60_000;

export function registerJob(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

export interface EnqueueOptions {
  /** Delay before the first attempt (ms). */
  delayMs?: number;
  maxAttempts?: number;
  /** Idempotency: a pending/running job with the same key is not duplicated. */
  dedupeKey?: string;
}

export function enqueue(type: string, payload: Record<string, unknown>, opts: EnqueueOptions = {}): JobRecord {
  const db = getDb();
  const now = new Date();
  if (opts.dedupeKey) {
    const existing = db
      .prepare(`SELECT id FROM job_queue WHERE dedupe_key = ? AND status IN ('pending','running') LIMIT 1`)
      .get(opts.dedupeKey) as { id: string } | undefined;
    if (existing) return getJob(existing.id)!;
  }
  const job: JobRecord = {
    id: newId('job'),
    type,
    payload,
    status: 'pending',
    attempts: 0,
    maxAttempts: Math.max(1, opts.maxAttempts ?? 5),
    runAt: new Date(now.getTime() + Math.max(0, opts.delayMs || 0)).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  db.prepare(
    `INSERT INTO job_queue (id, type, status, attempts, max_attempts, run_at, dedupe_key, payload, created_at, updated_at)
     VALUES (?, ?, 'pending', 0, ?, ?, ?, ?, ?, ?)`
  ).run(
    job.id,
    type,
    job.maxAttempts,
    job.runAt,
    opts.dedupeKey || null,
    JSON.stringify(payload),
    job.createdAt,
    job.updatedAt
  );
  // Without a worker (tests, DISABLE_JOBS) jobs still run — inline on the next tick — so behaviour
  // is identical to the old fire-and-forget dispatch, just observable and retried.
  if (!workerStarted) setImmediate(() => void runQueueOnce());
  return job;
}

function rowToJob(r: any): JobRecord {
  return {
    id: r.id,
    type: r.type,
    payload: JSON.parse(r.payload || '{}'),
    status: r.status,
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    runAt: r.run_at,
    lastError: r.last_error || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getJob(id: string): JobRecord | null {
  const row = getDb().prepare('SELECT * FROM job_queue WHERE id = ?').get(id);
  return row ? rowToJob(row) : null;
}

export function listJobs(opts: { status?: JobRecord['status']; limit?: number } = {}): JobRecord[] {
  const limit = Math.min(500, Math.max(1, opts.limit || 100));
  const rows = opts.status
    ? getDb()
        .prepare('SELECT * FROM job_queue WHERE status = ? ORDER BY created_at DESC LIMIT ?')
        .all(opts.status, limit)
    : getDb().prepare('SELECT * FROM job_queue ORDER BY created_at DESC LIMIT ?').all(limit);
  return rows.map(rowToJob);
}

export function queueStats(): Record<JobRecord['status'], number> {
  const rows = getDb().prepare('SELECT status, COUNT(*) AS n FROM job_queue GROUP BY status').all() as Array<{
    status: JobRecord['status'];
    n: number;
  }>;
  const out = { pending: 0, running: 0, done: 0, failed: 0 };
  for (const r of rows) out[r.status] = Number(r.n);
  return out;
}

/** Claims and runs due jobs. Returns how many were attempted. Safe to call concurrently. */
export async function runQueueOnce(batch = 20): Promise<number> {
  const db = getDb();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const staleLease = new Date(now - LEASE_MS).toISOString();
  const due = db
    .prepare(
      `SELECT id FROM job_queue
       WHERE (status = 'pending' AND run_at <= ?) OR (status = 'running' AND updated_at <= ?)
       ORDER BY run_at ASC LIMIT ?`
    )
    .all(nowIso, staleLease, batch) as Array<{ id: string }>;
  let ran = 0;
  for (const { id } of due) {
    const claimed = db
      .prepare(
        `UPDATE job_queue SET status = 'running', attempts = attempts + 1, updated_at = ?
         WHERE id = ? AND ((status = 'pending' AND run_at <= ?) OR (status = 'running' AND updated_at <= ?))`
      )
      .run(nowIso, id, nowIso, staleLease);
    if (!claimed.changes) continue;
    const job = getJob(id)!;
    ran += 1;
    const handler = handlers.get(job.type);
    try {
      if (!handler) throw new Error(`No handler registered for job type "${job.type}"`);
      await handler(job.payload, job);
      db.prepare(`UPDATE job_queue SET status = 'done', updated_at = ?, last_error = NULL WHERE id = ?`).run(
        new Date().toISOString(),
        id
      );
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
      const exhausted = job.attempts >= job.maxAttempts;
      const backoffMs = Math.min(60 * 60_000, 2_000 * 2 ** job.attempts);
      db.prepare(`UPDATE job_queue SET status = ?, run_at = ?, last_error = ?, updated_at = ? WHERE id = ?`).run(
        exhausted ? 'failed' : 'pending',
        new Date(Date.now() + backoffMs).toISOString(),
        message,
        new Date().toISOString(),
        id
      );
      (exhausted ? log.error : log.warn)('job failed', { id, type: job.type, attempt: job.attempts, error: message });
    }
  }
  return ran;
}

let workerStarted = false;
let timer: NodeJS.Timeout | null = null;

/** Starts the in-process worker: polls every `intervalMs` and prunes finished jobs older than 7 days. */
export function startQueueWorker(intervalMs = 2_000): void {
  if (workerStarted) return;
  workerStarted = true;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await runQueueOnce();
    } catch (err) {
      log.error('queue tick failed', { error: String(err) });
    } finally {
      busy = false;
    }
  };
  timer = setInterval(tick, intervalMs);
  timer.unref();
  setInterval(
    () => {
      try {
        getDb()
          .prepare(`DELETE FROM job_queue WHERE status IN ('done','failed') AND updated_at < ?`)
          .run(new Date(Date.now() - 7 * 86_400_000).toISOString());
      } catch (err) {
        log.warn('queue prune failed', { error: String(err) });
      }
    },
    6 * 60 * 60_000
  ).unref();
  log.info('job queue worker started', { intervalMs, env: config.env });
}

export function stopQueueWorker(): void {
  if (timer) clearInterval(timer);
  timer = null;
  workerStarted = false;
}
