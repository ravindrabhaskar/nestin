import { platformFeeFor, handleWebhookOrder as handleSubscriptionWebhookOrder } from './billingService.js';
import type { TenantBookingItem, TenantPaymentItem, TenantSupportTicket, TenantDocument } from '../../src/types';
import {
  bookings,
  payments,
  documents,
  supportTickets,
  wishlist,
  properties,
  notifications,
  users,
  type StoredBooking,
  type PaymentRecord,
  type StoredDocument,
  type StoredTicket,
} from '../db/repositories.js';
import { badRequest, notFound, HttpError } from '../lib/errors.js';
import { config } from '../config.js';
import { createOrder, razorpayEnabled, verifyPaymentSignature, assertPaymentsAvailable } from '../lib/razorpay.js';
import { newId, invoiceNumber, ticketNumber } from '../lib/ids.js';
import * as v from '../lib/validate.js';
import { events, type EventContext } from '../lib/events.js';
import type { AuthUser } from '../middleware/auth.js';
import { toPublicListing } from './propertyService.js';
import { notifyUser } from './crmService.js';
import { responsibleOwnerFor, notifySupportSide } from './supportService.js';

// ---------------------------------------------------------------------------------------------
// Bookings (tenant view of CRM bookings)
// ---------------------------------------------------------------------------------------------

/** Resident-facing lifecycle: pending/confirmed before move-in = upcoming; confirmed after move-in or moved-in = active. */
function deriveTenantStatus(b: StoredBooking): TenantBookingItem['status'] {
  const now = Date.now();
  if (b.bookingStatus === 'Cancelled' || b.bookingStatus === 'Rejected') return 'cancelled';
  if (
    b.expectedMoveOutDate &&
    Date.parse(b.expectedMoveOutDate) < now &&
    (b.bookingStatus === 'Completed' || b.bookingStatus === 'Confirmed')
  )
    return 'completed';
  if (b.bookingStatus === 'Completed') return 'active';
  if (b.bookingStatus === 'Confirmed' && Date.parse(b.moveInDate) <= now) return 'active';
  return 'upcoming';
}

function toTenantBooking(b: StoredBooking): TenantBookingItem {
  const owner = users.findById(b.ownerId);
  const prop = properties.get(b.propertyId);
  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    pgId: b.propertyId,
    pgName: b.propertyName,
    pgSlug: b.propertySlug || prop?.slug,
    location: b.propertyAddress || prop?.location?.formattedAddress || '',
    city: b.propertyCity || prop?.location?.city || '',
    roomType: b.roomType,
    sharingType: b.roomType,
    checkInDate: b.moveInDate,
    checkOutDate: b.expectedMoveOutDate,
    monthlyRent: b.monthlyRent,
    depositAmount: b.securityDeposit,
    paidAmount: b.paidAmount,
    status: deriveTenantStatus(b),
    approval: b.bookingStatus,
    image: b.propertyImage || prop?.coverImage || '',
    ownerName: owner?.fullName,
    ownerPhone: prop?.caretaker?.isPubliclyVisible ? prop.caretaker.phone : undefined,
    bedNumber: b.bedNumber,
    roomNumber: b.roomName,
    amenitiesIncluded: prop?.amenities
      ?.filter((a) => a.isAvailable)
      .slice(0, 6)
      .map((a) => a.name),
    cancellationReason: b.cancellationReason || b.rejectionReason,
  };
}

export function myBookings(userId: string): TenantBookingItem[] {
  return bookings.list({ tenant_id: userId }).map(toTenantBooking);
}

export function myBookingDetail(userId: string, id: string): { booking: TenantBookingItem; raw: StoredBooking } {
  const b = bookings.get(id);
  if (!b || b.tenantId !== userId) throw notFound('Booking');
  return { booking: toTenantBooking(b), raw: b };
}

// ---------------------------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------------------------

