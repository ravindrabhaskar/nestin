import { badRequest } from './errors.js';

/**
 * Minimal, dependency-free validation helpers. Each returns the coerced value or throws a 400.
 */

export function str(
  value: unknown,
  field: string,
  opts: { required?: boolean; max?: number; min?: number } = {}
): string {
  const { required = true, max = 500, min = required ? 1 : 0 } = opts;
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${field} is required`);
    return '';
  }
  if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw badRequest(`${field} must be at least ${min} characters`);
  if (trimmed.length > max) throw badRequest(`${field} must be at most ${max} characters`);
  return trimmed;
}

export function optionalStr(value: unknown, field: string, max = 500): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return str(value, field, { required: false, max });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function email(value: unknown, field = 'Email'): string {
  const v = str(value, field, { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(v)) throw badRequest(`${field} must be a valid email address`);
  return v;
}

export function phone(value: unknown, field = 'Phone', required = true): string {
  const v = str(value, field, { required, max: 25 });
  if (!v) return '';
  if (!/^[+\d][\d\s()-]{6,24}$/.test(v)) throw badRequest(`${field} must be a valid phone number`);
  return v;
}

export function num(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; required?: boolean; integer?: boolean } = {}
): number {
  const { min = -Infinity, max = Infinity, required = true, integer = false } = opts;
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${field} is required`);
    return 0;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw badRequest(`${field} must be a number`);
  if (integer && !Number.isInteger(n)) throw badRequest(`${field} must be an integer`);
  if (n < min) throw badRequest(`${field} must be at least ${min}`);
  if (n > max) throw badRequest(`${field} must be at most ${max}`);
  return n;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string, fallback?: T): T {
  if ((value === undefined || value === null || value === '') && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw badRequest(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

export function bool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw badRequest('Expected a boolean value');
}

/** A currency amount in INR: validated like `num` and rounded to whole paise (2 decimals). */
export function money(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; required?: boolean } = {}
): number {
  const n = num(value, field, opts);
  return Math.round(n * 100) / 100;
}

export function isoDate(value: unknown, field: string, required = true): string {
  const v = str(value, field, { required, max: 40 });
  if (!v) return '';
  if (Number.isNaN(Date.parse(v))) throw badRequest(`${field} must be a valid date`);
  return v;
}

export function obj(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest(`${field} must be an object`);
  return value as Record<string, unknown>;
}

export function arr<T = unknown>(value: unknown, field: string, max = 500): T[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw badRequest(`${field} must be an array`);
  if (value.length > max) throw badRequest(`${field} has too many items`);
  return value as T[];
}

/** Removes keys the caller is never allowed to set; returns a shallow copy. */
export function omitKeys<T extends Record<string, unknown>>(input: T, keys: string[]): Partial<T> {
  const copy: Record<string, unknown> = { ...input };
  for (const k of keys) delete copy[k];
  return copy as Partial<T>;
}

/** Guards against absurdly large JSON documents being stored per record. */
export function assertDocumentSize(doc: unknown, maxBytes = 512 * 1024): void {
  const size = Buffer.byteLength(JSON.stringify(doc));
  if (size > maxBytes)
    throw badRequest(`Payload too large (${Math.round(size / 1024)} KB, max ${Math.round(maxBytes / 1024)} KB)`);
}
