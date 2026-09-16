import type { Request, Response, NextFunction } from 'express';
import { verifyJwt, type AppRole } from '../lib/jwt.js';
import { users, sessions, employees, roles } from '../db/repositories.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { getAllPermissionsTrue } from '../../src/data/rbacData';

export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  /** Owner tenancy this request operates on: the owner's own id, or the employer for employees. */
  ownerId: string | null;
  fullName: string;
  sessionId: string;
  /** Effective RBAC permissions for employees (role permissions + per-employee overrides). */
  permissions: Record<string, boolean> | null;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
  correlationId?: string;
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Resolves the caller from a Bearer JWT. Requires: valid signature & expiry, an active (non-revoked)
 * session, and an active user account. Never falls back to unverified token contents.
 */
function resolveUser(req: Request): AuthUser | null {
  const token = extractBearer(req);
  if (!token) return null;
  const result = verifyJwt(token);
  if (!result.valid) return null;

  const session = sessions.get(result.payload.sid);
  if (
    !session ||
    session.revokedAt ||
    session.userId !== result.payload.sub ||
    Date.parse(session.expiresAt) < Date.now()
  )
    return null;

  const user = users.findById(result.payload.sub);
  if (!user || user.status !== 'active') return null;

  sessions.touch(session.id);

  let permissions: Record<string, boolean> | null = null;
  let ownerId: string | null = user.role === 'owner' ? user.id : user.ownerId;
  if (user.role === 'employee') {
    const employee = user.data.employeeId
      ? employees.get(user.data.employeeId)
      : employees.findOne({ email: user.email });
    if (!employee || employee.status !== 'active') return null; // deactivated staff lose access immediately
    ownerId = employee.ownerId;
    const role = roles.get(employee.roleId);
    permissions = { ...(role?.permissions || {}), ...(employee.overrides || {}) };
  } else if (user.role === 'owner' || user.role === 'super_admin') {
    permissions = getAllPermissionsTrue();
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    ownerId,
    fullName: user.fullName,
    sessionId: session.id,
    permissions,
  };
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  try {
    const user = resolveUser(req);
    if (user) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function authenticate(req: AuthedRequest, _res: Response, next: NextFunction): void {
  try {
    const user = resolveUser(req);
    if (!user) return next(unauthorized('A valid, active session is required'));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowed: AppRole[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!allowed.includes(req.user.role))
      return next(forbidden(`This action requires one of the roles: ${allowed.join(', ')}`));
    next();
  };
}

/** Owner-tenancy guard: owners always pass; employees need the given RBAC permission; super admins pass. */
export function requirePermission(permissionId: string) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) return next(unauthorized());
    if (user.role === 'owner' || user.role === 'super_admin') return next();
    if (user.role === 'employee' && user.permissions?.[permissionId]) return next();
    next(forbidden(`Missing permission: ${permissionId}`));
  };
}

/** Returns the owner tenancy id for an owner/employee request, or throws. */
export function ownerScope(req: AuthedRequest): string {
  const user = req.user;
  if (!user) throw unauthorized();
  if (user.role === 'super_admin') {
    const override = typeof req.query.ownerId === 'string' ? req.query.ownerId : undefined;
    if (override) return override;
  }
  if (!user.ownerId) throw forbidden('This endpoint is only available to owner accounts and their staff');
  return user.ownerId;
}

export function currentUser(req: AuthedRequest): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
