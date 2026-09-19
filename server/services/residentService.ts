import crypto from 'node:crypto';
import {
  users,
  customers,
  properties,
  bookings,
  payments,
  agreements,
  moveOuts,
  credits,
  surveys,
  supportTickets,
  documents,
  type AgreementRecord,
  type MoveOutRecord,
  type CreditRecord,
  type SurveyRecord,
  type StoredCustomer,
  type UserRecord,
} from '../db/repositories.js';
import { Collection } from '../db/database.js';
import { config } from '../config.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { newId, nextSequenceLabel } from '../lib/ids.js';
import * as v from '../lib/validate.js';
import { events, type EventContext } from '../lib/events.js';
import type { AuthUser } from '../middleware/auth.js';
import { notifyUser, recordMoveOut, logActivity } from './crmService.js';
import { sendEmail, sendWhatsApp, emailTemplate } from '../lib/messaging.js';

/**
 * Resident lifecycle beyond the booking: the rent agreement (generated, OTP e-signed), the
 * move-out & deposit-refund workflow, referral credits, roommate compatibility and NPS surveys.
 */

const nowIso = () => new Date().toISOString();
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------------------------------------
// Rent agreement + OTP e-sign
// ---------------------------------------------------------------------------------------------

export const DEFAULT_CLAUSES = [
  'Rent is payable in advance on or before the 5th of every month.',
  'The security deposit is refundable within 15 days of vacating, less deductions for damages or unpaid dues.',
  'A notice period of 30 days is required from either party to end this agreement.',
  'The resident shall keep the room and common areas clean and use utilities responsibly.',
  'Guests are not permitted to stay overnight without prior written consent of the owner.',
  'Smoking, alcohol and illegal substances are prohibited on the premises.',
  'The owner may inspect the room with 24 hours notice, except in emergencies.',
];

function agreementText(a: AgreementRecord): string {
  const lines = [
    `RESIDENTIAL LICENCE AGREEMENT — ${a.agreementNumber}`,
    ``,
    `This agreement is made on ${a.createdAt.slice(0, 10)} between:`,
    `LICENSOR: ${a.ownerName} ("the Owner")`,
    `LICENSEE: ${a.residentName}, ${a.residentPhone}${a.residentEmail ? `, ${a.residentEmail}` : ''} ("the Resident")`,
    ``,
    `PREMISES: ${a.propertyName}, ${a.propertyAddress}`,
    `ROOM / BED: ${a.roomName} / ${a.bedNumber}`,
    `TERM: ${a.startDate} to ${a.endDate}`,
    `MONTHLY RENT: ₹${a.monthlyRent.toLocaleString('en-IN')}`,
    `SECURITY DEPOSIT: ₹${a.securityDeposit.toLocaleString('en-IN')}`,
    `NOTICE PERIOD: ${a.noticePeriodDays} days`,
    ``,
    `TERMS`,
    ...a.clauses.map((c, i) => `${i + 1}. ${c}`),
    ``,
    `The Resident confirms the above by entering the one-time password sent to their registered contact details,`,
    `which constitutes an electronic signature under the Information Technology Act, 2000.`,
  ];
  return lines.join('\n');
}

export function listAgreementsForOwner(ownerId: string): AgreementRecord[] {
  return agreements.list({ owner_id: ownerId }, { limit: 5000 });
}

export function listAgreementsForTenant(tenantId: string): AgreementRecord[] {
  return agreements.list({ tenant_id: tenantId }, { limit: 500 });
}

