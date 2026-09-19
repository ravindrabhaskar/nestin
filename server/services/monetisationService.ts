import crypto from 'node:crypto';
import {
  users,
  customers,
  properties,
  bookings,
  mandates,
  addonOrders,
  type MandateRecord,
  type AddonOrderRecord,
  type UserRecord,
} from '../db/repositories.js';
import { Collection, getMeta, setMeta } from '../db/database.js';
import { config } from '../config.js';
import { badRequest, conflict, forbidden, notFound, HttpError } from '../lib/errors.js';
import { newId, nextSequenceLabel } from '../lib/ids.js';
import * as v from '../lib/validate.js';
import { events, type EventContext } from '../lib/events.js';
import type { AuthUser } from '../middleware/auth.js';
import {
  razorpayEnabled,
  simulatedPaymentsAllowed,
  assertPaymentsAvailable,
  createOrder,
  createRazorpaySubscription,
  cancelRazorpaySubscription,
  verifyPaymentSignature,
} from '../lib/razorpay.js';
import { notifyUser, recordPayment, approveBooking, rejectBooking } from './crmService.js';
import { ADDONS } from '../../src/lib/domain/plans';

/**
 * Money features beyond the subscription: UPI autopay mandates for rent, paid add-ons for owners
 * (verification visit, featured placement) and the WhatsApp command bot.
 */

const nowIso = () => new Date().toISOString();
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------------------------
// Autopay mandates (rent)
// ---------------------------------------------------------------------------------------------

function nextChargeDate(dayOfMonth: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), dayOfMonth, 9, 0, 0);
  if (d.getTime() <= from.getTime()) d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export function myMandate(tenantId: string): MandateRecord | null {
  return (
    mandates.list({ tenant_id: tenantId }, { limit: 20 }).find((m) => m.status !== 'cancelled') ||
    mandates.list({ tenant_id: tenantId }, { limit: 1 })[0] ||
    null
  );
}

export async function createMandate(
  actor: AuthUser,
  body: Record<string, unknown>,
  ctx: EventContext
): Promise<MandateRecord> {
  assertPaymentsAvailable();
  const existing = mandates
    .list({ tenant_id: actor.id })
    .find((m) => m.status === 'active' || m.status === 'pending_auth');
  if (existing) throw conflict('You already have an autopay mandate. Cancel it before creating a new one.');
  const customer = customers
    .list({ tenant_id: actor.id }, { limit: 50 })
    .sort((a, b) => (a.tenantStatus === 'Active' ? -1 : b.tenantStatus === 'Active' ? 1 : 0))
    .find((c) => c.tenantStatus === 'Active' || c.tenantStatus === 'Upcoming');
  if (!customer) throw badRequest('Autopay needs an active stay.');
  const dayOfMonth = v.num(body.dayOfMonth ?? config.jobs.rentDueDay, 'Day of month', {
    min: 1,
    max: 28,
    integer: true,
  });
  const amount = v.money(body.amount ?? customer.monthlyRent, 'Amount', { min: 1, max: 10_000_000 });
  const user = users.findById(actor.id);
  const record: MandateRecord = {
    id: newId('mnd'),
    tenantId: actor.id,
    customerId: customer.id,
    ownerId: customer.ownerId,
    propertyId: customer.propertyId,
    propertyName: customer.propertyName,
    amount,
    dayOfMonth,
    status: razorpayEnabled() ? 'pending_auth' : 'active',
    gateway: razorpayEnabled() ? 'razorpay' : 'simulated',
    nextChargeAt: nextChargeDate(dayOfMonth),
    charges: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  if (razorpayEnabled()) {
    const sub = await createRazorpaySubscription({
      amountInr: amount,
      description: `Rent autopay — ${customer.propertyName}`,
      notes: { mandateId: record.id, tenantId: actor.id, customerId: customer.id },
      customer: { name: actor.fullName, email: actor.email, contact: user?.data.phone },
    });
    record.gatewaySubscriptionId = sub.id;
    record.authorizationUrl = sub.short_url;
  }
  mandates.insert(record);
  notifyUser(customer.ownerId, {
    title: 'Resident set up rent autopay',
    message: `${customer.fullName} enabled autopay of ₹${amount.toLocaleString('en-IN')} on the ${dayOfMonth}${ordinal(dayOfMonth)} of every month for ${customer.propertyName}.`,
    type: 'payment',
    linkTo: '/owner/customers',
  });
  events.publish(
    'AutopayMandateCreated',
    'Mandate',
    record.id,
    { amount, dayOfMonth, gateway: record.gateway },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: customer.ownerId }
  );
  return record;
}

