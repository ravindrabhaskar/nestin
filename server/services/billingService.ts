import { config } from '../config.js';
import {
  subscriptions,
  subscriptionInvoices,
  properties,
  employees,
  users,
  payments,
  type SubscriptionRecord,
  type SubscriptionInvoice,
} from '../db/repositories.js';
import { Collection } from '../db/database.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { invoiceNumber, newId } from '../lib/ids.js';
import * as v from '../lib/validate.js';
import { events, type EventContext } from '../lib/events.js';
import { createOrder, razorpayEnabled, verifyPaymentSignature, assertPaymentsAvailable } from '../lib/razorpay.js';
import { HttpError } from '../lib/errors.js';
import type { AuthUser } from '../middleware/auth.js';
import { notifyUser } from './crmService.js';
import { webhookAmountMatches } from './tenantService.js';
import {
  PLANS,
  PLAN_ORDER,
  isPlanId,
  planPeriodAmount,
  planRank,
  type BillingInterval,
  type PlanDefinition,
  type PlanId,
} from '../../src/lib/domain/plans';

/**
 * Owner subscriptions. Every owner workspace has exactly one subscription record; owners without
 * one are on Starter (or in a Professional trial when PLAN_TRIAL_DAYS > 0 and the account is new).
 * Plan limits are enforced at the point of use (property/staff creation, feature gates).
 */

const nowIso = () => new Date().toISOString();
const DAY_MS = 86_400_000;