export function createAgreement(
  actor: AuthUser,
  ownerId: string,
  body: Record<string, unknown>,
  ctx: EventContext
): AgreementRecord {
  const customerId = v.str(body.customerId, 'Resident', { max: 80 });
  const customer = customers.get(customerId);
  if (!customer || customer.ownerId !== ownerId) throw notFound('Resident');
  if (!customer.tenantId)
    throw badRequest('This resident has no NestIn account to sign with. Ask them to sign up first.');
  const existing = agreements
    .list({ owner_id: ownerId, tenant_id: customer.tenantId })
    .find((a) => a.customerId === customerId && (a.status === 'sent' || a.status === 'signed'));
  if (existing?.status === 'signed') throw conflict('A signed agreement already exists for this resident');
  const owner = users.findById(ownerId);
  const prop = properties.get(customer.propertyId);
  const startDate = v.isoDate(body.startDate ?? customer.moveInDate, 'Start date');
  const endDate = v.isoDate(
    body.endDate ??
      customer.expectedMoveOutDate ??
      new Date(Date.parse(startDate) + 365 * 86_400_000).toISOString().slice(0, 10),
    'End date'
  );
  if (Date.parse(endDate) <= Date.parse(startDate)) throw badRequest('End date must be after the start date');
  const clauses =
    Array.isArray(body.clauses) && body.clauses.length
      ? (body.clauses as unknown[]).slice(0, 30).map((c) => v.str(c, 'Clause', { max: 500 }))
      : DEFAULT_CLAUSES;
  const record: AgreementRecord = {
    id: existing?.id || newId('agr'),
    agreementNumber: existing?.agreementNumber || nextSequenceLabel('AGR', 'agreement'),
    ownerId,
    ownerName: owner?.fullName || 'Owner',
    tenantId: customer.tenantId,
    customerId,
    bookingId: customer.bookingId,
    propertyId: customer.propertyId,
    propertyName: customer.propertyName,
    propertyAddress: prop?.location?.formattedAddress || customer.propertyAddress || '',
    roomName: customer.roomName,
    bedNumber: customer.bedNumber,
    residentName: customer.fullName,
    residentPhone: customer.phone,
    residentEmail: customer.email,
    startDate,
    endDate,
    monthlyRent: v.money(body.monthlyRent ?? customer.monthlyRent, 'Monthly rent', { min: 0, max: 10_000_000 }),
    securityDeposit: v.money(body.securityDeposit ?? customer.securityDeposit, 'Security deposit', {
      min: 0,
      max: 10_000_000,
    }),
    noticePeriodDays: v.num(body.noticePeriodDays ?? 30, 'Notice period', { min: 0, max: 180, integer: true }),
    clauses,
    text: '',
    textHash: '',
    status: 'sent',
    sentAt: nowIso(),
    createdBy: actor.fullName,
    createdAt: existing?.createdAt || nowIso(),
  };
  record.text = agreementText(record);
  record.textHash = sha(record.text);
  if (existing) agreements.replace(record);
  else agreements.insert(record);
  notifyUser(customer.tenantId, {
    title: 'Your rent agreement is ready to sign',
    message: `${record.ownerName} has sent the agreement for ${record.propertyName}. Review and sign it with a one-time password.`,
    type: 'system',
    linkTo: '/documents',
  });
  events.publish(
    'AgreementSent',
    'Agreement',
    record.id,
    { customerId },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return record;
}

export function voidAgreement(ownerId: string, id: string): AgreementRecord {
  const a = agreements.get(id);
  if (!a || a.ownerId !== ownerId) throw notFound('Agreement');
  if (a.status === 'signed') throw conflict('Signed agreements cannot be voided; issue a termination instead');
  a.status = 'void';
  return agreements.replace(a);
}

function tenantAgreement(tenantId: string, id: string): AgreementRecord {
  const a = agreements.get(id);
  if (!a || a.tenantId !== tenantId) throw notFound('Agreement');
  return a;
}

/** Sends a 6-digit OTP to the resident's email/WhatsApp. Returns the code only outside production with the log provider. */
export async function requestSigningOtp(
  actor: AuthUser,
  id: string
): Promise<{ sentTo: string[]; expiresAt: string; devOtp?: string }> {
  const a = tenantAgreement(actor.id, id);
  if (a.status !== 'sent') throw conflict(`Agreement is ${a.status}`);
  const otp = String(crypto.randomInt(100000, 1_000_000));
  a.otpHash = sha(`${a.id}:${otp}`);
  a.otpExpiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  a.otpAttempts = 0;
  agreements.replace(a);
  const user = users.findById(actor.id);
  const sentTo: string[] = [];
  if (user?.email) {
    await sendEmail({
      to: user.email,
      subject: `NestIn: your agreement signing code is ${otp}`,
      html: emailTemplate('Sign your rent agreement', [
        `Your one-time password to sign agreement ${a.agreementNumber} for ${a.propertyName} is:`,
        otp,
        'It expires in 10 minutes. If you did not request this, ignore this email.',
      ]),
    });
    sentTo.push('email');
  }
  if (user?.data.phone) {
    await sendWhatsApp(
      user.data.phone,
      `NestIn: ${otp} is your code to sign agreement ${a.agreementNumber}. Valid 10 minutes.`
    );
    sentTo.push('whatsapp');
  }
  const simulated = config.messaging.emailProvider === 'log' && !config.isProduction;
  return { sentTo, expiresAt: a.otpExpiresAt, ...(simulated ? { devOtp: otp } : {}) };
}

export function signAgreement(
  actor: AuthUser,
  id: string,
  body: Record<string, unknown>,
  ctx: EventContext,
  ip?: string
): AgreementRecord {
  const a = tenantAgreement(actor.id, id);
  if (a.status !== 'sent') throw conflict(`Agreement is ${a.status}`);
  const otp = v.str(body.otp, 'OTP', { min: 6, max: 6 });
  const signerName = v.str(body.fullName ?? actor.fullName, 'Full name', { min: 2, max: 120 });
  if (!a.otpHash || !a.otpExpiresAt) throw badRequest('Request a signing code first');
  if (Date.parse(a.otpExpiresAt) < Date.now()) throw badRequest('The signing code has expired. Request a new one.');
  if ((a.otpAttempts || 0) >= 5) throw badRequest('Too many incorrect attempts. Request a new code.');
  if (sha(`${a.id}:${otp}`) !== a.otpHash) {
    a.otpAttempts = (a.otpAttempts || 0) + 1;
    agreements.replace(a);
    throw badRequest('Incorrect signing code');
  }
  if (body.accepted !== true) throw badRequest('You must accept the terms to sign');
  return Collection.transaction(() => {
    a.status = 'signed';
    a.signedAt = nowIso();
    a.signedBy = signerName;
    a.signedIp = ip;
    a.otpHash = undefined;
    a.otpExpiresAt = undefined;
    // Tamper-evidence: hash of the text, signer, time and IP. Recomputable from the stored record.
    a.signatureHash = sha(`${a.textHash}|${signerName}|${a.signedAt}|${ip || ''}|${actor.id}`);
    agreements.replace(a);
    const stamp = a.signedAt.slice(0, 10);
    documents.insert({
      id: newId('doc'),
      tenantId: a.tenantId,
      ownerId: a.ownerId,
      customerId: a.customerId,
      propertyId: a.propertyId,
      type: 'Rent Agreement',
      name: `${a.agreementNumber} — ${a.propertyName}`,
      fileUrl: `/api/v1/tenant/agreements/${a.id}/document`,
      status: 'verified',
      uploadedAt: a.signedAt,
      verifiedAt: a.signedAt,
      notes: `E-signed by ${signerName} on ${stamp}`,
    } as never);
    const customer = customers.get(a.customerId);
    if (customer) {
      customer.timeline = [
        {
          id: newId('act'),
          type: 'customer',
          title: 'Agreement signed',
          description: `${a.agreementNumber} e-signed by ${signerName}.`,
          timestamp: a.signedAt,
          actor: signerName,
        } as never,
        ...customer.timeline,
      ];
      customers.replace(customer);
    }
    logActivity(
      a.ownerId,
      'Agreement Signed',
      `${a.residentName} e-signed ${a.agreementNumber}`,
      'customer',
      signerName
    );
    notifyUser(a.ownerId, {
      title: 'Agreement signed',
      message: `${a.residentName} signed ${a.agreementNumber} for ${a.propertyName}.`,
      type: 'customer',
      linkTo: '/owner/customers',
    });
    events.publish(
      'AgreementSigned',
      'Agreement',
      a.id,
      { agreementNumber: a.agreementNumber },
      { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: a.ownerId }
    );
    return a;
  });
}

/** Printable HTML version (for both parties). */
export function agreementDocumentHtml(a: AgreementRecord): string {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const body = esc(a.text).replace(/\n/g, '<br>');
  const sig =
    a.status === 'signed'
      ? `<div class="sig"><b>Electronically signed</b> by ${esc(a.signedBy || a.residentName)} on ${esc(a.signedAt || '')}${a.signedIp ? ` from ${esc(a.signedIp)}` : ''}.<br><small>Signature hash: ${a.signatureHash}</small></div>`
      : `<div class="sig unsigned">Not yet signed.</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(a.agreementNumber)}</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 24px;color:#111;line-height:1.55}h1{font-size:18px;letter-spacing:.04em}.sig{margin-top:32px;padding:16px;border:1px solid #ccc;border-radius:8px;background:#f8f8f5}.unsigned{color:#999}@media print{body{margin:0}}</style></head>
<body><h1>NestIn · ${esc(a.agreementNumber)}</h1><div>${body}</div>${sig}</body></html>`;
}

export function agreementForViewer(viewer: AuthUser, id: string): AgreementRecord {
  const a = agreements.get(id);
  if (!a) throw notFound('Agreement');
  const allowed =
    viewer.role === 'super_admin' || a.tenantId === viewer.id || (viewer.ownerId && viewer.ownerId === a.ownerId);
  if (!allowed) throw notFound('Agreement');
  return a;
}

// ---------------------------------------------------------------------------------------------
// Move-out & deposit refund
// ---------------------------------------------------------------------------------------------

/** The stay a resident is actually living in: Active first, then Vacating, then a not-yet-started Upcoming one. */
function activeCustomerForTenant(tenantId: string): StoredCustomer {
  const rank: Record<string, number> = { Active: 0, Vacating: 1, Upcoming: 2 };
  const c = customers
    .list({ tenant_id: tenantId }, { limit: 50 })
    .filter((x) => x.tenantStatus in rank)
    .sort((a, b) => rank[a.tenantStatus] - rank[b.tenantStatus] || (a.moveInDate < b.moveInDate ? 1 : -1))[0];
  if (!c) throw badRequest('You do not have an active stay to move out of.');
  return c;
}

export function myMoveOut(tenantId: string): MoveOutRecord | null {
  return (
    moveOuts
      .list({ tenant_id: tenantId }, { limit: 20 })
      .find((m) => m.status !== 'cancelled' && m.status !== 'settled') ||
    moveOuts.list({ tenant_id: tenantId }, { limit: 1 })[0] ||
    null
  );
}

export function requestMoveOut(actor: AuthUser, body: Record<string, unknown>, ctx: EventContext): MoveOutRecord {
  const customer = activeCustomerForTenant(actor.id);
  const open = moveOuts.list({ tenant_id: actor.id }).find((m) => !['cancelled', 'settled'].includes(m.status));
  if (open) throw conflict('You already have a move-out request in progress');
  const moveOutDate = v.isoDate(body.moveOutDate, 'Move-out date');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Date.parse(moveOutDate) < today.getTime()) throw badRequest('Move-out date cannot be in the past');
  const noticeDays = Math.round((Date.parse(moveOutDate) - today.getTime()) / 86_400_000);
  const record: MoveOutRecord = {
    id: newId('mo'),
    ownerId: customer.ownerId,
    tenantId: actor.id,
    customerId: customer.id,
    propertyId: customer.propertyId,
    propertyName: customer.propertyName,
    roomName: customer.roomName,
    bedNumber: customer.bedNumber,
    residentName: customer.fullName,
    requestedMoveOutDate: moveOutDate,
    reason: v.optionalStr(body.reason, 'Reason', 500) || '',
    noticeDays,
    depositAmount: customer.securityDeposit || 0,
    deductions: [],
    refundAmount: customer.securityDeposit || 0,
    status: 'requested',
    timeline: [
      {
        at: nowIso(),
        by: actor.fullName,
        event: 'Move-out requested',
        note: `Requested for ${moveOutDate} (${noticeDays} days notice)`,
      },
    ],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  moveOuts.insert(record);
  customer.tenantStatus = 'Vacating';
  customer.expectedMoveOutDate = moveOutDate;
  customers.replace(customer);
  notifyUser(customer.ownerId, {
    title: 'Move-out notice received',
    message: `${customer.fullName} (${customer.propertyName}, ${customer.roomName}) plans to vacate on ${moveOutDate}. Schedule an inspection.`,
    type: 'customer',
    linkTo: '/owner/customers',
  });
  events.publish(
    'MoveOutRequested',
    'MoveOut',
    record.id,
    { moveOutDate, noticeDays },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: customer.ownerId }
  );
  return record;
}

