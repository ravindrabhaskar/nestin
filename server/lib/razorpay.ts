import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from './errors.js';

/**
 * Razorpay integration (Orders API + signature verification). Nothing here runs unless
 * RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are configured; callers check `razorpayEnabled()` and fall
 * back to simulated payments otherwise.
 */

export const razorpayEnabled = () => config.razorpay.enabled;

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