function addInterval(from: Date, interval: BillingInterval): Date {
  const d = new Date(from);
  if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/** Returns the stored subscription, creating a Starter/trial record on first access. */
export function getSubscription(ownerId: string): SubscriptionRecord {
  let sub = subscriptions.findOne({ owner_id: ownerId });
  if (sub) return reconcile(sub);
  const owner = users.findById(ownerId);
  const createdAt = owner?.createdAt ? new Date(owner.createdAt) : new Date();
  const trialEnds = new Date(createdAt.getTime() + config.billing.trialDays * DAY_MS);
  const inTrial = config.billing.trialDays > 0 && trialEnds.getTime() > Date.now();
  sub = {
    id: newId('sub'),
    ownerId,
    plan: inTrial ? 'professional' : 'starter',
    interval: 'monthly',
    status: inTrial ? 'trialing' : 'active',
    currentPeriodStart: createdAt.toISOString(),
    currentPeriodEnd: inTrial ? trialEnds.toISOString() : addInterval(createdAt, 'monthly').toISOString(),
    trialEndsAt: inTrial ? trialEnds.toISOString() : undefined,
    cancelAtPeriodEnd: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  subscriptions.insert(sub);
  return sub;
}

/** Downgrades lapsed trials/paid periods to Starter. Idempotent. */
function reconcile(sub: SubscriptionRecord): SubscriptionRecord {
  const ended = Date.parse(sub.currentPeriodEnd) < Date.now();
  if (!ended || sub.plan === 'starter' || sub.grantedBy) return sub;
  const wasTrial = sub.status === 'trialing';
  if ((sub.status === 'active' || sub.status === 'past_due') && !sub.cancelAtPeriodEnd) {
    // Grace period: mark past due for 7 days before downgrading so a late payment keeps the workspace intact.
    const graceEnd = Date.parse(sub.currentPeriodEnd) + 7 * DAY_MS;
    if (graceEnd > Date.now()) {
      if (sub.status === 'active') {
        sub.status = 'past_due';
        sub.updatedAt = nowIso();
        subscriptions.replace(sub);
        notifyUser(sub.ownerId, {
          title: 'Subscription payment due',
          message: `Your ${PLANS[sub.plan].name} plan renewal is due. Renew within 7 days to keep your properties and staff active.`,
          type: 'payment',
          linkTo: '/owner/subscription',
        });
      }
      return sub;
    }
  }
  const previous = sub.plan;
  sub.plan = 'starter';
  sub.status = 'active';
  sub.interval = 'monthly';
  sub.currentPeriodStart = nowIso();
  sub.currentPeriodEnd = addInterval(new Date(), 'monthly').toISOString();
  sub.cancelAtPeriodEnd = false;
  sub.trialEndsAt = undefined;
  sub.updatedAt = nowIso();
  subscriptions.replace(sub);
  events.publish(
    'SubscriptionDowngraded',
    'Subscription',
    sub.id,
    { from: previous, trial: wasTrial },
    { ownerId: sub.ownerId }
  );
  notifyUser(sub.ownerId, {
    title: wasTrial ? 'Your Professional trial has ended' : 'Plan downgraded to Starter',
    message: `Your workspace is now on the Starter plan. Properties and staff above the Starter limits stay saved but cannot be added to until you upgrade.`,
    type: 'system',
    linkTo: '/owner/subscription',
  });
  return sub;
}

export interface PlanUsage {
  properties: { used: number; limit: number | null };
  staff: { used: number; limit: number | null };
}

export function usage(ownerId: string): PlanUsage {
  const plan = PLANS[getSubscription(ownerId).plan];
  const props = properties.list({ owner_id: ownerId }).filter((p) => p.status !== 'archived').length;
  const staff = employees.list({ owner_id: ownerId }).filter((e) => e.status === 'active').length;
  return {
    properties: { used: props, limit: plan.limits.maxProperties },
    staff: { used: staff, limit: plan.limits.maxStaff },
  };
}

export interface SubscriptionView {
  subscription: SubscriptionRecord;
  plan: PlanDefinition;
  usage: PlanUsage;
  invoices: SubscriptionInvoice[];
  plans: PlanDefinition[];
  gstPercent: number;
  platformFeePercent: number;
  payments: 'razorpay' | 'simulated';
}

export function view(ownerId: string): SubscriptionView {
  const subscription = getSubscription(ownerId);
  return {
    subscription,
    plan: PLANS[subscription.plan],
    usage: usage(ownerId),
    invoices: subscriptionInvoices.list({ owner_id: ownerId }, { limit: 50 }),
    plans: PLAN_ORDER.map((id) => PLANS[id]),
    gstPercent: config.billing.gstPercent,
    platformFeePercent: config.billing.platformFeePercent,
    payments: razorpayEnabled() ? 'razorpay' : 'simulated',
  };
}

// ---------------------------------------------------------------------------------------------
// Enforcement helpers (called by property / RBAC services)
// ---------------------------------------------------------------------------------------------

export function assertCanAddProperty(ownerId: string): void {
  const u = usage(ownerId);
  if (u.properties.limit !== null && u.properties.used >= u.properties.limit) {
    const plan = PLANS[getSubscription(ownerId).plan];
    throw new HttpError(
      402,
      'PLAN_LIMIT',
      `The ${plan.name} plan allows ${u.properties.limit} propert${u.properties.limit === 1 ? 'y' : 'ies'}. Upgrade your plan to add more.`,
      { resource: 'properties', ...u.properties, plan: plan.id }
    );
  }
}

export function assertCanAddStaff(ownerId: string): void {
  const u = usage(ownerId);
  if (u.staff.limit !== null && u.staff.used >= u.staff.limit) {
    const plan = PLANS[getSubscription(ownerId).plan];
    throw new HttpError(
      402,
      'PLAN_LIMIT',
      `The ${plan.name} plan allows ${u.staff.limit} staff account${u.staff.limit === 1 ? '' : 's'}. Upgrade your plan to add more.`,
      { resource: 'staff', ...u.staff, plan: plan.id }
    );
  }
}

export function hasFeature(ownerId: string, feature: keyof PlanDefinition['features']): boolean {
  return PLANS[getSubscription(ownerId).plan].features[feature];
}

export function assertFeature(ownerId: string, feature: keyof PlanDefinition['features'], label: string): void {
  if (!hasFeature(ownerId, feature)) {
    const plan = PLANS[getSubscription(ownerId).plan];
    throw new HttpError(402, 'PLAN_FEATURE', `${label} is not included in the ${plan.name} plan.`, {
      feature,
      plan: plan.id,
    });
  }
}

/** Platform commission on an online tenant payment, per configuration. */
export function platformFeeFor(amount: number): { platformFee: number; platformFeePercent: number } {
  const pct = config.billing.platformFeePercent;
  return { platformFee: Math.round((amount * pct) / 100), platformFeePercent: pct };
}

// ---------------------------------------------------------------------------------------------
// Checkout (upgrade / renew)
// ---------------------------------------------------------------------------------------------

export interface SubscriptionCheckout {
  simulated: boolean;
  invoiceId: string;
  orderId?: string;
  keyId?: string;
  amount: number;
  currency: 'INR';
  description: string;
  prefill: { name: string; email: string; contact?: string };
}

export async function createCheckout(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): Promise<SubscriptionCheckout> {
  if (actor.role !== 'owner') throw forbidden('Only the workspace owner can change the subscription.');
  assertPaymentsAvailable();
  const planId = body.plan;
  if (!isPlanId(planId) || planId === 'starter') throw badRequest('Choose a paid plan to upgrade to.');
  const interval = v.oneOf(body.interval, ['monthly', 'yearly'] as const, 'Billing interval', 'monthly');

  const subtotal = planPeriodAmount(planId, interval);
  const gst = Math.round((subtotal * config.billing.gstPercent) / 100);
  const now = new Date();
  const current = getSubscription(ownerId);
  // Renewals of the same plan extend the current period; upgrades start a new period today.
  const periodStart =
    current.plan === planId && current.status === 'active' && Date.parse(current.currentPeriodEnd) > now.getTime()
      ? new Date(current.currentPeriodEnd)
      : now;
  const invoice: SubscriptionInvoice = {
    id: newId('sinv'),
    ownerId,
    plan: planId,
    interval,
    invoiceNumber: invoiceNumber('SUB'),
    subtotal,
    gstPercent: config.billing.gstPercent,
    gst,
    amount: subtotal + gst,
    currency: 'INR',
    status: 'Pending',
    gateway: razorpayEnabled() ? 'razorpay' : 'simulated',
    periodStart: periodStart.toISOString(),
    periodEnd: addInterval(periodStart, interval).toISOString(),
    createdAt: nowIso(),
  };
  subscriptionInvoices.insert(invoice);

  const owner = users.findById(ownerId);
  const prefill = { name: actor.fullName, email: actor.email, contact: owner?.data.phone };
  const description = `NestIn ${PLANS[planId].name} plan · ${interval === 'yearly' ? 'annual' : 'monthly'}`;
  events.publish(
    'SubscriptionCheckoutStarted',
    'SubscriptionInvoice',
    invoice.id,
    { plan: planId, interval, amount: invoice.amount },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  if (!razorpayEnabled()) {
    return { simulated: true, invoiceId: invoice.id, amount: invoice.amount, currency: 'INR', description, prefill };
  }
  const order = await createOrder(invoice.amount, invoice.id, { invoiceId: invoice.id, ownerId, plan: planId });
  invoice.gatewayOrderId = order.id;
  subscriptionInvoices.replace(invoice);
  return {
    simulated: false,
    invoiceId: invoice.id,
    orderId: order.id,
    keyId: config.razorpay.keyId,
    amount: invoice.amount,
    currency: 'INR',
    description,
    prefill,
  };
}

function applyPaidInvoice(invoice: SubscriptionInvoice, gatewayPaymentId: string | undefined, ctx: EventContext) {
  if (invoice.status === 'Paid') return getSubscription(invoice.ownerId);
  return Collection.transaction(() => {
    invoice.status = 'Paid';
    invoice.gatewayPaymentId = gatewayPaymentId;
    invoice.paidAt = nowIso();
    subscriptionInvoices.replace(invoice);
    const sub = getSubscription(invoice.ownerId);
    const previous = sub.plan;
    sub.plan = invoice.plan;
    sub.interval = invoice.interval;
    sub.status = 'active';
    sub.currentPeriodStart = invoice.periodStart;
    sub.currentPeriodEnd = invoice.periodEnd;
    sub.trialEndsAt = undefined;
    sub.cancelAtPeriodEnd = false;
    sub.grantedBy = undefined;
    sub.updatedAt = nowIso();
    subscriptions.replace(sub);
    events.publish(
      planRank(invoice.plan) > planRank(previous) ? 'SubscriptionUpgraded' : 'SubscriptionRenewed',
      'Subscription',
      sub.id,
      { from: previous, to: invoice.plan, interval: invoice.interval, amount: invoice.amount },
      { ...ctx, ownerId: invoice.ownerId }
    );
    notifyUser(invoice.ownerId, {
      title: `${PLANS[invoice.plan].name} plan active`,
      message: `Invoice ${invoice.invoiceNumber} paid. Your plan is active until ${new Date(invoice.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      type: 'payment',
      linkTo: '/owner/subscription',
    });
    return sub;
  });
}

export function completeCheckout(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): SubscriptionView {
  if (actor.role !== 'owner') throw forbidden('Only the workspace owner can change the subscription.');
  const invoiceId = v.str(body.invoiceId, 'Invoice', { max: 80 });
  const invoice = subscriptionInvoices.get(invoiceId);
  if (!invoice || invoice.ownerId !== ownerId) throw notFound('Invoice');
  if (invoice.status === 'Paid') return view(ownerId);
  if (razorpayEnabled() && invoice.gateway === 'razorpay') {
    const orderId = v.str(body.razorpay_order_id, 'Order id', { max: 80 });
    const gwPaymentId = v.str(body.razorpay_payment_id, 'Payment id', { max: 80 });
    const signature = v.str(body.razorpay_signature, 'Signature', { max: 200 });
    if (orderId !== invoice.gatewayOrderId || !verifyPaymentSignature(orderId, gwPaymentId, signature)) {
      throw new HttpError(400, 'INVALID_SIGNATURE', 'Subscription payment could not be verified.');
    }
    applyPaidInvoice(invoice, gwPaymentId, { ...ctx, actorId: actor.id, actorRole: actor.role });
    return view(ownerId);
  }
  assertPaymentsAvailable();
  applyPaidInvoice(invoice, `sim_${Date.now().toString(36)}`, { ...ctx, actorId: actor.id, actorRole: actor.role });
  return view(ownerId);
}

/** Razorpay webhook for subscription invoices (matched by order id). */
export function handleWebhookOrder(orderId: string, eventName: string | undefined, entity: any): boolean {
  const invoice = subscriptionInvoices.findOne({ gateway_order_id: orderId });
  if (!invoice) return false;
  if (eventName === 'payment.captured') {
    if (!webhookAmountMatches(entity, invoice.amount)) {
      events.publish(
        'WebhookAmountMismatch',
        'SubscriptionInvoice',
        invoice.id,
        { expected: invoice.amount, received: entity?.amount, currency: entity?.currency },
        { ownerId: invoice.ownerId }
      );
      return false;
    }
    applyPaidInvoice(invoice, entity?.id, { correlationId: `webhook-${entity?.id}` });
    return true;
  }
  if (eventName === 'payment.failed' && invoice.status === 'Pending') {
    invoice.status = 'Failed';
    subscriptionInvoices.replace(invoice);
    return true;
  }
  return false;
}

export function cancelAtPeriodEnd(
  actor: AuthUser,
  ownerId: string,
  cancel: boolean,
  ctx: EventContext
): SubscriptionView {
  if (actor.role !== 'owner') throw forbidden('Only the workspace owner can change the subscription.');
  const sub = getSubscription(ownerId);
  if (sub.plan === 'starter') throw badRequest('The Starter plan has nothing to cancel.');
  sub.cancelAtPeriodEnd = cancel;
  sub.updatedAt = nowIso();
  subscriptions.replace(sub);
  events.publish(
    cancel ? 'SubscriptionCancellationScheduled' : 'SubscriptionCancellationReverted',
    'Subscription',
    sub.id,
    { plan: sub.plan, periodEnd: sub.currentPeriodEnd },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return view(ownerId);
}

// ---------------------------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------------------------

export interface AdminSubscriptionRow extends SubscriptionRecord {
  ownerName: string;
  ownerEmail: string;
  usage: PlanUsage;
  lifetimeValue: number;
}

export function adminList(): AdminSubscriptionRow[] {
  // Materialise a record for every owner so operators see the whole customer base.
  const owners = users.list({ role: 'owner' }, 5000);
  return owners.map((o) => {
    const sub = getSubscription(o.id);
    return {
      ...sub,
      ownerName: o.fullName,
      ownerEmail: o.email,
      usage: usage(o.id),
      lifetimeValue: subscriptionInvoices.list({ owner_id: o.id, status: 'Paid' }).reduce((a, i) => a + i.amount, 0),
    };
  });
}

export function adminSetPlan(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): AdminSubscriptionRow {
  const owner = users.findById(ownerId);
  if (!owner || owner.role !== 'owner') throw notFound('Owner');
  const planId = body.plan;
  if (!isPlanId(planId)) throw badRequest('Unknown plan');
  const months = v.num(body.months, 'Months', { min: 1, max: 60, integer: true, required: false }) || 12;
  const sub = getSubscription(ownerId);
  const previous = sub.plan;
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  sub.plan = planId;
  sub.status = 'active';
  sub.interval = months >= 12 ? 'yearly' : 'monthly';
  sub.currentPeriodStart = start.toISOString();
  sub.currentPeriodEnd = end.toISOString();
  sub.trialEndsAt = undefined;
  sub.cancelAtPeriodEnd = false;
  sub.grantedBy = planId === 'starter' ? undefined : actor.id;
  sub.updatedAt = nowIso();
  subscriptions.replace(sub);
  events.publish(
    'SubscriptionPlanSetByAdmin',
    'Subscription',
    sub.id,
    { from: previous, to: planId, months },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  notifyUser(ownerId, {
    title: `Your plan is now ${PLANS[planId].name}`,
    message: `NestIn has set your workspace to the ${PLANS[planId].name} plan until ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
    type: 'system',
    linkTo: '/owner/subscription',
  });
  return adminList().find((r) => r.ownerId === ownerId)!;
}

export interface BillingStats {
  mrr: number;
  activePaid: number;
  trialing: number;
  pastDue: number;
  byPlan: Record<PlanId, number>;
  subscriptionRevenue: { total: number; last30Days: number };
  platformFees: { total: number; last30Days: number };
}

export function stats(): BillingStats {
  const rows = adminList();
  const cutoff = Date.now() - 30 * DAY_MS;
  const paidInvoices = subscriptionInvoices.list({ status: 'Paid' }, { limit: 100000 });
  const paid = payments.list({ status: 'Paid' }, { limit: 100000 });
  const byPlan: Record<PlanId, number> = { starter: 0, professional: 0, business: 0 };
  let mrr = 0;
  for (const r of rows) {
    byPlan[r.plan] += 1;
    if (r.plan !== 'starter' && r.status !== 'cancelled' && !r.grantedBy && r.status !== 'trialing') {
      // Annual plans contribute one twelfth per month; otherwise a single yearly customer inflates MRR 12x.
      mrr += r.interval === 'yearly' ? PLANS[r.plan].yearlyPrice / 12 : PLANS[r.plan].monthlyPrice;
    }
  }
  return {
    mrr: Math.round(mrr),
    activePaid: rows.filter((r) => r.plan !== 'starter' && r.status === 'active').length,
    trialing: rows.filter((r) => r.status === 'trialing').length,
    pastDue: rows.filter((r) => r.status === 'past_due').length,
    byPlan,
    subscriptionRevenue: {
      total: paidInvoices.reduce((a, i) => a + i.amount, 0),
      last30Days: paidInvoices
        .filter((i) => Date.parse(i.paidAt || i.createdAt) > cutoff)
        .reduce((a, i) => a + i.amount, 0),
    },
    platformFees: {
      total: paid.reduce((a, p) => a + (p.platformFee || 0), 0),
      last30Days: paid.filter((p) => Date.parse(p.createdAt) > cutoff).reduce((a, p) => a + (p.platformFee || 0), 0),
    },
  };
}
