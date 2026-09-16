import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess, sendError } from "../shared/types.js";
import { authenticateToken, requireRole } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface OwnerSubscription {
  ownerId: string;
  planId: "starter" | "growth" | "enterprise";
  planName: string;
  maxProperties: number;
  maxEmployees: number;
  monthlyFee: number;
  status: "active" | "past_due" | "cancelled";
  currentPeriodEnd: string;
  autoRenew: boolean;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    paidAt: string;
    pdfUrl: string;
  }>;
}

const subscriptionDatabase: Map<string, OwnerSubscription> = new Map([
  [
    "owner-001",
    {
      ownerId: "owner-001",
      planId: "growth",
      planName: "Growth Tier (Pro CRM + RBAC)",
      maxProperties: 10,
      maxEmployees: 15,
      monthlyFee: 4999,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86400000 * 28).toISOString(),
      autoRenew: true,
      invoices: [
        {
          id: "sub-inv-01",
          invoiceNumber: "SUB-2026-AUG-001",
          amount: 4999,
          paidAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          pdfUrl: "/invoices/SUB-2026-AUG-001.pdf",
        },
      ],
    },
  ],
]);

export const subscriptionRouter: Router = Router();

// Health
subscriptionRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "subscription-service" }, "subscription-service");
});

// Owner: Get Subscription Status
subscriptionRouter.get("/my-plan", authenticateToken, requireRole("owner", "admin"), (req: AuthenticatedRequest, res: Response) => {
  const ownerId = req.user?.ownerId || req.user!.id;
  let sub = subscriptionDatabase.get(ownerId);
  if (!sub) {
    sub = {
      ownerId,
      planId: "starter",
      planName: "Starter Tier",
      maxProperties: 2,
      maxEmployees: 3,
      monthlyFee: 0,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86400000 * 365).toISOString(),
      autoRenew: true,
      invoices: [],
    };
    subscriptionDatabase.set(ownerId, sub);
  }
  return sendSuccess(res, sub, "subscription-service");
});

// Upgrade / Change Plan
subscriptionRouter.post("/upgrade", authenticateToken, requireRole("owner", "admin"), (req: AuthenticatedRequest, res: Response) => {
  const ownerId = req.user?.ownerId || req.user!.id;
  const { planId = "growth" } = req.body;

  const planConfigs = {
    starter: { name: "Starter Tier", maxProperties: 2, maxEmployees: 3, fee: 0 },
    growth: { name: "Growth Tier (Pro CRM + RBAC)", maxProperties: 10, maxEmployees: 15, fee: 4999 },
    enterprise: { name: "Enterprise Unlimited", maxProperties: 100, maxEmployees: 200, fee: 14999 },
  };

  const config = planConfigs[planId as keyof typeof planConfigs] || planConfigs.growth;
  const sub = subscriptionDatabase.get(ownerId) || {
    ownerId,
    planId: "starter",
    planName: "Starter Tier",
    maxProperties: 2,
    maxEmployees: 3,
    monthlyFee: 0,
    status: "active",
    currentPeriodEnd: new Date().toISOString(),
    autoRenew: true,
    invoices: [],
  };

  sub.planId = planId as any;
  sub.planName = config.name;
  sub.maxProperties = config.maxProperties;
  sub.maxEmployees = config.maxEmployees;
  sub.monthlyFee = config.fee;
  sub.status = "active";
  sub.currentPeriodEnd = new Date(Date.now() + 86400000 * 30).toISOString();

  subscriptionDatabase.set(ownerId, sub);
  eventBus.publish("SubscriptionUpgraded", ownerId, "Subscription", sub, req.correlationId);

  return sendSuccess(res, sub, "subscription-service");
});
