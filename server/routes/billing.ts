import { Router } from 'express';
import * as billing from '../services/billingService.js';
import * as monetisation from '../services/monetisationService.js';
import { ADDONS } from '../../src/lib/domain/plans';
import { authenticate, requireRole, ownerScope, currentUser, type AuthedRequest } from '../middleware/auth.js';
import { sendOk, wrap } from '../middleware/common.js';

/** Owner subscription: current plan, usage against limits, invoices and upgrade checkout. */
export const billingRouter = Router();

const ctx = (req: AuthedRequest) => ({ correlationId: req.correlationId });

billingRouter.use(authenticate, requireRole('owner', 'employee', 'super_admin'));

billingRouter.get(
  '/',
  wrap((req, res) => sendOk(res, billing.view(ownerScope(req))))
);

billingRouter.post(
  '/checkout',
  wrap(async (req, res) =>
    sendOk(res, await billing.createCheckout(currentUser(req), ownerScope(req), req.body || {}, ctx(req)), 201)
  )
);

billingRouter.post(
  '/checkout/complete',
  wrap((req, res) => sendOk(res, billing.completeCheckout(currentUser(req), ownerScope(req), req.body || {}, ctx(req))))
);

// Add-ons: verification visit, featured placement --------------------------------------------
billingRouter.get(
  '/addons',
  wrap((req, res) => sendOk(res, { prices: ADDONS, orders: monetisation.listAddonOrders(ownerScope(req)) }))
);
billingRouter.post(
  '/addons/checkout',
  wrap(async (req, res) =>
    sendOk(
      res,
      await monetisation.createAddonCheckout(currentUser(req), ownerScope(req), req.body || {}, ctx(req)),
      201
    )
  )
);
billingRouter.post(
  '/addons/checkout/complete',
  wrap((req, res) =>
    sendOk(res, monetisation.completeAddonCheckout(currentUser(req), ownerScope(req), req.body || {}, ctx(req)))
  )
);

billingRouter.post(
  '/cancel',
  wrap((req, res) =>
    sendOk(res, billing.cancelAtPeriodEnd(currentUser(req), ownerScope(req), req.body?.cancel !== false, ctx(req)))
  )
);
