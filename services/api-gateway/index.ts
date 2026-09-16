import express, { Router, Request, Response, NextFunction } from "express";
import { correlationMiddleware } from "../shared/middleware.js";
import { sendSuccess, sendError, AuthenticatedRequest } from "../shared/types.js";
import { corsMiddleware } from "./cors.js";
import { forwardAuthContext } from "./authForwarder.js";
import { createProxyOrDirectForwarder } from "./dispatcher.js";

// Microservice Sub-Routers
import { authRouter } from "../auth/index.js";
import { propertyRouter } from "../property-service/index.js";
import { inventoryRouter } from "../inventory-service/index.js";
import { bookingRouter } from "../booking-service/index.js";
import { crmRouter } from "../crm-service/index.js";
import { tenantRouter } from "../tenant-service/index.js";
import { paymentRouter } from "../payment-service/index.js";
import { subscriptionRouter } from "../subscription-service/index.js";
import { documentRouter } from "../document-service/index.js";
import { notificationRouter } from "../notification-service/index.js";
import { rbacRouter } from "../rbac-service/index.js";
import { auditRouter } from "../audit-service/index.js";

const startTime = Date.now();

export interface RouteRegistryItem {
  name: string;
  path: string;
  envVar: string;
  description: string;
  router: Router;
}

export const REGISTERED_SERVICES: RouteRegistryItem[] = [
  {
    name: "auth-service",
    path: "/auth",
    envVar: "AUTH_SERVICE_URL",
    description: "User Identity, JWT Authentication, Google OAuth & Session Management",
    router: authRouter,
  },
  {
    name: "property-service",
    path: "/properties",
    envVar: "PROPERTY_SERVICE_URL",
    description: "PG & Co-Living Property Listings, Amenities & City Catalogs",
    router: propertyRouter,
  },
  {
    name: "inventory-service",
    path: "/inventory",
    envVar: "INVENTORY_SERVICE_URL",
    description: "Room & Bed Allocation, Real-Time Occupancy & Pricing Models",
    router: inventoryRouter,
  },
  {
    name: "booking-service",
    path: "/bookings",
    envVar: "BOOKING_SERVICE_URL",
    description: "Bed Reservation Engine, Move-In Requests & Physical Visit Schedules",
    router: bookingRouter,
  },
  {
    name: "crm-service",
    path: "/crm",
    envVar: "CRM_SERVICE_URL",
    description: "Owner Lead Management, Follow-ups, Pipeline & In-Person Visitor Log",
    router: crmRouter,
  },
  {
    name: "tenant-service",
    path: "/tenants",
    envVar: "TENANT_SERVICE_URL",
    description: "Active Tenant Roster, Digital Lease Agreements & Room Assignments",
    router: tenantRouter,
  },
  {
    name: "payment-service",
    path: "/payments",
    envVar: "PAYMENT_SERVICE_URL",
    description: "Online Rent Collection, UPI/Gateway Invoicing, Deposits & Refund Ledgers",
    router: paymentRouter,
  },
  {
    name: "subscription-service",
    path: "/subscriptions",
    envVar: "SUBSCRIPTION_SERVICE_URL",
    description: "Owner SaaS Subscription Tiers, Billing Cycles & Plan Entitlements",
    router: subscriptionRouter,
  },
  {
    name: "document-service",
    path: "/documents",
    envVar: "DOCUMENT_SERVICE_URL",
    description: "KYC Verification, Aadhaar/Passport Uploads & Owner Document Vault",
    router: documentRouter,
  },
  {
    name: "notification-service",
    path: "/notifications",
    envVar: "NOTIFICATION_SERVICE_URL",
    description: "Multi-Channel Alerts (Web Push, Email, SMS & WhatsApp Delivery)",
    router: notificationRouter,
  },
  {
    name: "rbac-service",
    path: "/rbac",
    envVar: "RBAC_SERVICE_URL",
    description: "Granular Role-Based Access Control, Permissions & Staff Authority",
    router: rbacRouter,
  },
  {
    name: "audit-service",
    path: "/audit",
    envVar: "AUDIT_SERVICE_URL",
    description: "Compliance Logs, Financial Transaction History & Security Audit Trails",
    router: auditRouter,
  },
];

