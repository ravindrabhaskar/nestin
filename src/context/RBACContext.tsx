import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Role, Employee, AuditLog, PermissionDefinition, AuthorityLevel } from '../types/rbac';
import { PERMISSION_CATALOG, getAllPermissionsTrue } from '../data/rbacData';
import { useAuth } from './AuthContext';
import { ApiClient } from '../lib/apiClient';
import { reportSyncError, syncBus } from '../lib/syncBus';

/**
 * Roles & staff for the signed-in owner tenancy. State is loaded from the API and mutations are
 * applied optimistically then persisted; the server also enforces every rule below, so the client
 * checks are purely for immediate UX feedback.
 */
interface RBACContextType {
  roles: Role[];
  employees: Employee[];
  auditLogs: AuditLog[];
  permissionCatalog: PermissionDefinition[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  currentActor: { id: string; name: string };

  getEffectivePermissions: (employeeId?: string) => Record<string, boolean>;
  hasPermission: (permissionId: string, employeeId?: string, propertyId?: string) => boolean;
  getRoleById: (roleId: string) => Role | undefined;
  getEmployeeById: (employeeId: string) => Employee | undefined;

  toggleRolePermission: (roleId: string, permissionId: string, confirmedHighRisk?: boolean) => boolean;
  batchUpdateRolePermissions: (roleId: string, newPermissions: Record<string, boolean>) => void;
  createRole: (roleData: { name: string; description: string; authorityLevel: AuthorityLevel; permissions: Record<string, boolean>; color?: string }) => Role;
  updateRole: (roleId: string, roleData: { name: string; description: string; authorityLevel?: AuthorityLevel; permissions?: Record<string, boolean>; color?: string }) => boolean;
  duplicateRole: (roleId: string, newName?: string) => Role;
  deleteRole: (roleId: string) => { success: boolean; message: string };

  createEmployee: (employeeData: { name: string; email: string; phone: string; avatar?: string; roleId: string; status?: 'active' | 'inactive'; assignedProperties: string[]; propertyAccessScope?: 'all' | 'selected' }) => Employee;
  updateEmployee: (employeeId: string, updates: Partial<Employee>) => void;
  changeEmployeeRole: (employeeId: string, newRoleId: string) => boolean;
  toggleEmployeeStatus: (employeeId: string) => void;
  setEmployeeOverride: (employeeId: string, permissionId: string, overrideValue: boolean | null) => void;
  clearEmployeeOverrides: (employeeId: string) => void;
  deleteEmployee: (employeeId: string) => boolean;
  resetEmployeePassword: (employeeId: string) => Promise<string>;

  bulkAssignRole: (employeeIds: string[], roleId: string) => void;
  bulkAssignProperties: (employeeIds: string[], propertyIds: string[]) => void;
  bulkSetStatus: (employeeIds: string[], status: 'active' | 'inactive') => void;

  logAction: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  clearAuditLogs: () => void;
  resetToDefaults: () => void;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const replaceById = <T extends { id: string }>(list: T[], item: T): T[] => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

export const RBACProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isOwner, isEmployee, isSuperAdmin, isLoading: authLoading } = useAuth();

  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rolesRef = useRef(roles);
  const employeesRef = useRef(employees);
  rolesRef.current = roles;
  employeesRef.current = employees;

  const currentActor = useMemo(() => ({ id: user?.id || 'anonymous', name: user?.name || 'Owner' }), [user]);
  const canUseRbac = isOwner || isEmployee || isSuperAdmin;

