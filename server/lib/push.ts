import { config } from '../config.js';
import { pushSubscriptions, type PushSubscriptionRecord } from '../db/repositories.js';
import { newId } from './ids.js';
import { badRequest } from './errors.js';
import { log } from './logger.js';

/**
 * Web Push (VAPID). Enabled when VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are configured; generate a
 * pair once with `npx web-push generate-vapid-keys`. Without keys, subscriptions are still stored so
 * enabling push later needs no client changes.
 */

export const pushEnabled = () => config.push.enabled;

type WebPushModule = typeof import('web-push');
let webPushPromise: Promise<WebPushModule | null> | null = null;

async function webPush(): Promise<WebPushModule | null> {
  if (!pushEnabled()) return null;
  if (!webPushPromise) {
    webPushPromise = import('web-push')
      .then((mod) => {
        const wp = (mod.default || mod) as WebPushModule;
        wp.setVapidDetails(config.push.subject, config.push.publicKey, config.push.privateKey);
        return wp;
      })
      .catch((err) => {
        log.error('web-push unavailable', { error: String(err) });
        return null;
      });
  }
  return webPushPromise;
}

export function subscribe(userId: string, body: Record<string, unknown>, userAgent?: string): PushSubscriptionRecord {
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
  const keys = (body.keys || {}) as Record<string, unknown>;
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) throw badRequest('A valid push endpoint is required');
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') throw badRequest('Push keys are missing');
  // A push endpoint identifies one browser profile. If another account registered it earlier
  // (shared device, no logout), the old registration is dropped rather than silently re-owned.
  const existing = pushSubscriptions.findOne({ endpoint });
  if (existing && existing.userId !== userId) pushSubscriptions.remove(existing.id);
  const sameUser = existing && existing.userId === userId ? existing : null;
  const record: PushSubscriptionRecord = {
    id: sameUser?.id || newId('push'),
    userId,
    endpoint,
    keys: { p256dh: keys.p256dh.slice(0, 200), auth: keys.auth.slice(0, 100) },
    userAgent: userAgent?.slice(0, 200),
    createdAt: sameUser?.createdAt || new Date().toISOString(),
  };
  pushSubscriptions.upsert(record);
  return record;
}

export function unsubscribe(userId: string, endpoint: string): boolean {
  const existing = pushSubscriptions.findOne({ endpoint });
  if (!existing || existing.userId !== userId) return false;
  return pushSubscriptions.remove(existing.id);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Sends to every device the user registered; dead subscriptions (410/404) are pruned. */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  const wp = await webPush();
  if (!wp) return 0;
  const subs = pushSubscriptions.list({ user_id: userId });
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ ...payload, url: payload.url ? `${config.appUrl}${payload.url}` : config.appUrl }),
          { TTL: 60 * 60 * 24 }
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) pushSubscriptions.remove(sub.id);
        else log.warn('push delivery failed', { userId, status, error: String(err).slice(0, 200) });
      }
    })
  );
  return sent;
}
