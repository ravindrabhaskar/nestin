import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess, sendError } from "../shared/types.js";
import { authenticateToken, optionalAuth, requireRole, requirePermission } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface PropertyRecord {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  address: {
    street: string;
    locality: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  genderCategory: "men" | "women" | "unisex";
  startingPrice: number;
  depositAmount: number;
  noticePeriodDays: number;
  images: string[];
  amenities: string[];
  rules: string[];
  status: "draft" | "pending_verification" | "verified" | "published" | "archived";
  rating: number;
  reviewsCount: number;
  createdAt: string;
  updatedAt: string;
}

// Property Microservice DB
const propertyDatabase: Map<string, PropertyRecord> = new Map([
  [
    "nestin-orion-whitefield",
    {
      id: "nestin-orion-whitefield",
      ownerId: "owner-001",
      name: "Nestin Orion Luxury Stays",
      type: "Luxury Coliving",
      address: {
        street: "ITPL Main Road, Pattandur Agrahara",
        locality: "Whitefield",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560066",
        latitude: 12.9698,
        longitude: 77.7499,
      },
      genderCategory: "unisex",
      startingPrice: 13500,
      depositAmount: 20000,
      noticePeriodDays: 30,
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      ],
      amenities: ["High-speed WiFi", "Air Conditioning", "Daily Housekeeping", "Power Backup", "Gymnasium", "Biometric Security", "Rooftop Lounge"],
      rules: ["No smoking inside rooms", "Quiet hours after 11 PM", "Visitors permitted till 8 PM"],
      status: "published",
      rating: 4.8,
      reviewsCount: 124,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "nestin-elegance-koramangala",
    {
      id: "nestin-elegance-koramangala",
      ownerId: "owner-001",
      name: "Nestin Elegance Premium Suites",
      type: "Executive Living",
      address: {
        street: "80 Feet Road, 4th Block",
        locality: "Koramangala",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560034",
        latitude: 12.9352,
        longitude: 77.6245,
      },
      genderCategory: "unisex",
      startingPrice: 16000,
      depositAmount: 25000,
      noticePeriodDays: 30,
      images: [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
      ],
      amenities: ["High-speed WiFi", "Chef-Curated Meals", "Swimming Pool", "Coworking Desks", "EV Charging", "24/7 Concierge"],
      rules: ["Valid ID required for guests", "Pet friendly in designated wings"],
      status: "published",
      rating: 4.9,
      reviewsCount: 88,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
]);

export const propertyRouter: Router = Router();

// Health
propertyRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "property-service", totalProperties: propertyDatabase.size }, "property-service");
});

// Search / List Public Properties
propertyRouter.get("/", optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { city, locality, gender, minPrice, maxPrice, query, status = "published" } = req.query;
  let results = Array.from(propertyDatabase.values());

  // Filter published only for public or unauthenticated
  if (!req.user || req.user.role === "tenant") {
    results = results.filter((p) => p.status === "published");
  }

  if (city) {
    results = results.filter((p) => p.address.city.toLowerCase() === String(city).toLowerCase());
  }
  if (locality) {
    results = results.filter((p) => p.address.locality.toLowerCase().includes(String(locality).toLowerCase()));
  }
  if (gender && gender !== "all") {
    results = results.filter((p) => p.genderCategory === gender || p.genderCategory === "unisex");
  }
  if (minPrice) {
    results = results.filter((p) => p.startingPrice >= Number(minPrice));
  }
  if (maxPrice) {
    results = results.filter((p) => p.startingPrice <= Number(maxPrice));
  }
  if (query) {
    const q = String(query).toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.locality.toLowerCase().includes(q) ||
        p.address.city.toLowerCase().includes(q)
    );
  }

  return sendSuccess(res, results, "property-service", 200, {
    page: 1,
    limit: results.length,
    total: results.length,
    totalPages: 1,
  });
});

// Get Property Details by ID
propertyRouter.get("/:id", optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const property = propertyDatabase.get(req.params.id);
  if (!property) {
    return sendError(res, "NOT_FOUND", "Property not found", "property-service", 404);
  }
  return sendSuccess(res, property, "property-service");
});

// Owner: Get Owner's Properties
propertyRouter.get("/owner/my-listings", authenticateToken, requireRole("owner", "employee", "admin"), (req: AuthenticatedRequest, res: Response) => {
  const targetOwnerId = req.user?.ownerId || req.user?.id;
  const ownerProperties = Array.from(propertyDatabase.values()).filter((p) => p.ownerId === targetOwnerId);
  return sendSuccess(res, ownerProperties, "property-service");
});

// Owner: Create Property
propertyRouter.post("/", authenticateToken, requireRole("owner", "admin"), requirePermission("manage_properties"), (req: AuthenticatedRequest, res: Response) => {
  const { name, type = "Coliving", address, startingPrice = 10000, amenities = [], rules = [], genderCategory = "unisex", images = [] } = req.body;
  if (!name || !address || !address.city) {
    return sendError(res, "VALIDATION_FAILED", "Property name and address with city are required", "property-service", 400);
  }

  const propId = `nestin-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;
  const newProperty: PropertyRecord = {
    id: propId,
    ownerId: req.user!.id,
    name,
    type,
    address,
    genderCategory,
    startingPrice: Number(startingPrice),
    depositAmount: Number(req.body.depositAmount || startingPrice * 2),
    noticePeriodDays: Number(req.body.noticePeriodDays || 30),
    images: images.length > 0 ? images : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"],
    amenities,
    rules,
    status: "published", // default publish for seamless UX
    rating: 5.0,
    reviewsCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  propertyDatabase.set(propId, newProperty);

  // Publish Asynchronous Event for Notification & Inventory Services
  eventBus.publish("PropertyCreated", propId, "Property", newProperty, req.correlationId);

  return sendSuccess(res, newProperty, "property-service", 201);
});

// Owner: Update Property
propertyRouter.put("/:id", authenticateToken, requireRole("owner", "admin"), requirePermission("manage_properties"), (req: AuthenticatedRequest, res: Response) => {
  const property = propertyDatabase.get(req.params.id);
  if (!property) {
    return sendError(res, "NOT_FOUND", "Property not found", "property-service", 404);
  }

  // Multi-tenancy check
  if (property.ownerId !== (req.user?.ownerId || req.user?.id)) {
    return sendError(res, "FORBIDDEN", "Unauthorized access to another owner's property", "property-service", 403);
  }

  const updated: PropertyRecord = {
    ...property,
    ...req.body,
    id: property.id, // Immutable
    ownerId: property.ownerId, // Immutable
    updatedAt: new Date().toISOString(),
  };

  propertyDatabase.set(property.id, updated);
  eventBus.publish("PropertyUpdated", property.id, "Property", updated, req.correlationId);

  return sendSuccess(res, updated, "property-service");
});

// Owner: Delete Property
propertyRouter.delete("/:id", authenticateToken, requireRole("owner", "admin"), requirePermission("manage_properties"), (req: AuthenticatedRequest, res: Response) => {
  const property = propertyDatabase.get(req.params.id);
  if (!property) {
    return sendError(res, "NOT_FOUND", "Property not found", "property-service", 404);
  }
  if (property.ownerId !== (req.user?.ownerId || req.user?.id)) {
    return sendError(res, "FORBIDDEN", "Unauthorized access to another owner's property", "property-service", 403);
  }

  propertyDatabase.delete(req.params.id);
  eventBus.publish("PropertyDeleted", req.params.id, "Property", { id: req.params.id }, req.correlationId);

  return sendSuccess(res, { deleted: true, id: req.params.id }, "property-service");
});