  const refresh = useCallback(async () => {
    if (!canUseRbac) {
      setRoles([]);
      setEmployees([]);
      setAuditLogs([]);
      return;
    }
    setIsLoading(true);
    try {
      const snap = await ApiClient.rbac.snapshot();
      setRoles(snap.roles || []);
      setEmployees(snap.employees || []);
      setAuditLogs(snap.auditLogs || []);
    } catch (err) {
      reportSyncError('Could not load roles & staff', err);
    } finally {
      setIsLoading(false);
    }
  }, [canUseRbac]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh, user?.id]);

  // -------------------------------------------------------------------------------------------

  const logAction = useCallback((logData: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = { ...logData, id: uid('aud'), timestamp: new Date().toISOString() };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 499)]);
    ApiClient.rbac.logAudit(logData).catch(() => undefined);
  }, []);

  const persistRole = (role: Role, previous: Role | null, label: string) => {
    ApiClient.rbac.upsertRole(role as unknown as { id?: string } & Record<string, unknown>)
      .then((saved: Role) => setRoles((prev) => replaceById(prev, saved)))
      .catch((err) => {
        setRoles((prev) => (previous ? replaceById(prev, previous) : prev.filter((r) => r.id !== role.id)));
        reportSyncError(label, err);
      });
  };

  const persistEmployee = (employee: Employee, previous: Employee | null, label: string) => {
    ApiClient.rbac.upsertEmployee(employee as unknown as { id?: string } & Record<string, unknown>)
      .then((saved: Employee & { temporaryPassword?: string }) => {
        const { temporaryPassword, ...rest } = saved;
        setEmployees((prev) => replaceById(prev, rest as Employee));
        if (temporaryPassword) {
          syncBus.publish('success', `Login created for ${rest.name} (${rest.email}). Temporary password: ${temporaryPassword}`);
        }
      })
      .catch((err) => {
        setEmployees((prev) => (previous ? replaceById(prev, previous) : prev.filter((e) => e.id !== employee.id)));
        reportSyncError(label, err);
      });
  };

  const getRoleById = useCallback((roleId: string) => roles.find((r) => r.id === roleId), [roles]);
  const getEmployeeById = useCallback((employeeId: string) => employees.find((e) => e.id === employeeId), [employees]);

  const findSelf = useCallback(() => employees.find((e) => e.id === user?.employeeId) || employees.find((e) => e.email === user?.email), [employees, user?.email, user?.employeeId]);

  /** Effective permissions: employee override > role permission > false. Owners always have everything. */
  const getEffectivePermissions = useCallback(
    (employeeId?: string): Record<string, boolean> => {
      if (!employeeId && (isOwner || isSuperAdmin)) return getAllPermissionsTrue();
      const targetEmp = employeeId ? employees.find((e) => e.id === employeeId) : findSelf();
      if (!targetEmp) return isOwner || isSuperAdmin ? getAllPermissionsTrue() : user?.permissions || {};
      const role = roles.find((r) => r.id === targetEmp.roleId);
      if (role?.isOwnerRole) return getAllPermissionsTrue();
      const effective: Record<string, boolean> = { ...(role?.permissions || {}) };
      Object.entries(targetEmp.overrides || {}).forEach(([permId, granted]) => {
        if (typeof granted === 'boolean') effective[permId] = granted;
      });
      return effective;
    },
    [employees, roles, findSelf, isOwner, isSuperAdmin, user?.permissions]
  );

  const hasPermission = useCallback(
    (permissionId: string, employeeId?: string, propertyId?: string): boolean => {
      if (!employeeId && (isOwner || isSuperAdmin)) return true;
      const targetEmp = employeeId ? employees.find((e) => e.id === employeeId) : findSelf();
      if (!targetEmp) return !!user?.permissions?.[permissionId];
      if (targetEmp.status === 'inactive') return false;
      if (propertyId && targetEmp.assignedProperties && !targetEmp.assignedProperties.includes('all') && !targetEmp.assignedProperties.includes(propertyId)) return false;
      return !!getEffectivePermissions(targetEmp.id)[permissionId];
    },
    [employees, findSelf, getEffectivePermissions, isOwner, isSuperAdmin, user?.permissions]
  );

  // ---- Roles ---------------------------------------------------------------------------------

  const toggleRolePermission = useCallback(
    (roleId: string, permissionId: string): boolean => {
      const targetRole = rolesRef.current.find((r) => r.id === roleId);
      if (!targetRole || targetRole.isOwnerRole) return false;
      const currentValue = !!targetRole.permissions[permissionId];
      const newValue = !currentValue;
      const permDef = PERMISSION_CATALOG.find((p) => p.id === permissionId);
      const updated: Role = { ...targetRole, permissions: { ...targetRole.permissions, [permissionId]: newValue }, updatedAt: new Date().toISOString() };
      setRoles((prev) => replaceById(prev, updated));
      persistRole(updated, targetRole, 'Could not update the role permission');
      logAction({
        actorId: currentActor.id, actorName: currentActor.name, targetType: 'role', targetId: roleId, targetName: targetRole.name,
        action: newValue ? 'Permission Granted' : 'Permission Revoked', permissionId, permissionLabel: permDef?.label || permissionId, oldValue: currentValue, newValue,
        note: `${currentActor.name} ${newValue ? 'granted' : 'revoked'} "${permDef?.label || permissionId}" for role ${targetRole.name}.`,
      });
      return true;
    },
    [currentActor, logAction]
  );

  const batchUpdateRolePermissions = useCallback(
    (roleId: string, newPermissions: Record<string, boolean>) => {
      const targetRole = rolesRef.current.find((r) => r.id === roleId);
      if (!targetRole || targetRole.isOwnerRole) return;
      const updated: Role = { ...targetRole, permissions: { ...targetRole.permissions, ...newPermissions }, updatedAt: new Date().toISOString() };
      setRoles((prev) => replaceById(prev, updated));
      persistRole(updated, targetRole, 'Could not update the permission matrix');
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'role', targetId: roleId, targetName: targetRole.name, action: 'Batch Permissions Updated', note: `${currentActor.name} updated permission matrix for role ${targetRole.name}.` });
    },
    [currentActor, logAction]
  );

  const createRole = useCallback(
    (roleData: { name: string; description: string; authorityLevel: AuthorityLevel; permissions: Record<string, boolean>; color?: string }): Role => {
      const newRole: Role = { id: uid('role'), name: roleData.name, description: roleData.description, isSystem: false, authorityLevel: roleData.authorityLevel, permissions: roleData.permissions, color: roleData.color || '#059669', createdAt: new Date().toISOString(), createdBy: currentActor.name };
      setRoles((prev) => [...prev, newRole]);
      persistRole(newRole, null, 'Could not create the role');
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'role', targetId: newRole.id, targetName: newRole.name, action: 'Role Created', note: `Created new custom role "${newRole.name}" with ${Object.values(newRole.permissions).filter(Boolean).length} permissions.` });
      return newRole;
    },
    [currentActor, logAction]
  );

  const updateRole = useCallback(
    (roleId: string, roleData: { name: string; description: string; authorityLevel?: AuthorityLevel; permissions?: Record<string, boolean>; color?: string }): boolean => {
      const targetRole = rolesRef.current.find((r) => r.id === roleId);
      if (!targetRole) return false;
      const updated: Role = {
        ...targetRole, name: roleData.name, description: roleData.description, authorityLevel: roleData.authorityLevel || targetRole.authorityLevel, color: roleData.color || targetRole.color,
        permissions: targetRole.isOwnerRole ? getAllPermissionsTrue() : roleData.permissions || targetRole.permissions, updatedAt: new Date().toISOString(),
      };
      setRoles((prev) => replaceById(prev, updated));
      setEmployees((prev) => prev.map((e) => (e.roleId === roleId ? { ...e, roleName: roleData.name } : e)));
      persistRole(updated, targetRole, 'Could not update the role');
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'role', targetId: roleId, targetName: roleData.name, action: 'Role Profile Updated', note: `Updated role configuration for "${roleData.name}".` });
      return true;
    },
    [currentActor, logAction]
  );

  const duplicateRole = useCallback(
    (roleId: string, newName?: string): Role => {
      const sourceRole = rolesRef.current.find((r) => r.id === roleId);
      const clonedRole: Role = {
        id: uid('role'), name: newName || `${sourceRole?.name || 'Role'} (Copy)`, description: `Cloned from ${sourceRole?.name || 'existing role'}. ${sourceRole?.description || ''}`,
        isSystem: false, authorityLevel: sourceRole?.authorityLevel || 'medium', permissions: { ...(sourceRole?.permissions || {}) }, color: '#2563eb', createdAt: new Date().toISOString(), createdBy: currentActor.name,
      };
      setRoles((prev) => [...prev, clonedRole]);
      persistRole(clonedRole, null, 'Could not duplicate the role');
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'role', targetId: clonedRole.id, targetName: clonedRole.name, action: 'Role Duplicated', note: `Duplicated role "${sourceRole?.name}" into new role "${clonedRole.name}".` });
      return clonedRole;
    },
    [currentActor, logAction]
  );

  const deleteRole = useCallback(
    (roleId: string): { success: boolean; message: string } => {
      const targetRole = rolesRef.current.find((r) => r.id === roleId);
      if (!targetRole) return { success: false, message: 'Role not found.' };
      if (targetRole.isSystem || targetRole.isOwnerRole) return { success: false, message: 'System protected roles cannot be deleted.' };
      const assignedCount = employeesRef.current.filter((e) => e.roleId === roleId).length;
      if (assignedCount > 0) return { success: false, message: `Cannot delete "${targetRole.name}" because it is currently assigned to ${assignedCount} employee(s). Reassign them first.` };
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      ApiClient.rbac.deleteRole(roleId).catch((err) => {
        setRoles((prev) => [...prev, targetRole]);
        reportSyncError('Could not delete the role', err);
      });
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'role', targetId: roleId, targetName: targetRole.name, action: 'Role Deleted', note: `Permanently removed custom role "${targetRole.name}".` });
      return { success: true, message: `Role "${targetRole.name}" deleted successfully.` };
    },
    [currentActor, logAction]
  );

  // ---- Employees -----------------------------------------------------------------------------

  const mutateEmployee = (employeeId: string, mutator: (e: Employee) => Employee, label: string) => {
    const current = employeesRef.current.find((e) => e.id === employeeId);
    if (!current) return null;
    const updated = mutator(current);
    setEmployees((prev) => replaceById(prev, updated));
    persistEmployee(updated, current, label);
    return { current, updated };
  };

  const createEmployee = useCallback(
    (data: { name: string; email: string; phone: string; avatar?: string; roleId: string; status?: 'active' | 'inactive'; assignedProperties: string[]; propertyAccessScope?: 'all' | 'selected' }): Employee => {
      const role = rolesRef.current.find((r) => r.id === data.roleId);
      const newEmployee: Employee = {
        id: uid('emp'), name: data.name, email: data.email, phone: data.phone,
        avatar: data.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}`,
        roleId: data.roleId, roleName: role?.name || 'Property Manager', status: data.status || 'active',
        assignedProperties: data.assignedProperties.length ? data.assignedProperties : ['all'],
        propertyAccessScope: data.propertyAccessScope || (data.assignedProperties.includes('all') ? 'all' : 'selected'),
        lastActive: 'Never', joinedAt: new Date().toISOString().split('T')[0],
      };
      setEmployees((prev) => [newEmployee, ...prev]);
      persistEmployee(newEmployee, null, 'Could not add the employee');
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'employee', targetId: newEmployee.id, targetName: newEmployee.name, action: 'Employee Added', note: `Added employee ${newEmployee.name} with role ${newEmployee.roleName}.` });
      return newEmployee;
    },
    [currentActor, logAction]
  );

  const updateEmployee = useCallback(
    (employeeId: string, updates: Partial<Employee>) => {
      const res = mutateEmployee(employeeId, (e) => {
        const role = updates.roleId ? rolesRef.current.find((r) => r.id === updates.roleId) : undefined;
        return { ...e, ...updates, roleName: role ? role.name : e.roleName };
      }, 'Could not update the employee');
      if (!res) return;
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'employee', targetId: employeeId, targetName: updates.name || res.current.name, action: 'Employee Profile Updated', note: `Updated employee details for ${updates.name || res.current.name}.` });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentActor, logAction]
  );

  const changeEmployeeRole = useCallback(
    (employeeId: string, newRoleId: string): boolean => {
      const newRole = rolesRef.current.find((r) => r.id === newRoleId);
      if (!newRole) return false;
      const res = mutateEmployee(employeeId, (e) => ({ ...e, roleId: newRoleId, roleName: newRole.name }), 'Could not change the role');
      if (!res) return false;
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'employee', targetId: employeeId, targetName: res.current.name, action: 'Role Changed', oldValue: res.current.roleName, newValue: newRole.name, note: `Changed role for ${res.current.name} from "${res.current.roleName}" to "${newRole.name}".` });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentActor, logAction]
  );

  const toggleEmployeeStatus = useCallback(
    (employeeId: string) => {
      const res = mutateEmployee(employeeId, (e) => ({ ...e, status: e.status === 'active' ? 'inactive' : 'active' }), 'Could not change the employee status');
      if (!res) return;
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'employee', targetId: employeeId, targetName: res.current.name, action: res.updated.status === 'active' ? 'Employee Activated' : 'Employee Deactivated', oldValue: res.current.status, newValue: res.updated.status, note: `${currentActor.name} marked ${res.current.name} as ${res.updated.status}.` });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentActor, logAction]
  );

  const setEmployeeOverride = useCallback(
    (employeeId: string, permissionId: string, overrideValue: boolean | null) => {
      const permDef = PERMISSION_CATALOG.find((p) => p.id === permissionId);
      const res = mutateEmployee(employeeId, (e) => {
        const overrides = { ...(e.overrides || {}) };
        if (overrideValue === null) delete overrides[permissionId];
        else overrides[permissionId] = overrideValue;
        return { ...e, overrides };
      }, 'Could not update the permission override');
      if (!res) return;
      const oldOverrides = res.current.overrides || {};
      logAction({
        actorId: currentActor.id, actorName: currentActor.name, targetType: 'permission', targetId: employeeId, targetName: `${res.current.name} (${res.current.roleName})`,
        action: overrideValue === null ? 'Override Cleared' : overrideValue ? 'Override Granted' : 'Override Denied', permissionId, permissionLabel: permDef?.label || permissionId,
        oldValue: oldOverrides[permissionId] ?? 'Inherited from Role', newValue: overrideValue ?? 'Inherited from Role',
        note: `Custom override ${overrideValue === null ? 'cleared' : overrideValue ? 'granted' : 'denied'} for "${permDef?.label || permissionId}" on employee ${res.current.name}.`,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentActor, logAction]
  );

  const clearEmployeeOverrides = useCallback((employeeId: string) => {
    mutateEmployee(employeeId, (e) => ({ ...e, overrides: {} }), 'Could not clear overrides');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteEmployee = useCallback(
    (employeeId: string): boolean => {
      const targetEmp = employeesRef.current.find((e) => e.id === employeeId);
      if (!targetEmp) return false;
      const role = rolesRef.current.find((r) => r.id === targetEmp.roleId);
      if (role?.isOwnerRole || targetEmp.email === user?.email) return false;
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
      ApiClient.rbac.deleteEmployee(employeeId).catch((err) => {
        setEmployees((prev) => [targetEmp, ...prev]);
        reportSyncError('Could not remove the employee', err);
      });
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'employee', targetId: employeeId, targetName: targetEmp.name, action: 'Employee Deleted', note: `Removed employee profile for ${targetEmp.name}.` });
      return true;
    },
    [currentActor, logAction, user?.email]
  );

  const resetEmployeePassword = useCallback(async (employeeId: string) => {
    const res = await ApiClient.rbac.resetEmployeePassword(employeeId);
    const emp = employeesRef.current.find((e) => e.id === employeeId);
    logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'employee', targetId: employeeId, targetName: emp?.name || employeeId, action: 'Password Reset', note: `Temporary password issued for ${emp?.name || employeeId}.` });
    return res.temporaryPassword;
  }, [currentActor, logAction]);

  // ---- Bulk ----------------------------------------------------------------------------------

  const bulkAssignRole = useCallback(
    (employeeIds: string[], roleId: string) => {
      const role = rolesRef.current.find((r) => r.id === roleId);
      if (!role || role.isOwnerRole) return;
      for (const id of employeeIds) mutateEmployee(id, (e) => (rolesRef.current.find((r) => r.id === e.roleId)?.isOwnerRole ? e : { ...e, roleId, roleName: role.name }), 'Could not assign the role');
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'role', targetId: roleId, targetName: role.name, action: 'Bulk Role Assigned', note: `Assigned role "${role.name}" to ${employeeIds.length} employee(s).` });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentActor, logAction]
  );

  const bulkAssignProperties = useCallback(
    (employeeIds: string[], propertyIds: string[]) => {
      for (const id of employeeIds) mutateEmployee(id, (e) => ({ ...e, assignedProperties: propertyIds, propertyAccessScope: propertyIds.includes('all') ? 'all' : 'selected' }), 'Could not update property access');
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'employee', targetId: 'bulk', targetName: 'Multiple Employees', action: 'Bulk Properties Assigned', note: `Updated property access scope for ${employeeIds.length} employee(s).` });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentActor, logAction]
  );

  const bulkSetStatus = useCallback(
    (employeeIds: string[], status: 'active' | 'inactive') => {
      for (const id of employeeIds) mutateEmployee(id, (e) => (rolesRef.current.find((r) => r.id === e.roleId)?.isOwnerRole ? e : { ...e, status }), 'Could not update the employee status');
      logAction({ actorId: currentActor.id, actorName: currentActor.name, targetType: 'employee', targetId: 'bulk', targetName: 'Multiple Employees', action: status === 'active' ? 'Bulk Activated' : 'Bulk Deactivated', note: `Marked ${employeeIds.length} employee(s) as ${status}.` });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentActor, logAction]
  );

  const clearAuditLogs = useCallback(() => setAuditLogs([]), []);
  const resetToDefaults = useCallback(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<RBACContextType>(
    () => ({
      roles, employees, auditLogs, permissionCatalog: PERMISSION_CATALOG, isLoading, refresh, selectedEmployeeId, setSelectedEmployeeId, currentActor,
      getEffectivePermissions, hasPermission, getRoleById, getEmployeeById,
      toggleRolePermission, batchUpdateRolePermissions, createRole, updateRole, duplicateRole, deleteRole,
      createEmployee, updateEmployee, changeEmployeeRole, toggleEmployeeStatus, setEmployeeOverride, clearEmployeeOverrides, deleteEmployee, resetEmployeePassword,
      bulkAssignRole, bulkAssignProperties, bulkSetStatus, logAction, clearAuditLogs, resetToDefaults,
    }),
    [roles, employees, auditLogs, isLoading, refresh, selectedEmployeeId, currentActor, getEffectivePermissions, hasPermission, getRoleById, getEmployeeById, toggleRolePermission, batchUpdateRolePermissions, createRole, updateRole, duplicateRole, deleteRole, createEmployee, updateEmployee, changeEmployeeRole, toggleEmployeeStatus, setEmployeeOverride, clearEmployeeOverrides, deleteEmployee, resetEmployeePassword, bulkAssignRole, bulkAssignProperties, bulkSetStatus, logAction, clearAuditLogs, resetToDefaults]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
};

export const useRBAC = (): RBACContextType => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};
