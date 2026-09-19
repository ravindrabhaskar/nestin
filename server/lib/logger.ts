import type { Response, NextFunction } from 'express';
import { config } from '../config.js';
import type { AuthedRequest } from '../middleware/auth.js';

/**
 * Structured logging. In production every request becomes one JSON line (ingestible by Loki,
 * CloudWatch, Datadog, …) carrying the correlation id so a client report can be traced end to end.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  if (config.logging.format === 'off') return;
  if (config.logging.format === 'json') {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields });
    if (level === 'error') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
    return;
  }
  const extra = Object.keys(fields).length ? ' ' + JSON.stringify(fields) : '';
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[${level}] ${msg}${extra}`);
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
};

// ---------------------------------------------------------------------------------------------
// Request metrics (exposed at /metrics in Prometheus text format)
// ---------------------------------------------------------------------------------------------

const LATENCY_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

interface RouteStats {
  count: number;
  totalMs: number;
  buckets: number[];
  byStatus: Map<number, number>;
}

const routeStats = new Map<string, RouteStats>();
let inFlight = 0;
let totalRequests = 0;
let totalErrors = 0;

/** Collapses ids so the label set stays bounded: /crm/leads/lead-abc → /crm/leads/:id */
function normalisePath(path: string): string {
  return path
    .replace(/\/api(\/v\d+)?/, '')
    .split('?')[0]
    .split('/')
    .map((seg) => (/^[a-z]+-[a-z0-9]{6,}$|^\d+$|^[0-9a-f]{16,}$/i.test(seg) ? ':id' : seg))
    .join('/')
    .slice(0, 80);
}

export function requestLogger(req: AuthedRequest, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  inFlight += 1;
  res.on('finish', () => {
    inFlight -= 1;
    totalRequests += 1;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const key = `${req.method} ${normalisePath(req.originalUrl || req.url)}`;
    let stats = routeStats.get(key);
    if (!stats) {
      stats = { count: 0, totalMs: 0, buckets: new Array(LATENCY_BUCKETS_MS.length + 1).fill(0), byStatus: new Map() };
      if (routeStats.size < 500) routeStats.set(key, stats);
    }
    stats.count += 1;
    stats.totalMs += ms;
    const idx = LATENCY_BUCKETS_MS.findIndex((b) => ms <= b);
    stats.buckets[idx === -1 ? LATENCY_BUCKETS_MS.length : idx] += 1;
    stats.byStatus.set(res.statusCode, (stats.byStatus.get(res.statusCode) || 0) + 1);
    if (res.statusCode >= 500) totalErrors += 1;

    const level: Level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    if (config.logging.format === 'pretty' && level === 'info') return; // keep dev terminals quiet
    emit(level, 'request', {
      method: req.method,
      path: (req.originalUrl || req.url).split('?')[0],
      status: res.statusCode,
      ms: Math.round(ms * 10) / 10,
      correlationId: req.correlationId,
      userId: req.user?.id,
      role: req.user?.role,
      ip: req.ip,
    });
  });
  next();
}

export interface MetricsSnapshot {
  requestsTotal: number;
  errorsTotal: number;
  inFlight: number;
  routes: Array<{ route: string; count: number; avgMs: number; p95Ms: number; statuses: Record<string, number> }>;
}

function p95(buckets: number[], count: number): number {
  const target = Math.ceil(count * 0.95);
  let seen = 0;
  for (let i = 0; i < buckets.length; i++) {
    seen += buckets[i];
    if (seen >= target) return i < LATENCY_BUCKETS_MS.length ? LATENCY_BUCKETS_MS[i] : LATENCY_BUCKETS_MS.at(-1)! * 2;
  }
  return 0;
}

export function metricsSnapshot(): MetricsSnapshot {
  return {
    requestsTotal: totalRequests,
    errorsTotal: totalErrors,
    inFlight,
    routes: [...routeStats.entries()]
      .map(([route, s]) => ({
        route,
        count: s.count,
        avgMs: Math.round((s.totalMs / s.count) * 10) / 10,
        p95Ms: p95(s.buckets, s.count),
        statuses: Object.fromEntries([...s.byStatus.entries()].map(([k, v]) => [String(k), v])),
      }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Prometheus exposition format. */
export function metricsText(extra: Record<string, number> = {}): string {
  const lines: string[] = [];
  lines.push('# HELP nestin_http_requests_total Total HTTP requests handled.');
  lines.push('# TYPE nestin_http_requests_total counter');
  for (const [route, s] of routeStats) {
    const [method, path] = route.split(' ', 2);
    for (const [status, n] of s.byStatus) {
      lines.push(`nestin_http_requests_total{method="${method}",route="${path}",status="${status}"} ${n}`);
    }
  }
  lines.push('# HELP nestin_http_request_duration_ms HTTP request latency histogram.');
  lines.push('# TYPE nestin_http_request_duration_ms histogram');
  for (const [route, s] of routeStats) {
    const [method, path] = route.split(' ', 2);
    let cumulative = 0;
    s.buckets.forEach((n, i) => {
      cumulative += n;
      const le = i < LATENCY_BUCKETS_MS.length ? String(LATENCY_BUCKETS_MS[i]) : '+Inf';
      lines.push(`nestin_http_request_duration_ms_bucket{method="${method}",route="${path}",le="${le}"} ${cumulative}`);
    });
    lines.push(`nestin_http_request_duration_ms_sum{method="${method}",route="${path}"} ${s.totalMs.toFixed(1)}`);
    lines.push(`nestin_http_request_duration_ms_count{method="${method}",route="${path}"} ${s.count}`);
  }
  lines.push('# TYPE nestin_http_in_flight gauge');
  lines.push(`nestin_http_in_flight ${inFlight}`);
  lines.push('# TYPE nestin_http_errors_total counter');
  lines.push(`nestin_http_errors_total ${totalErrors}`);
  for (const [name, value] of Object.entries(extra)) {
    lines.push(`# TYPE nestin_${name} gauge`);
    lines.push(`nestin_${name} ${value}`);
  }
  const mem = process.memoryUsage();
  lines.push('# TYPE nestin_process_rss_bytes gauge');
  lines.push(`nestin_process_rss_bytes ${mem.rss}`);
  lines.push('# TYPE nestin_process_heap_used_bytes gauge');
  lines.push(`nestin_process_heap_used_bytes ${mem.heapUsed}`);
  lines.push('# TYPE nestin_process_uptime_seconds gauge');
  lines.push(`nestin_process_uptime_seconds ${Math.floor(process.uptime())}`);
  return lines.join('\n') + '\n';
}