const ordinal = (n: number) =>
  n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';

export async function updateMandate(actor: AuthUser, id: string, action: unknown): Promise<MandateRecord> {
  const m = mandates.get(id);
  if (!m || m.tenantId !== actor.id) throw notFound('Mandate');
  const act = v.oneOf(action, ['pause', 'resume', 'cancel'] as const, 'Action');
  if (act === 'cancel') {
    if (m.status === 'cancelled') return m;
    if (m.gatewaySubscriptionId) await cancelRazorpaySubscription(m.gatewaySubscriptionId);
    m.status = 'cancelled';
    m.cancelledAt = nowIso();
  } else if (act === 'pause') {
    if (m.status !== 'active') throw conflict(`Mandate is ${m.status}`);
    m.status = 'paused';
  } else {
    if (m.status !== 'paused') throw conflict(`Mandate is ${m.status}`);
    m.status = 'active';
    m.nextChargeAt = nextChargeDate(m.dayOfMonth);
  }
  m.updatedAt = nowIso();
  return mandates.replace(m);
}

/** Records a successful autopay charge as a paid rent payment. Idempotent per gateway charge id / period. */
export function recordMandateCharge(
  m: MandateRecord,
  opts: { gatewayPaymentId?: string; period?: string } = {}
): MandateRecord {
  const period = opts.period || nowIso().slice(0, 7);
  if (
    m.charges.some(
      (c) => c.period === period || (opts.gatewayPaymentId && c.gatewayPaymentId === opts.gatewayPaymentId)
    )
  )
    return m;
  const customer = customers.get(m.customerId);
  const payment = recordPayment({
    ownerId: m.ownerId,
    tenantId: m.tenantId,
    customerId: m.customerId,
    bookingId: customer?.bookingId,
    propertyId: m.propertyId,
    propertyName: m.propertyName,
    tenantName: customer?.fullName || 'Resident',
    amount: m.amount,
    type: 'Rent',
    method: 'Auto-Debit',
    status: 'Paid',
    gateway: m.gateway === 'razorpay' ? 'razorpay' : 'simulated',
    gatewayPaymentId: opts.gatewayPaymentId,
    description: `Rent autopay for ${period}`,
    idempotencyKey: `autopay:${m.id}:${period}`,
  });
  m.charges.push({
    period,
    paymentId: payment.id,
    amount: m.amount,
    at: nowIso(),
    gatewayPaymentId: opts.gatewayPaymentId,
  });
  m.lastChargedAt = nowIso();
  m.nextChargeAt = nextChargeDate(m.dayOfMonth, new Date(Date.now() + DAY_MS));
  m.updatedAt = nowIso();
  mandates.replace(m);
  if (customer) {
    customer.paymentStatus = 'Paid';
    customers.replace(customer);
  }
  notifyUser(m.tenantId, {
    title: 'Rent paid automatically',
    message: `₹${m.amount.toLocaleString('en-IN')} for ${m.propertyName} was collected via autopay. Receipt: ${payment.invoiceNumber}.`,
    type: 'payment',
    linkTo: '/payments',
  });
  notifyUser(m.ownerId, {
    title: 'Autopay rent received',
    message: `${customer?.fullName || 'A resident'} paid ₹${m.amount.toLocaleString('en-IN')} via autopay (${payment.invoiceNumber}).`,
    type: 'payment',
    linkTo: '/owner/customers',
  });
  return m;
}

