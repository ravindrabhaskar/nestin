import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from './errors.js';

/**
 * Razorpay integration (Orders API + signature verification). Nothing here runs unless
 * RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are configured; callers check `razorpayEnabled()` and fall
 * back to simulated payments otherwise.
 */

export const razorpayEnabled = () => config.razorpay.enabled;

/**
 * Whether a payment may be recorded as a simulated success. Only ever true outside production (or
 * with an explicit ALLOW_SIMULATED_PAYMENTS opt-in for staging); production without gateway keys
 * refuses online payments rather than silently giving them away.
 */
export const simulatedPaymentsAllowed = () => !razorpayEnabled() && config.allowSimulatedPayments;

/** Guard for every checkout entry point: a real gateway or an allowed simulation, never neither. */
export function assertPaymentsAvailable(): void {
  if (razorpayEnabled() || simulatedPaymentsAllowed()) return;
  throw new HttpError(
    503,
    'PAYMENTS_UNAVAILABLE',
    'Online payments are not configured on this server. Please contact support or pay offline.'
  );
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  receipt?: string;
  status: string;
}

export async function createOrder(
  amountInr: number,
  receipt: string,
  notes: Record<string, string> = {}
): Promise<RazorpayOrder> {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt: receipt.slice(0, 40),
      notes,
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new HttpError(502, 'GATEWAY_ERROR', `Payment gateway could not create the order (${res.status}).`, detail);
  }
  return (await res.json()) as RazorpayOrder;
}

const authHeader = () =>
  `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`;

async function rp<T>(path: string, method: 'POST' | 'GET' = 'POST', body?: unknown): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new HttpError(502, 'GATEWAY_ERROR', `Payment gateway request failed (${res.status}).`, detail);
  }
  return (await res.json()) as T;
}

export interface RazorpaySubscription {
  id: string;
  status: string;
  short_url?: string;
}

/**
 * Recurring rent mandate (UPI autopay / e-mandate) through the Subscriptions API: a monthly plan
 * for the exact rent, then a subscription the resident authorises once via `short_url`. Charges
 * afterwards arrive as `subscription.charged` webhooks.
 */
export async function createRazorpaySubscription(input: {
  amountInr: number;
  description: string;
  notes?: Record<string, string>;
  customer?: { name: string; email: string; contact?: string };
  totalCount?: number;
}): Promise<RazorpaySubscription> {
  const plan = await rp<{ id: string }>('/plans', 'POST', {
    period: 'monthly',
    interval: 1,
    item: { name: input.description.slice(0, 120), amount: Math.round(input.amountInr * 100), currency: 'INR' },
  });
  return rp<RazorpaySubscription>('/subscriptions', 'POST', {
    plan_id: plan.id,
    total_count: input.totalCount || 36,
    customer_notify: 1,
    notes: input.notes || {},
  });
}

export async function cancelRazorpaySubscription(id: string): Promise<void> {
  await rp(`/subscriptions/${encodeURIComponent(id)}/cancel`, 'POST', { cancel_at_cycle_end: 0 });
}

/** Checkout success handshake: HMAC-SHA256(order_id|payment_id, key_secret) must equal the signature. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw body, webhook secret) sent as X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean {
  if (!config.razorpay.webhookSecret || !signature) return false;
  const expected = crypto.createHmac('sha256', config.razorpay.webhookSecret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
