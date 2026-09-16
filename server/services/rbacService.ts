import crypto from "node:crypto";
import type { Role, Employee, AuditLog, AuthorityLevel } from "../../src/types/rbac";
import { PERMISSION_CATALOG, INITIAL_ROLES } from "../../src/data/rbacData";
import { roles, employees, rbacAudit, users, sessions, type StoredEmployee } from "../db/repositories.js";
import { Collection } from "../db/database.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { isSafeId, newId } from "../lib/ids.js";
import { hashPassword } from "../lib/password.js";
import * as v from "../lib/validate.js";
import { events, type EventContext } from "../lib/events.js";
import type { AuthUser } from "../middleware/auth.js";
import { notifyUser } from "./crmService.js";

const AUTHORITY_LEVELS: AuthorityLevel[] = ["full", "high", "medium", "low", "limited"];
const KNOWN_PERMISSIONS = new Set(PERMISSION_CATALOG.map((p) => p.id));

export interface RbacSnapshot {
  roles: Role[];
  employees: Employee[];
  auditLogs: AuditLog[];
}

/** Every owner starts with the platform's default role templates (cloned per owner so edits stay isolated). */
export function ensureDefaultRoles(ownerId: string): void {
  if (roles.count({ owner_id: ownerId }) > 0) return;
  for (const template of INITIAL_ROLES) {
    roles.insert({ ...template, id: `${template.id}-${ownerId}`, ownerId, createdAt: new Date().toISOString() });
  }
}

export function snapshot(ownerId: string): RbacSnapshot {
  ensureDefaultRoles(ownerId);
  return {
    roles: roles.list({ owner_id: ownerId }, { orderBy: "created_at ASC" }),
    employees: employees.list({ owner_id: ownerId }, { orderBy: "created_at ASC" }).map(stripInternal),
    auditLogs: rbacAudit.list({ owner_id: ownerId }, { limit: 500 }),
  };
}

function stripInternal(e: StoredEmployee): Employee {
  const { userId: _u, ownerId: _o, ...rest } = e;
  return rest as Employee;
}

function sanitizePermissions(input: unknown): Record<string, boolean> {
  const source = v.obj(input ?? {}, "Permissions");
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(source)) {
    if (KNOWN_PERMISSIONS.has(k)) out[k] = !!val;
  }
  return out;
}

export function logAudit(ownerId: string, entry: Omit<AuditLog, "id" | "timestamp">): AuditLog {
  const record = { ...entry, id: newId("aud"), timestamp: new Date().toISOString(), ownerId };
  rbacAudit.insert(record);
  return record;
}

export function recordAudit(ownerId: string, body: Record<string, unknown>, actor: AuthUser): AuditLog {
  return logAudit(ownerId, {
    actorId: actor.id,
    actorName: actor.fullName,
    targetType: v.oneOf(body.targetType, ["role", "employee", "permission"] as const, "Target type", "permission"),
    targetId: v.str(body.targetId, "Target id", { max: 80 }),
    targetName: v.str(body.targetName, "Target name", { max: 120 }),
    action: v.str(body.action, "Action", { max: 120 }),
    permissionId: v.optionalStr(body.permissionId, "Permission", 80),
    permissionLabel: v.optionalStr(body.permissionLabel, "Permission label", 120),
    oldValue: typeof body.oldValue === "boolean" ? body.oldValue : v.optionalStr(body.oldValue, "Old value", 200),
    newValue: typeof body.newValue === "boolean" ? body.newValue : v.optionalStr(body.newValue, "New value", 200),
    note: v.optionalStr(body.note, "Note", 500),
  });
}

// ---------------------------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------------------------

