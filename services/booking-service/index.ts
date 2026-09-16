import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess, sendError } from "../shared/types.js";
import { authenticateToken, requireRole, requirePermission } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface BookingRecord {
  id: string;
  propertyId: string;
  propertyName: string;
  roomId: string;
  roomNumber: string;
  bedId: string;
  bedNumber: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  ownerId: string;
  moveInDate: string;
  sharingType: string;
  monthlyRent: number;
  depositAmount: number;
  paymentStatus: "paid" | "pending" | "failed";
  status: "confirmed" | "pending" | "active" | "cancelled" | "checked_out";
  createdAt: string;
  updatedAt: string;
}

// Booking Service Database
const bookingDatabase: Map<string, BookingRecord> = new Map([
  [
    "bkg-001",
    {
      id: "bkg-001",
      propertyId: "nestin-elegance-koramangala",
      propertyName: "Nestin Elegance Premium Suites",
      roomId: "room-202",
      roomNumber: "202",
      bedId: "bed-202-A",
      bedNumber: "A",
      tenantId: "tenant-001",
      tenantName: "Ananya Sharma",
      tenantEmail: "tenant@nestin.com",
      tenantPhone: "+91 9845012345",
      ownerId: "owner-001",
      moveInDate: "2026-09-01",
      sharingType: "double",
      monthlyRent: 16000,
      depositAmount: 25000,
      paymentStatus: "paid",
      status: "confirmed",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
]);

// Concurrency mutex lock for Bed Allocations
const bedLocks = new Set<string>();

export const bookingRouter: Router = Router();

// Health
bookingRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "booking-service", totalBookings: bookingDatabase.size }, "booking-service");
});

// Tenant: Get My Bookings
bookingRouter.get("/my-bookings", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.id;
  const bookings = Array.from(bookingDatabase.values()).filter((b) => b.tenantId === tenantId);
  return sendSuccess(res, bookings, "booking-service");
});

// Owner: Get All Bookings for Owner
bookingRouter.get("/owner/all", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("view_bookings"), (req: AuthenticatedRequest, res: Response) => {
  const targetOwnerId = req.user?.ownerId || req.user?.id;
  const bookings = Array.from(bookingDatabase.values()).filter((b) => b.ownerId === targetOwnerId);
  return sendSuccess(res, bookings, "booking-service");
});

// Create / Reserve Booking (Transactional concurrency check)
bookingRouter.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const {
    propertyId,
    propertyName,
    roomId,
    roomNumber = "101",
    bedId,
    bedNumber = "A",
    moveInDate,
    sharingType = "double",
    monthlyRent,
    depositAmount,
    ownerId = "owner-001",
    tenantName,
    tenantPhone,
  } = req.body;

  if (!propertyId || !moveInDate || !monthlyRent) {
    return sendError(res, "VALIDATION_FAILED", "Property ID, Move-in Date, and Rent amount are required", "booking-service", 400);
  }

  const effectiveBedId = bedId || `bed-${roomId || "default"}-${bedNumber}`;

  // Transactional Bed Lock Check
  if (bedLocks.has(effectiveBedId)) {
    return sendError(res, "BED_LOCKED", "This bed is currently being booked by another resident. Please select another bed.", "booking-service", 409);
  }

  // Check if bed already actively confirmed
  for (const bkg of bookingDatabase.values()) {
    if (bkg.bedId === effectiveBedId && (bkg.status === "confirmed" || bkg.status === "active")) {
      return sendError(res, "BED_OCCUPIED", "Selected bed is already reserved or occupied.", "booking-service", 409);
    }
  }

  // Acquire Lock
  bedLocks.add(effectiveBedId);

  try {
    const bookingId = `bkg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newBooking: BookingRecord = {
      id: bookingId,
      propertyId,
      propertyName: propertyName || "Nestin Property",
      roomId: roomId || "room-default",
      roomNumber,
      bedId: effectiveBedId,
      bedNumber,
      tenantId: req.user!.id,
      tenantName: tenantName || (req.user as any).fullName || "Valued Resident",
      tenantEmail: req.user!.email,
      tenantPhone: tenantPhone || "+91 9876543210",
      ownerId,
      moveInDate,
      sharingType,
      monthlyRent: Number(monthlyRent),
      depositAmount: Number(depositAmount || monthlyRent * 2),
      paymentStatus: "paid",
      status: "confirmed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    bookingDatabase.set(bookingId, newBooking);

    // Publish Asynchronous Events for Inventory, Payment, CRM, Notification, and Audit
    eventBus.publish("BedAllocated", effectiveBedId, "Bed", {
      propertyId,
      roomId: newBooking.roomId,
      bedId: effectiveBedId,
      tenantId: newBooking.tenantId,
      bookingId,
    }, req.correlationId);

    eventBus.publish("BookingCreated", bookingId, "Booking", newBooking, req.correlationId);
    eventBus.publish("BookingConfirmed", bookingId, "Booking", newBooking, req.correlationId);

    return sendSuccess(res, newBooking, "booking-service", 201);
  } finally {
    // Release Lock
    setTimeout(() => {
      bedLocks.delete(effectiveBedId);
    }, 1500);
  }
});

// Cancel Booking
bookingRouter.post("/:id/cancel", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const booking = bookingDatabase.get(req.params.id);
  if (!booking) {
    return sendError(res, "NOT_FOUND", "Booking not found", "booking-service", 404);
  }

  // Security check: tenant owns booking or owner owns property
  const isTenantOwner = booking.tenantId === req.user!.id;
  const isPropertyOwner = booking.ownerId === (req.user?.ownerId || req.user?.id);

  if (!isTenantOwner && !isPropertyOwner && req.user?.role !== "admin") {
    return sendError(res, "FORBIDDEN", "Unauthorized to cancel this booking", "booking-service", 403);
  }

  booking.status = "cancelled";
  booking.updatedAt = new Date().toISOString();

  // Release bed
  eventBus.publish("BedReleased", booking.bedId, "Bed", {
    propertyId: booking.propertyId,
    roomId: booking.roomId,
    bedId: booking.bedId,
    bookingId: booking.id,
  }, req.correlationId);

  eventBus.publish("BookingCancelled", booking.id, "Booking", booking, req.correlationId);

  return sendSuccess(res, booking, "booking-service");
});
