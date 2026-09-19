import express, { Router } from 'express';
import { verifyWebhookSignature, razorpayEnabled } from '../lib/razorpay.js';
import { handleRazorpayWebhook } from '../services/tenantService.js';
import { getMeta, setMeta } from '../db/database.js';
import { events } from '../lib/events.js';
import {
  handleSubscriptionWebhook,
  handleAddonWebhookOrder,
  handleWhatsAppCommand,
  verifyTwilioSignature,
} from '../services/monetisationService.js';
import { config } from '../config.js';

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
  let result = handleRazorpayWebhook(payload);
  if (!result.handled && payload.event?.startsWith('subscription.')) {
    result = { handled: handleSubscriptionWebhook(payload.event, payload.payload) };
  }
  if (!result.handled) {
    const entity = (payload.payload as any)?.payment?.entity;
    if (entity?.order_id) result = { handled: handleAddonWebhookOrder(entity.order_id, payload.event, entity) };
  }
  if (dedupeKey) setMeta(dedupeKey, new Date().toISOString());
  events.publish('WebhookReceived', 'Webhook', eventId || 'razorpay', {
    event: payload.event,
    handled: result.handled,
  });
  res.json({ success: true, data: result });
});

/**
 * Twilio inbound WhatsApp (form-encoded). Owners reply APPROVE/REJECT/STATUS to booking alerts; the
 * bot answers with TwiML. Signature verification is enforced whenever the Twilio auth token is set.
 */
razorpayWebhookRouter.post('/twilio/whatsapp', express.urlencoded({ extended: false, limit: '64kb' }), (req, res) => {
  const params = req.body as Record<string, string>;
  const twilio = config.messaging.twilio;
  if (twilio.authToken) {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const url = `${proto}://${req.get('host')}${req.originalUrl}`;
    if (!verifyTwilioSignature(url, params, req.header('X-Twilio-Signature'))) {
      res.status(403).type('text/plain').send('invalid signature');
      return;
    }
  } else if (config.isProduction) {
    res.status(403).type('text/plain').send('twilio not configured');
    return;
  }
  const reply = handleWhatsAppCommand(String(params.From || ''), String(params.Body || ''));
  events.publish('WhatsAppCommand', 'Webhook', 'twilio', {
    from: String(params.From || '').slice(-4),
    command: String(params.Body || '')
      .split(' ')[0]
      ?.toUpperCase(),
  });
  const escaped = reply.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);
  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`);
});