export function upsertRole(actor: AuthUser, ownerId: string, id: string | undefined, body: Record<string, unknown>, ctx: EventContext): Role {
  ensureDefaultRoles(ownerId);
  const existing = id ? roles.get(id) : null;
  if (existing && existing.ownerId !== ownerId) throw notFound("Role");
  if (existing?.isOwnerRole && body.permissions) {
    const perms = sanitizePermissions(body.permissions);
    if (Object.values(perms).some((val) => !val)) throw conflict("The owner role always has every permission and cannot be restricted.");
  }

  const name = v.str(body.name ?? existing?.name, "Role name", { max: 80 });
  const duplicate = roles.list({ owner_id: ownerId }).find((r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== existing?.id);
  if (duplicate) throw conflict(`A role named "${name}" already exists.`);

  const role: Role & { ownerId: string } = {
    ...(existing || { createdAt: new Date().toISOString(), createdBy: actor.fullName, isSystem: false, isOwnerRole: false, color: "slate" }),
    ...v.omitKeys(body, ["id", "ownerId", "isSystem", "isOwnerRole", "createdAt", "createdBy"]),
    id: existing?.id || (isSafeId(id) && !roles.exists(id) ? id : isSafeId(body.id) && !roles.exists(body.id as string) ? (body.id as string) : newId("role")),
    ownerId,
    name,
    description: v.optionalStr(body.description ?? existing?.description, "Description", 500) || "",
    authorityLevel: v.oneOf(body.authorityLevel ?? existing?.authorityLevel, AUTHORITY_LEVELS, "Authority level", "medium"),
    permissions: body.permissions !== undefined ? sanitizePermissions(body.permissions) : existing?.permissions || {},
    color: v.optionalStr(body.color ?? existing?.color, "Color", 40) || "slate",
    updatedAt: new Date().toISOString(),
  } as Role & { ownerId: string };

  roles.upsert(role);
  events.publish(existing ? "RoleUpdated" : "RoleCreated", "Role", role.id, { name }, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId });
  return role;
}

export function deleteRole(actor: AuthUser, ownerId: string, id: string, ctx: EventContext): void {
  const role = roles.get(id);
  if (!role || role.ownerId !== ownerId) throw notFound("Role");
  if (role.isSystem || role.isOwnerRole) throw conflict("System roles cannot be deleted.");
  const inUse = employees.count({ owner_id: ownerId, role_id: id });
  if (inUse > 0) throw conflict(`This role is assigned to ${inUse} employee(s). Reassign them before deleting it.`);
  roles.remove(id);
  events.publish("RoleDeleted", "Role", id, { name: role.name }, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId });
}

// ---------------------------------------------------------------------------------------------
// Employees (each employee gets a real login account scoped to the owner)
// ---------------------------------------------------------------------------------------------

function temporaryPassword(): string {
  return `Nest-${crypto.randomBytes(4).toString("hex")}-${crypto.randomInt(10, 99)}`;
}

export interface EmployeeResult extends Employee {
  /** Only present when a login account was just created or reset. Never stored. */
  temporaryPassword?: string;
}