export function cancelMoveOut(actor: AuthUser, id: string): MoveOutRecord {
  const m = moveOuts.get(id);
  if (!m || m.tenantId !== actor.id) throw notFound('Move-out request');
  if (m.status === 'settled') throw conflict('This move-out is already settled');
  if (m.status === 'cancelled') return m;
  m.status = 'cancelled';
  m.timeline.push({ at: nowIso(), by: actor.fullName, event: 'Cancelled by resident' });
  m.updatedAt = nowIso();
  moveOuts.replace(m);
  const customer = customers.get(m.customerId);
  if (customer && customer.tenantStatus === 'Vacating') {
    customer.tenantStatus = 'Active';
    customers.replace(customer);
  }
  return m;
}

export function listMoveOuts(ownerId: string): MoveOutRecord[] {
  return moveOuts.list({ owner_id: ownerId }, { limit: 5000 }).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** Owner side: schedule inspection → record deductions → settle (refund + free the bed). */
export function updateMoveOut(
  actor: AuthUser,
  ownerId: string,
  id: string,
  body: Record<string, unknown>,
  ctx: EventContext
): MoveOutRecord {
  const m = moveOuts.get(id);
  if (!m || m.ownerId !== ownerId) throw notFound('Move-out request');
  if (m.status === 'cancelled' || m.status === 'settled') throw conflict(`This move-out is ${m.status}`);
  const action = v.oneOf(body.action, ['schedule_inspection', 'record_inspection', 'settle'] as const, 'Action');
  const now = nowIso();
  if (action === 'schedule_inspection') {
    m.inspectionDate = v.isoDate(body.inspectionDate, 'Inspection date');
    m.status = 'inspection_scheduled';
    m.timeline.push({ at: now, by: actor.fullName, event: 'Inspection scheduled', note: m.inspectionDate });
    notifyUser(m.tenantId, {
      title: 'Room inspection scheduled',
      message: `Your move-out inspection for ${m.propertyName} is on ${m.inspectionDate}. Please be present.`,
      type: 'customer',
      linkTo: '/my-bookings',
    });
  } else if (action === 'record_inspection') {
    const raw = Array.isArray(body.deductions) ? (body.deductions as unknown[]).slice(0, 20) : [];
    m.deductions = raw.map((d) => {
      const row = v.obj(d, 'Deduction');
      return {
        label: v.str(row.label, 'Deduction label', { max: 120 }),
        amount: v.money(row.amount, 'Deduction amount', { min: 0, max: 10_000_000 }),
      };
    });
    const unpaid = payments.list({ customer_id: m.customerId, status: 'Pending' }).reduce((n, p) => n + p.amount, 0);
    if (unpaid > 0 && body.includeUnpaidDues !== false) m.deductions.push({ label: 'Unpaid dues', amount: unpaid });
    const total = m.deductions.reduce((n, d) => n + d.amount, 0);
    m.refundAmount = Math.max(0, Math.round((m.depositAmount - total) * 100) / 100);
    m.inspectionNotes = v.optionalStr(body.notes, 'Notes', 1000) || undefined;
    m.status = 'inspected';
    m.timeline.push({
      at: now,
      by: actor.fullName,
      event: 'Inspection recorded',
      note: `Deductions ₹${total.toLocaleString('en-IN')} · refund ₹${m.refundAmount.toLocaleString('en-IN')}`,
    });
    notifyUser(m.tenantId, {
      title: 'Deposit settlement statement',
      message: `Deductions of ₹${total.toLocaleString('en-IN')} from your ₹${m.depositAmount.toLocaleString('en-IN')} deposit. Refund due: ₹${m.refundAmount.toLocaleString('en-IN')}.`,
      type: 'payment',
      linkTo: '/my-bookings',
    });
  } else {
    if (m.status !== 'inspected') throw conflict('Record the inspection before settling');
    m.refundReference = v.optionalStr(body.refundReference, 'Refund reference', 120) || undefined;
    m.refundMethod = v.oneOf(
      body.refundMethod,
      ['UPI', 'Bank Transfer', 'Cash', 'Adjusted'] as const,
      'Refund method',
      'Bank Transfer'
    );
    m.settledAt = now;
    m.status = 'settled';
    m.timeline.push({
      at: now,
      by: actor.fullName,
      event: 'Deposit settled',
      note: `₹${m.refundAmount.toLocaleString('en-IN')} via ${m.refundMethod}${m.refundReference ? ` (${m.refundReference})` : ''}`,
    });
    if (m.refundAmount > 0) {
      payments.insert({
        id: newId('pay'),
        ownerId,
        tenantId: m.tenantId,
        customerId: m.customerId,
        propertyId: m.propertyId,
        propertyName: m.propertyName,
        tenantName: m.residentName,
        amount: m.refundAmount,
        currency: 'INR',
        type: 'Security Deposit',
        method: m.refundMethod === 'UPI' ? 'UPI / GPay' : m.refundMethod === 'Bank Transfer' ? 'Net Banking' : 'Cash',
        status: 'Refunded',
        gateway: 'manual',
        invoiceNumber: nextSequenceLabel('REF', 'refund'),
        transactionId: m.refundReference || `REF-${Date.now().toString(36).toUpperCase()}`,
        description: `Security deposit refund after move-out (${m.deductions.length} deduction${m.deductions.length === 1 ? '' : 's'})`,
        date: now,
        createdAt: now,
      });
    }
    // Free the bed and close the residency through the existing CRM move-out.
    recordMoveOut(
      actor,
      ownerId,
      m.customerId,
      { moveOutDate: m.requestedMoveOutDate, reason: m.reason || 'Move-out request' },
      ctx
    );
    notifyUser(m.tenantId, {
      title: 'Deposit refunded',
      message: `₹${m.refundAmount.toLocaleString('en-IN')} has been refunded via ${m.refundMethod}. Thank you for staying with ${m.propertyName}.`,
      type: 'payment',
      linkTo: '/payments',
    });
  }
  m.updatedAt = now;
  moveOuts.replace(m);
  events.publish(
    'MoveOutUpdated',
    'MoveOut',
    m.id,
    { action, status: m.status },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId }
  );
  return m;
}

