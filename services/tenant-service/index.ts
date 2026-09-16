import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess, sendError } from "../shared/types.js";
import { authenticateToken } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface TenantProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  occupation: string;
  workplace?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  livingPreferences: {
    dietary: "veg" | "non_veg" | "any";
    smoking: boolean;
    alcohol: boolean;
    lateNightEntry: boolean;
    workFromHome: boolean;
  };
  savedPropertyIds: string[];
  createdAt: string;
  updatedAt: string;
}

const tenantDatabase: Map<string, TenantProfile> = new Map([
  [
    "tenant-001",
    {
      userId: "tenant-001",
      fullName: "Ananya Sharma",
      email: "tenant@nestin.com",
      phone: "+91 9845012345",
      occupation: "Senior Product Designer",
      workplace: "Fintech HQ, Bangalore",
      emergencyContact: {
        name: "Ramesh Sharma",
        phone: "+91 9845099999",
        relationship: "Father",
      },
      livingPreferences: {
        dietary: "veg",
        smoking: false,
        alcohol: false,
        lateNightEntry: true,
        workFromHome: true,
      },
      savedPropertyIds: ["nestin-orion-whitefield", "nestin-elegance-koramangala"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
]);

export const tenantRouter: Router = Router();

// Health
tenantRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "tenant-service" }, "tenant-service");
});

// Get My Profile
tenantRouter.get("/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  let profile = tenantDatabase.get(userId);
  if (!profile) {
    profile = {
      userId,
      fullName: (req.user as any).fullName || "Valued Resident",
      email: req.user!.email,
      phone: "+91 9876543210",
      occupation: "Professional",
      emergencyContact: { name: "Family Contact", phone: "+91 9876500000", relationship: "Parent" },
      livingPreferences: { dietary: "any", smoking: false, alcohol: false, lateNightEntry: true, workFromHome: true },
      savedPropertyIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tenantDatabase.set(userId, profile);
  }
  return sendSuccess(res, profile, "tenant-service");
});

// Update Profile
tenantRouter.put("/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const existing = tenantDatabase.get(userId) || {
    userId,
    fullName: (req.user as any).fullName || "Resident",
    email: req.user!.email,
    phone: "",
    occupation: "",
    emergencyContact: { name: "", phone: "", relationship: "" },
    livingPreferences: { dietary: "any", smoking: false, alcohol: false, lateNightEntry: true, workFromHome: true },
    savedPropertyIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated: TenantProfile = {
    ...existing,
    ...req.body,
    userId,
    email: req.user!.email,
    updatedAt: new Date().toISOString(),
  };

  tenantDatabase.set(userId, updated);
  eventBus.publish("TenantProfileUpdated", userId, "Tenant", updated, req.correlationId);

  return sendSuccess(res, updated, "tenant-service");
});

// Toggle Saved Property
tenantRouter.post("/saved/:propertyId", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { propertyId } = req.params;
  const profile = tenantDatabase.get(userId) || {
    userId,
    fullName: "Resident",
    email: req.user!.email,
    phone: "",
    occupation: "",
    emergencyContact: { name: "", phone: "", relationship: "" },
    livingPreferences: { dietary: "any", smoking: false, alcohol: false, lateNightEntry: true, workFromHome: true },
    savedPropertyIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const exists = profile.savedPropertyIds.includes(propertyId);
  if (exists) {
    profile.savedPropertyIds = profile.savedPropertyIds.filter((id) => id !== propertyId);
  } else {
    profile.savedPropertyIds.push(propertyId);
  }

  profile.updatedAt = new Date().toISOString();
  tenantDatabase.set(userId, profile);

  return sendSuccess(res, { saved: !exists, savedPropertyIds: profile.savedPropertyIds }, "tenant-service");
});
