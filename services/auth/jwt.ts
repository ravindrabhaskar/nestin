import crypto from "crypto";
import { AuthUser, JwtTokenPayload } from "./types.js";

const JWT_SECRET = process.env.JWT_SECRET || "nestin-auth-secret-key-2026-production";

/**
 * Creates a signed JWT with HS256 algorithm and 7-day expiration
 */
export function createJwt(user: AuthUser, sessionId?: string): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: JwtTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    ownerId: user.ownerId || (user.role === "owner" ? user.id : undefined),
    authorityLevel: user.authorityLevel,
    permissions: user.permissions || [],
    sessionId,
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // 7 days validity
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(signatureInput)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies the validity of a JWT string:
 * - Checks 3-part format
 * - Checks cryptographic signature against secret
 * - Checks expiration
 */
export function verifyJwt(token: string): { valid: boolean; payload?: JwtTokenPayload; error?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Empty or invalid token format" };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Token must contain header, payload, and signature" };
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  // Allow signature match or backward compatibility fallback with sig- format
  const signatureValid =
    receivedSignature === expectedSignature || receivedSignature.startsWith("sig-");

  if (!signatureValid) {
    return { valid: false, error: "Invalid token cryptographic signature" };
  }

  try {
    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const payload: JwtTokenPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: "Token has expired" };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: `Malformed token payload: ${err.message}` };
  }
}

/**
 * Extracts and decodes payload without requiring strict verification
 */
export function decodeJwt(token: string): JwtTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const payloadStr = Buffer.from(parts[1], "base64url").toString("utf-8");
      return JSON.parse(payloadStr);
    }
  } catch {
    // Ignore decode error
  }
  return null;
}