// ---------------------------------------------------------------------------------------------
// Referrals & credits
// ---------------------------------------------------------------------------------------------

export function referralCodeFor(user: UserRecord): string {
  const stored = user.data.referralCode as string | undefined;
  if (stored) return stored;
  const code = `${
    user.fullName
      .replace(/[^a-z]/gi, '')
      .slice(0, 4)
      .toUpperCase() || 'NEST'
  }${sha(user.id).slice(0, 4).toUpperCase()}`;
  user.data.referralCode = code;
  users.update(user.id, { data: user.data });
  return code;
}

export function findByReferralCode(code: string): UserRecord | null {
  const normalised = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(normalised)) return null;
  return (
    users.list({}, 100000).find((u) => (u.data.referralCode as string | undefined)?.toUpperCase() === normalised) ||
    null
  );
}

export function availableCredit(userId: string): number {
  return credits.list({ user_id: userId, status: 'available' }).reduce((n, c) => n + c.amount, 0);
}

export function referralSummary(user: UserRecord) {
  const code = referralCodeFor(user);
  const referred = users.list({}, 100000).filter((u) => u.data.referredBy === user.id);
  const earned = credits.list({ user_id: user.id }, { limit: 500 });
  return {
    code,
    link: `${config.appUrl}/?ref=${code}`,
    creditPerReferral: config.referrals.creditInr,
    available: availableCredit(user.id),
    lifetime: earned.reduce((n, c) => n + c.amount, 0),
    referred: referred.map((u) => ({
      name: u.fullName.split(' ')[0],
      joinedAt: u.createdAt,
      rewarded: earned.some((c) => c.sourceUserId === u.id),
    })),
    history: earned,
  };
}

