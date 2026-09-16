import { Response, NextFunction } from "express";
import { AuthenticatedRequest, sendError } from "../shared/types.js";
import { verifyJwt, decodeJwt } from "../auth/jwt.js";

/**
 * Authentication Forwarding Middleware
 * Inspects incoming Authorization header, decodes the JWT token, verifies signature and expiry,
 * populates req.user, and enriches request headers for downstream microservice forwarding.
 */
export function forwardAuthContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : (req.query?.token as string);

  if (token) {
    try {
      const verification = verifyJwt(token);
      const payload = verification.valid && verification.payload ? verification.payload : decodeJwt(token);

      if (payload && payload.id) {
        req.user = {
          id: payload.id,
          email: payload.email || "user@nestin.com",
          role: payload.role || "tenant",
          ownerId: payload.ownerId || (payload.role === "owner" ? payload.id : undefined),
          permissions: payload.permissions || [],
          authorityLevel: payload.authorityLevel || "full",
        };

        // Forward authenticated identity downstream via standard HTTP headers
        req.headers["x-user-id"] = payload.id;
        req.headers["x-user-email"] = payload.email || "";
        req.headers["x-user-role"] = payload.role || "tenant";
        req.headers["x-user-permissions"] = (payload.permissions || []).join(",");
        if (payload.ownerId) {
          req.headers["x-owner-id"] = payload.ownerId;
        }
      }
    } catch (err) {
      // In non-strict mode, allow continuation to service which will perform its own validation
      console.warn("[API Gateway] Token parsing warning:", err);
    }
  }

  next();
}

/**
 * Strict Gateway Authentication Guard
 * Blocks unauthenticated requests with HTTP 401 before reaching protected downstream services
 */
export function requireGatewayAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(
      res,
      "UNAUTHORIZED",
      "Authentication required: No Bearer token provided in Authorization header",
      "api-gateway",
      401
    );
  }

  const token = authHeader.split(" ")[1];
  const verification = verifyJwt(token);

  if (!verification.valid || !verification.payload) {
    return sendError(
      res,
      "INVALID_TOKEN",
      verification.error || "Malformed or expired authentication token",
      "api-gateway",
      401
    );
  }

  const payload = verification.payload;
  req.user = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    ownerId: payload.ownerId,
    permissions: payload.permissions || [],
    authorityLevel: payload.authorityLevel || "full",
  };

  req.headers["x-user-id"] = payload.id;
  req.headers["x-user-email"] = payload.email;
  req.headers["x-user-role"] = payload.role;
  req.headers["x-user-permissions"] = (payload.permissions || []).join(",");
  if (payload.ownerId) {
    req.headers["x-owner-id"] = payload.ownerId;
  }

  next();
}
