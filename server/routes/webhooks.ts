import express, { Router } from 'express';
import { verifyWebhookSignature, razorpayEnabled } from '../lib/razorpay.js';
import { handleRazorpayWebhook } from '../services/tenantService.js';
import { getMeta, setMeta } from '../db/database.js';
import { events } from '../lib/events.js';

/**
 * Payment gateway webhooks. Mounted before the JSON body parser so the raw body is available for
 * HMAC verification. Razorpay retries on non-2xx, so we only fail on signature problems.
 */
export const razorpayWebhookRouter = Router();

razorpayWebhookRouter.post('/razorpay', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
  const signature = req.header('X-Razorpay-Signature');
  const raw = req.body as Buffer;
  if (!razorpayEnabled() || !verifyWebhookSignature(raw, signature)) {
    events.publish('WebhookRejected', 'Webhook', 'razorpay', {
      reason: razorpayEnabled() ? 'bad_signature' : 'gateway_disabled',
    });
    res
      .status(401)
      .json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' } });
    return;
  }

  let payload: { event?: string; payload?: unknown };
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Malformed webhook body' } });
    return;
  }

  // Idempotency: Razorpay sends a stable event id; ignore repeats.
  const eventId = req.header('x-razorpay-event-id');
  const dedupeKey = eventId ? `webhook:razorpay:${eventId}` : null;
  if (dedupeKey && getMeta(dedupeKey)) {
    res.json({ success: true, data: { status: 'already_processed' } });
    return;
  }
  const result = handleRazorpayWebhook(payload);
  if (dedupeKey) setMeta(dedupeKey, new Date().toISOString());
  events.publish('WebhookReceived', 'Webhook', eventId || 'razorpay', {
    event: payload.event,
    handled: result.handled,
  });
  res.json({ success: true, data: result });
});
