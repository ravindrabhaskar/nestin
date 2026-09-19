import type {
  LeadItem,
  BookingItem,
  VisitorItem,
  CustomerItem,
  CRMActivityLog,
  OwnerCRMNotification,
  LeadStage,
  VisitorStatus,
} from '../../src/types/crm';
import type { OwnerPropertyListing } from '../../src/types/property';
import {
  leads,
  bookings,
  visitors,
  customers,
  crmActivity,
  notifications,
  properties,
  payments,
  users,
  type StoredBooking,
  type StoredCustomer,
  type StoredVisitor,
  type PaymentRecord,
} from '../db/repositories.js';
import { Collection } from '../db/database.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { isSafeId, newId, bookingNumber as makeBookingNumber, invoiceNumber } from '../lib/ids.js';
import * as v from '../lib/validate.js';
import { events, type EventContext } from '../lib/events.js';
import type { AuthUser } from '../middleware/auth.js';
import { setBedStatus, syncBedAvailability } from './propertyService.js';
import { rewardReferralOnBooking } from './residentService.js';
import { dispatchNotification } from '../lib/messaging.js';
import { config } from '../config.js';
import { razorpayEnabled, simulatedPaymentsAllowed } from '../lib/razorpay.js';

export const LEAD_STAGES: LeadStage[] = [
  'New',
  'Contacted',
  'Visit Scheduled',
  'Visited',
  'Interested',
  'Booking Requested',
  'Converted',
  'Lost',
];
export const VISITOR_STATUSES: VisitorStatus[] = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-show'];