function toTenantPayment(p: PaymentRecord): TenantPaymentItem {
  return {
    id: p.id,
    transactionId: p.transactionId,
    bookingId: p.bookingId,
    pgName: p.propertyName,
    amount: p.amount,
    type: p.type === 'Subscription' ? 'Maintenance' : p.type,
    date: p.date,
    paymentMethod:
      p.method === 'Cash' || p.method === 'Auto-Debit' || p.method === 'Razorpay' ? 'UPI / GPay' : p.method,
    status: p.status,
    month: p.month,
    invoiceNumber: p.invoiceNumber,
    gateway: p.gateway,
    receiptUrl: `/api/v1/tenant/payments/${p.id}/receipt`,
  };
}

export function myPayments(userId: string): TenantPaymentItem[] {
  return payments.list({ tenant_id: userId }).map(toTenantPayment);
}

export function paymentReceipt(userId: string, id: string): PaymentRecord {
  const p = payments.get(id);
  if (!p || p.tenantId !== userId) throw notFound('Payment');
  return p;
}

/** Tenant pays rent/dues online. Without gateway keys the payment is recorded as a simulated success. */
export function payOnline(actor: AuthUser, body: Record<string, unknown>, ctx: EventContext): TenantPaymentItem {
  // Legacy one-shot payment: only meaningful while payments are simulated. With a real gateway the
  // client must use the checkout handshake, otherwise a "Paid" record would exist without money.
  if (razorpayEnabled()) throw badRequest('Use the checkout flow to pay online.');
  assertPaymentsAvailable();
  const amount = v.money(body.amount, 'Amount', { min: 1, max: 10_000_000 });
  const type = v.oneOf(
    body.type,
    ['Rent', 'Security Deposit', 'Token Booking', 'Maintenance', 'Electricity'] as const,
    'Payment type',
    'Rent'
  );
  const method = v.oneOf(
    body.paymentMethod,
    ['UPI / GPay', 'Credit Card', 'Debit Card', 'Net Banking'] as const,
    'Payment method',
    'UPI / GPay'
  );
  const idempotencyKey = v.optionalStr(body.idempotencyKey, 'Idempotency key', 120);
  const bookingId = v.optionalStr(body.bookingId, 'Booking', 80);

  let booking: StoredBooking | null;
  if (bookingId) {
    booking = bookings.get(bookingId);
    if (!booking || booking.tenantId !== actor.id) throw notFound('Booking');
  } else {
    booking =
      bookings.list({ tenant_id: actor.id }).find((b) => ['Confirmed', 'Completed'].includes(b.bookingStatus)) || null;
  }
  if (!booking) throw badRequest('You need a confirmed booking before paying online.');

  if (idempotencyKey) {
    const existing = payments.findOne({ idempotency_key: idempotencyKey });
    if (existing) return toTenantPayment(existing);
  }

  const now = new Date();
  const record: PaymentRecord = {
    id: newId('pay'),
    ownerId: booking.ownerId,
    tenantId: actor.id,
    customerId: booking.customerId,
    bookingId: booking.id,
    propertyId: booking.propertyId,
    propertyName: booking.propertyName,
    tenantName: booking.tenantName,
    amount,
    currency: 'INR',
    type,
    method,
    status: 'Paid',
    gateway: 'simulated',
    invoiceNumber: invoiceNumber('INV', now),
    transactionId: `TXN-${now.getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
    idempotencyKey,
    month: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    description: `${type} paid online via ${method}`,
    date: now.toISOString(),
    createdAt: now.toISOString(),
  };
  payments.insert(record);
  notifyUser(booking.ownerId, {
    title: 'Online Payment Received',
    message: `${booking.tenantName} paid ₹${amount.toLocaleString('en-IN')} (${type}) for ${booking.propertyName}.`,
    type: 'payment',
    linkTo: '/owner/customers',
  });
  notifyUser(actor.id, {
    title: 'Payment Successful',
    message: `₹${amount.toLocaleString('en-IN')} paid. Invoice ${record.invoiceNumber}.`,
    type: 'payment',
    linkTo: '/payments',
  });
  events.publish(
    'OnlinePaymentCaptured',
    'Payment',
    record.id,
    { amount, type, gateway: record.gateway },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: booking.ownerId }
  );
  return toTenantPayment(record);
}

// ---------------------------------------------------------------------------------------------
// Documents (metadata only; binary uploads go to object storage in production)
// ---------------------------------------------------------------------------------------------

const DOC_TYPES = ['govt_id', 'address_proof', 'student_id', 'employment_proof', 'agreement', 'other'] as const;

export function myDocuments(userId: string): TenantDocument[] {
  return documents.list({ tenant_id: userId });
}

export function addDocument(actor: AuthUser, body: Record<string, unknown>, ctx: EventContext): TenantDocument {
  const doc: StoredDocument = {
    id: newId('doc'),
    tenantId: actor.id,
    ownerId: responsibleOwnerFor(actor.id).ownerId,
    name: v.str(body.name, 'Document name', { max: 120 }),
    type: v.oneOf(body.type, DOC_TYPES, 'Document type', 'other'),
    documentNumber: v.optionalStr(body.documentNumber, 'Document number', 60),
    fileName: v.str(body.fileName, 'File name', { max: 200 }),
    fileSize: v.optionalStr(body.fileSize, 'File size', 20),
    uploadedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: 'in_review',
    fileUrl: v.optionalStr(body.fileUrl, 'File URL', 2000),
  };
  if (documents.count({ tenant_id: actor.id }) >= 25)
    throw badRequest('Document limit reached. Remove an old document first.');
  documents.insert(doc);
  events.publish(
    'TenantDocumentUploaded',
    'Document',
    doc.id,
    { type: doc.type },
    { ...ctx, actorId: actor.id, actorRole: actor.role }
  );
  return doc;
}

export function deleteDocument(actor: AuthUser, id: string, ctx: EventContext): void {
  const doc = documents.get(id);
  if (!doc || doc.tenantId !== actor.id) throw notFound('Document');
  if (doc.status === 'verified')
    throw badRequest('Verified documents cannot be removed. Contact support if a document needs replacing.');
  documents.remove(id);
  events.publish('TenantDocumentDeleted', 'Document', id, {}, { ...ctx, actorId: actor.id, actorRole: actor.role });
}

// ---------------------------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------------------------

export function myTickets(userId: string): TenantSupportTicket[] {
  return supportTickets.list({ tenant_id: userId });
}

export function createTicket(actor: AuthUser, body: Record<string, unknown>, ctx: EventContext): TenantSupportTicket {
  const subject = v.str(body.subject, 'Subject', { max: 200 });
  const description = v.str(body.description || body.message, 'Description', { max: 3000 });
  const category = v.str(body.category || 'General', 'Category', { max: 60 });
  const priority = v.oneOf(body.priority, ['Low', 'Medium', 'High'] as const, 'Priority', 'Medium');
  const now = new Date().toISOString();
  const responsible = responsibleOwnerFor(actor.id);
  const ticket: StoredTicket = {
    id: newId('tkt'),
    tenantId: actor.id,
    ownerId: responsible.ownerId,
    tenantName: actor.fullName,
    tenantEmail: actor.email,
    ticketNumber: ticketNumber(),
    subject,
    category,
    description,
    pgName: v.optionalStr(body.pgName, 'Property', 120) || responsible.propertyName,
    status: 'Open',
    priority,
    createdAt: now,
    updatedAt: now,
    messages: [{ id: newId('msg'), sender: 'user', senderName: actor.fullName, message: description, timestamp: now }],
  };
  supportTickets.insert(ticket);
  notifySupportSide(ticket, 'New support ticket', `${actor.fullName}: ${subject}`);
  events.publish(
    'SupportTicketCreated',
    'SupportTicket',
    ticket.id,
    { category, priority },
    { ...ctx, actorId: actor.id, actorRole: actor.role }
  );
  return ticket;
}

export function replyToTicket(
  actor: AuthUser,
  id: string,
  body: Record<string, unknown>,
  ctx: EventContext
): TenantSupportTicket {
  const ticket = supportTickets.get(id);
  if (!ticket || ticket.tenantId !== actor.id) throw notFound('Ticket');
  const message = v.str(body.message, 'Message', { max: 3000 });
  const now = new Date().toISOString();
  ticket.messages = [
    ...(ticket.messages || []),
    { id: newId('msg'), sender: 'user', senderName: actor.fullName, message, timestamp: now },
  ];
  ticket.status = ticket.status === 'Resolved' || ticket.status === 'resolved' ? 'Open' : ticket.status;
  ticket.updatedAt = now;
  supportTickets.replace(ticket);
  notifySupportSide(
    ticket,
    `Reply on ticket ${ticket.ticketNumber || ''}`.trim(),
    `${actor.fullName}: ${message.slice(0, 160)}`
  );
  events.publish('SupportTicketReplied', 'SupportTicket', id, {}, { ...ctx, actorId: actor.id, actorRole: actor.role });
  return ticket;
}

export function closeTicket(actor: AuthUser, id: string, ctx: EventContext): TenantSupportTicket {
  const ticket = supportTickets.get(id);
  if (!ticket || ticket.tenantId !== actor.id) throw notFound('Ticket');
  ticket.status = 'Resolved';
  ticket.updatedAt = new Date().toISOString();
  supportTickets.replace(ticket);
  events.publish(
    'SupportTicketResolved',
    'SupportTicket',
    id,
    {},
    { ...ctx, actorId: actor.id, actorRole: actor.role }
  );
  return ticket;
}

// ---------------------------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------------------------

export function myWishlist(userId: string) {
  return wishlist
    .list(userId)
    .map((id) => properties.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.status === 'published')
    .map(toPublicListing);
}

export function setWishlist(
  userId: string,
  propertyId: string,
  saved: boolean
): { saved: boolean; propertyIds: string[] } {
  if (!properties.exists(propertyId)) throw notFound('Property');
  if (saved) wishlist.add(userId, propertyId);
  else wishlist.remove(userId, propertyId);
  return { saved, propertyIds: wishlist.list(userId) };
}

export function clearWishlist(userId: string): void {
  wishlist.clear(userId);
}

export function myNotifications(userId: string) {
  return notifications.list({ user_id: userId }, { limit: 100 });
}

// ---------------------------------------------------------------------------------------------
// Razorpay checkout (order → verify → captured). Falls back to simulated payments when unconfigured.
// ---------------------------------------------------------------------------------------------

export interface CheckoutOrder {
  simulated: boolean;
  paymentId: string;
  orderId?: string;
  amount: number;
  currency: 'INR';
  keyId?: string;
  description: string;
  prefill: { name: string; email: string; contact?: string };
}

/** Creates (or reuses) a pending payment record and a Razorpay order for it. */
export async function createCheckoutOrder(
  actor: AuthUser,
  body: Record<string, unknown>,
  ctx: EventContext
): Promise<CheckoutOrder> {
  assertPaymentsAvailable();
  const existingId = v.optionalStr(body.paymentId, 'Payment', 80);
  let pending: PaymentRecord | null = existingId ? payments.get(existingId) : null;
  if (pending && (pending.tenantId !== actor.id || pending.status !== 'Pending'))
    throw badRequest('This payment is not pending or does not belong to you.');

  if (!pending) {
    const amount = v.money(body.amount, 'Amount', { min: 1, max: 10_000_000 });
    const type = v.oneOf(
      body.type,
      ['Rent', 'Security Deposit', 'Token Booking', 'Maintenance', 'Electricity'] as const,
      'Payment type',
      'Rent'
    );
    const bookingId = v.optionalStr(body.bookingId, 'Booking', 80);
    let booking: StoredBooking | null = bookingId ? bookings.get(bookingId) : null;
    if (bookingId && (!booking || booking.tenantId !== actor.id)) throw notFound('Booking');
    if (!booking)
      booking =
        bookings
          .list({ tenant_id: actor.id })
          .find((b) => ['Confirmed', 'Completed', 'Pending'].includes(b.bookingStatus)) || null;
    if (!booking) throw badRequest('You need a booking before paying online.');
    const now = new Date();
    pending = {
      id: newId('pay'),
      ownerId: booking.ownerId,
      tenantId: actor.id,
      customerId: booking.customerId,
      bookingId: booking.id,
      propertyId: booking.propertyId,
      propertyName: booking.propertyName,
      tenantName: booking.tenantName,
      amount,
      currency: 'INR',
      type,
      method: 'Razorpay',
      status: 'Pending',
      gateway: razorpayEnabled() ? 'razorpay' : 'simulated',
      invoiceNumber: invoiceNumber('INV', now),
      transactionId: `TXN-${now.getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
      month: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      description: `${type} for ${booking.propertyName}`,
      date: now.toISOString(),
      createdAt: now.toISOString(),
    };
    payments.insert(pending);
  }

  const user = users.findById(actor.id);
  const prefill = { name: actor.fullName, email: actor.email, contact: user?.data.phone };

  if (!razorpayEnabled()) {
    return {
      simulated: true,
      paymentId: pending.id,
      amount: pending.amount,
      currency: 'INR',
      description: pending.description || pending.type,
      prefill,
    };
  }
  if (!pending.gatewayOrderId) {
    const order = await createOrder(pending.amount, pending.id, {
      paymentId: pending.id,
      tenantId: actor.id,
      type: pending.type,
    });
    pending.gatewayOrderId = order.id;
    pending.gateway = 'razorpay';
    payments.replace(pending);
  }
  events.publish(
    'CheckoutStarted',
    'Payment',
    pending.id,
    { amount: pending.amount, gateway: 'razorpay' },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: pending.ownerId }
  );
  return {
    simulated: false,
    paymentId: pending.id,
    orderId: pending.gatewayOrderId,
    amount: pending.amount,
    currency: 'INR',
    keyId: config.razorpay.keyId,
    description: pending.description || pending.type,
    prefill,
  };
}

