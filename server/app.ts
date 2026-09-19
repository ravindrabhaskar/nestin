import crypto from 'node:crypto';
import express, { Router, type Express } from 'express';
import compression from 'compression';
import { config, assertProductionConfig } from './config.js';
import { getDb } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { sessions, backfillCatalogueColumns, backfillReservedAvailability } from './db/repositories.js';
import {
  correlation,
  cors,
  securityHeaders,
  responseTime,
  errorHandler,
  notFoundHandler,
  sendOk,
} from './middleware/common.js';
import { rateLimit } from './lib/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { propertiesRouter } from './routes/properties.js';
import { crmRouter } from './routes/crm.js';
import { rbacRouter } from './routes/rbac.js';
import { tenantRouter } from './routes/tenant.js';
import { adminRouter } from './routes/admin.js';
import { publicRouter, auditRouter } from './routes/public.js';
import { filesRouter } from './routes/files.js';
import { razorpayWebhookRouter } from './routes/webhooks.js';
import { startJobs } from './jobs/index.js';
import { syncBedAvailability } from './services/propertyService.js';
import { storageDriverName } from './lib/storage.js';
import { messagingStatus } from './lib/messaging.js';
import { billingRouter } from './routes/billing.js';
import { pushRouter } from './routes/push.js';
import { operationsRouter } from './routes/operations.js';
import { requestLogger, metricsText, log } from './lib/logger.js';
import { databaseSizeBytes } from './db/database.js';
import { pushEnabled } from './lib/push.js';
import { initErrorTracking, errorTrackingEnabled } from './lib/errorTracking.js';
import { queueStats } from './lib/queue.js';
import './services/notificationService.js';

const startedAt = Date.now();

function timingSafeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export const API_VERSION = '3.1.0';

/** Builds the versioned API router. Mounted at /api/v1 (and /api for convenience). */
export function createApiRouter(): Router {
  const api = Router();

  api.use(cors);
  api.use(correlation);
  api.use(responseTime);
  api.use(requestLogger);
  api.use(rateLimit({ name: 'api', windowMs: config.rateLimit.apiWindowMs, max: config.rateLimit.apiMaxRequests }));

  api.get(['/health', '/status'], (_req, res) => {
    sendOk(res, {
      status: 'UP',
      version: API_VERSION,
      environment: config.env,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      database: config.databasePath === ':memory:' ? 'sqlite (memory)' : 'sqlite (file)',
      googleSignIn: !!config.google.clientId,
      payments: config.razorpay.enabled ? 'razorpay' : 'simulated',
      storage: storageDriverName,
      messaging: messagingStatus(),
      push: pushEnabled(),
      errorTracking: errorTrackingEnabled(),
      queue: queueStats(),
      demoData: config.seedDemoData,
      timestamp: new Date().toISOString(),
    });
  });

  api.use('/auth', authRouter);
  api.use('/properties', propertiesRouter);
  api.use('/crm', crmRouter);
  api.use('/rbac', rbacRouter);
  api.use('/tenant', tenantRouter);
  api.use('/admin', adminRouter);
  api.use('/public', publicRouter);
  api.use('/audit', auditRouter);
  api.use('/files', filesRouter);
  api.use('/billing', billingRouter);
  api.use('/push', pushRouter);
  api.use('/operations', operationsRouter);

  api.use(notFoundHandler);
  api.use(errorHandler);
  return api;
}

export interface AppOptions {
  /** Attach the SPA (Vite dev middleware or static dist). Tests leave this off. */
  serveFrontend?: boolean;
}

export async function createApp(options: AppOptions = {}): Promise<Express> {
  assertProductionConfig();
  await initErrorTracking();
  getDb();
  seedDatabase();
  backfillCatalogueColumns();
  backfillReservedAvailability(syncBedAvailability);
  sessions.purgeExpired();

  const app = express();
  app.disable('x-powered-by');
  // Security headers go on every response, including the SPA document and static files.
  app.use(securityHeaders);
  app.use(compression({ threshold: 1024 }));
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);

  // Webhooks need the raw body for signature verification, so they are mounted before the JSON parser.
  app.use('/api/v1/webhooks', razorpayWebhookRouter);
  app.use('/api/webhooks', razorpayWebhookRouter);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  const api = createApiRouter();
  app.use('/api/v1', api);
  app.use('/api', api);

  // Prometheus scrape endpoint. Protected by METRICS_TOKEN when set (always required in production).
  app.get('/metrics', (req, res) => {
    const token = process.env.METRICS_TOKEN;
    if (token || config.isProduction) {
      const presented = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token || !timingSafeEqualString(presented, token)) {
        res.status(404).end();
        return;
      }
    }
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsText({ database_size_bytes: databaseSizeBytes() }));
  });

  // Public uploads (listing photos, avatars) from local storage.
  if (storageDriverName === 'local') {
    const path = await import('node:path');
    app.use(
      '/uploads/public',
      express.static(path.join(config.storage.uploadsDir, 'public'), {
        maxAge: '30d',
        immutable: true,
        index: false,
        dotfiles: 'deny',
        // A missing photo must be a 404, never the SPA's index.html (which the service worker would cache as an image).
        fallthrough: false,
      })
    );
  }

  if (config.jobs.enabled) startJobs();
  log.info('nestin api ready', {
    env: config.env,
    version: API_VERSION,
    payments: config.razorpay.enabled ? 'razorpay' : 'simulated',
  });

  if (options.serveFrontend) {
    if (config.isProduction) {
      const path = await import('node:path');
      const distPath = path.join(process.cwd(), 'dist');
      app.use(
        express.static(distPath, {
          maxAge: '1y',
          index: false,
          setHeaders: (res, filePath) => {
            // Un-hashed entry points must always be revalidated: the document, the service worker
            // (otherwise updates lag by the browser's 24h cap), the manifest and the offline page.
            const base = path.basename(filePath);
            if (base.endsWith('.html') || base === 'sw.js' || base === 'manifest.webmanifest') {
              res.setHeader('Cache-Control', 'no-cache');
            }
            if (filePath.endsWith('sw.js')) res.setHeader('Service-Worker-Allowed', '/');
          },
        })
      );
      app.get('*', (_req, res) =>
        res.sendFile(path.join(distPath, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } })
      );
    } else {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
      app.use(vite.middlewares);
    }
  }

  return app;
}