export function upsertEmployee(actor: AuthUser, ownerId: string, id: string | undefined, body: Record<string, unknown>, ctx: EventContext): EmployeeResult {
  ensureDefaultRoles(ownerId);
  const existing = id ? employees.get(id) : null;
  if (existing && existing.ownerId !== ownerId) throw notFound("Employee");

  const name = v.str(body.name ?? existing?.name, "Employee name", { max: 120 });
  const email = v.email(body.email ?? existing?.email);
  const phone = v.phone(body.phone ?? existing?.phone, "Phone", false);
  const roleId = v.str(body.roleId ?? existing?.roleId, "Role", { max: 80 });
  const role = roles.get(roleId);
  if (!role || role.ownerId !== ownerId) throw badRequest("Selected role does not exist.");
  if (role.isOwnerRole) throw conflict("Staff cannot be assigned the owner role.");
  const status = v.oneOf(body.status ?? existing?.status, ["active", "inactive", "pending"] as const, "Status", "active");

  const emailOwner = users.findByEmail(email);
  if (emailOwner && emailOwner.id !== existing?.userId) {
    if (emailOwner.role !== "employee" || emailOwner.ownerId !== ownerId) throw conflict("This email address already belongs to another account.");
  }

  const employee: StoredEmployee = {
    ...(existing || { joinedAt: new Date().toISOString(), lastActive: "Never" }),
    ...v.omitKeys(body, ["id", "ownerId", "userId", "joinedAt"]),
    id: existing?.id || (isSafeId(id) && !employees.exists(id) ? id : isSafeId(body.id) && !employees.exists(body.id as string) ? (body.id as string) : newId("emp")),
    ownerId,
    name,
    email,
    phone,
    roleId,
    roleName: role.name,
    status,
    assignedProperties: v.arr(body.assignedProperties ?? existing?.assignedProperties ?? ["all"], "Assigned properties", 200).map((p) => String(p).slice(0, 80)),
    propertyAccessScope: v.oneOf(body.propertyAccessScope ?? existing?.propertyAccessScope, ["all", "selected", "assigned_records"] as const, "Access scope", "all"),
    overrides: body.overrides !== undefined ? sanitizePermissions(body.overrides) : existing?.overrides,
    avatar: v.optionalStr(body.avatar ?? existing?.avatar, "Avatar", 500),
  } as StoredEmployee;

  let temp: string | undefined;
  Collection.transaction(() => {
    // Create or update the linked login account.
    let account = employee.userId ? users.findById(employee.userId) : users.findByEmail(email);
    if (!account) {
      temp = temporaryPassword();
      account = users.insert({
        id: newId("emp"),
        email,
        passwordHash: hashPassword(temp),
        role: "employee",
        ownerId,
        fullName: name,
        status: "active",
        authProvider: "email",
        data: { phone: phone || undefined, avatar: employee.avatar, employeeId: employee.id },
      });
    } else {
      users.update(account.id, { email, fullName: name, ownerId, data: { ...account.data, employeeId: employee.id, phone: phone || account.data.phone } });
      if (status !== "active") sessions.revokeAllForUser(account.id);
    }
    employee.userId = account.id;
    employees.upsert(employee);
  });

  if (temp) {
    notifyUser(ownerId, {
      title: "Staff login created",
      message: `${name} can sign in at the owner portal with ${email}. Temporary password: ${temp} (ask them to change it after first login).`,
      type: "system",
      linkTo: "/owner/employees",
    });
  }
  events.publish(existing ? "EmployeeUpdated" : "EmployeeCreated", "Employee", employee.id, { email, roleId, status }, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId });
  return { ...stripInternal(employee), temporaryPassword: temp };
}

export function resetEmployeePassword(actor: AuthUser, ownerId: string, id: string, ctx: EventContext): { temporaryPassword: string } {
  const employee = employees.get(id);
  if (!employee || employee.ownerId !== ownerId || !employee.userId) throw notFound("Employee");
  const temp = temporaryPassword();
  users.update(employee.userId, { passwordHash: hashPassword(temp) });
  sessions.revokeAllForUser(employee.userId);
  events.publish("EmployeePasswordReset", "Employee", id, {}, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId });
  return { temporaryPassword: temp };
}

export function deleteEmployee(actor: AuthUser, ownerId: string, id: string, ctx: EventContext): void {
  const employee = employees.get(id);
  if (!employee || employee.ownerId !== ownerId) throw notFound("Employee");
  Collection.transaction(() => {
    if (employee.userId) {
      sessions.revokeAllForUser(employee.userId);
      users.update(employee.userId, { status: "suspended", email: `removed-${Date.now()}-${employee.email}` });
    }
    employees.remove(id);
  });
  events.publish("EmployeeDeleted", "Employee", id, { email: employee.email }, { ...ctx, actorId: actor.id, actorRole: actor.role, ownerId });
}

export function permissionCatalog() {
  return PERMISSION_CATALOG;
}
