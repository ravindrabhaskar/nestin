import type { Request, Response, NextFunction } from 'express';
import { tooManyRequests } from './errors.js';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window in-memory rate limiter keyed by client IP (+ optional key such as email).
 * Sufficient for a single-instance deployment; swap for a Redis-backed limiter when scaling out.
 */
export function rateLimit(opts: { windowMs: number; max: number; keyFn?: (req: Request) => string; name: string }) {
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(
    () => {
      const now = Date.now();
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    },
    Math.min(opts.windowMs, 60_000)
  );
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${opts.name}:${clientIp(req)}:${opts.keyFn ? opts.keyFn(req) : ''}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, opts.max - bucket.count)));
    if (bucket.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return next(tooManyRequests());
    }
    next();
  };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  // Only trust X-Forwarded-For when explicitly behind a proxy (express 'trust proxy' is set by the app).
  if (first && req.app.get('trust proxy')) return first.trim();
  return req.socket.remoteAddress || 'unknown';
}