/**
 * Creates and configures the centralized API Gateway router.
 * Acts as the single entry point for all frontend requests, handles CORS,
 * injects correlation IDs, tracks response latency, verifies & forwards
 * authentication credentials, and routes requests to the appropriate downstream microservices.
 */
export function createApiGatewayRouter(): Router {
  const gateway = Router();

  // 1. CORS Handling: Allow cross-origin requests, custom headers, and handle OPTIONS preflight
  gateway.use(corsMiddleware());

  // 2. Correlation Tracking: Generate and propagate unique request correlation IDs
  gateway.use(correlationMiddleware);

  // 3. Request Latency Metrics Middleware
  gateway.use((req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();
    const originalSend = res.send;
    res.send = function (body?: any): Response {
      if (!res.headersSent) {
        const diff = process.hrtime(start);
        const latencyMs = ((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2);
        res.setHeader("X-Response-Time", `${latencyMs}ms`);
      }
      return originalSend.call(this, body);
    };
    next();
  });

  // 4. Authentication Context & Header Forwarding
  // Decodes Bearer tokens and enriches downstream requests with verified user identity headers
  gateway.use(forwardAuthContext);

  // 5. Centralized System Aggregated Health Check
  gateway.get(["/health", "/status"], (req: Request, res: Response) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    const serviceStatuses: Record<string, { status: string; description: string; route: string }> = {};
    for (const service of REGISTERED_SERVICES) {
      serviceStatuses[service.name] = {
        status: "UP",
        description: service.description,
        route: service.path,
      };
    }

    return sendSuccess(
      res,
      {
        gateway: "UP",
        architecture: "INDEPENDENT_MICROSERVICES_API_GATEWAY",
        version: "2.5.0",
        uptimeSeconds,
        timestamp: new Date().toISOString(),
        registeredServicesCount: REGISTERED_SERVICES.length,
        corsEnabled: true,
        authForwarding: "ACTIVE",
        services: serviceStatuses,
      },
      "api-gateway"
    );
  });

  // 6. Route Registry Discovery Endpoint
  gateway.get("/routes", (req: Request, res: Response) => {
    const routes = REGISTERED_SERVICES.map((s) => ({
      service: s.name,
      endpoint: s.path,
      description: s.description,
      envVar: s.envVar,
      isProxied: !!process.env[s.envVar],
    }));

    return sendSuccess(
      res,
      {
        gatewayVersion: "2.5.0",
        routes,
      },
      "api-gateway"
    );
  });

  // 7. Mount Downstream Microservice Routes (forwarding authenticated requests to appropriate services)
  for (const service of REGISTERED_SERVICES) {
    const forwarder = createProxyOrDirectForwarder(service.router, service.envVar);
    
    // Mount direct path (e.g. /auth/*, /properties/*)
    gateway.use(service.path, forwarder);

    // Also mount with /v1 prefix internally so requests to either /auth or /v1/auth work seamlessly
    gateway.use(`/v1${service.path}`, forwarder);
  }

  // 8. Gateway 404 Handler for Unrecognized Endpoints
  gateway.use((req: Request, res: Response) => {
    return sendError(
      res,
      "RESOURCE_NOT_FOUND",
      `API Gateway: No microservice registered for path '${req.originalUrl || req.url}'`,
      "api-gateway",
      404
    );
  });

  // 9. Centralized Error Handling Middleware
  gateway.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("[API Gateway Internal Error]:", err);
    return sendError(
      res,
      "INTERNAL_GATEWAY_ERROR",
      err.message || "An unexpected error occurred within the API Gateway",
      "api-gateway",
      500
    );
  });

  return gateway;
}

/**
 * Singleton instance of the API Gateway Router for use in Express apps
 */
export const apiGatewayRouter = createApiGatewayRouter();

/**
 * Creates a standalone Express application for the API Gateway
 * (used when running the gateway as an independent microservice container on port 3000 or specified PORT)
 */
export function createApiGatewayApp(): express.Express {
  const app = express();

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Mount gateway on /api, /api/v1, and root
  const router = createApiGatewayRouter();
  app.use("/api/v1", router);
  app.use("/api", router);
  app.use("/", router);

  return app;
}

// Standalone execution entrypoint when run via `node services/api-gateway/index.js`
if (process.env.RUN_STANDALONE_GATEWAY === "true") {
  const app = createApiGatewayApp();
  const PORT = process.env.GATEWAY_PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[Standalone API Gateway] listening on port ${PORT}`);
  });
}
