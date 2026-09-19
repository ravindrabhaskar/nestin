import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../lib/errors.js';
import { config } from '../config.js';
import { captureError } from '../lib/errorTracking.js';
import type { AuthedRequest } from './auth.js';

export function correlation(req: AuthedRequest, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-correlation-id'];
  const value =
    typeof incoming === 'string' && /^[\w.-]{1,64}$/.test(incoming)
      ? incoming
      : `req-${crypto.randomBytes(8).toString('hex')}`;
  req.correlationId = value;
  res.setHeader('X-Correlation-Id', value);
  next();
}

/**
 * Content-Security-Policy for the SPA. Scripts are locked to this origin plus the two third-party
 * SDKs we load (Google Identity, Razorpay checkout); styles need 'unsafe-inline' because Tailwind
 * runtime utilities and motion/leaflet set inline styles. Images stay open over https because
 * listing photos come from the configured object store/CDN. In development Vite injects inline
 * module scripts for HMR / React Fast Refresh, so scripts are relaxed there only.
 */
export function contentSecurityPolicy(): string {
  const scriptSrc = ["'self'", 'https://accounts.google.com/gsi/', 'https://checkout.razorpay.com'];
  if (!config.isProduction) scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
  const connectSrc = [
    "'self'",
    'https://accounts.google.com/gsi/',
    'https://api.razorpay.com',
    'https://lumberjack.razorpay.com',
    'https://*.basemaps.cartocdn.com',
  ];
  if (!config.isProduction) connectSrc.push('ws:', 'wss:');
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'media-src': ["'self'", 'blob:'],
    'connect-src': connectSrc,
    'frame-src': ["'self'", 'https://accounts.google.com', 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };
  if (config.isProduction) directives['upgrade-insecure-requests'] = [];
  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(' ')}` : k))
    .join('; ');
}

const CSP_VALUE = contentSecurityPolicy();

/** Applied to every response (API and SPA alike) so the HTML document is protected too. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Content-Security-Policy', CSP_VALUE);
  if (config.isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

/**
 * CORS: same-origin by default (the SPA is served by this server). Extra origins can be allowed via
 * CORS_ORIGINS. Wildcards are deliberately not supported because requests carry bearer tokens.
 */
export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (origin) {
    const allowed =
      config.corsOrigins.includes(origin) ||
      (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id, Idempotency-Key');
      res.setHeader('Access-Control-Expose-Headers', 'X-Correlation-Id, X-Response-Time, Content-Disposition');
      res.setHeader('Access-Control-Max-Age', '600');
    }
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

export function responseTime(_req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = function patchedWriteHead(...args: Parameters<typeof originalWriteHead>) {
    if (!res.headersSent) {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      res.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`);
    }
    return originalWriteHead(...args);
  } as typeof res.writeHead;
  next();
}

export function sendOk<T>(res: Response, data: T, status = 200, extra: Record<string, unknown> = {}): Response {
  const req = res.req as AuthedRequest;
  return res.status(status).json({
    success: true,
    data,
    metadata: { timestamp: new Date().toISOString(), correlationId: req.correlationId, ...extra },
  });
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, 'NOT_FOUND', `No API route matches ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = (req as AuthedRequest).correlationId;
  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) },
      metadata: { timestamp: new Date().toISOString(), correlationId },
    });
    return;
  }
  const anyErr = err as { type?: string; status?: number; message?: string; name?: string; code?: string };
  if (anyErr?.name === 'MulterError') {
    const tooLarge = anyErr.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      success: false,
      error: {
        code: tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INVALID_UPLOAD',
        message: tooLarge
          ? `File exceeds the ${config.storage.maxFileBytes / 1024 / 1024} MB upload limit`
          : anyErr.message || 'Invalid upload',
      },
      metadata: { timestamp: new Date().toISOString(), correlationId },
    });
    return;
  }
  if (anyErr?.type === 'entity.parse.failed' || anyErr?.type === 'entity.too.large') {
    res.status(anyErr.status || 400).json({
      success: false,
      error: {
        code: anyErr.type === 'entity.too.large' ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON',
        message: anyErr.message || 'Invalid request body',
      },
      metadata: { timestamp: new Date().toISOString(), correlationId },
    });
    return;
  }
  console.error(`[api] unhandled error (${correlationId}):`, err);
  captureError(err, { correlationId, method: req.method, path: req.originalUrl });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    metadata: { timestamp: new Date().toISOString(), correlationId },
  });
}

/** Wraps an async route handler so rejections reach the error handler. */
export const wrap =
  (fn: (req: AuthedRequest, res: Response, next: NextFunction) => unknown) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next);
  };
