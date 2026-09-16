import { Router } from 'express';
import * as tenant from '../services/tenantService.js';
import * as crm from '../services/crmService.js';
import { authenticate, requireRole, currentUser, type AuthedRequest } from '../middleware/auth.js';
import { sendOk, wrap } from '../middleware/common.js';

export const tenantRouter = Router();

const ctx = (req: AuthedRequest) => ({ correlationId: req.correlationId });

tenantRouter.use(authenticate);

// Bookings
tenantRouter.get(
  '/bookings',
  wrap((req, res) => sendOk(res, tenant.myBookings(currentUser(req).id)))
);
tenantRouter.get(
  '/bookings/:id',
  wrap((req, res) => sendOk(res, tenant.myBookingDetail(currentUser(req).id, req.params.id)))
);
tenantRouter.post(
  '/bookings',
  requireRole('tenant'),
  wrap((req, res) => {
    const booking = crm.createBooking(currentUser(req), req.body || {}, ctx(req), { tenantInitiated: true });
    sendOk(res, { booking, tenantBooking: tenant.myBookingDetail(currentUser(req).id, booking.id).booking }, 201);
  })
);
tenantRouter.post(
  '/bookings/:id/cancel',
  wrap((req, res) => {
    const result = crm.cancelBooking(currentUser(req), req.params.id, String(req.body?.reason || ''), ctx(req), {
      tenantId: currentUser(req).id,
    });
    sendOk(res, tenant.myBookingDetail(currentUser(req).id, result.booking.id).booking);
  })
);

// Visits
tenantRouter.post(
  '/visits',
  requireRole('tenant'),
  wrap((req, res) => sendOk(res, crm.scheduleVisitAsTenant(currentUser(req), req.body || {}, ctx(req)), 201))
);

// Payments
tenantRouter.get(
  '/payments',
  wrap((req, res) => sendOk(res, tenant.myPayments(currentUser(req).id)))
);
tenantRouter.post(
  '/payments',
  requireRole('tenant'),
  wrap((req, res) => sendOk(res, tenant.payOnline(currentUser(req), req.body || {}, ctx(req)), 201))
);
tenantRouter.post(
  '/payments/checkout',
  requireRole('tenant'),
  wrap(async (req, res) =>
    sendOk(res, await tenant.createCheckoutOrder(currentUser(req), req.body || {}, ctx(req)), 201)
  )
);
tenantRouter.post(
  '/payments/checkout/complete',
  requireRole('tenant'),
  wrap((req, res) => sendOk(res, tenant.completeCheckout(currentUser(req), req.body || {}, ctx(req))))
);
tenantRouter.get(
  '/payments/:id/receipt',
  wrap((req, res) => {
    const p = tenant.paymentReceipt(currentUser(req).id, req.params.id);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${p.invoiceNumber}.txt"`);
    res.send(
      [
        'NESTIN PAYMENT RECEIPT',
        '======================',
        `Invoice:        ${p.invoiceNumber}`,
        `Transaction:    ${p.transactionId}`,
        `Date:           ${new Date(p.date).toLocaleString('en-IN')}`,
        `Paid by:        ${p.tenantName}`,
        `Property:       ${p.propertyName}`,
        `Type:           ${p.type}`,
        `Method:         ${p.method}`,
        `Amount:         INR ${p.amount.toLocaleString('en-IN')}`,
        `Status:         ${p.status}`,
        '',
        'This is a system-generated receipt.',
      ].join('\n')
    );
  })
);

// Documents
tenantRouter.get(
  '/documents',
  wrap((req, res) => sendOk(res, tenant.myDocuments(currentUser(req).id)))
);
tenantRouter.post(
  '/documents',
  wrap((req, res) => sendOk(res, tenant.addDocument(currentUser(req), req.body || {}, ctx(req)), 201))
);
tenantRouter.delete(
  '/documents/:id',
  wrap((req, res) => {
    tenant.deleteDocument(currentUser(req), req.params.id, ctx(req));
    sendOk(res, { deleted: true, id: req.params.id });
  })
);

// Support
tenantRouter.get(
  '/support',
  wrap((req, res) => sendOk(res, tenant.myTickets(currentUser(req).id)))
);
tenantRouter.post(
  '/support',
  wrap((req, res) => sendOk(res, tenant.createTicket(currentUser(req), req.body || {}, ctx(req)), 201))
);
tenantRouter.post(
  '/support/:id/messages',
  wrap((req, res) => sendOk(res, tenant.replyToTicket(currentUser(req), req.params.id, req.body || {}, ctx(req))))
);
tenantRouter.post(
  '/support/:id/resolve',
  wrap((req, res) => sendOk(res, tenant.closeTicket(currentUser(req), req.params.id, ctx(req))))
);

// Wishlist
tenantRouter.get(
  '/wishlist',
  wrap((req, res) => sendOk(res, tenant.myWishlist(currentUser(req).id)))
);
tenantRouter.put(
  '/wishlist/:propertyId',
  wrap((req, res) => sendOk(res, tenant.setWishlist(currentUser(req).id, req.params.propertyId, true)))
);
tenantRouter.delete(
  '/wishlist/:propertyId',
  wrap((req, res) => sendOk(res, tenant.setWishlist(currentUser(req).id, req.params.propertyId, false)))
);
tenantRouter.delete(
  '/wishlist',
  wrap((req, res) => {
    tenant.clearWishlist(currentUser(req).id);
    sendOk(res, { cleared: true });
  })
);

// Notifications (any authenticated user)
tenantRouter.get(
  '/notifications',
  wrap((req, res) => sendOk(res, tenant.myNotifications(currentUser(req).id)))
);
tenantRouter.put(
  '/notifications/:id/read',
  wrap((req, res) => {
    crm.markNotificationRead(currentUser(req).id, req.params.id);
    sendOk(res, { read: true });
  })
);