/** Scheduler: charges due simulated mandates (real ones are charged by the gateway and arrive via webhook). */
export function runAutopayCharges(now = new Date()): { charged: number } {
  let charged = 0;
  for (const m of mandates.list({ status: 'active' }, { limit: 100000 })) {
    if (m.gateway !== 'simulated' || !simulatedPaymentsAllowed()) continue;
    if (Date.parse(m.nextChargeAt) > now.getTime()) continue;
    const customer = customers.get(m.customerId);
    if (!customer || customer.tenantStatus === 'Inactive') {
      // The stay has ended: stop the mandate rather than keep charging.
      m.status = 'cancelled';
      m.cancelledAt = nowIso();
      mandates.replace(m);
      continue;
    }
    if (customer.tenantStatus === 'Upcoming') continue; // starts charging once the resident has moved in
    recordMandateCharge(m, { period: now.toISOString().slice(0, 7) });
    charged += 1;
  }
  if (charged) events.publish('AutopayChargesRun', 'Job', now.toISOString().slice(0, 10), { charged });
  return { charged };
}

/** Razorpay subscription webhooks: `subscription.activated|charged|halted|cancelled`. */
export function handleSubscriptionWebhook(eventName: string | undefined, payload: any): boolean {
  const sub = payload?.subscription?.entity;
  const subId: string | undefined = sub?.id;
  if (!subId) return false;
  const m = mandates.findOne({ gateway_subscription_id: subId });
  if (!m) return false;
  if (eventName === 'subscription.activated' || eventName === 'subscription.authenticated') {
    if (m.status === 'pending_auth') {
      m.status = 'active';
      m.updatedAt = nowIso();
      mandates.replace(m);
    }
    return true;
  }
  if (eventName === 'subscription.charged') {
    const payment = payload?.payment?.entity;
    if (m.status === 'pending_auth') m.status = 'active';
    recordMandateCharge(m, { gatewayPaymentId: payment?.id, period: nowIso().slice(0, 7) });
    return true;
  }
  if (eventName === 'subscription.halted' || eventName === 'subscription.paused') {
    m.status = 'paused';
    m.updatedAt = nowIso();
    mandates.replace(m);
    notifyUser(m.tenantId, {
      title: 'Autopay paused',
      message: 'Your bank declined the last autopay attempt. Pay this month manually and resume autopay from Payments.',
      type: 'payment',
      linkTo: '/payments',
    });
    return true;
  }
  if (eventName === 'subscription.cancelled' || eventName === 'subscription.completed') {
    m.status = 'cancelled';
    m.cancelledAt = nowIso();
    m.updatedAt = nowIso();
    mandates.replace(m);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Paid add-ons: verification visit, featured placement
// ---------------------------------------------------------------------------------------------

export function listAddonOrders(ownerId: string): AddonOrderRecord[] {
  return addonOrders.list({ owner_id: ownerId }, { limit: 500 }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addonStatusFor(propertyId: string) {
  const orders = addonOrders.list({ property_id: propertyId, status: 'Paid' }, { limit: 100 });
  const featured = orders
    .filter((o) => o.type === 'featured' && o.periodEnd && Date.parse(o.periodEnd) > Date.now())
    .sort((a, b) => (a.periodEnd! < b.periodEnd! ? 1 : -1))[0];
  const verification = orders.find((o) => o.type === 'verification' && !o.fulfilledAt);
  return {
    featuredUntil: featured?.periodEnd,
    verificationRequested: !!verification,
    verificationOrderId: verification?.id,
  };
}

export async function createAddonCheckout(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
) {
  if (actor.role !== 'owner') throw forbidden('Only the workspace owner can buy add-ons.');
  assertPaymentsAvailable();
  const type = v.oneOf(body.type, ['verification', 'featured'] as const, 'Add-on');
  const propertyId = v.str(body.propertyId, 'Property', { max: 80 });
  const prop = properties.get(propertyId);
  if (!prop || prop.ownerId !== ownerId) throw notFound('Property');
  const months = type === 'featured' ? v.num(body.months ?? 1, 'Months', { min: 1, max: 12, integer: true }) : 1;
  if (type === 'verification' && prop.isNestinVerified && prop.verification?.status === 'verified')
    throw conflict('This listing is already verified');
  if (type === 'verification' && addonStatusFor(prop.id).verificationRequested)
    throw conflict('A verification visit is already requested for this listing');
  if (type === 'featured' && prop.status !== 'published') throw badRequest('Only published listings can be featured');
  const subtotal = type === 'verification' ? ADDONS.verificationVisit : ADDONS.featuredPerMonth * months;
  const gst = Math.round((subtotal * config.billing.gstPercent) / 100);
  const order: AddonOrderRecord = {
    id: newId('addon'),
    ownerId,
    propertyId: prop.id,
    propertyName: prop.name,
    type,
    months,
    invoiceNumber: nextSequenceLabel('ADD', 'addon'),
    subtotal,
    gstPercent: config.billing.gstPercent,
    gst,
    amount: subtotal + gst,
    status: 'Pending',
    gateway: razorpayEnabled() ? 'razorpay' : 'simulated',
    createdAt: nowIso(),
  };
  addonOrders.insert(order);
  const owner = users.findById(ownerId);
  const description =
    type === 'verification'
      ? `NestIn Verified site visit — ${prop.name}`
      : `Featured placement × ${months} month${months === 1 ? '' : 's'} — ${prop.name}`;
  events.publish(
    'AddonCheckoutStarted',
    'AddonOrder',
    order.id,
    { type, amount: order.amount },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  if (!razorpayEnabled()) {
    return {
      simulated: true,
      orderId: order.id,
      amount: order.amount,
      currency: 'INR' as const,
      description,
      prefill: { name: actor.fullName, email: actor.email, contact: owner?.data.phone },
    };
  }
  const gw = await createOrder(order.amount, order.id, { addonOrderId: order.id, ownerId, type });
  order.gatewayOrderId = gw.id;
  addonOrders.replace(order);
  return {
    simulated: false,
    orderId: order.id,
    gatewayOrderId: gw.id,
    keyId: config.razorpay.keyId,
    amount: order.amount,
    currency: 'INR' as const,
    description,
    prefill: { name: actor.fullName, email: actor.email, contact: owner?.data.phone },
  };
}

function fulfilPaidAddon(
  order: AddonOrderRecord,
  gatewayPaymentId: string | undefined,
  ctx: EventContext
): AddonOrderRecord {
  if (order.status === 'Paid') return order;
  return Collection.transaction(() => {
    order.status = 'Paid';
    order.gatewayPaymentId = gatewayPaymentId;
    order.paidAt = nowIso();
    const prop = properties.get(order.propertyId);
    if (order.type === 'featured' && prop) {
      const base =
        prop.isFeatured && addonStatusFor(prop.id).featuredUntil
          ? Date.parse(addonStatusFor(prop.id).featuredUntil!)
          : Date.now();
      const end = new Date(base);
      end.setMonth(end.getMonth() + order.months);
      order.periodEnd = end.toISOString();
      prop.isFeatured = true;
      properties.replace(prop);
      notifyUser(order.ownerId, {
        title: 'Listing featured',
        message: `${prop.name} is now featured in search results until ${order.periodEnd.slice(0, 10)}.`,
        type: 'system',
        linkTo: '/owner/properties',
      });
    }
    if (order.type === 'verification' && prop) {
      for (const admin of users.list({ role: 'super_admin' })) {
        notifyUser(admin.id, {
          title: 'Paid verification visit requested',
          message: `${prop.ownerName} paid for a NestIn Verified visit to ${prop.name} (${prop.location?.city}). Schedule the visit and complete the checklist.`,
          type: 'system',
          linkTo: '/admin',
        });
      }
      notifyUser(order.ownerId, {
        title: 'Verification visit booked',
        message: `Our team will contact you within 2 working days to schedule the site visit for ${prop.name}.`,
        type: 'system',
        linkTo: '/owner/properties',
      });
    }
    addonOrders.replace(order);
    events.publish(
      'AddonPaid',
      'AddonOrder',
      order.id,
      { type: order.type, amount: order.amount },
      { ...ctx, ownerId: order.ownerId }
    );
    return order;
  });
}

export function completeAddonCheckout(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): AddonOrderRecord {
  if (actor.role !== 'owner') throw forbidden('Only the workspace owner can buy add-ons.');
  const orderId = v.str(body.orderId, 'Order', { max: 80 });
  const order = addonOrders.get(orderId);
  if (!order || order.ownerId !== ownerId) throw notFound('Order');
  if (order.status === 'Paid') return order;
  if (razorpayEnabled() && order.gateway === 'razorpay') {
    const gwOrder = v.str(body.razorpay_order_id, 'Order id', { max: 80 });
    const gwPayment = v.str(body.razorpay_payment_id, 'Payment id', { max: 80 });
    const signature = v.str(body.razorpay_signature, 'Signature', { max: 200 });
    if (gwOrder !== order.gatewayOrderId || !verifyPaymentSignature(gwOrder, gwPayment, signature))
      throw new HttpError(400, 'INVALID_SIGNATURE', 'Payment could not be verified.');
    return fulfilPaidAddon(order, gwPayment, { ...ctx, actorId: actor.id, actorRole: actor.role });
  }
  assertPaymentsAvailable();
  return fulfilPaidAddon(order, `sim_${Date.now().toString(36)}`, { ...ctx, actorId: actor.id, actorRole: actor.role });
}

export function handleAddonWebhookOrder(orderId: string, eventName: string | undefined, entity: any): boolean {
  const order = addonOrders.findOne({ gateway_order_id: orderId });
  if (!order) return false;
  if (eventName === 'payment.captured') {
    if (Number(entity?.amount) !== Math.round(order.amount * 100)) return false;
    fulfilPaidAddon(order, entity?.id, { correlationId: `webhook-${entity?.id}` });
    return true;
  }
  if (eventName === 'payment.failed' && order.status === 'Pending') {
    order.status = 'Failed';
    addonOrders.replace(order);
    return true;
  }
  return false;
}

/** Marks a paid verification order fulfilled once the admin grants the badge. */
export function fulfilVerificationOrder(propertyId: string): void {
  const status = addonStatusFor(propertyId);
  if (!status.verificationOrderId) return;
  const order = addonOrders.get(status.verificationOrderId);
  if (!order) return;
  order.fulfilledAt = nowIso();
  addonOrders.replace(order);
}

/** Scheduler: un-features listings whose paid placement has ended. */
export function runFeaturedExpiry(now = new Date()): number {
  let expired = 0;
  for (const prop of properties.list({ is_featured: 1 }, { limit: 100000 })) {
    const orders = addonOrders.list({ property_id: prop.id, type: 'featured', status: 'Paid' }, { limit: 50 });
    if (!orders.length) continue; // featured by an admin, not by purchase
    const latest = orders.map((o) => Date.parse(o.periodEnd || '0')).sort((a, b) => b - a)[0];
    if (latest > now.getTime()) continue;
    prop.isFeatured = false;
    properties.replace(prop);
    expired += 1;
    notifyUser(prop.ownerId, {
      title: 'Featured placement ended',
      message: `${prop.name} is no longer featured. Renew from Subscription → Add-ons to stay on top of search.`,
      type: 'system',
      linkTo: '/owner/subscription',
    });
  }
  return expired;
}

// ---------------------------------------------------------------------------------------------
// WhatsApp command bot (Twilio inbound)
// ---------------------------------------------------------------------------------------------

const normalisePhone = (p: string) =>
  p
    .replace(/^whatsapp:/, '')
    .replace(/\D/g, '')
    .slice(-10);

function ownerByPhone(phone: string): { user: UserRecord; actor: AuthUser } | null {
  const digits = normalisePhone(phone);
  if (digits.length < 10) return null;
  const user = users
    .list({}, 100000)
    .find(
      (u) =>
        (u.role === 'owner' || u.role === 'employee') &&
        u.status === 'active' &&
        normalisePhone(u.data.phone || '') === digits
    );
  if (!user) return null;
  const ownerId = user.role === 'owner' ? user.id : user.ownerId || undefined;
  if (!ownerId) return null;
  return {
    user,
    actor: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      ownerId,
      sessionId: 'whatsapp',
      permissions: user.role === 'owner' ? null : { 'bookings.approve': true, 'bookings.cancel': true },
    } as AuthUser,
  };
}

export const WHATSAPP_HELP =
  'NestIn commands:\nAPPROVE NST-100001 — confirm a booking\nREJECT NST-100001 <reason> — decline it\nSTATUS — pending bookings\nHELP — this message';

/** Executes one inbound WhatsApp message and returns the reply text. Never throws. */
export function handleWhatsAppCommand(from: string, body: string): string {
  const who = ownerByPhone(from);
  if (!who)
    return 'This number is not linked to a NestIn owner or staff account. Add your WhatsApp number under Settings → Profile.';
  const text = (body || '').trim();
  const [cmd, ref, ...rest] = text.split(/\s+/);
  const command = (cmd || '').toUpperCase();
  const ctx: EventContext = { correlationId: `whatsapp-${crypto.randomBytes(4).toString('hex')}` };
  try {
    if (command === 'HELP' || !command) return WHATSAPP_HELP;
    if (command === 'STATUS') {
      const pending = bookings.list({ owner_id: who.actor.ownerId!, status: 'Pending' }, { limit: 10 });
      if (!pending.length) return 'No pending bookings. 🎉';
      return `Pending bookings:\n${pending.map((b) => `${b.bookingNumber} · ${b.tenantName} · ${b.propertyName} (${b.roomName}) · move-in ${b.moveInDate}`).join('\n')}\nReply APPROVE <number> or REJECT <number> <reason>.`;
    }
    if (command === 'APPROVE' || command === 'REJECT') {
      if (!ref) return `Which booking? e.g. ${command} NST-100001`;
      const booking = bookings
        .list({ owner_id: who.actor.ownerId! }, { limit: 100000 })
        .find((b) => b.bookingNumber.toUpperCase() === ref.toUpperCase());
      if (!booking) return `No booking ${ref.toUpperCase()} in your workspace.`;
      if (command === 'APPROVE') {
        const res = approveBooking(who.actor, who.actor.ownerId!, booking.id, {}, ctx);
        return `✅ ${booking.bookingNumber} approved. ${res.customer.fullName} is allotted ${booking.roomName} / ${booking.bedNumber}.`;
      }
      const reason = rest.join(' ') || 'Not available';
      rejectBooking(who.actor, who.actor.ownerId!, booking.id, reason, ctx);
      return `❌ ${booking.bookingNumber} rejected (${reason}). The resident has been notified.`;
    }
    return `Sorry, I did not understand "${text.slice(0, 40)}".\n${WHATSAPP_HELP}`;
  } catch (err) {
    return `Could not do that: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Twilio request signature: HMAC-SHA1 of URL + sorted POST params, base64. */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | undefined
): boolean {
  const token = config.messaging.twilio.authToken;
  if (!token || !signature) return false;
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join('');
  const expected = crypto.createHmac('sha1', token).update(data).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const monetisationMeta = {
  lastAutopayRun: () => getMeta('autopay:last'),
  markAutopayRun: () => setMeta('autopay:last', nowIso()),
};