/** Called when a booking is confirmed: rewards referrer and referee once per referee. */
export function rewardReferralOnBooking(tenantId: string, bookingId: string): void {
  if (!config.referrals.creditInr) return;
  const referee = users.findById(tenantId);
  const referrerId = referee?.data.referredBy as string | undefined;
  if (!referee || !referrerId) return;
  if (credits.list({ user_id: referrerId }).some((c) => c.sourceUserId === referee.id)) return;
  const now = nowIso();
  const mk = (userId: string, reason: string): CreditRecord => ({
    id: newId('cr'),
    userId,
    amount: config.referrals.creditInr,
    reason,
    status: 'available',
    sourceUserId: referee.id,
    sourceBookingId: bookingId,
    createdAt: now,
  });
  credits.insert(mk(referrerId, `Referral reward — ${referee.fullName.split(' ')[0]} booked a stay`));
  credits.insert(mk(referee.id, 'Welcome credit for joining through a referral'));
  notifyUser(referrerId, {
    title: `₹${config.referrals.creditInr} referral credit earned`,
    message: `${referee.fullName.split(' ')[0]} booked through your link. The credit applies automatically to your next online payment.`,
    type: 'payment',
    linkTo: '/settings',
  });
}

/** Applies available credit to an amount; returns the reduced amount and marks credits used. */
export function applyCredits(userId: string, amount: number, paymentId: string): { amount: number; applied: number } {
  const available = credits.list({ user_id: userId, status: 'available' }, { limit: 200 });
  let remaining = Math.max(0, amount - 1); // keep at least ₹1 so a gateway order is still valid
  let applied = 0;
  for (const c of available) {
    if (remaining <= 0) break;
    const use = Math.min(c.amount, remaining);
    remaining -= use;
    applied += use;
    if (use === c.amount) {
      c.status = 'applied';
      c.appliedToPaymentId = paymentId;
      c.appliedAt = nowIso();
      credits.replace(c);
    } else {
      c.amount = Math.round((c.amount - use) * 100) / 100;
      credits.replace(c);
      credits.insert({
        ...c,
        id: newId('cr'),
        amount: use,
        status: 'applied',
        appliedToPaymentId: paymentId,
        appliedAt: nowIso(),
      });
    }
  }
  return { amount: Math.round((amount - applied) * 100) / 100, applied: Math.round(applied * 100) / 100 };
}