function markPaid(
  record: PaymentRecord,
  gatewayPaymentId: string | undefined,
  method: PaymentRecord['method'],
  ctx: EventContext
): PaymentRecord {
  if (record.status === 'Paid') return record;
  record.status = 'Paid';
  record.method = method;
  record.gatewayPaymentId = gatewayPaymentId;
  record.date = new Date().toISOString();
  Object.assign(record, platformFeeFor(record.amount));
  payments.replace(record);
  if (record.bookingId) {
    const booking = bookings.get(record.bookingId);
    if (booking) {
      booking.paidAmount = Math.min(booking.totalAmount, (booking.paidAmount || 0) + record.amount);
      booking.paymentStatus = booking.paidAmount >= booking.totalAmount ? 'Paid' : 'Partial';
      bookings.replace(booking);
    }
  }
  notifyUser(record.ownerId, {
    title: 'Online Payment Received',
    message: `${record.tenantName} paid ₹${record.amount.toLocaleString('en-IN')} (${record.type}) for ${record.propertyName}.`,
    type: 'payment',
    linkTo: '/owner/customers',
  });
  if (record.tenantId)
    notifyUser(record.tenantId, {
      title: 'Payment Successful',
      message: `₹${record.amount.toLocaleString('en-IN')} received. Invoice ${record.invoiceNumber}.`,
      type: 'payment',
      linkTo: '/payments',
    });
  events.publish(
    'OnlinePaymentCaptured',
    'Payment',
    record.id,
    { amount: record.amount, type: record.type, gateway: record.gateway },
    { ...ctx, actorId: record.tenantId, actorRole: 'tenant', ownerId: record.ownerId }
  );
  return record;
}

