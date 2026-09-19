import { log } from './logger.js';

/**
 * Error tracking. When SENTRY_DSN is set and `@sentry/node` is installed, unhandled errors,
 * 5xx responses and failed jobs are reported with the correlation id; otherwise this is a no-op
 * so the app has no hard dependency on the SDK. Import is dynamic so a missing package never
 * breaks startup.
 */

type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => unknown;
  captureMessage: (msg: string, ctx?: Record<string, unknown>) => unknown;
};

let sentry: SentryLike | null = null;
let attempted = false;

export async function initErrorTracking(): Promise<boolean> {
  if (attempted) return !!sentry;
  attempted = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  try {
    const modName = '@sentry/node';
    const mod = (await import(/* @vite-ignore */ modName)) as unknown as SentryLike;
    mod.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    });
    sentry = mod;
    process.on('unhandledRejection', (reason) => captureError(reason, { source: 'unhandledRejection' }));
    process.on('uncaughtException', (err) => captureError(err, { source: 'uncaughtException' }));
    log.info('error tracking enabled', { provider: 'sentry' });
    return true;
  } catch (err) {
    log.warn('SENTRY_DSN is set but @sentry/node is not installed; error tracking disabled', {
      error: String(err).slice(0, 120),
    });
    return false;
  }
}

export function captureError(err: unknown, context: Record<string, unknown> = {}): void {
  if (!sentry) return;
  try {
    sentry.captureException(err, { extra: context });
  } catch {
    // never let telemetry throw
  }
}

export const errorTrackingEnabled = () => !!sentry;