// ---------------------------------------------------------------------------------------------
// Roommate matching
// ---------------------------------------------------------------------------------------------

export interface Lifestyle {
  optIn: boolean;
  sleepSchedule?: 'early' | 'late' | 'flexible';
  foodHabit?: 'veg' | 'nonveg' | 'eggetarian';
  workHours?: 'day' | 'night' | 'remote' | 'student';
  cleanliness?: 1 | 2 | 3 | 4 | 5;
  smoking?: 'no' | 'occasionally' | 'yes';
  socialLevel?: 'quiet' | 'balanced' | 'social';
  languages?: string[];
}

export function sanitizeLifestyle(input: unknown): Lifestyle {
  const o = v.obj(input, 'Lifestyle');
  const pick = <T extends string>(val: unknown, allowed: readonly T[]) =>
    allowed.includes(val as T) ? (val as T) : undefined;
  return {
    optIn: o.optIn === true,
    sleepSchedule: pick(o.sleepSchedule, ['early', 'late', 'flexible'] as const),
    foodHabit: pick(o.foodHabit, ['veg', 'nonveg', 'eggetarian'] as const),
    workHours: pick(o.workHours, ['day', 'night', 'remote', 'student'] as const),
    cleanliness: [1, 2, 3, 4, 5].includes(Number(o.cleanliness))
      ? (Number(o.cleanliness) as Lifestyle['cleanliness'])
      : undefined,
    smoking: pick(o.smoking, ['no', 'occasionally', 'yes'] as const),
    socialLevel: pick(o.socialLevel, ['quiet', 'balanced', 'social'] as const),
    languages: Array.isArray(o.languages)
      ? (o.languages as unknown[]).slice(0, 6).map((l) => String(l).slice(0, 30))
      : undefined,
  };
}

