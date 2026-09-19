import { Router } from 'express';
import * as admin from '../services/adminService.js';
import { sendOk, wrap } from '../middleware/common.js';
import { rateLimit } from '../lib/rateLimit.js';
import { auditEvents } from '../db/repositories.js';
import { authenticate, requireRole, ownerScope } from '../middleware/auth.js';

export const publicRouter = Router();

const formLimiter = rateLimit({ name: 'forms', windowMs: 60 * 60 * 1000, max: 30 });

/** Live platform numbers for the landing page (no fabricated marketing figures). */
publicRouter.get('/stats', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  sendOk(res, admin.publicStats());
});

publicRouter.post(
  '/contact',
  formLimiter,
  wrap((req, res) => sendOk(res, admin.submitContact(req.body || {}, { correlationId: req.correlationId }), 201))
);
publicRouter.post(
  '/owner-demo',
  formLimiter,
  wrap((req, res) => sendOk(res, admin.submitDemoRequest(req.body || {}, { correlationId: req.correlationId }), 201))
);
publicRouter.post(
  '/newsletter',
  formLimiter,
  wrap((req, res) => sendOk(res, admin.subscribeNewsletter(req.body || {}, { correlationId: req.correlationId }), 201))
);

/** Owner-scoped audit trail (the RBAC UI's "Audit Logs" modal reads the RBAC audit; this is the platform event trail). */
export const auditRouter = Router();
auditRouter.get(
  '/logs',
  authenticate,
  requireRole('owner', 'employee', 'super_admin'),
  wrap((req, res) => {
    const ownerId = ownerScope(req);
    const limit = Math.min(500, Number(req.query.limit) || 100);
    const type = typeof req.query.eventType === 'string' ? req.query.eventType : undefined;
    sendOk(res, auditEvents.list({ ownerId, type, limit }));
  })
);