/** Completes a checkout: simulated (no gateway) or Razorpay signature-verified. */
export function completeCheckout(actor: AuthUser, body: Record<string, unknown>, ctx: EventContext): TenantPaymentItem {
  const paymentId = v.str(body.paymentId, 'Payment', { max: 80 });
  const record = payments.get(paymentId);
  if (!record || record.tenantId !== actor.id) throw notFound('Payment');
  if (record.status === 'Paid') return toTenantPayment(record);

  if (razorpayEnabled() && record.gateway === 'razorpay') {
    const orderId = v.str(body.razorpay_order_id, 'Order id', { max: 80 });
    const gwPaymentId = v.str(body.razorpay_payment_id, 'Payment id', { max: 80 });
    const signature = v.str(body.razorpay_signature, 'Signature', { max: 200 });
    if (orderId !== record.gatewayOrderId || !verifyPaymentSignature(orderId, gwPaymentId, signature)) {
      events.publish(
        'PaymentSignatureRejected',
        'Payment',
        record.id,
        {},
        { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: record.ownerId }
      );
      throw new HttpError(
        400,
        'INVALID_SIGNATURE',
        'Payment could not be verified. If money was deducted it will be reconciled automatically.'
      );
    }
    return toTenantPayment(markPaid(record, gwPaymentId, 'Razorpay', ctx));
  }
  assertPaymentsAvailable();
  const method = v.oneOf(
    body.paymentMethod,
    ['UPI / GPay', 'Credit Card', 'Debit Card', 'Net Banking'] as const,
    'Payment method',
    'UPI / GPay'
  );
  return toTenantPayment(markPaid(record, `sim_${Date.now().toString(36)}`, method, ctx));
}