function stamp() {
  const d = new Date();
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

function activity(action: string, description: string, type: CRMActivityLog['type'], user: string): CRMActivityLog {
  const { date, time } = stamp();
  return { id: newId('act'), action, description, date, time, user, type };
}

export function logActivity(
  ownerId: string,
  action: string,
  description: string,
  type: CRMActivityLog['type'],
  user: string
): CRMActivityLog {
  const entry = { ...activity(action, description, type, user), ownerId };
  crmActivity.insert(entry);
  return entry;
}

export function notifyUser(userId: string, notif: Omit<OwnerCRMNotification, 'id' | 'timestamp' | 'isRead'>): void {
  const { date, time } = stamp();
  notifications.insert({ ...notif, id: newId('ntf'), userId, timestamp: `${date}, ${time}`, isRead: false });
  dispatchNotification(userId, notif);
}

export interface CrmSnapshot {
  leads: LeadItem[];
  bookings: BookingItem[];
  visitors: VisitorItem[];
  customers: CustomerItem[];
  auditLogs: CRMActivityLog[];
  notifications: OwnerCRMNotification[];
}

export function snapshot(ownerId: string, userId: string): CrmSnapshot {
  return {
    leads: leads.list({ owner_id: ownerId }),
    bookings: bookings.list({ owner_id: ownerId }),
    visitors: visitors.list({ owner_id: ownerId }),
    customers: customers.list({ owner_id: ownerId }),
    auditLogs: crmActivity.list({ owner_id: ownerId }, { limit: 500 }),
    notifications: notifications.list({ user_id: userId }, { limit: 200 }),
  };
}

// ---------------------------------------------------------------------------------------------
// Generic owner-scoped document upsert (leads, visitors, customers) with validation hooks
// ---------------------------------------------------------------------------------------------

type Kind = 'leads' | 'visitors' | 'customers';

const collections = { leads, visitors, customers } as const;

function validateLead(doc: Record<string, unknown>): void {
  doc.fullName = v.str(doc.fullName, 'Lead name', { max: 120 });
  doc.phone = v.phone(doc.phone, 'Phone');
  if (doc.email) doc.email = v.email(doc.email);
  doc.stage = v.oneOf(doc.stage, LEAD_STAGES, 'Stage', 'New');
  doc.budget = v.num(doc.budget ?? 0, 'Budget', { min: 0, max: 10_000_000, required: false });
}

function validateVisitor(doc: Record<string, unknown>): void {
  doc.visitorName = v.str(doc.visitorName, 'Visitor name', { max: 120 });
  doc.phone = v.phone(doc.phone, 'Phone');
  doc.visitDate = v.isoDate(doc.visitDate, 'Visit date');
  doc.status = v.oneOf(doc.status, VISITOR_STATUSES, 'Status', 'Scheduled');
  doc.propertyId = v.str(doc.propertyId, 'Property', { max: 80 });
}

function validateCustomer(doc: Record<string, unknown>): void {
  doc.fullName = v.str(doc.fullName, 'Customer name', { max: 120 });
  doc.phone = v.phone(doc.phone, 'Phone');
  doc.monthlyRent = v.num(doc.monthlyRent ?? 0, 'Monthly rent', { min: 0, max: 10_000_000, required: false });
  doc.tenantStatus = v.oneOf(
    doc.tenantStatus,
    ['Active', 'Upcoming', 'Vacating', 'Inactive'] as const,
    'Status',
    'Upcoming'
  );
}

const validators: Record<Kind, (doc: Record<string, unknown>) => void> = {
  leads: validateLead,
  visitors: validateVisitor,
  customers: validateCustomer,
};
const prefixes: Record<Kind, string> = { leads: 'lead', visitors: 'vis', customers: 'cust' };

export function upsertDocument(
  kind: Kind,
  actor: AuthUser,
  ownerId: string,
  id: string | undefined,
  body: Record<string, unknown>,
  ctx: EventContext
): Record<string, unknown> {
  v.assertDocumentSize(body);
  const col = collections[kind] as unknown as Collection<{ id: string; ownerId: string; createdAt?: string }>;
  const existing = id ? col.get(id) : null;
  if (existing && existing.ownerId !== ownerId) throw notFound(kind.slice(0, -1));

  const doc: Record<string, unknown> = { ...(existing || {}), ...body };
  doc.id =
    existing?.id ||
    (isSafeId(id) && !col.exists(id)
      ? id
      : isSafeId(body.id) && !col.exists(body.id as string)
        ? body.id
        : newId(prefixes[kind]));
  doc.ownerId = ownerId;
  doc.createdAt = existing?.createdAt || (typeof doc.createdAt === 'string' ? doc.createdAt : new Date().toISOString());
  if (!Array.isArray(doc.timeline)) doc.timeline = [];
  validators[kind](doc);

  const saved = col.upsert(doc as { id: string; ownerId: string });
  events.publish(
    existing ? `${kind}.updated` : `${kind}.created`,
    kind,
    saved.id,
    {},
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return saved;
}

export function deleteDocument(kind: Kind, actor: AuthUser, ownerId: string, id: string, ctx: EventContext): void {
  const col = collections[kind] as unknown as Collection<{ id: string; ownerId: string }>;
  const existing = col.get(id);
  if (!existing || existing.ownerId !== ownerId) throw notFound(kind.slice(0, -1));
  Collection.transaction(() => {
    if (kind === 'customers') releaseCustomerBed(existing as unknown as StoredCustomer);
    col.remove(id);
  });
  events.publish(`${kind}.deleted`, kind, id, {}, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId });
}

function releaseCustomerBed(customer: StoredCustomer): void {
  if (!customer.propertyId || !customer.roomId || !customer.bedId) return;
  const prop = properties.get(customer.propertyId);
  if (!prop || prop.ownerId !== customer.ownerId) return;
  try {
    properties.replace(setBedStatus(prop, customer.roomId, customer.bedId, false));
  } catch {
    // bed may have been removed from the room configuration; nothing to release
  }
}

export function recordActivity(actor: AuthUser, ownerId: string, body: Record<string, unknown>): CRMActivityLog {
  const action = v.str(body.action, 'Action', { max: 120 });
  const description = v.str(body.description, 'Description', { max: 1000 });
  const type = v.oneOf(
    body.type,
    ['lead', 'booking', 'visit', 'customer', 'payment', 'document', 'general'] as const,
    'Type',
    'general'
  );
  return logActivity(ownerId, action, description, type, actor.fullName);
}

// ---------------------------------------------------------------------------------------------
// Bookings & workflows
// ---------------------------------------------------------------------------------------------

function getOwnedBooking(ownerId: string, id: string): StoredBooking {
  const booking = bookings.get(id);
  if (!booking || booking.ownerId !== ownerId) throw notFound('Booking');
  return booking;
}

function bedIsFree(prop: OwnerPropertyListing, roomId?: string, bedId?: string, excludeBookingId?: string): boolean {
  if (!roomId || !bedId) return true;
  const room = prop.rooms.find((r) => r.id === roomId);
  const bed = room?.beds.find((b) => b.id === bedId);
  if (bed?.isOccupied) return false;
  const active = bookings
    .list({ property_id: prop.id, bed_id: bedId })
    .filter((b) => b.id !== excludeBookingId && ['Pending', 'Confirmed'].includes(b.bookingStatus));
  return active.length === 0;
}

/** Picks the first vacant bed of a room (or of the property) for tenant-initiated bookings. */
function pickBed(
  prop: OwnerPropertyListing,
  roomId?: string
): { room: OwnerPropertyListing['rooms'][number]; bed: OwnerPropertyListing['rooms'][number]['beds'][number] } | null {
  const rooms = roomId ? prop.rooms.filter((r) => r.id === roomId) : prop.rooms;
  for (const room of rooms) {
    for (const bed of room.beds) {
      if (!bed.isOccupied && bedIsFree(prop, room.id, bed.id)) return { room, bed };
    }
  }
  return null;
}

export interface CreateBookingInput {
  propertyId: string;
  roomId?: string;
  bedId?: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  moveInDate: string;
  durationMonths?: number;
  notes?: string;
  leadId?: string;
  source?: string;
  expectedMoveOutDate?: string;
}

/** Owner/staff created booking (from the CRM) or tenant-initiated booking (from a listing page). */
export function createBooking(
  actor: AuthUser,
  body: Record<string, unknown>,
  ctx: EventContext,
  options: { tenantInitiated: boolean; ownerId?: string }
): StoredBooking {
  const propertyId = v.str(body.propertyId, 'Property', { max: 80 });
  const prop = properties.get(propertyId);
  if (!prop) throw notFound('Property');
  if (options.tenantInitiated && prop.status !== 'published') throw notFound('Property');
  if (!options.tenantInitiated && prop.ownerId !== options.ownerId) throw notFound('Property');

  const moveInDate = v.isoDate(body.moveInDate, 'Move-in date');
  if (options.tenantInitiated) {
    // Owners may backfill historical move-ins; a resident booking online must pick today or later.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Date.parse(moveInDate) < today.getTime()) throw badRequest('Move-in date cannot be in the past');
  }
  const roomId = v.optionalStr(body.roomId, 'Room', 80);
  let bedId = v.optionalStr(body.bedId, 'Bed', 80);
  let room = roomId ? prop.rooms.find((r) => r.id === roomId) : undefined;
  let bed = room && bedId ? room.beds.find((b) => b.id === bedId) : undefined;

  if (!bed) {
    const picked = pickBed(prop, roomId);
    if (!picked) throw conflict('No vacant beds are available for the selected room right now.');
    room = picked.room;
    bed = picked.bed;
    bedId = bed.id;
  } else if (!bedIsFree(prop, room!.id, bed.id)) {
    throw conflict('The selected bed has just been reserved by someone else. Please choose another bed.');
  }

  const monthlyRent = v.num(body.monthlyRent ?? room!.monthlyRent, 'Monthly rent', { min: 0, max: 10_000_000 });
  const securityDeposit = v.num(body.securityDeposit ?? room!.securityDeposit ?? monthlyRent * 2, 'Security deposit', {
    min: 0,
    max: 10_000_000,
    required: false,
  });
  const bookingFee = v.num(body.bookingFee ?? room!.bookingFee ?? prop.pricing?.bookingFee ?? 0, 'Booking fee', {
    min: 0,
    max: 1_000_000,
    required: false,
  });
  const maintenanceCharges = v.num(body.maintenanceCharges ?? room!.maintenance ?? 0, 'Maintenance', {
    min: 0,
    max: 1_000_000,
    required: false,
  });
  const durationMonths = v.num(body.durationMonths ?? 6, 'Duration', {
    min: 1,
    max: 60,
    integer: true,
    required: false,
  });

  const tenantUser = options.tenantInitiated ? users.findById(actor.id) : null;
  const tenantName = options.tenantInitiated
    ? v.str(body.tenantName || actor.fullName, 'Name', { max: 120 })
    : v.str(body.tenantName, 'Tenant name', { max: 120 });
  const tenantPhone = v.phone(body.tenantPhone || tenantUser?.data.phone, 'Phone');
  const tenantEmail = options.tenantInitiated ? actor.email : v.email(body.tenantEmail || '');

  const id = isSafeId(body.id) && !bookings.exists(body.id as string) ? (body.id as string) : newId('bk');
  const bookingNumber = makeBookingNumber();
  const actorName = options.tenantInitiated ? tenantName : actor.fullName;
  const totalAmount = monthlyRent + securityDeposit + bookingFee + maintenanceCharges;

  const booking: StoredBooking = {
    id,
    ownerId: prop.ownerId,
    tenantId: options.tenantInitiated
      ? actor.id
      : typeof body.tenantId === 'string' && isSafeId(body.tenantId)
        ? body.tenantId
        : undefined,
    bookingNumber,
    tenantName,
    tenantPhone,
    tenantEmail,
    tenantAvatar: v.optionalStr(body.tenantAvatar, 'Avatar', 500) || tenantUser?.data.avatar,
    propertyId,
    propertyName: prop.name,
    propertyAddress: prop.location?.formattedAddress,
    propertyImage: prop.coverImage,
    propertyCity: prop.location?.city,
    propertySlug: prop.slug,
    roomId: room!.id,
    roomName: room!.name,
    roomType: room!.type,
    bedId: bedId!,
    bedNumber: bed.bedNumber,
    moveInDate,
    expectedMoveOutDate: v.optionalStr(body.expectedMoveOutDate, 'Move-out date', 40),
    durationMonths,
    monthlyRent,
    securityDeposit,
    bookingFee,
    maintenanceCharges,
    totalAmount,
    paidAmount: options.tenantInitiated
      ? simulatedPaymentsAllowed()
        ? bookingFee
        : 0
      : v.num(body.paidAmount ?? 0, 'Paid amount', { min: 0, max: 10_000_000, required: false }),
    paymentStatus: options.tenantInitiated
      ? bookingFee > 0 && simulatedPaymentsAllowed()
        ? 'Partial'
        : 'Pending'
      : v.oneOf(
          body.paymentStatus,
          ['Paid', 'Partial', 'Pending', 'Overdue', 'Refunded'] as const,
          'Payment status',
          'Pending'
        ),
    bookingStatus: 'Pending',
    notes: v.optionalStr(body.notes, 'Notes', 2000),
    createdAt: new Date().toISOString(),
    leadId: v.optionalStr(body.leadId, 'Lead', 80),
    timeline: [
      activity(
        'Booking Created',
        `${options.tenantInitiated ? 'Online' : 'New'} booking request ${bookingNumber} created for ${room!.name} (${bed.bedNumber}).`,
        'booking',
        actorName
      ),
    ],
  };

  Collection.transaction(() => {
    bookings.insert(booking);
    if (booking.leadId) {
      const lead = leads.get(booking.leadId);
      if (lead && lead.ownerId === prop.ownerId) {
        lead.stage = 'Booking Requested';
        lead.bookingId = id;
        lead.timeline = [
          activity('Booking Requested', `Booking ${bookingNumber} generated for ${prop.name}.`, 'booking', actorName),
          ...lead.timeline,
        ];
        leads.replace(lead);
      }
    }
    if (options.tenantInitiated && bookingFee > 0) {
      recordPayment({
        ownerId: prop.ownerId,
        tenantId: actor.id,
        bookingId: id,
        propertyId,
        propertyName: prop.name,
        tenantName,
        amount: bookingFee,
        type: 'Token Booking',
        method: simulatedPaymentsAllowed() ? 'UPI / GPay' : 'Razorpay',
        status: simulatedPaymentsAllowed() ? 'Paid' : 'Pending',
        gateway: razorpayEnabled() ? 'razorpay' : 'simulated',
        description: `Token booking fee for ${prop.name} (${room!.name})`,
      });
    }
    logActivity(
      prop.ownerId,
      'Booking Created',
      `Booking ${bookingNumber} created for ${tenantName}`,
      'booking',
      actorName
    );
  });

  notifyUser(prop.ownerId, {
    title: options.tenantInitiated ? 'New Online Booking Request' : 'Booking Created',
    message: `Booking ${bookingNumber} for ${tenantName} at ${prop.name}.${
      options.tenantInitiated && config.messaging.twilio.enabled
        ? ` Reply APPROVE ${bookingNumber} or REJECT ${bookingNumber} <reason> on WhatsApp.`
        : ''
    }`,
    type: 'booking',
    linkTo: '/owner/bookings',
  });
  if (booking.tenantId)
    notifyUser(booking.tenantId, {
      title: 'Booking Request Received',
      message: `Your request ${bookingNumber} for ${prop.name} is awaiting owner confirmation.`,
      type: 'booking',
      linkTo: '/my-bookings',
    });
  events.publish(
    'BookingCreated',
    'Booking',
    id,
    { bookingNumber, propertyId, bedId: bedId!, tenantInitiated: options.tenantInitiated },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: prop.ownerId }
  );
  syncBedAvailability(propertyId);
  return booking;
}

