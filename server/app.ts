import express, { Router, type Express } from 'express';
import compression from 'compression';
import { config } from './config.js';
import { getDb } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { sessions } from './db/repositories.js';
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
import { storageDriverName } from './lib/storage.js';
import { messagingStatus } from './lib/messaging.js';
import './services/notificationService.js';

const startedAt = Date.now();

export const API_VERSION = '3.0.0';

/** Builds the versioned API router. Mounted at /api/v1 (and /api for convenience). */
export function createApiRouter(): Router {
  const api = Router();

  api.use(cors);
  api.use(securityHeaders);
  api.use(correlation);
  api.use(responseTime);
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

  api.use(notFoundHandler);
  api.use(errorHandler);
  return api;
}

export interface AppOptions {
  /** Attach the SPA (Vite dev middleware or static dist). Tests leave this off. */
  serveFrontend?: boolean;
}

export async function createApp(options: AppOptions = {}): Promise<Express> {
  getDb();
  seedDatabase();
  sessions.purgeExpired();

  const app = express();
  app.disable('x-powered-by');
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
      })
    );
  }

  if (config.jobs.enabled) startJobs();

  if (options.serveFrontend) {
    if (config.isProduction) {
      const path = await import('node:path');
      const distPath = path.join(process.cwd(), 'dist');
      app.use(
        express.static(distPath, {
          maxAge: '1y',
          index: false,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
          },
        })
      );
      app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
    } else {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
      app.use(vite.middlewares);
    }
  }

  return app;
}
