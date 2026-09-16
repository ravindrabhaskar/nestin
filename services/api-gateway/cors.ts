import { Request, Response, NextFunction } from "express";
import { CorsConfig } from "./types.js";

const DEFAULT_CORS_CONFIG: Required<CorsConfig> = {
  allowedOrigins: "*",
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Correlation-Id",
    "X-Request-Id",
    "X-User-Id",
    "X-User-Role",
    "Idempotency-Key",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],
  exposedHeaders: [
    "X-Correlation-Id",
    "X-Response-Time",
    "Content-Disposition",
    "Content-Length",
  ],
  maxAge: 86400, // 24 hours preflight cache
  credentials: true,
};

/**
 * Robust CORS Middleware for the API Gateway
 * Handles preflight OPTIONS requests, allowed origins, headers, and methods
 */
export function corsMiddleware(config: CorsConfig = {}) {
  const mergedConfig = { ...DEFAULT_CORS_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Handle Origin
    if (mergedConfig.allowedOrigins === "*") {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (origin && mergedConfig.allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      if (mergedConfig.credentials) {
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    } else if (!origin) {
      // Direct same-origin or non-browser request
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    // Set Allowed Methods
    res.setHeader("Access-Control-Allow-Methods", mergedConfig.allowedMethods.join(", "));

    // Set Allowed Headers
    res.setHeader("Access-Control-Allow-Headers", mergedConfig.allowedHeaders.join(", "));

    // Set Exposed Headers so client-side JavaScript can inspect correlation and timings
    res.setHeader("Access-Control-Expose-Headers", mergedConfig.exposedHeaders.join(", "));

    // Cache preflight response
    res.setHeader("Access-Control-Max-Age", mergedConfig.maxAge.toString());

    // Immediately handle preflight OPTIONS
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    next();
  };
}
