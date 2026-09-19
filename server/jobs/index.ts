import { config } from '../config.js';
import { customers, payments, sessions, users } from '../db/repositories.js';
import { getMeta, setMeta } from '../db/database.js';
import { notifyUser } from '../services/crmService.js';
import { events } from '../lib/events.js';
import { runVerificationExpiry } from '../services/propertyService.js';
import { getSubscription, hasFeature } from '../services/billingService.js';
import { runScheduledBackup } from '../lib/backup.js';
import { log } from '../lib/logger.js';
import { startQueueWorker } from '../lib/queue.js';
import { runAutopayCharges, runFeaturedExpiry } from '../services/monetisationService.js';

/**
 * Lightweight in-process scheduler. Jobs are idempotent per period (tracked in the `meta` table) so
 * restarts and multiple ticks never double-send.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Reminds active residents whose rent for the current month has not been recorded, once per month after the due day. */
export function runRentReminders(now = new Date()): { reminded: number } {
  if (now.getDate() < config.jobs.rentDueDay) return { reminded: 0 };
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  let reminded = 0;
  const byOwner = new Map<string, string[]>();

  const reminderEligible = new Map<string, boolean>();
  for (const customer of customers.list({ status: 'Active' })) {
    const key = `rent-reminder:${customer.id}:${period}`;
    if (getMeta(key)) continue;
    // Automated reminders are a paid-plan feature; Starter owners see dues on the dashboard instead.
    if (!reminderEligible.has(customer.ownerId))
      reminderEligible.set(customer.ownerId, hasFeature(customer.ownerId, 'rentReminders'));
    if (!reminderEligible.get(customer.ownerId)) continue;
    const paidThisMonth = payments
      .list({ customer_id: customer.id, status: 'Paid' })
      .some((p) => p.type === 'Rent' && p.createdAt >= monthStart);
    if (paidThisMonth) {
      setMeta(key, 'paid');
      continue;
    }
    const amount = `₹${customer.monthlyRent.toLocaleString('en-IN')}`;
    if (customer.tenantId) {
      notifyUser(customer.tenantId, {
        title: 'Rent due reminder',
        message: `Your rent of ${amount} for ${customer.propertyName} (${customer.roomName}) for ${now.toLocaleDateString('en-IN', { month: 'long' })} is due. Pay online from the Payments page.`,
        type: 'payment',
        linkTo: '/payments',
      });
    }
    byOwner.set(customer.ownerId, [...(byOwner.get(customer.ownerId) || []), `${customer.fullName} (${amount})`]);
    setMeta(key, 'reminded');
    reminded += 1;
  }

  for (const [ownerId, names] of byOwner) {
    notifyUser(ownerId, {
      title: `${names.length} rent payment${names.length > 1 ? 's' : ''} pending`,
      message: `Rent not yet recorded this month for: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` and ${names.length - 5} more` : ''}.`,
      type: 'payment',
      linkTo: '/owner/customers',
    });
  }
  if (reminded) events.publish('RentRemindersSent', 'Job', period, { reminded });
  return { reminded };
}

/** Touches every owner subscription so lapsed trials/periods downgrade even when the owner is inactive. */
export function reconcileSubscriptions(): number {
  let touched = 0;
  for (const owner of users.list({ role: 'owner' }, 10000)) {
    getSubscription(owner.id);
    touched += 1;
  }
  return touched;
}

export function startJobs(): void {
  startQueueWorker();
  const tick = async () => {
    try {
      runRentReminders();
      sessions.purgeExpired();
      reconcileSubscriptions();
      const autopay = runAutopayCharges();
      if (autopay.charged) log.info('autopay charges', autopay);
      const unfeatured = runFeaturedExpiry();
      if (unfeatured) log.info('featured placements expired', { count: unfeatured });
      const ver = runVerificationExpiry();
      if (ver.expired || ver.dueSoon) log.info('verification sweep', ver);
      await runScheduledBackup();
    } catch (err) {
      log.error('jobs tick failed', { error: String(err) });
    }
  };
  setTimeout(tick, 30_000).unref();
  setInterval(tick, DAY_MS / 4).unref(); // four times a day; every job is idempotent per period
}
