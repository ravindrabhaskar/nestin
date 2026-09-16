import crypto from "node:crypto";
import { config } from "../config.js";

export type AppRole = "super_admin" | "owner" | "employee" | "tenant";

export interface JwtPayload {
  sub: string;
  email: string;
  role: AppRole;
  /** Owner account this user acts on behalf of (self for owners, employer for employees). */
  ownerId?: string;
  sid: string;
  iat: number;
  exp: number;
}

function sign(input: string): string {
  return crypto.createHmac("sha256", config.jwtSecret).update(input).digest("base64url");
}

export function createJwt(payload: Omit<JwtPayload, "iat" | "exp">, ttlSeconds = config.jwtTtlSeconds): string {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

export type JwtVerification = { valid: true; payload: JwtPayload } | { valid: false; error: string };

/** Strict verification: HS256 signature via timing-safe comparison, expiry, and required claims. */
export function verifyJwt(token: unknown): JwtVerification {
  if (typeof token !== "string" || token.length > 4096) return { valid: false, error: "Invalid token" };
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, error: "Malformed token" };
  const [header, body, signature] = parts;

  let headerJson: { alg?: string };
  try {
    headerJson = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
  } catch {
    return { valid: false, error: "Malformed token header" };
  }
  if (headerJson.alg !== "HS256") return { valid: false, error: "Unsupported token algorithm" };

  const expected = Buffer.from(sign(`${header}.${body}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return { valid: false, error: "Invalid token signature" };
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { valid: false, error: "Malformed token payload" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) return { valid: false, error: "Token has expired" };
  if (typeof payload.sub !== "string" || typeof payload.sid !== "string" || typeof payload.role !== "string") {
    return { valid: false, error: "Token is missing required claims" };
  }
  return { valid: true, payload };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
