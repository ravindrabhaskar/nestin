import { Router } from 'express';
import { config } from '../config.js';
import * as push from '../lib/push.js';
import { authenticate, currentUser } from '../middleware/auth.js';
import { sendOk, wrap } from '../middleware/common.js';

/** Web Push device registration. */
export const pushRouter = Router();

pushRouter.get('/config', (_req, res) => {
  sendOk(res, { enabled: push.pushEnabled(), publicKey: config.push.publicKey || null });
});

pushRouter.post(
  '/subscribe',
  authenticate,
  wrap((req, res) =>
    sendOk(
      res,
      { subscribed: true, id: push.subscribe(currentUser(req).id, req.body || {}, req.headers['user-agent']).id },
      201
    )
  )
);

pushRouter.post(
  '/unsubscribe',
  authenticate,
  wrap((req, res) =>
    sendOk(res, { unsubscribed: push.unsubscribe(currentUser(req).id, String(req.body?.endpoint || '')) })
  )
);
