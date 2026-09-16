import type { TenantBookingItem, TenantPaymentItem, TenantSupportTicket, TenantDocument } from "../../src/types";
import { bookings, payments, documents, supportTickets, wishlist, properties, notifications, users, type StoredBooking, type PaymentRecord, type StoredDocument, type StoredTicket } from "../db/repositories.js";
import { badRequest, notFound } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import * as v from "../lib/validate.js";
import { events, type EventContext } from "../lib/events.js";
import type { AuthUser } from "../middleware/auth.js";
import { toPublicListing } from "./propertyService.js";
import { notifyUser } from "./crmService.js";

// ---------------------------------------------------------------------------------------------
// Bookings (tenant view of CRM bookings)
// ---------------------------------------------------------------------------------------------

/** Resident-facing lifecycle: pending/confirmed before move-in = upcoming; confirmed after move-in or moved-in = active. */
function deriveTenantStatus(b: StoredBooking): TenantBookingItem["status"] {
  const now = Date.now();
  if (b.bookingStatus === "Cancelled" || b.bookingStatus === "Rejected") return "cancelled";
  if (b.expectedMoveOutDate && Date.parse(b.expectedMoveOutDate) < now && (b.bookingStatus === "Completed" || b.bookingStatus === "Confirmed")) return "completed";
  if (b.bookingStatus === "Completed") return "active";
  if (b.bookingStatus === "Confirmed" && Date.parse(b.moveInDate) <= now) return "active";
  return "upcoming";
}

function toTenantBooking(b: StoredBooking): TenantBookingItem {
  const owner = users.findById(b.ownerId);
  const prop = properties.get(b.propertyId);
  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    pgId: b.propertyId,
    pgName: b.propertyName,
    pgSlug: b.propertySlug || prop?.slug,
    location: b.propertyAddress || prop?.location?.formattedAddress || "",
    city: b.propertyCity || prop?.location?.city || "",
    roomType: b.roomType,
    sharingType: b.roomType,
    checkInDate: b.moveInDate,
    checkOutDate: b.expectedMoveOutDate,
    monthlyRent: b.monthlyRent,
    depositAmount: b.securityDeposit,
    paidAmount: b.paidAmount,
    status: deriveTenantStatus(b),
    image: b.propertyImage || prop?.coverImage || "",
    ownerName: owner?.fullName,
    ownerPhone: prop?.caretaker?.isPubliclyVisible ? prop.caretaker.phone : undefined,
    bedNumber: b.bedNumber,
    roomNumber: b.roomName,
    amenitiesIncluded: prop?.amenities?.filter((a) => a.isAvailable).slice(0, 6).map((a) => a.name),
    cancellationReason: b.cancellationReason || b.rejectionReason,
  };
}

export function myBookings(userId: string): TenantBookingItem[] {
  return bookings.list({ tenant_id: userId }).map(toTenantBooking);
}

export function myBookingDetail(userId: string, id: string): { booking: TenantBookingItem; raw: StoredBooking } {
  const b = bookings.get(id);
  if (!b || b.tenantId !== userId) throw notFound("Booking");
  return { booking: toTenantBooking(b), raw: b };
}

// ---------------------------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------------------------

function toTenantPayment(p: PaymentRecord): TenantPaymentItem {
  return {
    id: p.id,
    transactionId: p.transactionId,
    bookingId: p.bookingId,
    pgName: p.propertyName,
    amount: p.amount,
    type: p.type === "Subscription" ? "Maintenance" : p.type,
    date: p.date,
    paymentMethod: p.method === "Cash" || p.method === "Auto-Debit" || p.method === "Razorpay" ? "UPI / GPay" : p.method,
    status: p.status,
    month: p.month,
    invoiceNumber: p.invoiceNumber,
    receiptUrl: `/api/v1/tenant/payments/${p.id}/receipt`,
  };
}

export function myPayments(userId: string): TenantPaymentItem[] {
  return payments.list({ tenant_id: userId }).map(toTenantPayment);
}

export function paymentReceipt(userId: string, id: string): PaymentRecord {
  const p = payments.get(id);
  if (!p || p.tenantId !== userId) throw notFound("Payment");
  return p;
}

