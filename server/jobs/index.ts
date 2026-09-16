import { config } from '../config.js';
import { customers, payments, sessions } from '../db/repositories.js';
import { getMeta, setMeta } from '../db/database.js';
import { notifyUser } from '../services/crmService.js';
import { events } from '../lib/events.js';

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

  for (const customer of customers.list({ status: 'Active' })) {
    const key = `rent-reminder:${customer.id}:${period}`;
    if (getMeta(key)) continue;
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

export function startJobs(): void {
  const tick = () => {
    try {
      runRentReminders();
      sessions.purgeExpired();
    } catch (err) {
      console.error('[jobs] tick failed:', err);
    }
  };
  setTimeout(tick, 30_000).unref();
  setInterval(tick, DAY_MS / 4).unref(); // four times a day; idempotent per month
}
