import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess } from "../shared/types.js";
import { authenticateToken, requireRole } from "../shared/middleware.js";
import { eventBus, DomainEvent } from "../shared/eventBus.js";

export interface AuditLogRecord {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  correlationId: string;
  timestamp: string;
  details: any;
}

const auditLogs: AuditLogRecord[] = [
  {
    id: "audit-001",
    eventType: "SystemBootstrapped",
    aggregateId: "sys-01",
    aggregateType: "System",
    actorId: "system",
    actorRole: "system",
    correlationId: "req-bootstrap-001",
    timestamp: new Date().toISOString(),
    details: { message: "Microservices Suite initialized" },
  },
];

// Subscribe to ALL domain events asynchronously
eventBus.subscribe("*", (event: DomainEvent) => {
  const record: AuditLogRecord = {
    id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    eventType: event.type,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    actorId: event.payload?.ownerId || event.payload?.userId || event.payload?.tenantId || "authenticated-user",
    actorRole: event.payload?.role || "user",
    correlationId: event.correlationId,
    timestamp: event.timestamp,
    details: event.payload,
  };

  auditLogs.unshift(record);
  if (auditLogs.length > 5000) {
    auditLogs.pop();
  }
});

export const auditRouter: Router = Router();

// Health
auditRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "audit-service", totalLoggedEvents: auditLogs.length }, "audit-service");
});

// Get Audit Logs (Owner/Admin only)
auditRouter.get("/logs", authenticateToken, requireRole("owner", "admin"), (req: AuthenticatedRequest, res: Response) => {
  const { limit = 50, eventType } = req.query;
  let results = [...auditLogs];

  if (eventType) {
    results = results.filter((log) => log.eventType.toLowerCase().includes(String(eventType).toLowerCase()));
  }

  return sendSuccess(res, results.slice(0, Number(limit)), "audit-service", 200, {
    page: 1,
    limit: Number(limit),
    total: results.length,
    totalPages: 1,
  });
});
