import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess, sendError } from "../shared/types.js";
import { authenticateToken, requireRole, requirePermission } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface PaymentTransaction {
  id: string;
  bookingId?: string;
  ownerId: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  currency: string;
  type: "booking_deposit" | "monthly_rent" | "maintenance" | "subscription";
  status: "success" | "pending" | "failed" | "refunded";
  gateway: "razorpay" | "stripe" | "upi";
  gatewayPaymentId?: string;
  invoiceNumber: string;
  idempotencyKey?: string;
  createdAt: string;
}

// Payment Service Database
const paymentDatabase: Map<string, PaymentTransaction> = new Map([
  [
    "pay-001",
    {
      id: "pay-001",
      bookingId: "bkg-001",
      ownerId: "owner-001",
      tenantId: "tenant-001",
      tenantName: "Ananya Sharma",
      amount: 41000,
      currency: "INR",
      type: "booking_deposit",
      status: "success",
      gateway: "razorpay",
      gatewayPaymentId: "pay_rzp_mock_992144",
      invoiceNumber: "INV-2026-0089",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
]);

const processedIdempotencyKeys = new Set<string>();

// Asynchronous event trigger on booking confirmation
eventBus.subscribe("BookingConfirmed", (event) => {
  const booking = event.payload;
  const payId = `pay-${Date.now().toString(36)}`;
  const transaction: PaymentTransaction = {
    id: payId,
    bookingId: booking.id,
    ownerId: booking.ownerId,
    tenantId: booking.tenantId,
    tenantName: booking.tenantName,
    amount: (booking.monthlyRent || 0) + (booking.depositAmount || 0),
    currency: "INR",
    type: "booking_deposit",
    status: "success",
    gateway: "razorpay",
    gatewayPaymentId: `pay_rzp_${Date.now().toString(36)}`,
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
  };

  paymentDatabase.set(payId, transaction);
  eventBus.publish("PaymentSuccessful", payId, "Payment", transaction, event.correlationId);
});

export const paymentRouter: Router = Router();

// Health
paymentRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "payment-service", totalTransactions: paymentDatabase.size }, "payment-service");
});

// Tenant: Get My Invoices & Payments
paymentRouter.get("/my-payments", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.id;
  const payments = Array.from(paymentDatabase.values()).filter((p) => p.tenantId === tenantId);
  return sendSuccess(res, payments, "payment-service");
});

// Owner: Get All Property Payments
paymentRouter.get("/owner/all", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("view_payments"), (req: AuthenticatedRequest, res: Response) => {
  const targetOwnerId = req.user?.ownerId || req.user?.id;
  const payments = Array.from(paymentDatabase.values()).filter((p) => p.ownerId === targetOwnerId);
  return sendSuccess(res, payments, "payment-service");
});

// Create Payment Order / Checkout
paymentRouter.post("/checkout", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { amount, currency = "INR", type = "monthly_rent", bookingId, ownerId = "owner-001", idempotencyKey } = req.body;
  if (!amount || amount <= 0) {
    return sendError(res, "VALIDATION_FAILED", "Valid positive amount is required", "payment-service", 400);
  }

  // Idempotency check
  if (idempotencyKey && processedIdempotencyKeys.has(idempotencyKey)) {
    return sendError(res, "DUPLICATE_REQUEST", "This payment has already been processed or is in-flight.", "payment-service", 409);
  }
  if (idempotencyKey) {
    processedIdempotencyKeys.add(idempotencyKey);
  }

  const payId = `pay-${Date.now().toString(36)}`;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const transaction: PaymentTransaction = {
    id: payId,
    bookingId,
    ownerId,
    tenantId: req.user!.id,
    tenantName: (req.user as any).fullName || "Resident",
    amount: Number(amount),
    currency,
    type,
    status: "success",
    gateway: "razorpay",
    gatewayPaymentId: `pay_rzp_${Date.now().toString(36)}`,
    invoiceNumber,
    idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  paymentDatabase.set(payId, transaction);
  eventBus.publish("PaymentSuccessful", payId, "Payment", transaction, req.correlationId);

  return sendSuccess(res, transaction, "payment-service", 201);
});

// Webhook Ingestion (Async idempotent processing)
paymentRouter.post("/webhooks/razorpay", (req: AuthenticatedRequest, res: Response) => {
  const { event, payload } = req.body;
  const eventId = req.headers["x-razorpay-event-id"] as string;

  if (eventId && processedIdempotencyKeys.has(eventId)) {
    return sendSuccess(res, { status: "already_processed" }, "payment-service");
  }
  if (eventId) {
    processedIdempotencyKeys.add(eventId);
  }

  // Handle Event
  if (event === "payment.captured") {
    eventBus.publish("PaymentWebhookCaptured", payload?.payment?.entity?.id || "unknown", "PaymentWebhook", payload, req.correlationId);
  }

  return sendSuccess(res, { received: true, event }, "payment-service");
});