/** Tenant pays rent/dues online. Without gateway keys the payment is recorded as a simulated success. */
export function payOnline(actor: AuthUser, body: Record<string, unknown>, ctx: EventContext): TenantPaymentItem {
  const amount = v.num(body.amount, "Amount", { min: 1, max: 10_000_000 });
  const type = v.oneOf(body.type, ["Rent", "Security Deposit", "Token Booking", "Maintenance", "Electricity"] as const, "Payment type", "Rent");
  const method = v.oneOf(body.paymentMethod, ["UPI / GPay", "Credit Card", "Debit Card", "Net Banking"] as const, "Payment method", "UPI / GPay");
  const idempotencyKey = v.optionalStr(body.idempotencyKey, "Idempotency key", 120);
  const bookingId = v.optionalStr(body.bookingId, "Booking", 80);

  let booking: StoredBooking | null = null;
  if (bookingId) {
    booking = bookings.get(bookingId);
    if (!booking || booking.tenantId !== actor.id) throw notFound("Booking");
  } else {
    booking = bookings.list({ tenant_id: actor.id }).find((b) => ["Confirmed", "Completed"].includes(b.bookingStatus)) || null;
  }
  if (!booking) throw badRequest("You need a confirmed booking before paying online.");

  if (idempotencyKey) {
    const existing = payments.findOne({ idempotency_key: idempotencyKey });
    if (existing) return toTenantPayment(existing);
  }

  const now = new Date();
  const record: PaymentRecord = {
    id: newId("pay"),
    ownerId: booking.ownerId,
    tenantId: actor.id,
    customerId: booking.customerId,
    bookingId: booking.id,
    propertyId: booking.propertyId,
    propertyName: booking.propertyName,
    tenantName: booking.tenantName,
    amount,
    currency: "INR",
    type,
    method,
    status: "Paid",
    gateway: "simulated",
    invoiceNumber: `INV-${now.getFullYear()}-${1000 + Math.floor(Math.random() * 9000)}`,
    transactionId: `TXN-${now.getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
    idempotencyKey,
    month: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    description: `${type} paid online via ${method}`,
    date: now.toISOString(),
    createdAt: now.toISOString(),
  };
  payments.insert(record);
  notifyUser(booking.ownerId, { title: "Online Payment Received", message: `${booking.tenantName} paid ₹${amount.toLocaleString("en-IN")} (${type}) for ${booking.propertyName}.`, type: "payment", linkTo: "/owner/customers" });
  notifyUser(actor.id, { title: "Payment Successful", message: `₹${amount.toLocaleString("en-IN")} paid. Invoice ${record.invoiceNumber}.`, type: "payment", linkTo: "/payments" });
  events.publish("OnlinePaymentCaptured", "Payment", record.id, { amount, type, gateway: record.gateway }, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: booking.ownerId });
  return toTenantPayment(record);
}

// ---------------------------------------------------------------------------------------------
// Documents (metadata only; binary uploads go to object storage in production)
// ---------------------------------------------------------------------------------------------

const DOC_TYPES = ["govt_id", "address_proof", "student_id", "employment_proof", "agreement", "other"] as const;

export function myDocuments(userId: string): TenantDocument[] {
  return documents.list({ tenant_id: userId });
}

export function addDocument(actor: AuthUser, body: Record<string, unknown>, ctx: EventContext): TenantDocument {
  const doc: StoredDocument = {
    id: newId("doc"),
    tenantId: actor.id,
    name: v.str(body.name, "Document name", { max: 120 }),
    type: v.oneOf(body.type, DOC_TYPES, "Document type", "other"),
    documentNumber: v.optionalStr(body.documentNumber, "Document number", 60),
    fileName: v.str(body.fileName, "File name", { max: 200 }),
    fileSize: v.optionalStr(body.fileSize, "File size", 20),
    uploadedAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    status: "in_review",
    fileUrl: v.optionalStr(body.fileUrl, "File URL", 2000),
  };
  if (documents.count({ tenant_id: actor.id }) >= 25) throw badRequest("Document limit reached. Remove an old document first.");
  documents.insert(doc);
  events.publish("TenantDocumentUploaded", "Document", doc.id, { type: doc.type }, { ...ctx, actorId: actor.id, actorRole: actor.role });
  return doc;
}

export function deleteDocument(actor: AuthUser, id: string, ctx: EventContext): void {
  const doc = documents.get(id);
  if (!doc || doc.tenantId !== actor.id) throw notFound("Document");
  if (doc.status === "verified") throw badRequest("Verified documents cannot be removed. Contact support if a document needs replacing.");
  documents.remove(id);
  events.publish("TenantDocumentDeleted", "Document", id, {}, { ...ctx, actorId: actor.id, actorRole: actor.role });
}

// ---------------------------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------------------------

export function myTickets(userId: string): TenantSupportTicket[] {
  return supportTickets.list({ tenant_id: userId });
}

export function createTicket(actor: AuthUser, body: Record<string, unknown>, ctx: EventContext): TenantSupportTicket {
  const subject = v.str(body.subject, "Subject", { max: 200 });
  const description = v.str(body.description || body.message, "Description", { max: 3000 });
  const category = v.str(body.category || "General", "Category", { max: 60 });
  const priority = v.oneOf(body.priority, ["Low", "Medium", "High"] as const, "Priority", "Medium");
  const now = new Date().toISOString();
  const ticket: StoredTicket = {
    id: newId("tkt"),
    tenantId: actor.id,
    ticketNumber: `NST-${100000 + Math.floor(Math.random() * 900000)}`,
    subject,
    category,
    description,
    pgName: v.optionalStr(body.pgName, "Property", 120),
    status: "Open",
    priority,
    createdAt: now,
    updatedAt: now,
    messages: [{ id: newId("msg"), sender: "user", senderName: actor.fullName, message: description, timestamp: now }],
  };
  supportTickets.insert(ticket);
  events.publish("SupportTicketCreated", "SupportTicket", ticket.id, { category, priority }, { ...ctx, actorId: actor.id, actorRole: actor.role });
  return ticket;
}

export function replyToTicket(actor: AuthUser, id: string, body: Record<string, unknown>, ctx: EventContext): TenantSupportTicket {
  const ticket = supportTickets.get(id);
  if (!ticket || ticket.tenantId !== actor.id) throw notFound("Ticket");
  const message = v.str(body.message, "Message", { max: 3000 });
  const now = new Date().toISOString();
  ticket.messages = [...(ticket.messages || []), { id: newId("msg"), sender: "user", senderName: actor.fullName, message, timestamp: now }];
  ticket.status = ticket.status === "Resolved" || ticket.status === "resolved" ? "Open" : ticket.status;
  ticket.updatedAt = now;
  supportTickets.replace(ticket);
  events.publish("SupportTicketReplied", "SupportTicket", id, {}, { ...ctx, actorId: actor.id, actorRole: actor.role });
  return ticket;
}

export function closeTicket(actor: AuthUser, id: string, ctx: EventContext): TenantSupportTicket {
  const ticket = supportTickets.get(id);
  if (!ticket || ticket.tenantId !== actor.id) throw notFound("Ticket");
  ticket.status = "Resolved";
  ticket.updatedAt = new Date().toISOString();
  supportTickets.replace(ticket);
  events.publish("SupportTicketResolved", "SupportTicket", id, {}, { ...ctx, actorId: actor.id, actorRole: actor.role });
  return ticket;
}

// ---------------------------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------------------------

export function myWishlist(userId: string) {
  return wishlist
    .list(userId)
    .map((id) => properties.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.status === "published")
    .map(toPublicListing);
}

export function setWishlist(userId: string, propertyId: string, saved: boolean): { saved: boolean; propertyIds: string[] } {
  if (!properties.exists(propertyId)) throw notFound("Property");
  if (saved) wishlist.add(userId, propertyId);
  else wishlist.remove(userId, propertyId);
  return { saved, propertyIds: wishlist.list(userId) };
}

export function clearWishlist(userId: string): void {
  wishlist.clear(userId);
}

export function myNotifications(userId: string) {
  return notifications.list({ user_id: userId }, { limit: 100 });
}