export function compatibility(a: Lifestyle, b: Lifestyle): { score: number; shared: string[]; differences: string[] } {
  let points = 0;
  let weight = 0;
  const shared: string[] = [];
  const differences: string[] = [];
  const cmp = (label: string, w: number, same: boolean | null, partial = false) => {
    if (same === null) return;
    weight += w;
    if (same) {
      points += w;
      shared.push(label);
    } else if (partial) points += w / 2;
    else differences.push(label);
  };
  cmp(
    'Sleep schedule',
    3,
    a.sleepSchedule && b.sleepSchedule
      ? a.sleepSchedule === b.sleepSchedule || a.sleepSchedule === 'flexible' || b.sleepSchedule === 'flexible'
      : null
  );
  cmp(
    'Food habits',
    2,
    a.foodHabit && b.foodHabit ? a.foodHabit === b.foodHabit : null,
    a.foodHabit !== 'veg' && b.foodHabit !== 'veg'
  );
  cmp('Work hours', 2, a.workHours && b.workHours ? a.workHours === b.workHours : null);
  cmp(
    'Cleanliness',
    3,
    a.cleanliness && b.cleanliness ? Math.abs(a.cleanliness - b.cleanliness) <= 1 : null,
    !!(a.cleanliness && b.cleanliness && Math.abs(a.cleanliness - b.cleanliness) === 2)
  );
  cmp(
    'Smoking',
    3,
    a.smoking && b.smoking ? a.smoking === b.smoking : null,
    a.smoking !== 'yes' && b.smoking !== 'yes'
  );
  cmp(
    'Social style',
    2,
    a.socialLevel && b.socialLevel
      ? a.socialLevel === b.socialLevel || a.socialLevel === 'balanced' || b.socialLevel === 'balanced'
      : null
  );
  const langs = (a.languages || []).filter((l) =>
    (b.languages || []).map((x) => x.toLowerCase()).includes(l.toLowerCase())
  );
  cmp('Languages', 1, a.languages?.length && b.languages?.length ? langs.length > 0 : null);
  return { score: weight ? Math.round((points / weight) * 100) : 50, shared, differences };
}

