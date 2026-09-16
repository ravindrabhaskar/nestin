import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest, sendError } from "../shared/types.js";

export interface ServiceRouteConfig {
  name: string;
  path: string;
  envUrl?: string;
  description: string;
}

/**
 * Creates an HTTP proxy or direct forwarder to a downstream microservice.
 * If the microservice has a distinct network URL defined in environment variables
 * (e.g., AUTH_SERVICE_URL=http://auth-service:3001), it forwards via HTTP fetch,
 * preserving all headers, correlation IDs, and authentication tokens.
 * Otherwise, it falls back to the in-process service router.
 */
export function createProxyOrDirectForwarder(
  targetRouter: any,
  envVarName?: string
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const remoteUrl = envVarName ? process.env[envVarName] : undefined;

    // If a remote microservice endpoint is specified (e.g. in multi-container Kubernetes/Docker Compose)
    if (remoteUrl && !remoteUrl.includes("localhost") && !remoteUrl.includes("127.0.0.1")) {
      try {
        const targetPath = req.url;
        const forwardUrl = `${remoteUrl.replace(/\/$/, "")}${targetPath}`;

        const headers: Record<string, string> = {
          "Content-Type": req.header("Content-Type") || "application/json",
          "X-Correlation-Id": req.correlationId || `req-${Date.now()}`,
        };

        if (req.header("Authorization")) {
          headers["Authorization"] = req.header("Authorization")!;
        }
        if (req.user) {
          headers["X-User-Id"] = req.user.id;
          headers["X-User-Role"] = req.user.role;
          headers["X-User-Email"] = req.user.email;
          headers["X-User-Permissions"] = (req.user.permissions || []).join(",");
          if (req.user.ownerId) {
            headers["X-Owner-Id"] = req.user.ownerId;
          }
        }

        const fetchOptions: RequestInit = {
          method: req.method,
          headers,
        };

        if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
          fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(forwardUrl, fetchOptions);
        const data = await response.json().catch(() => null);

        // Copy downstream response headers
        response.headers.forEach((val, key) => {
          if (!key.toLowerCase().startsWith("content-encoding")) {
            res.setHeader(key, val);
          }
        });

        return res.status(response.status).send(data);
      } catch (err: any) {
        console.error(`[API Gateway] Remote proxy forward failure to ${remoteUrl}:`, err.message);
        return sendError(
          res,
          "DOWNSTREAM_SERVICE_UNAVAILABLE",
          `Unable to reach downstream microservice at ${remoteUrl}`,
          "api-gateway",
          503
        );
      }
    }

    // Direct in-process router invocation
    return targetRouter(req, res, next);
  };
}
