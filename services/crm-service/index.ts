import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess, sendError } from "../shared/types.js";
import { authenticateToken, requireRole, requirePermission } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface LeadRecord {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  status: "new" | "contacted" | "visit_scheduled" | "visited" | "interested" | "booking_requested" | "converted" | "lost";
  propertyInterest?: string;
  budget?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorRecord {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  propertyId: string;
  propertyName: string;
  visitDate: string;
  visitTime: string;
  status: "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled";
  assignedStaff?: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerRecord {
  id: string;
  ownerId: string;
  tenantId?: string;
  name: string;
  phone: string;
  email: string;
  propertyId: string;
  propertyName: string;
  roomNumber: string;
  bedNumber: string;
  monthlyRent: number;
  depositPaid: number;
  moveInDate: string;
  status: "active" | "notice_served" | "moved_out";
  createdAt: string;
}

// CRM Microservice Database
const leadsDatabase: Map<string, LeadRecord> = new Map([
  [
    "lead-001",
    {
      id: "lead-001",
      ownerId: "owner-001",
      name: "Karan Johar",
      phone: "+91 9820011223",
      email: "karan@gmail.com",
      source: "Google Search",
      status: "visit_scheduled",
      propertyInterest: "Nestin Orion Luxury Stays",
      budget: 15000,
      notes: "Looking for single sharing near ITPL",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "lead-002",
    {
      id: "lead-002",
      ownerId: "owner-001",
      name: "Sneha Reddy",
      phone: "+91 9701122334",
      email: "sneha.r@outlook.com",
      source: "Instagram",
      status: "new",
      propertyInterest: "Nestin Elegance Premium Suites",
      budget: 18000,
      notes: "Immediate move-in requested",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
]);

const visitorsDatabase: Map<string, VisitorRecord> = new Map([
  [
    "vis-001",
    {
      id: "vis-001",
      ownerId: "owner-001",
      name: "Karan Johar",
      phone: "+91 9820011223",
      propertyId: "nestin-orion-whitefield",
      propertyName: "Nestin Orion Luxury Stays",
      visitDate: "2026-09-05",
      visitTime: "11:00 AM",
      status: "scheduled",
      assignedStaff: "Rahul Verma",
      createdAt: new Date().toISOString(),
    },
  ],
]);

const customersDatabase: Map<string, CustomerRecord> = new Map([
  [
    "cust-001",
    {
      id: "cust-001",
      ownerId: "owner-001",
      tenantId: "tenant-001",
      name: "Ananya Sharma",
      phone: "+91 9845012345",
      email: "tenant@nestin.com",
      propertyId: "nestin-elegance-koramangala",
      propertyName: "Nestin Elegance Premium Suites",
      roomNumber: "202",
      bedNumber: "A",
      monthlyRent: 16000,
      depositPaid: 25000,
      moveInDate: "2026-09-01",
      status: "active",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
]);

// Event Listeners: Auto-promote to Customer upon BookingConfirmed
eventBus.subscribe("BookingConfirmed", (event) => {
  const booking = event.payload;
  const custId = `cust-${booking.id}`;
  if (!customersDatabase.has(custId)) {
    const customer: CustomerRecord = {
      id: custId,
      ownerId: booking.ownerId,
      tenantId: booking.tenantId,
      name: booking.tenantName,
      phone: booking.tenantPhone,
      email: booking.tenantEmail,
      propertyId: booking.propertyId,
      propertyName: booking.propertyName,
      roomNumber: booking.roomNumber,
      bedNumber: booking.bedNumber,
      monthlyRent: booking.monthlyRent,
      depositPaid: booking.depositAmount,
      moveInDate: booking.moveInDate,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    customersDatabase.set(custId, customer);
  }
});

export const crmRouter: Router = Router();

// Health
crmRouter.get("/health", (req, res) => {
  return sendSuccess(res, {
    status: "UP",
    service: "crm-service",
    totalLeads: leadsDatabase.size,
    totalVisitors: visitorsDatabase.size,
    totalCustomers: customersDatabase.size,
  }, "crm-service");
});

// LEADS
crmRouter.get("/leads", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("view_leads"), (req: AuthenticatedRequest, res: Response) => {
  const targetOwnerId = req.user?.ownerId || req.user?.id;
  const leads = Array.from(leadsDatabase.values()).filter((l) => l.ownerId === targetOwnerId);
  return sendSuccess(res, leads, "crm-service");
});

crmRouter.post("/leads", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("manage_leads"), (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, email, source = "Direct Enquiry", status = "new", propertyInterest, budget, notes } = req.body;
  if (!name || !phone) {
    return sendError(res, "VALIDATION_FAILED", "Lead name and phone number are required", "crm-service", 400);
  }

  const leadId = `lead-${Date.now().toString(36)}`;
  const newLead: LeadRecord = {
    id: leadId,
    ownerId: req.user?.ownerId || req.user!.id,
    name,
    phone,
    email,
    source,
    status,
    propertyInterest,
    budget: budget ? Number(budget) : undefined,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  leadsDatabase.set(leadId, newLead);
  eventBus.publish("LeadCreated", leadId, "Lead", newLead, req.correlationId);

  return sendSuccess(res, newLead, "crm-service", 201);
});

crmRouter.put("/leads/:id", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("manage_leads"), (req: AuthenticatedRequest, res: Response) => {
  const lead = leadsDatabase.get(req.params.id);
  if (!lead) {
    return sendError(res, "NOT_FOUND", "Lead not found", "crm-service", 404);
  }
  if (lead.ownerId !== (req.user?.ownerId || req.user?.id)) {
    return sendError(res, "FORBIDDEN", "Unauthorized lead access", "crm-service", 403);
  }

  const updated: LeadRecord = {
    ...lead,
    ...req.body,
    id: lead.id,
    ownerId: lead.ownerId,
    updatedAt: new Date().toISOString(),
  };

  leadsDatabase.set(lead.id, updated);
  eventBus.publish("LeadStatusChanged", lead.id, "Lead", updated, req.correlationId);

  return sendSuccess(res, updated, "crm-service");
});

// VISITORS
crmRouter.get("/visitors", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("view_visitors"), (req: AuthenticatedRequest, res: Response) => {
  const targetOwnerId = req.user?.ownerId || req.user?.id;
  const visitors = Array.from(visitorsDatabase.values()).filter((v) => v.ownerId === targetOwnerId);
  return sendSuccess(res, visitors, "crm-service");
});

crmRouter.post("/visitors", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("schedule_visits"), (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, propertyId, propertyName, visitDate, visitTime = "10:00 AM", assignedStaff, notes } = req.body;
  if (!name || !phone || !propertyId || !visitDate) {
    return sendError(res, "VALIDATION_FAILED", "Name, phone, property, and visit date are required", "crm-service", 400);
  }

  const visitorId = `vis-${Date.now().toString(36)}`;
  const newVisitor: VisitorRecord = {
    id: visitorId,
    ownerId: req.user?.ownerId || req.user!.id,
    name,
    phone,
    propertyId,
    propertyName: propertyName || "Nestin Property",
    visitDate,
    visitTime,
    status: "scheduled",
    assignedStaff: assignedStaff || (req.user as any).fullName || "Property Staff",
    notes,
    createdAt: new Date().toISOString(),
  };

  visitorsDatabase.set(visitorId, newVisitor);
  eventBus.publish("VisitScheduled", visitorId, "Visitor", newVisitor, req.correlationId);

  return sendSuccess(res, newVisitor, "crm-service", 201);
});

// CUSTOMERS
crmRouter.get("/customers", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("view_customers"), (req: AuthenticatedRequest, res: Response) => {
  const targetOwnerId = req.user?.ownerId || req.user?.id;
  const customers = Array.from(customersDatabase.values()).filter((c) => c.ownerId === targetOwnerId);
  return sendSuccess(res, customers, "crm-service");
});
