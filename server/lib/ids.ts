import crypto from "node:crypto";

/** Short, URL-safe, collision-resistant identifier with a readable prefix, e.g. `lead-k3f9x2ab7c`. */
export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "x").toLowerCase()}`;
}

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,79}$/;

/** Accepts client-supplied ids (used for optimistic UI) only if they are simple and short. */
export function isSafeId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function bookingNumber(): string {
  return `NST-${100000 + crypto.randomInt(900000)}`;
}

export function invoiceNumber(prefix = "INV"): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${1000 + crypto.randomInt(9000)}`;
}
