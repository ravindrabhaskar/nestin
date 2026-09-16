import type { TenantSupportTicket } from '../../src/types';
import { supportTickets, bookings, users, type StoredTicket } from '../db/repositories.js';
import { notFound } from '../lib/errors.js';
import { newId } from '../lib/ids.js';
import * as v from '../lib/validate.js';
import { events, type EventContext } from '../lib/events.js';
import type { AuthUser } from '../middleware/auth.js';
import { notifyUser } from './crmService.js';

/**
 * Support tickets are raised by residents and answered by the owner of the property they are
 * staying at (or by the platform admin when there is no owner relationship).
 */

/** Owner tenancy responsible for a resident: the owner of their most recent non-cancelled booking. */
export function responsibleOwnerFor(tenantId: string): { ownerId?: string; propertyName?: string } {
  const booking = bookings
    .list({ tenant_id: tenantId })
    .find((b) => !['Cancelled', 'Rejected'].includes(b.bookingStatus));
  return booking ? { ownerId: booking.ownerId, propertyName: booking.propertyName } : {};
}

export function listForOwner(ownerId: string): TenantSupportTicket[] {
  return supportTickets.list({ owner_id: ownerId });
}

export function listAll(): TenantSupportTicket[] {
  return supportTickets.list({}, { limit: 1000 });
}

function getScoped(id: string, scope: { ownerId?: string; admin?: boolean }): StoredTicket {
  const ticket = supportTickets.get(id);
  if (!ticket) throw notFound('Ticket');
  if (!scope.admin && ticket.ownerId !== scope.ownerId) throw notFound('Ticket');
  return ticket;
}

/** Owner/staff/admin reply — appended as a "support" message and pushed to the resident. */
export function replyAsSupport(
  actor: AuthUser,
  id: string,
  body: Record<string, unknown>,
  ctx: EventContext,
  scope: { ownerId?: string; admin?: boolean }
): TenantSupportTicket {
  const ticket = getScoped(id, scope);
  const message = v.str(body.message, 'Message', { max: 3000 });
  const now = new Date().toISOString();
  ticket.messages = [
    ...(ticket.messages || []),
    {
      id: newId('msg'),
      sender: 'support',
      senderName: actor.role === 'super_admin' ? 'NestIn Support' : actor.fullName,
      message,
      timestamp: now,
    },
  ];
  ticket.status = 'In Progress';
  ticket.updatedAt = now;
  supportTickets.replace(ticket);
  notifyUser(ticket.tenantId, {
    title: `Reply on ticket ${ticket.ticketNumber || ''}`.trim(),
    message: message.slice(0, 200),
    type: 'system',
    linkTo: '/support',
  });
  events.publish(
    'SupportTicketReplied',
    'SupportTicket',
    id,
    { by: actor.role },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: ticket.ownerId }
  );
  return ticket;
}

export function resolveAsSupport(
  actor: AuthUser,
  id: string,
  ctx: EventContext,
  scope: { ownerId?: string; admin?: boolean }
): TenantSupportTicket {
  const ticket = getScoped(id, scope);
  ticket.status = 'Resolved';
  ticket.updatedAt = new Date().toISOString();
  supportTickets.replace(ticket);
  notifyUser(ticket.tenantId, {
    title: `Ticket ${ticket.ticketNumber || ''} resolved`.trim(),
    message: `${ticket.subject} has been marked as resolved. Reply on the ticket if you still need help.`,
    type: 'system',
    linkTo: '/support',
  });
  events.publish(
    'SupportTicketResolved',
    'SupportTicket',
    id,
    { by: actor.role },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: ticket.ownerId }
  );
  return ticket;
}

/** Notifies the responsible owner (or every admin) that a resident opened/updated a ticket. */
export function notifySupportSide(ticket: StoredTicket, title: string, message: string): void {
  if (ticket.ownerId) {
    notifyUser(ticket.ownerId, { title, message, type: 'system', linkTo: '/owner/support' });
    return;
  }
  for (const admin of users.list({ role: 'super_admin' }))
    notifyUser(admin.id, { title, message, type: 'system', linkTo: '/admin' });
}
