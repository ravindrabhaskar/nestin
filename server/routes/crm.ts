import { Router } from 'express';
import * as crm from '../services/crmService.js';
import * as support from '../services/supportService.js';
import {
  authenticate,
  requireRole,
  requirePermission,
  ownerScope,
  currentUser,
  type AuthedRequest,
} from '../middleware/auth.js';
import { sendOk, wrap } from '../middleware/common.js';

export const crmRouter = Router();

const ctx = (req: AuthedRequest) => ({ correlationId: req.correlationId });

crmRouter.use(authenticate, requireRole('owner', 'employee', 'super_admin'));

crmRouter.get(
  '/snapshot',
  wrap((req, res) => sendOk(res, crm.snapshot(ownerScope(req), currentUser(req).id)))
);

// ---- Generic owner-scoped documents ---------------------------------------------------------
const docPermissions = {
  leads: { view: 'leads.view', write: 'leads.edit', create: 'leads.create', remove: 'leads.delete' },
  visitors: { view: 'visitors.view', write: 'visitors.edit', create: 'visitors.create', remove: 'visitors.edit' },
  customers: { view: 'customers.view', write: 'customers.edit', create: 'customers.edit', remove: 'customers.edit' },
} as const;

for (const kind of ['leads', 'visitors', 'customers'] as const) {
  const perms = docPermissions[kind];
  crmRouter.post(
    `/${kind}`,
    requirePermission(perms.create),
    wrap((req, res) =>
      sendOk(res, crm.upsertDocument(kind, currentUser(req), ownerScope(req), undefined, req.body || {}, ctx(req)), 201)
    )
  );
  crmRouter.put(
    `/${kind}/:id`,
    requirePermission(perms.write),
    wrap((req, res) =>
      sendOk(res, crm.upsertDocument(kind, currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)))
    )
  );
  crmRouter.delete(
    `/${kind}/:id`,
    requirePermission(perms.remove),
    wrap((req, res) => {
      crm.deleteDocument(kind, currentUser(req), ownerScope(req), req.params.id, ctx(req));
      sendOk(res, { deleted: true, id: req.params.id });
    })
  );
}

crmRouter.post(
  '/customers/:id/payments',
  requirePermission('payments.manage'),
  wrap((req, res) =>
    sendOk(res, crm.addCustomerPayment(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)), 201)
  )
);
crmRouter.post(
  '/customers/:id/move-out',
  requirePermission('customers.edit'),
  wrap((req, res) =>
    sendOk(res, crm.recordMoveOut(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)))
  )
);

// ---- Bookings & workflows -------------------------------------------------------------------
crmRouter.post(
  '/bookings',
  requirePermission('bookings.create'),
  wrap((req, res) =>
    sendOk(
      res,
      crm.createBooking(currentUser(req), req.body || {}, ctx(req), {
        tenantInitiated: false,
        ownerId: ownerScope(req),
      }),
      201
    )
  )
);
crmRouter.put(
  '/bookings/:id',
  requirePermission('bookings.edit'),
  wrap((req, res) =>
    sendOk(res, crm.updateBooking(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)))
  )
);
crmRouter.post(
  '/bookings/:id/approve',
  requirePermission('bookings.approve'),
  wrap((req, res) =>
    sendOk(res, crm.approveBooking(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)))
  )
);
crmRouter.post(
  '/bookings/:id/reject',
  requirePermission('bookings.approve'),
  wrap((req, res) =>
    sendOk(
      res,
      crm.rejectBooking(currentUser(req), ownerScope(req), req.params.id, String(req.body?.reason || ''), ctx(req))
    )
  )
);
crmRouter.post(
  '/bookings/:id/cancel',
  requirePermission('bookings.cancel'),
  wrap((req, res) =>
    sendOk(
      res,
      crm.cancelBooking(currentUser(req), req.params.id, String(req.body?.reason || ''), ctx(req), {
        ownerId: ownerScope(req),
      })
    )
  )
);
crmRouter.post(
  '/bookings/:id/complete-move-in',
  requirePermission('bookings.edit'),
  wrap((req, res) => sendOk(res, crm.completeMoveIn(currentUser(req), ownerScope(req), req.params.id, ctx(req))))
);

// ---- Activity & notifications ---------------------------------------------------------------
crmRouter.post(
  '/activity',
  wrap((req, res) => sendOk(res, crm.recordActivity(currentUser(req), ownerScope(req), req.body || {}), 201))
);
crmRouter.post(
  '/notifications',
  wrap((req, res) => sendOk(res, crm.createNotification(currentUser(req).id, req.body || {}), 201))
);
crmRouter.put(
  '/notifications/:id/read',
  wrap((req, res) => {
    crm.markNotificationRead(currentUser(req).id, req.params.id);
    sendOk(res, { read: true, id: req.params.id });
  })
);

// ---- Resident support tickets (owner side) ----------------------------------------------------
crmRouter.get(
  '/support',
  requirePermission('support.manage'),
  wrap((req, res) => sendOk(res, support.listForOwner(ownerScope(req))))
);
crmRouter.post(
  '/support/:id/messages',
  requirePermission('support.manage'),
  wrap((req, res) =>
    sendOk(
      res,
      support.replyAsSupport(currentUser(req), req.params.id, req.body || {}, ctx(req), { ownerId: ownerScope(req) })
    )
  )
);
crmRouter.post(
  '/support/:id/resolve',
  requirePermission('support.manage'),
  wrap((req, res) =>
    sendOk(res, support.resolveAsSupport(currentUser(req), req.params.id, ctx(req), { ownerId: ownerScope(req) }))
  )
);