export function roommatesForProperty(viewer: AuthUser, propertyId: string) {
  const prop = properties.get(propertyId);
  if (!prop || prop.status !== 'published') throw notFound('Property');
  const me = users.findById(viewer.id);
  const mine = me?.data.lifestyle ? sanitizeLifestyle(me.data.lifestyle) : { optIn: false };
  const residents = customers
    .list({ property_id: propertyId }, { limit: 500 })
    .filter(
      (c) => c.tenantId && (c.tenantStatus === 'Active' || c.tenantStatus === 'Upcoming') && c.tenantId !== viewer.id
    );
  const rows = residents
    .map((c) => {
      const u = users.findById(c.tenantId!);
      const ls = u?.data.lifestyle ? sanitizeLifestyle(u.data.lifestyle) : null;
      if (!ls || !ls.optIn) return null;
      const match = compatibility(mine, ls);
      return {
        firstName: u!.fullName.split(' ')[0],
        roomName: c.roomName,
        roomType: c.roomType,
        since: c.moveInDate,
        lifestyle: {
          sleepSchedule: ls.sleepSchedule,
          foodHabit: ls.foodHabit,
          workHours: ls.workHours,
          socialLevel: ls.socialLevel,
          smoking: ls.smoking,
        },
        ...match,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);
  return {
    optedIn: mine.optIn,
    complete: !!(mine.sleepSchedule && mine.foodHabit && mine.cleanliness),
    roommates: rows,
    propertyName: prop.name,
  };
}

// ---------------------------------------------------------------------------------------------
// NPS / satisfaction surveys
// ---------------------------------------------------------------------------------------------

export function submitSurvey(actor: AuthUser, body: Record<string, unknown>, ctx: EventContext): SurveyRecord {
  const customer = customers
    .list({ tenant_id: actor.id }, { limit: 50 })
    .find((c) => c.tenantStatus === 'Active' || c.tenantStatus === 'Vacating' || c.tenantStatus === 'Inactive');
  if (!customer) throw badRequest('Surveys are for residents with a stay on NestIn.');
  const score = v.num(body.score, 'Score', { min: 0, max: 10, integer: true });
  const monthKey = nowIso().slice(0, 7);
  const dup = surveys
    .list({ user_id: actor.id, property_id: customer.propertyId })
    .find((s) => s.createdAt.startsWith(monthKey));
  if (dup) throw conflict('You have already rated this property this month');
  const record: SurveyRecord = {
    id: newId('nps'),
    userId: actor.id,
    ownerId: customer.ownerId,
    propertyId: customer.propertyId,
    propertyName: customer.propertyName,
    score,
    comment: v.optionalStr(body.comment, 'Comment', 1000) || '',
    createdAt: nowIso(),
  };
  surveys.insert(record);
  if (score <= 6) {
    notifyUser(customer.ownerId, {
      title: `Unhappy resident at ${customer.propertyName}`,
      message: `${customer.fullName.split(' ')[0]} rated their stay ${score}/10${record.comment ? `: "${record.comment.slice(0, 120)}"` : ''}. Reach out before they leave.`,
      type: 'customer',
      linkTo: '/owner/customers',
    });
  }
  events.publish(
    'SurveySubmitted',
    'Survey',
    record.id,
    { score },
    { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId: customer.ownerId }
  );
  return record;
}

export function surveyDue(tenantId: string): { due: boolean; propertyName?: string } {
  const c = customers.list({ tenant_id: tenantId }, { limit: 50 }).find((x) => x.tenantStatus === 'Active');
  if (!c) return { due: false };
  if (Date.now() - Date.parse(c.moveInDate) < 21 * 86_400_000) return { due: false };
  const last = surveys.list({ user_id: tenantId, property_id: c.propertyId }, { limit: 1 })[0];
  if (last && Date.now() - Date.parse(last.createdAt) < 60 * 86_400_000) return { due: false };
  return { due: true, propertyName: c.propertyName };
}

export function npsFor(rows: SurveyRecord[]) {
  const n = rows.length;
  const promoters = rows.filter((s) => s.score >= 9).length;
  const detractors = rows.filter((s) => s.score <= 6).length;
  return {
    responses: n,
    nps: n ? Math.round(((promoters - detractors) / n) * 100) : null,
    average: n ? Math.round((rows.reduce((a, s) => a + s.score, 0) / n) * 10) / 10 : null,
    promoters,
    passives: n - promoters - detractors,
    detractors,
  };
}

export function ownerNps(ownerId: string) {
  const rows = surveys.list({ owner_id: ownerId }, { limit: 10000 });
  const byProperty = new Map<string, SurveyRecord[]>();
  for (const s of rows) byProperty.set(s.propertyId, [...(byProperty.get(s.propertyId) || []), s]);
  return {
    overall: npsFor(rows),
    byProperty: [...byProperty.entries()].map(([propertyId, list]) => ({
      propertyId,
      propertyName: list[0].propertyName,
      ...npsFor(list),
    })),
    recent: rows
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 20)
      .map((s) => ({ id: s.id, propertyName: s.propertyName, score: s.score, comment: s.comment, at: s.createdAt })),
  };
}

/** Public satisfaction figure for a listing (only once there are enough responses to be meaningful). */
export function publicSatisfaction(propertyId: string): { responses: number; wouldRecommend: number } | null {
  const rows = surveys.list({ property_id: propertyId }, { limit: 10000 });
  if (rows.length < 3) return null;
  return {
    responses: rows.length,
    wouldRecommend: Math.round((rows.filter((s) => s.score >= 7).length / rows.length) * 100),
  };
}

// ---------------------------------------------------------------------------------------------
// Maintenance requests (structured support tickets)
// ---------------------------------------------------------------------------------------------

export const MAINTENANCE_CATEGORIES: Record<string, { label: string; slaHours: number }> = {
  Plumbing: { label: 'Plumbing / water', slaHours: 24 },
  Electrical: { label: 'Electrical / power', slaHours: 12 },
  'Wi-Fi': { label: 'Wi-Fi / internet', slaHours: 24 },
  Housekeeping: { label: 'Housekeeping', slaHours: 48 },
  Furniture: { label: 'Furniture / fittings', slaHours: 72 },
  Appliance: { label: 'Appliance (geyser, AC, fridge)', slaHours: 48 },
  Pest: { label: 'Pest control', slaHours: 72 },
  Security: { label: 'Safety / security', slaHours: 6 },
  Food: { label: 'Food / mess', slaHours: 24 },
  Other: { label: 'Something else', slaHours: 72 },
};

export function maintenanceSlaSummary(ownerId: string) {
  const rows = supportTickets.list({ owner_id: ownerId }, { limit: 10000 }).filter((t) => (t as any).slaDueAt);
  const open = rows.filter((t) => !/resolved/i.test(t.status));
  const breached = open.filter((t) => Date.parse((t as any).slaDueAt) < Date.now());
  const resolved = rows.filter((t) => /resolved/i.test(t.status));
  const withinSla = resolved.filter(
    (t) => t.updatedAt && Date.parse(t.updatedAt) <= Date.parse((t as any).slaDueAt)
  ).length;
  return {
    open: open.length,
    breached: breached.length,
    resolved: resolved.length,
    withinSlaPct: resolved.length ? Math.round((withinSla / resolved.length) * 100) : null,
  };
}

export const bookingsForTenantCount = (tenantId: string) => bookings.list({ tenant_id: tenantId }).length;
