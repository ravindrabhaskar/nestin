import type { Request, Response, NextFunction } from 'express';
import { tooManyRequests } from './errors.js';
import { getDb } from '../db/database.js';

/**
 * Fixed-window rate limiter keyed by client IP (+ optional key such as email), persisted in the
 * `rate_limits` table so counters survive restarts and are shared by every app instance on the
 * same database. One upsert per request; expired rows are swept periodically.
 */
export function rateLimit(opts: { windowMs: number; max: number; keyFn?: (req: Request) => string; name: string }) {
  const sweep = setInterval(
    () => {
      try {
        getDb().prepare('DELETE FROM rate_limits WHERE reset_at <= ?').run(Date.now());
      } catch {
        // table may not exist yet during early boot; nothing to sweep
      }
    },
    Math.min(opts.windowMs, 60_000)
  );
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${opts.name}:${clientIp(req)}:${opts.keyFn ? opts.keyFn(req) : ''}`;
    const now = Date.now();
    const row = getDb()
      .prepare(
        `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET
           count = CASE WHEN rate_limits.reset_at <= excluded.reset_at - ? THEN 1 ELSE rate_limits.count + 1 END,
           reset_at = CASE WHEN rate_limits.reset_at <= excluded.reset_at - ? THEN excluded.reset_at ELSE rate_limits.reset_at END
         RETURNING count, reset_at`
      )
      .get(key, now + opts.windowMs, opts.windowMs, opts.windowMs) as { count: number; reset_at: number };
    res.setHeader('X-RateLimit-Limit', String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, opts.max - row.count)));
    if (row.count > opts.max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((row.reset_at - now) / 1000))));
      return next(tooManyRequests());
    }
    next();
  };
}

/**
 * Forgives a caller after a successful attempt so the limiter counts *failures*: twenty staff
 * signing in from one office NAT must not lock the twenty-first out, while twenty wrong passwords
 * for one account still do.
 */
export function resetRateLimit(name: string, req: Request, key = ''): void {
  try {
    getDb()
      .prepare('DELETE FROM rate_limits WHERE key = ?')
      .run(`${name}:${clientIp(req)}:${key}`);
  } catch {
    // best effort
  }
}

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  // Only trust X-Forwarded-For when explicitly behind a proxy (express 'trust proxy' is set by the app).
  if (first && req.app.get('trust proxy')) return first.trim();
  return req.socket.remoteAddress || 'unknown';
}
