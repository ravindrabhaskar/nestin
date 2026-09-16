import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess, sendError } from "../shared/types.js";
import { authenticateToken, optionalAuth, requireRole, requirePermission } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface BedRecord {
  id: string;
  bedNumber: string;
  isAvailable: boolean;
  assignedTenantId?: string;
  assignedBookingId?: string;
}

export interface RoomRecord {
  id: string;
  propertyId: string;
  ownerId: string;
  roomNumber: string;
  sharingType: "single" | "double" | "triple" | "four";
  monthlyRent: number;
  depositAmount: number;
  amenities: string[];
  totalBeds: number;
  availableBeds: number;
  beds: BedRecord[];
}

// Dedicated Inventory Database
const inventoryDatabase: Map<string, RoomRecord[]> = new Map([
  [
    "nestin-orion-whitefield",
    [
      {
        id: "room-101",
        propertyId: "nestin-orion-whitefield",
        ownerId: "owner-001",
        roomNumber: "101",
        sharingType: "single",
        monthlyRent: 18000,
        depositAmount: 30000,
        amenities: ["Attached Balcony", "Air Conditioner", "Work Desk", "Smart TV"],
        totalBeds: 1,
        availableBeds: 1,
        beds: [{ id: "bed-101-A", bedNumber: "A", isAvailable: true }],
      },
      {
        id: "room-102",
        propertyId: "nestin-orion-whitefield",
        ownerId: "owner-001",
        roomNumber: "102",
        sharingType: "double",
        monthlyRent: 13500,
        depositAmount: 20000,
        amenities: ["Air Conditioner", "Work Desk", "Twin Wardrobes"],
        totalBeds: 2,
        availableBeds: 2,
        beds: [
          { id: "bed-102-A", bedNumber: "A", isAvailable: true },
          { id: "bed-102-B", bedNumber: "B", isAvailable: true },
        ],
      },
    ],
  ],
  [
    "nestin-elegance-koramangala",
    [
      {
        id: "room-201",
        propertyId: "nestin-elegance-koramangala",
        ownerId: "owner-001",
        roomNumber: "201",
        sharingType: "single",
        monthlyRent: 22000,
        depositAmount: 35000,
        amenities: ["Private Balcony", "Smart TV", "Mini Fridge", "Work Station"],
        totalBeds: 1,
        availableBeds: 1,
        beds: [{ id: "bed-201-A", bedNumber: "A", isAvailable: true }],
      },
      {
        id: "room-202",
        propertyId: "nestin-elegance-koramangala",
        ownerId: "owner-001",
        roomNumber: "202",
        sharingType: "double",
        monthlyRent: 16000,
        depositAmount: 25000,
        amenities: ["Air Conditioner", "Attached Washroom", "Study Desks"],
        totalBeds: 2,
        availableBeds: 1,
        beds: [
          { id: "bed-202-A", bedNumber: "A", isAvailable: false, assignedTenantId: "tenant-001" },
          { id: "bed-202-B", bedNumber: "B", isAvailable: true },
        ],
      },
    ],
  ],
]);

// Event Listener for Bed Allocation & Release
eventBus.subscribe("BedAllocated", (event) => {
  const { propertyId, roomId, bedId, tenantId, bookingId } = event.payload;
  const rooms = inventoryDatabase.get(propertyId);
  if (rooms) {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      const bed = room.beds.find((b) => b.id === bedId);
      if (bed) {
        bed.isAvailable = false;
        bed.assignedTenantId = tenantId;
        bed.assignedBookingId = bookingId;
        room.availableBeds = room.beds.filter((b) => b.isAvailable).length;
      }
    }
  }
});

eventBus.subscribe("BedReleased", (event) => {
  const { propertyId, roomId, bedId } = event.payload;
  const rooms = inventoryDatabase.get(propertyId);
  if (rooms) {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      const bed = room.beds.find((b) => b.id === bedId);
      if (bed) {
        bed.isAvailable = true;
        bed.assignedTenantId = undefined;
        bed.assignedBookingId = undefined;
        room.availableBeds = room.beds.filter((b) => b.isAvailable).length;
      }
    }
  }
});

export const inventoryRouter: Router = Router();

// Health
inventoryRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "inventory-service" }, "inventory-service");
});

// Get Rooms for a Property
inventoryRouter.get("/property/:propertyId/rooms", optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { propertyId } = req.params;
  const rooms = inventoryDatabase.get(propertyId) || [];
  return sendSuccess(res, rooms, "inventory-service");
});

// Check Bed Availability
inventoryRouter.get("/property/:propertyId/check-availability", optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { propertyId } = req.params;
  const rooms = inventoryDatabase.get(propertyId) || [];
  const totalAvailable = rooms.reduce((acc, r) => acc + r.availableBeds, 0);
  const totalBeds = rooms.reduce((acc, r) => acc + r.totalBeds, 0);

  return sendSuccess(
    res,
    {
      propertyId,
      totalBeds,
      availableBeds: totalAvailable,
      occupancyRate: totalBeds > 0 ? Math.round(((totalBeds - totalAvailable) / totalBeds) * 100) : 0,
      roomsSummary: rooms.map((r) => ({
        roomId: r.id,
        roomNumber: r.roomNumber,
        sharingType: r.sharingType,
        availableBeds: r.availableBeds,
        monthlyRent: r.monthlyRent,
      })),
    },
    "inventory-service"
  );
});

// Add Room to Property (Owner only)
inventoryRouter.post("/property/:propertyId/rooms", authenticateToken, requireRole("owner", "admin"), requirePermission("manage_inventory"), (req: AuthenticatedRequest, res: Response) => {
  const { propertyId } = req.params;
  const { roomNumber, sharingType = "double", monthlyRent = 12000, amenities = [] } = req.body;

  if (!roomNumber) {
    return sendError(res, "VALIDATION_FAILED", "Room number is required", "inventory-service", 400);
  }

  const capacityMap = { single: 1, double: 2, triple: 3, four: 4 };
  const totalBeds = capacityMap[sharingType as keyof typeof capacityMap] || 2;
  const roomId = `room-${Date.now().toString(36)}`;

  const beds: BedRecord[] = Array.from({ length: totalBeds }, (_, i) => ({
    id: `bed-${roomId}-${String.fromCharCode(65 + i)}`,
    bedNumber: String.fromCharCode(65 + i),
    isAvailable: true,
  }));

  const newRoom: RoomRecord = {
    id: roomId,
    propertyId,
    ownerId: req.user?.ownerId || req.user!.id,
    roomNumber,
    sharingType: sharingType as any,
    monthlyRent: Number(monthlyRent),
    depositAmount: Number(req.body.depositAmount || monthlyRent * 2),
    amenities,
    totalBeds,
    availableBeds: totalBeds,
    beds,
  };

  const existingRooms = inventoryDatabase.get(propertyId) || [];
  existingRooms.push(newRoom);
  inventoryDatabase.set(propertyId, existingRooms);

  eventBus.publish("RoomCreated", roomId, "Room", newRoom, req.correlationId);

  return sendSuccess(res, newRoom, "inventory-service", 201);
});