/** Razorpay reports amounts in paise; the record stores rupees. */
export function webhookAmountMatches(
  entity: { amount?: unknown; currency?: unknown } | undefined,
  amountInr: number
): boolean {
  const paise = Number(entity?.amount);
  if (!Number.isFinite(paise)) return false;
  if (entity?.currency && entity.currency !== 'INR') return false;
  return paise === Math.round(amountInr * 100);
}

/** Razorpay webhook (`payment.captured` / `payment.failed`). Idempotent; signature verified by the route. */
export function handleRazorpayWebhook(event: { event?: string; payload?: any }): { handled: boolean } {
  const entity = event.payload?.payment?.entity;
  const orderId: string | undefined = entity?.order_id;
  if (!orderId) return { handled: false };
  const record = payments.findOne({ gateway_order_id: orderId });
  if (!record) return { handled: handleSubscriptionWebhookOrder(orderId, event.event, entity) };
  if (event.event === 'payment.captured') {
    // The captured amount (paise) must match what we asked for; a partial capture never marks the record paid.
    if (!webhookAmountMatches(entity, record.amount)) {
      events.publish(
        'WebhookAmountMismatch',
        'Payment',
        record.id,
        { expected: record.amount, received: entity?.amount, currency: entity?.currency },
        { ownerId: record.ownerId }
      );
      return { handled: false };
    }
    markPaid(record, entity.id, 'Razorpay', { correlationId: `webhook-${entity.id}` });
    return { handled: true };
  }
  if (event.event === 'payment.failed' && record.status === 'Pending') {
    record.status = 'Failed';
    payments.replace(record);
    events.publish(
      'OnlinePaymentFailed',
      'Payment',
      record.id,
      { reason: entity.error_description },
      { ownerId: record.ownerId }
    );
    return { handled: true };
  }
  return { handled: false };
}