export function updateBooking(
  actor: AuthUser,
  ownerId: string,
  id: string,
  body: Record<string, unknown>,
  ctx: EventContext
): StoredBooking {
  const booking = getOwnedBooking(ownerId, id);
  v.assertDocumentSize(body);
  const patch = v.omitKeys(body, [
    'id',
    'ownerId',
    'tenantId',
    'bookingNumber',
    'bookingStatus',
    'customerId',
    'propertyId',
    'createdAt',
  ]);
  const merged = { ...booking, ...patch } as StoredBooking;
  if (patch.notes !== undefined) merged.notes = v.optionalStr(patch.notes, 'Notes', 2000);
  bookings.replace(merged);
  events.publish(
    'BookingUpdated',
    'Booking',
    id,
    { fields: Object.keys(patch) },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return merged;
}

export interface ApprovalResult {
  booking: StoredBooking;
  customer: StoredCustomer;
  property: OwnerPropertyListing | null;
  lead: LeadItem | null;
  isDuplicateCustomer: boolean;
}

export function approveBooking(
  actor: AuthUser,
  ownerId: string,
  id: string,
  body: Record<string, unknown>,
  ctx: EventContext
): ApprovalResult {
  const booking = getOwnedBooking(ownerId, id);
  if (booking.bookingStatus !== 'Pending')
    throw conflict(`Only pending bookings can be approved (current status: ${booking.bookingStatus}).`);
  const { date } = stamp();

  return Collection.transaction(() => {
    // 1. Reserve the bed in inventory.
    let property: OwnerPropertyListing | null = properties.get(booking.propertyId);
    if (property && booking.roomId && booking.bedId) {
      if (!bedIsFree(property, booking.roomId, booking.bedId, booking.id))
        throw conflict(`Bed ${booking.bedNumber} is no longer available. Assign a different bed before approving.`);
      property = properties.replace(setBedStatus(property, booking.roomId, booking.bedId, true, booking.tenantName));
    }

    // 2. Create or link the customer profile (dedupe by phone/email).
    const existing = findCustomerByContact(ownerId, booking.tenantPhone, booking.tenantEmail);
    const requestedId =
      isSafeId(body.customerId) && !customers.exists(body.customerId as string)
        ? (body.customerId as string)
        : newId('cust');
    const customer: StoredCustomer = existing
      ? {
          ...existing,
          propertyId: booking.propertyId,
          propertyName: booking.propertyName,
          propertyAddress: booking.propertyAddress,
          roomId: booking.roomId,
          roomName: booking.roomName,
          roomType: booking.roomType,
          bedId: booking.bedId,
          bedNumber: booking.bedNumber,
          moveInDate: booking.moveInDate,
          expectedMoveOutDate: booking.expectedMoveOutDate,
          monthlyRent: booking.monthlyRent,
          securityDeposit: booking.securityDeposit,
          tenantStatus: 'Upcoming',
          bookingId: booking.id,
          tenantId: existing.tenantId || booking.tenantId,
        }
      : {
          id: requestedId,
          ownerId,
          tenantId: booking.tenantId,
          fullName: booking.tenantName,
          phone: booking.tenantPhone,
          email: booking.tenantEmail,
          avatar: booking.tenantAvatar,
          propertyId: booking.propertyId,
          propertyName: booking.propertyName,
          propertyAddress: booking.propertyAddress,
          roomId: booking.roomId,
          roomName: booking.roomName,
          roomType: booking.roomType,
          bedId: booking.bedId,
          bedNumber: booking.bedNumber,
          moveInDate: booking.moveInDate,
          expectedMoveOutDate: booking.expectedMoveOutDate,
          monthlyRent: booking.monthlyRent,
          securityDeposit: booking.securityDeposit,
          paymentStatus: 'Paid',
          tenantStatus: 'Upcoming',
          notes: `Booking: ${booking.bookingNumber}. Approved on ${date}.`,
          createdAt: new Date().toISOString(),
          leadId: booking.leadId,
          bookingId: booking.id,
          documents: [],
          paymentHistory: [],
          visitHistory: [],
          timeline: [
            activity(
              'Customer Onboarded',
              `Resident account initialized for ${booking.propertyName} (${booking.roomName}).`,
              'customer',
              'NestIn Automation'
            ),
          ],
        };

    // 3. Record the move-in payment (rent + deposit) against the booking.
    const outstanding = Math.max(0, booking.totalAmount - booking.paidAmount);
    if (outstanding > 0) {
      const payment = recordPayment({
        ownerId,
        tenantId: booking.tenantId,
        customerId: customer.id,
        bookingId: booking.id,
        propertyId: booking.propertyId,
        propertyName: booking.propertyName,
        tenantName: booking.tenantName,
        amount: outstanding,
        type: 'Security Deposit',
        method: 'UPI / GPay',
        status: 'Paid',
        gateway: 'manual',
        description: 'Initial move-in rent & security deposit',
      });
      customer.paymentHistory = [
        {
          id: payment.id,
          paymentId: payment.transactionId,
          date,
          propertyId: booking.propertyId,
          propertyName: booking.propertyName,
          rentAmount: booking.monthlyRent,
          additionalCharges: outstanding - booking.monthlyRent,
          totalAmount: outstanding,
          paymentMethod: 'UPI',
          status: 'Completed',
          receiptNumber: payment.invoiceNumber,
          description: 'Initial Move-in Rent & Security Deposit Allotment',
        },
        ...customer.paymentHistory,
      ];
    }
    customers.upsert(customer);

    // 4. Confirm the booking.
    booking.bookingStatus = 'Confirmed';
    booking.paymentStatus = 'Paid';
    booking.paidAmount = booking.totalAmount;
    booking.customerId = customer.id;
    booking.timeline = [
      activity(
        'Booking Approved',
        `Owner approved booking. Bed ${booking.bedNumber} reserved and customer profile linked.`,
        'booking',
        actor.fullName
      ),
      ...booking.timeline,
    ];
    bookings.replace(booking);

    // 5. Convert the lead.
    let lead: (LeadItem & { ownerId: string }) | null = booking.leadId ? leads.get(booking.leadId) : null;
    if (lead && lead.ownerId === ownerId) {
      lead.stage = 'Converted';
      lead.customerId = customer.id;
      lead.timeline = [
        activity(
          'Lead Converted',
          `Lead converted to confirmed tenant upon booking approval (${booking.bookingNumber}).`,
          'customer',
          actor.fullName
        ),
        ...lead.timeline,
      ];
      leads.replace(lead);
    } else lead = null;

    if (property) {
      property.systemMetrics.totalBookingsCount = (property.systemMetrics.totalBookingsCount || 0) + 1;
      properties.replace(property);
    }

    logActivity(
      ownerId,
      'Booking Approved',
      `Booking ${booking.bookingNumber} approved for ${booking.tenantName}`,
      'booking',
      actor.fullName
    );
    if (!existing)
      logActivity(
        ownerId,
        'Customer Created',
        `New tenant customer record created for ${booking.tenantName}`,
        'customer',
        actor.fullName
      );
    notifyUser(ownerId, {
      title: 'Booking Approved',
      message: `Booking ${booking.bookingNumber} confirmed. Tenant allotment ready for ${booking.moveInDate}.`,
      type: 'booking',
      linkTo: '/owner/bookings',
    });
    if (booking.tenantId)
      notifyUser(booking.tenantId, {
        title: 'Booking Confirmed 🎉',
        message: `Your booking ${booking.bookingNumber} at ${booking.propertyName} is confirmed for ${booking.moveInDate}.`,
        type: 'booking',
        linkTo: '/my-bookings',
      });
    events.publish(
      'BookingApproved',
      'Booking',
      id,
      { bookingNumber: booking.bookingNumber, customerId: customer.id },
      { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
    );

    if (booking.tenantId) rewardReferralOnBooking(booking.tenantId, booking.id);
    return {
      booking,
      customer,
      property: syncBedAvailability(property.id) || property,
      lead,
      isDuplicateCustomer: !!existing,
    };
  });
}

export function rejectBooking(
  actor: AuthUser,
  ownerId: string,
  id: string,
  reason: string,
  ctx: EventContext
): StoredBooking {
  const booking = getOwnedBooking(ownerId, id);
  if (booking.bookingStatus !== 'Pending') throw conflict('Only pending bookings can be rejected.');
  const why = v.str(reason || 'Not specified', 'Reason', { max: 500 });
  booking.bookingStatus = 'Rejected';
  booking.rejectionReason = why;
  booking.timeline = [
    activity('Booking Rejected', `Booking rejected by owner. Reason: ${why}`, 'booking', actor.fullName),
    ...booking.timeline,
  ];
  bookings.replace(booking);
  logActivity(
    ownerId,
    'Booking Rejected',
    `Booking ${booking.bookingNumber} rejected: ${why}`,
    'booking',
    actor.fullName
  );
  if (booking.tenantId)
    notifyUser(booking.tenantId, {
      title: 'Booking Not Approved',
      message: `Your request ${booking.bookingNumber} could not be approved: ${why}`,
      type: 'booking',
      linkTo: '/my-bookings',
    });
  events.publish(
    'BookingRejected',
    'Booking',
    id,
    { reason: why },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  syncBedAvailability(booking.propertyId);
  return booking;
}

export function cancelBooking(
  actor: AuthUser,
  id: string,
  reason: string,
  ctx: EventContext,
  scope: { ownerId?: string; tenantId?: string }
): { booking: StoredBooking; property: OwnerPropertyListing | null } {
  const booking = bookings.get(id);
  if (!booking) throw notFound('Booking');
  if (scope.ownerId && booking.ownerId !== scope.ownerId) throw notFound('Booking');
  if (scope.tenantId && booking.tenantId !== scope.tenantId) throw notFound('Booking');
  if (['Cancelled', 'Completed', 'Rejected'].includes(booking.bookingStatus))
    throw conflict(`Booking is already ${booking.bookingStatus.toLowerCase()}.`);
  const why = v.str(reason || 'Cancelled by ' + (scope.tenantId ? 'resident' : 'owner'), 'Reason', { max: 500 });

  return Collection.transaction(() => {
    let property: OwnerPropertyListing | null = properties.get(booking.propertyId);
    if (property && booking.roomId && booking.bedId && booking.bookingStatus === 'Confirmed') {
      try {
        property = properties.replace(setBedStatus(property, booking.roomId, booking.bedId, false));
      } catch {
        // bed no longer exists
      }
    }
    booking.bookingStatus = 'Cancelled';
    booking.cancellationReason = why;
    booking.timeline = [
      activity(
        'Booking Cancelled',
        `Booking cancelled. Reason: ${why}. Bed ${booking.bedNumber} released.`,
        'booking',
        actor.fullName
      ),
      ...booking.timeline,
    ];
    bookings.replace(booking);
    if (booking.customerId) {
      const customer = customers.get(booking.customerId);
      if (customer && customer.bookingId === booking.id && customer.tenantStatus === 'Upcoming') {
        customer.tenantStatus = 'Inactive';
        customers.replace(customer);
      }
    }
    logActivity(
      booking.ownerId,
      'Booking Cancelled',
      `Booking ${booking.bookingNumber} cancelled`,
      'booking',
      actor.fullName
    );
    if (scope.tenantId)
      notifyUser(booking.ownerId, {
        title: 'Booking Cancelled by Resident',
        message: `${booking.tenantName} cancelled booking ${booking.bookingNumber}.`,
        type: 'booking',
        linkTo: '/owner/bookings',
      });
    else if (booking.tenantId)
      notifyUser(booking.tenantId, {
        title: 'Booking Cancelled',
        message: `Booking ${booking.bookingNumber} was cancelled: ${why}`,
        type: 'booking',
        linkTo: '/my-bookings',
      });
    events.publish(
      'BookingCancelled',
      'Booking',
      id,
      { reason: why },
      { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: booking.ownerId }
    );
    return { booking, property: syncBedAvailability(booking.propertyId) || property };
  });
}

export function completeMoveIn(
  actor: AuthUser,
  ownerId: string,
  id: string,
  ctx: EventContext
): { booking: StoredBooking; customer: StoredCustomer | null } {
  const booking = getOwnedBooking(ownerId, id);
  if (booking.bookingStatus !== 'Confirmed') throw conflict('Only confirmed bookings can be marked as moved-in.');
  booking.bookingStatus = 'Completed';
  booking.timeline = [
    activity(
      'Move-in Completed',
      'Tenant moved in. Physical key & biometric verification completed.',
      'customer',
      actor.fullName
    ),
    ...booking.timeline,
  ];
  bookings.replace(booking);
  const customer: StoredCustomer | null = booking.customerId ? customers.get(booking.customerId) : null;
  if (customer) {
    customer.tenantStatus = 'Active';
    customers.replace(customer);
  }
  logActivity(
    ownerId,
    'Move-in Completed',
    `Tenant move-in verified for booking ${booking.bookingNumber}`,
    'customer',
    actor.fullName
  );
  events.publish('MoveInCompleted', 'Booking', id, {}, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId });
  return { booking, customer };
}

export function recordMoveOut(
  actor: AuthUser,
  ownerId: string,
  customerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): { customer: StoredCustomer; property: OwnerPropertyListing | null } {
  const customer = customers.get(customerId);
  if (!customer || customer.ownerId !== ownerId) throw notFound('Customer');
  const moveOutDate = v.isoDate(body.moveOutDate, 'Move-out date');
  const reason = v.optionalStr(body.reason, 'Reason', 500) || 'End of lease tenure';
  return Collection.transaction(() => {
    let property: OwnerPropertyListing | null = null;
    if (customer.propertyId && customer.roomId && customer.bedId) {
      property = properties.get(customer.propertyId);
      if (property) {
        try {
          property = properties.replace(setBedStatus(property, customer.roomId, customer.bedId, false));
        } catch {
          property = null;
        }
      }
    }
    customer.tenantStatus = 'Inactive';
    customer.expectedMoveOutDate = moveOutDate;
    customer.timeline = [
      activity(
        'Move-out Completed',
        `Resident vacated on ${moveOutDate}. Reason: ${reason}.`,
        'customer',
        actor.fullName
      ),
      ...customer.timeline,
    ];
    customers.replace(customer);
    logActivity(
      ownerId,
      'Tenant Vacated',
      `Tenant ${customer.fullName} vacated bed ${customer.bedNumber}`,
      'customer',
      actor.fullName
    );
    events.publish(
      'TenantMovedOut',
      'Customer',
      customerId,
      { moveOutDate },
      { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
    );
    return { customer, property };
  });
}

export function findCustomerByContact(ownerId: string, phone: string, email?: string): StoredCustomer | null {
  const normalizedPhone = phone.replace(/\D/g, '');
  return (
    customers
      .list({ owner_id: ownerId })
      .find(
        (c) =>
          (c.phone || '').replace(/\D/g, '') === normalizedPhone ||
          (email && c.email?.toLowerCase() === email.toLowerCase())
      ) || null
  );
}

export function recordPayment(
  input: Omit<PaymentRecord, 'id' | 'currency' | 'invoiceNumber' | 'transactionId' | 'date' | 'createdAt'> & {
    idempotencyKey?: string;
  }
): PaymentRecord {
  if (input.idempotencyKey) {
    const existing = payments.findOne({ idempotency_key: input.idempotencyKey });
    if (existing) return existing;
  }
  const now = new Date();
  const record: PaymentRecord = {
    ...input,
    id: newId('pay'),
    currency: 'INR',
    invoiceNumber: invoiceNumber('INV'),
    transactionId: `TXN-${now.getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
    month: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    date: now.toISOString(),
    createdAt: now.toISOString(),
  };
  payments.insert(record);
  return record;
}

/** Owner logs a manual payment against a customer (rent collection). */
export function addCustomerPayment(
  actor: AuthUser,
  ownerId: string,
  customerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): StoredCustomer {
  const customer = customers.get(customerId);
  if (!customer || customer.ownerId !== ownerId) throw notFound('Customer');
  const rentAmount = v.num(body.rentAmount ?? 0, 'Rent amount', { min: 0, max: 10_000_000, required: false });
  const additionalCharges = v.num(body.additionalCharges ?? 0, 'Additional charges', {
    min: 0,
    max: 10_000_000,
    required: false,
  });
  const totalAmount = v.num(body.totalAmount ?? rentAmount + additionalCharges, 'Total', { min: 1, max: 10_000_000 });
  const paymentMethod = v.oneOf(
    body.paymentMethod,
    ['UPI', 'Bank Transfer', 'Credit Card', 'Cash', 'Auto-Debit'] as const,
    'Payment method',
    'UPI'
  );
  const description = v.optionalStr(body.description, 'Description', 500) || 'Monthly rent';
  const { date } = stamp();

  const payment = recordPayment({
    ownerId,
    tenantId: customer.tenantId,
    customerId,
    bookingId: customer.bookingId,
    propertyId: customer.propertyId,
    propertyName: customer.propertyName,
    tenantName: customer.fullName,
    amount: totalAmount,
    type: additionalCharges > rentAmount ? 'Maintenance' : 'Rent',
    method: paymentMethod === 'UPI' ? 'UPI / GPay' : paymentMethod === 'Bank Transfer' ? 'Net Banking' : paymentMethod,
    status: 'Paid',
    gateway: 'manual',
    description,
  });
  customer.paymentStatus = 'Paid';
  customer.paymentHistory = [
    {
      id: payment.id,
      paymentId: payment.transactionId,
      date,
      propertyId: customer.propertyId,
      propertyName: customer.propertyName,
      rentAmount,
      additionalCharges,
      totalAmount,
      paymentMethod,
      status: 'Completed',
      receiptNumber: payment.invoiceNumber,
      description,
    },
    ...customer.paymentHistory,
  ];
  customer.timeline = [
    activity(
      'Payment Received',
      `Payment of ₹${totalAmount.toLocaleString('en-IN')} received via ${paymentMethod} (${payment.invoiceNumber}).`,
      'payment',
      actor.fullName
    ),
    ...customer.timeline,
  ];
  customers.replace(customer);
  logActivity(
    ownerId,
    'Payment Logged',
    `Received ₹${totalAmount} from ${customer.fullName}`,
    'payment',
    actor.fullName
  );
  notifyUser(ownerId, {
    title: 'Payment Received',
    message: `Rent payment of ₹${totalAmount} logged for receipt ${payment.invoiceNumber}.`,
    type: 'payment',
    linkTo: '/owner/customers',
  });
  if (customer.tenantId)
    notifyUser(customer.tenantId, {
      title: 'Payment Receipt Generated',
      message: `₹${totalAmount.toLocaleString('en-IN')} received. Invoice ${payment.invoiceNumber}.`,
      type: 'payment',
      linkTo: '/payments',
    });
  events.publish(
    'PaymentRecorded',
    'Payment',
    payment.id,
    { amount: totalAmount, customerId },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return customer;
}

// ---------------------------------------------------------------------------------------------
// Tenant-facing visit scheduling (from listing page) creates a visitor + lead for the owner
// ---------------------------------------------------------------------------------------------

export function scheduleVisitAsTenant(
  actor: AuthUser,
  body: Record<string, unknown>,
  ctx: EventContext
): StoredVisitor {
  const propertyId = v.str(body.propertyId, 'Property', { max: 80 });
  const prop = properties.get(propertyId);
  if (!prop || prop.status !== 'published') throw notFound('Property');
  const visitDate = v.isoDate(body.visitDate, 'Visit date');
  const visitTime = v.str(body.visitTime || '10:00 AM', 'Visit time', { max: 20 });
  const tenantUser = users.findById(actor.id);
  const phone = v.phone(body.phone || tenantUser?.data.phone, 'Phone');
  const name = v.str(body.visitorName || actor.fullName, 'Name', { max: 120 });

  const visitor: StoredVisitor = {
    id: newId('vis'),
    ownerId: prop.ownerId,
    tenantId: actor.id,
    visitorName: name,
    phone,
    email: actor.email,
    propertyId,
    propertyName: prop.name,
    preferredRoom: v.optionalStr(body.preferredRoom, 'Room', 80),
    visitDate,
    visitTime,
    numberOfVisitors: v.num(body.numberOfVisitors ?? 1, 'Visitors', {
      min: 1,
      max: 10,
      integer: true,
      required: false,
    }),
    purpose: v.optionalStr(body.purpose, 'Purpose', 200) || 'Property tour',
    assignedTo: prop.caretaker?.name || 'Property Manager',
    status: 'Scheduled',
    notes: v.optionalStr(body.notes, 'Notes', 1000),
    createdAt: new Date().toISOString(),
    timeline: [
      activity(
        'Visit Scheduled',
        `${name} scheduled a visit via the website for ${visitDate} at ${visitTime}.`,
        'visit',
        name
      ),
    ],
  };
  Collection.transaction(() => {
    visitors.insert(visitor);
    const existingLead = leads
      .list({ owner_id: prop.ownerId })
      .find((l) => l.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
    if (!existingLead) {
      leads.insert({
        id: newId('lead'),
        ownerId: prop.ownerId,
        fullName: name,
        phone,
        email: actor.email,
        propertyId,
        propertyName: prop.name,
        roomType: visitor.preferredRoom || 'Any',
        budget: prop.pricing?.minRent || 0,
        source: 'Website',
        stage: 'Visit Scheduled',
        assignedTo: visitor.assignedTo,
        createdAt: new Date().toISOString(),
        visitorId: visitor.id,
        timeline: [
          activity(
            'Lead Created',
            `Lead auto-created from an online visit request for ${prop.name}.`,
            'lead',
            'NestIn Automation'
          ),
        ],
      });
    }
    logActivity(
      prop.ownerId,
      'Visit Scheduled',
      `${name} scheduled a visit to ${prop.name} on ${visitDate}`,
      'visit',
      name
    );
  });
  notifyUser(prop.ownerId, {
    title: 'New Property Visit Scheduled',
    message: `${name} scheduled a visit for ${prop.name} on ${visitDate} at ${visitTime}.`,
    type: 'visit',
    linkTo: '/owner/visitors',
  });
  events.publish(
    'VisitScheduled',
    'Visitor',
    visitor.id,
    { propertyId, visitDate },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: prop.ownerId }
  );
  return visitor;
}

// ---------------------------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------------------------

export function markNotificationRead(userId: string, id: string | 'all'): void {
  if (id === 'all') {
    for (const n of notifications.list({ user_id: userId, is_read: 0 })) notifications.replace({ ...n, isRead: true });
    return;
  }
  const n = notifications.get(id);
  if (!n || n.userId !== userId) throw notFound('Notification');
  notifications.replace({ ...n, isRead: true });
}

export function createNotification(userId: string, body: Record<string, unknown>): OwnerCRMNotification {
  const title = v.str(body.title, 'Title', { max: 120 });
  const message = v.str(body.message, 'Message', { max: 500 });
  const type = v.oneOf(
    body.type,
    ['lead', 'booking', 'visit', 'customer', 'payment', 'system'] as const,
    'Type',
    'system'
  );
  const linkTo = v.optionalStr(body.linkTo, 'Link', 200);
  const { date, time } = stamp();
  const record = {
    id: newId('ntf'),
    userId,
    title,
    message,
    type,
    linkTo,
    timestamp: `${date}, ${time}`,
    isRead: false,
  };
  notifications.insert(record);
  return record;
}
