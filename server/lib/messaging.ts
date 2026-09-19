import { config } from '../config.js';
import { enqueue, registerJob } from './queue.js';
import { outbox, users, type OutboxMessage } from '../db/repositories.js';
import { newId } from './ids.js';

/**
 * Outbound messaging. Every message is recorded in the `outbox` table with its delivery status so the
 * admin console can audit what went out (or, without a provider configured, what *would* have gone out).
 *
 * Email:    Resend (RESEND_API_KEY) or SendGrid (SENDGRID_API_KEY); otherwise "log".
 * WhatsApp: Twilio (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM); otherwise "log".
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Minimal branded HTML wrapper for transactional emails. */
export function emailTemplate(title: string, lines: string[], cta?: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#faf9f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#121820">
  <div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
    <div style="background:#0f172a;color:#a3e635;padding:18px 24px;font-weight:800;font-size:18px">NestIn</div>
    <div style="padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
      ${lines.map((l) => `<p style="font-size:14px;line-height:1.6;margin:0 0 10px;color:#334155">${escapeHtml(l)}</p>`).join('')}
      ${cta ? `<p style="margin:22px 0 6px"><a href="${cta.url}" style="display:inline-block;background:#a3e635;color:#0f172a;text-decoration:none;font-weight:800;padding:12px 20px;border-radius:12px">${escapeHtml(cta.label)}</a></p><p style="font-size:12px;color:#94a3b8">Or copy this link: ${escapeHtml(cta.url)}</p>` : ''}
    </div>
    <div style="padding:14px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9">You are receiving this because you have a NestIn account. Manage preferences in Settings → Notifications.</div>
  </div></body></html>`;
}

function record(msg: Omit<OutboxMessage, 'id' | 'createdAt'>): OutboxMessage {
  const rec: OutboxMessage = { ...msg, id: newId('msg'), createdAt: new Date().toISOString() };
  outbox.insert(rec);
  return rec;
}

export async function sendEmail(message: EmailMessage): Promise<OutboxMessage> {
  const { emailProvider, emailFrom, resendApiKey, sendgridApiKey } = config.messaging;
  const text =
    message.text ||
    message.html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  try {
    if (emailProvider === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: emailFrom, to: [message.to], subject: message.subject, html: message.html, text }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return record({
        channel: 'email',
        recipient: message.to,
        status: 'sent',
        subject: message.subject,
        body: text,
        provider: 'resend',
      });
    }
    if (emailProvider === 'sendgrid') {
      const fromMatch = emailFrom.match(/^(.*)<(.+)>$/);
      const from = fromMatch ? { name: fromMatch[1].trim(), email: fromMatch[2].trim() } : { email: emailFrom };
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sendgridApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: message.to }] }],
          from,
          subject: message.subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: message.html },
          ],
        }),
      });
      if (!res.ok) throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return record({
        channel: 'email',
        recipient: message.to,
        status: 'sent',
        subject: message.subject,
        body: text,
        provider: 'sendgrid',
      });
    }
    if (!config.isTest) console.log(`[email:log] to=${message.to} subject="${message.subject}"`);
    return record({
      channel: 'email',
      recipient: message.to,
      status: 'logged',
      subject: message.subject,
      body: text,
      provider: 'log',
    });
  } catch (err) {
    console.error('[email] delivery failed:', err);
    return record({
      channel: 'email',
      recipient: message.to,
      status: 'failed',
      subject: message.subject,
      body: text,
      provider: emailProvider,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function sendWhatsApp(toPhone: string, body: string): Promise<OutboxMessage> {
  const { twilio } = config.messaging;
  const to = `whatsapp:${toPhone.replace(/[^+\d]/g, '')}`;
  try {
    if (twilio.enabled) {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilio.whatsappFrom.startsWith('whatsapp:') ? twilio.whatsappFrom : `whatsapp:${twilio.whatsappFrom}`,
          To: to,
          Body: body,
        }),
      });
      if (!res.ok) throw new Error(`Twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return record({ channel: 'whatsapp', recipient: toPhone, status: 'sent', body, provider: 'twilio' });
    }
    if (!config.isTest) console.log(`[whatsapp:log] to=${toPhone} body="${body.slice(0, 80)}"`);
    return record({ channel: 'whatsapp', recipient: toPhone, status: 'logged', body, provider: 'log' });
  } catch (err) {
    console.error('[whatsapp] delivery failed:', err);
    return record({
      channel: 'whatsapp',
      recipient: toPhone,
      status: 'failed',
      body,
      provider: 'twilio',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Fans an in-app notification out to external channels according to the user's preferences.
 * Runs off the request path; failures are recorded in the outbox and never thrown.
 */
export function dispatchNotification(
  userId: string,
  notif: { title: string; message: string; type: string; linkTo?: string }
): void {
  // Queued rather than awaited: provider latency or outages never slow the user's request, and
  // delivery is retried with backoff (see lib/queue.ts).
  enqueue('notification.deliver', { userId, notif }, { maxAttempts: 4 });
}

registerJob('notification.deliver', async (payload) => {
  await deliverNotification(
    String(payload.userId),
    payload.notif as { title: string; message: string; type: string; linkTo?: string }
  );
});

/** Channel fan-out (email / WhatsApp) for one notification. Throws on provider failure so the job retries. */
export async function deliverNotification(
  userId: string,
  notif: { title: string; message: string; type: string; linkTo?: string }
): Promise<void> {
  const user = users.findById(userId);
  if (!user || user.status !== 'active') return;
  const prefs = (user.data.notificationSettings || {}) as Record<string, boolean>;
  const wantsEmail = prefs.emailNotifications !== false;
  const wantsWhatsApp = prefs.whatsAppNotifications === true && !!user.data.phone;
  const categoryOptOut =
    (notif.type === 'booking' && prefs.bookingUpdates === false) ||
    (notif.type === 'payment' && prefs.paymentConfirmation === false) ||
    (notif.type === 'visit' && prefs.visitConfirmation === false);
  if (categoryOptOut) return;
  const link = notif.linkTo ? `${config.appUrl}${notif.linkTo}` : config.appUrl;
  const results: OutboxMessage[] = [];
  if (wantsEmail)
    results.push(
      await sendEmail({
        to: user.email,
        subject: `NestIn: ${notif.title}`,
        html: emailTemplate(notif.title, [`Hi ${user.fullName},`, notif.message], {
          label: 'Open NestIn',
          url: link,
        }),
      })
    );
  if (wantsWhatsApp)
    results.push(await sendWhatsApp(user.data.phone!, `NestIn — ${notif.title}\n${notif.message}\n${link}`));
  const failed = results.find((r) => r.status === 'failed');
  if (failed) throw new Error(`${failed.channel} delivery failed: ${failed.error || 'unknown error'}`);
}

export const messagingStatus = () => ({
  email: config.messaging.emailProvider,
  whatsapp: config.messaging.twilio.enabled ? 'twilio' : 'log',
});
