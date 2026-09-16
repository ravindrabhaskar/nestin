import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess } from "../shared/types.js";
import { authenticateToken } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface NotificationRecord {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  channel: "in_app" | "whatsapp" | "email" | "sms";
  category: "booking" | "payment" | "visit" | "kyc" | "system";
  isRead: boolean;
  createdAt: string;
}

const notificationDatabase: Map<string, NotificationRecord[]> = new Map([
  [
    "owner-001",
    [
      {
        id: "notif-001",
        recipientId: "owner-001",
        title: "New Booking Confirmed 🎉",
        message: "Ananya Sharma has confirmed Room 202-A at Nestin Elegance. Deposit of ₹25,000 received.",
        channel: "in_app",
        category: "booking",
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ],
  ],
  [
    "tenant-001",
    [
      {
        id: "notif-002",
        recipientId: "tenant-001",
        title: "Welcome to Nestin! 🏠",
        message: "Your booking at Nestin Elegance is confirmed. Move-in date is 1st Sept 2026.",
        channel: "in_app",
        category: "booking",
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  ],
]);

function pushNotification(recipientId: string, notif: Omit<NotificationRecord, "id" | "isRead" | "createdAt" | "recipientId">) {
  const list = notificationDatabase.get(recipientId) || [];
  const record: NotificationRecord = {
    ...notif,
    id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    recipientId,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  list.unshift(record);
  notificationDatabase.set(recipientId, list);
}

// Asynchronous Event Consumers
eventBus.subscribe("BookingConfirmed", (event) => {
  const bkg = event.payload;
  // Notify Owner
  pushNotification(bkg.ownerId, {
    title: "New Bed Booking Received",
    message: `${bkg.tenantName} booked ${bkg.roomNumber}-${bkg.bedNumber} at ${bkg.propertyName}.`,
    channel: "in_app",
    category: "booking",
  });
  // Notify Tenant
  pushNotification(bkg.tenantId, {
    title: "Booking Confirmed Successfully",
    message: `Your bed reservation at ${bkg.propertyName} is active. Rent: ₹${bkg.monthlyRent}/mo.`,
    channel: "in_app",
    category: "booking",
  });
});

eventBus.subscribe("PaymentSuccessful", (event) => {
  const pay = event.payload;
  pushNotification(pay.tenantId, {
    title: "Payment Receipt Generated",
    message: `Payment of ₹${pay.amount.toLocaleString("en-IN")} processed. Invoice #${pay.invoiceNumber}`,
    channel: "in_app",
    category: "payment",
  });
});

eventBus.subscribe("VisitScheduled", (event) => {
  const vis = event.payload;
  pushNotification(vis.ownerId, {
    title: "New Property Visit Scheduled",
    message: `${vis.name} scheduled a visit for ${vis.propertyName} on ${vis.visitDate} at ${vis.visitTime}.`,
    channel: "in_app",
    category: "visit",
  });
});

export const notificationRouter: Router = Router();

// Health
notificationRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "notification-service" }, "notification-service");
});

// Get My Notifications
notificationRouter.get("/my-notifications", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const list = notificationDatabase.get(userId) || [];
  return sendSuccess(res, list, "notification-service");
});

// Mark Notification as Read
notificationRouter.put("/:id/read", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const list = notificationDatabase.get(userId) || [];
  const item = list.find((n) => n.id === req.params.id);
  if (item) {
    item.isRead = true;
  }
  return sendSuccess(res, { read: true, id: req.params.id }, "notification-service");
});
