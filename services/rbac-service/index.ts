import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess, sendError } from "../shared/types.js";
import { authenticateToken, requireRole, requirePermission } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  authorityLevel: "full" | "high" | "medium" | "low" | "limited";
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

export interface EmployeeRecord {
  id: string;
  ownerId: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  roleName: string;
  status: "active" | "inactive";
  assignedPropertyIds: string[];
  customOverrides?: Record<string, boolean>;
  createdAt: string;
}

const defaultRoles: CustomRole[] = [
  {
    id: "role-owner",
    name: "Property Owner / GM",
    description: "Unrestricted managerial authority across all properties, financials, and staff permissions.",
    authorityLevel: "full",
    permissions: [
      "view_properties", "manage_properties", "view_inventory", "manage_inventory",
      "view_leads", "manage_leads", "schedule_visits", "view_visitors",
      "view_bookings", "manage_bookings", "view_customers", "manage_customers",
      "view_payments", "manage_payments", "view_documents", "manage_documents",
      "manage_employees", "manage_roles"
    ],
    isSystem: true,
    userCount: 1,
  },
  {
    id: "role-property-mgr",
    name: "Senior Property Manager",
    description: "Operational leadership managing tenants, inventory, bookings, and customer issues.",
    authorityLevel: "high",
    permissions: [
      "view_properties", "manage_properties", "view_inventory", "manage_inventory",
      "view_leads", "manage_leads", "schedule_visits", "view_visitors",
      "view_bookings", "manage_bookings", "view_customers", "manage_customers",
      "view_payments", "view_documents", "manage_documents"
    ],
    isSystem: false,
    userCount: 2,
  },
  {
    id: "role-frontdesk",
    name: "Front Desk & Operations",
    description: "Day-to-day lead onboarding, visit coordination, and check-in support.",
    authorityLevel: "medium",
    permissions: [
      "view_properties", "view_inventory",
      "view_leads", "manage_leads", "schedule_visits", "view_visitors",
      "view_bookings", "view_customers", "view_documents"
    ],
    isSystem: false,
    userCount: 3,
  },
];

const employeeDatabase: Map<string, EmployeeRecord[]> = new Map([
  [
    "owner-001",
    [
      {
        id: "emp-001",
        ownerId: "owner-001",
        fullName: "Rahul Verma",
        email: "staff@nestin.com",
        phone: "+91 9811223344",
        roleId: "role-frontdesk",
        roleName: "Front Desk & Operations",
        status: "active",
        assignedPropertyIds: ["nestin-orion-whitefield", "nestin-elegance-koramangala"],
        createdAt: new Date().toISOString(),
      },
    ],
  ],
]);

const rolesDatabase: Map<string, CustomRole[]> = new Map([
  ["owner-001", defaultRoles],
]);

export const rbacRouter: Router = Router();

// Health
rbacRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "rbac-service" }, "rbac-service");
});

// Get Roles for Owner
rbacRouter.get("/roles", authenticateToken, requireRole("owner", "employee", "admin"), (req: AuthenticatedRequest, res: Response) => {
  const ownerId = req.user?.ownerId || req.user!.id;
  const roles = rolesDatabase.get(ownerId) || defaultRoles;
  return sendSuccess(res, roles, "rbac-service");
});

// Get Employees for Owner
rbacRouter.get("/employees", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("manage_employees"), (req: AuthenticatedRequest, res: Response) => {
  const ownerId = req.user?.ownerId || req.user!.id;
  const list = employeeDatabase.get(ownerId) || [];
  return sendSuccess(res, list, "rbac-service");
});

// Create Employee
rbacRouter.post("/employees", authenticateToken, requireRole("owner", "admin"), requirePermission("manage_employees"), (req: AuthenticatedRequest, res: Response) => {
  const ownerId = req.user?.ownerId || req.user!.id;
  const { fullName, email, phone, roleId, assignedPropertyIds = [] } = req.body;

  if (!fullName || !email || !roleId) {
    return sendError(res, "VALIDATION_FAILED", "Full Name, Email, and Role are required", "rbac-service", 400);
  }

  const roles = rolesDatabase.get(ownerId) || defaultRoles;
  const matchedRole = roles.find((r) => r.id === roleId) || roles[1];

  const empId = `emp-${Date.now().toString(36)}`;
  const newEmp: EmployeeRecord = {
    id: empId,
    ownerId,
    fullName,
    email,
    phone: phone || "+91 9800000000",
    roleId: matchedRole.id,
    roleName: matchedRole.name,
    status: "active",
    assignedPropertyIds,
    createdAt: new Date().toISOString(),
  };

  const list = employeeDatabase.get(ownerId) || [];
  list.push(newEmp);
  employeeDatabase.set(ownerId, list);

  eventBus.publish("EmployeeCreated", empId, "Employee", newEmp, req.correlationId);

  return sendSuccess(res, newEmp, "rbac-service", 201);
});

// Update Role Permissions (Matrix toggles)
rbacRouter.put("/roles/:id/permissions", authenticateToken, requireRole("owner", "admin"), requirePermission("manage_roles"), (req: AuthenticatedRequest, res: Response) => {
  const ownerId = req.user?.ownerId || req.user!.id;
  const { permissions } = req.body;
  const roles = rolesDatabase.get(ownerId) || defaultRoles;
  const role = roles.find((r) => r.id === req.params.id);

  if (!role) {
    return sendError(res, "NOT_FOUND", "Role not found", "rbac-service", 404);
  }

  role.permissions = permissions || [];
  rolesDatabase.set(ownerId, roles);

  eventBus.publish("RolePermissionsUpdated", role.id, "Role", { roleId: role.id, permissions }, req.correlationId);

  return sendSuccess(res, role, "rbac-service");
});
