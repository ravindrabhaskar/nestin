import crypto from 'node:crypto';
import { nextSequence } from '../db/database.js';

/** Short, URL-safe, collision-resistant identifier with a readable prefix, e.g. `lead-k3f9x2ab7c`. */
export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').toLowerCase()}`;
}

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,79}$/;

/** Accepts client-supplied ids (used for optimistic UI) only if they are simple and short. */
export function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Human-facing booking reference: sequential, so two bookings can never share a number. */
export function bookingNumber(): string {
  return `NST-${String(100000 + nextSequence('booking')).padStart(6, '0')}`;
}

/** Support ticket reference (own series so tickets and bookings never collide). */
export function ticketNumber(): string {
  return `TKT-${String(100000 + nextSequence('ticket')).padStart(6, '0')}`;
}

/**
 * Invoice serial: unique and consecutive within a prefix + financial year, as GST rules require
 * (e.g. `INV-2026-27-000042`). The Indian financial year runs April-March.
 */
export function invoiceNumber(prefix = 'INV', now = new Date()): string {
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
  const n = nextSequence(`invoice:${prefix}:${fy}`);
  return `${prefix}-${fy}-${String(n).padStart(6, '0')}`;
}
