import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Role,
  Employee,
  AuditLog,
  PermissionDefinition,
  AuthorityLevel,
} from '../types/rbac';
import {
  PERMISSION_CATALOG,
  INITIAL_ROLES,
  INITIAL_EMPLOYEES,
  INITIAL_AUDIT_LOGS,
  getAllPermissionsTrue,
} from '../data/rbacData';
import { useAuth } from './AuthContext';

interface RBACContextType {
  roles: Role[];
  employees: Employee[];
  auditLogs: AuditLog[];
  permissionCatalog: PermissionDefinition[];
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  currentActor: { id: string; name: string };
  
  // Permission Checkers
  getEffectivePermissions: (employeeId?: string) => Record<string, boolean>;
  hasPermission: (permissionId: string, employeeId?: string, propertyId?: string) => boolean;
  getRoleById: (roleId: string) => Role | undefined;
  getEmployeeById: (employeeId: string) => Employee | undefined;
  
  // Role Operations
  toggleRolePermission: (roleId: string, permissionId: string, confirmedHighRisk?: boolean) => boolean;
  batchUpdateRolePermissions: (roleId: string, newPermissions: Record<string, boolean>) => void;
  createRole: (roleData: {
    name: string;
    description: string;
    authorityLevel: AuthorityLevel;
    permissions: Record<string, boolean>;
    color?: string;
  }) => Role;
  updateRole: (
    roleId: string,
    roleData: {
      name: string;
      description: string;
      authorityLevel?: AuthorityLevel;
      permissions?: Record<string, boolean>;
      color?: string;
    }
  ) => boolean;
  duplicateRole: (roleId: string, newName?: string) => Role;
  deleteRole: (roleId: string) => { success: boolean; message: string };
  
  // Employee Operations
  createEmployee: (employeeData: {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    roleId: string;
    status?: 'active' | 'inactive';
    assignedProperties: string[];
    propertyAccessScope?: 'all' | 'selected';
  }) => Employee;
  updateEmployee: (employeeId: string, updates: Partial<Employee>) => void;
  changeEmployeeRole: (employeeId: string, newRoleId: string) => boolean;
  toggleEmployeeStatus: (employeeId: string) => void;
  setEmployeeOverride: (employeeId: string, permissionId: string, overrideValue: boolean | null) => void;
  clearEmployeeOverrides: (employeeId: string) => void;
  deleteEmployee: (employeeId: string) => boolean;
  
  // Bulk Employee Operations
  bulkAssignRole: (employeeIds: string[], roleId: string) => void;
  bulkAssignProperties: (employeeIds: string[], propertyIds: string[]) => void;
  bulkSetStatus: (employeeIds: string[], status: 'active' | 'inactive') => void;
  
  // Audit Logs
  logAction: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  clearAuditLogs: () => void;
  
  // Reset demo state
  resetToDefaults: () => void;
}

const STORAGE_KEYS = {
  ROLES: 'nestin_rbac_roles_v2',
  EMPLOYEES: 'nestin_rbac_employees_v2',
  AUDIT_LOGS: 'nestin_rbac_audit_logs_v2',
};

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const RBACProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const currentActor = useMemo(() => {
    return {
      id: user?.id || 'emp-1',
      name: user?.name || 'Paritala Venkata Vaibhav',
    };
  }, [user]);

  // Load from localStorage or defaults
  const [roles, setRoles] = useState<Role[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROLES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_ROLES;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_EMPLOYEES;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
    } catch {
      // ignore
    }
  }, [roles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    } catch {
      // ignore
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  // Log action helper
  const logAction = useCallback(
    (logData: Omit<AuditLog, 'id' | 'timestamp'>) => {
      const newLog: AuditLog = {
        ...logData,
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
      };
      setAuditLogs((prev) => [newLog, ...prev.slice(0, 199)]); // Keep last 200 logs
    },
    []
  );

  const getRoleById = useCallback(
    (roleId: string): Role | undefined => {
      return roles.find((r) => r.id === roleId);
    },
    [roles]
  );

  const getEmployeeById = useCallback(
    (employeeId: string): Employee | undefined => {
      return employees.find((e) => e.id === employeeId);
    },
    [employees]
  );

  // Effective permissions calculator
  // Priority: Employee Override > Role Permission > False
  // Protected rule: Owner role always has all permissions True
  const getEffectivePermissions = useCallback(
    (employeeId?: string): Record<string, boolean> => {
      // If no employeeId provided, check if current user matches an employee or default to Owner
      const targetEmp = employeeId
        ? employees.find((e) => e.id === employeeId)
        : employees.find((e) => e.email === user?.email || e.id === 'emp-1') || employees[0];

      if (!targetEmp) return getAllPermissionsTrue();

      const role = roles.find((r) => r.id === targetEmp.roleId);

      // System Owner gets full permissions always
      if (role?.isOwnerRole || targetEmp.roleId === 'role-owner') {
        return getAllPermissionsTrue();
      }

      // Base role permissions
      const effective: Record<string, boolean> = { ...(role?.permissions || {}) };

      // Apply individual employee overrides
      if (targetEmp.overrides) {
        Object.entries(targetEmp.overrides).forEach(([permId, isGranted]) => {
          if (typeof isGranted === 'boolean') {
            effective[permId] = isGranted;
          }
        });
      }

      return effective;
    },
    [employees, roles, user?.email]
  );

  // High-level authorization check
  const hasPermission = useCallback(
    (permissionId: string, employeeId?: string, propertyId?: string): boolean => {
      const targetEmp = employeeId
        ? employees.find((e) => e.id === employeeId)
        : employees.find((e) => e.email === user?.email || e.id === 'emp-1') || employees[0];

      if (!targetEmp) return true; // Default fallback for owner/root

      // If employee is inactive, deny all
      if (targetEmp.status === 'inactive') return false;

      // Check property scope if propertyId is provided
      if (propertyId && targetEmp.assignedProperties && !targetEmp.assignedProperties.includes('all')) {
        if (!targetEmp.assignedProperties.includes(propertyId)) {
          return false;
        }
      }

      const effective = getEffectivePermissions(targetEmp.id);
      return !!effective[permissionId];
    },
    [employees, getEffectivePermissions, user?.email]
  );

  // Toggle role permission
  const toggleRolePermission = useCallback(
    (roleId: string, permissionId: string): boolean => {
      const targetRole = roles.find((r) => r.id === roleId);
      if (!targetRole) return false;

      // Lockout prevention: Owner role cannot have permissions disabled
      if (targetRole.isOwnerRole) {
        return false;
      }

      const currentValue = !!targetRole.permissions[permissionId];
      const newValue = !currentValue;
      const permDef = PERMISSION_CATALOG.find((p) => p.id === permissionId);

      setRoles((prev) =>
        prev.map((r) => {
          if (r.id === roleId) {
            return {
              ...r,
              permissions: {
                ...r.permissions,
                [permissionId]: newValue,
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return r;
        })
      );

      // Audit Log
      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'role',
        targetId: roleId,
        targetName: targetRole.name,
        action: newValue ? 'Permission Granted' : 'Permission Revoked',
        permissionId,
        permissionLabel: permDef?.label || permissionId,
        oldValue: currentValue,
        newValue,
        note: `${currentActor.name} ${newValue ? 'granted' : 'revoked'} "${permDef?.label || permissionId}" for role ${targetRole.name}.`,
      });

      return true;
    },
    [roles, currentActor, logAction]
  );

  // Batch update role permissions
  const batchUpdateRolePermissions = useCallback(
    (roleId: string, newPermissions: Record<string, boolean>) => {
      const targetRole = roles.find((r) => r.id === roleId);
      if (!targetRole || targetRole.isOwnerRole) return;

      setRoles((prev) =>
        prev.map((r) => {
          if (r.id === roleId) {
            return {
              ...r,
              permissions: { ...r.permissions, ...newPermissions },
              updatedAt: new Date().toISOString(),
            };
          }
          return r;
        })
      );

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'role',
        targetId: roleId,
        targetName: targetRole.name,
        action: 'Batch Permissions Updated',
        note: `${currentActor.name} updated permission matrix for role ${targetRole.name}.`,
      });
    },
    [roles, currentActor, logAction]
  );

  // Create new role
  const createRole = useCallback(
    (roleData: {
      name: string;
      description: string;
      authorityLevel: AuthorityLevel;
      permissions: Record<string, boolean>;
      color?: string;
    }): Role => {
      const newRole: Role = {
        id: `role-${Date.now()}`,
        name: roleData.name,
        description: roleData.description,
        isSystem: false,
        authorityLevel: roleData.authorityLevel,
        permissions: roleData.permissions,
        color: roleData.color || '#059669',
        createdAt: new Date().toISOString(),
        createdBy: currentActor.name,
      };

      setRoles((prev) => [...prev, newRole]);

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'role',
        targetId: newRole.id,
        targetName: newRole.name,
        action: 'Role Created',
        note: `Created new custom role "${newRole.name}" with ${Object.values(newRole.permissions).filter(Boolean).length} permissions.`,
      });

      return newRole;
    },
    [currentActor, logAction]
  );

  // Update existing role
  const updateRole = useCallback(
    (
      roleId: string,
      roleData: {
        name: string;
        description: string;
        authorityLevel?: AuthorityLevel;
        permissions?: Record<string, boolean>;
        color?: string;
      }
    ): boolean => {
      const targetRole = roles.find((r) => r.id === roleId);
      if (!targetRole) return false;

      setRoles((prev) =>
        prev.map((r) => {
          if (r.id === roleId) {
            return {
              ...r,
              name: roleData.name,
              description: roleData.description,
              authorityLevel: roleData.authorityLevel || r.authorityLevel,
              color: roleData.color || r.color,
              permissions: r.isOwnerRole ? getAllPermissionsTrue() : roleData.permissions || r.permissions,
              updatedAt: new Date().toISOString(),
            };
          }
          return r;
        })
      );

      // Sync roleName in employees
      setEmployees((prev) =>
        prev.map((e) => {
          if (e.roleId === roleId) {
            return { ...e, roleName: roleData.name };
          }
          return e;
        })
      );

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'role',
        targetId: roleId,
        targetName: roleData.name,
        action: 'Role Profile Updated',
        note: `Updated role configuration for "${roleData.name}".`,
      });

      return true;
    },
    [roles, currentActor, logAction]
  );

  // Duplicate role
  const duplicateRole = useCallback(
    (roleId: string, newName?: string): Role => {
      const sourceRole = roles.find((r) => r.id === roleId);
      const targetName = newName || `${sourceRole?.name || 'Role'} (Copy)`;

      const clonedRole: Role = {
        id: `role-custom-${Date.now()}`,
        name: targetName,
        description: `Cloned from ${sourceRole?.name || 'existing role'}. ${sourceRole?.description || ''}`,
        isSystem: false,
        authorityLevel: sourceRole?.authorityLevel || 'medium',
        permissions: { ...(sourceRole?.permissions || {}) },
        color: '#2563eb',
        createdAt: new Date().toISOString(),
        createdBy: currentActor.name,
      };

      setRoles((prev) => [...prev, clonedRole]);

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'role',
        targetId: clonedRole.id,
        targetName: clonedRole.name,
        action: 'Role Duplicated',
        note: `Duplicated role "${sourceRole?.name}" into new role "${clonedRole.name}".`,
      });

      return clonedRole;
    },
    [roles, currentActor, logAction]
  );

  // Delete role
  const deleteRole = useCallback(
    (roleId: string): { success: boolean; message: string } => {
      const targetRole = roles.find((r) => r.id === roleId);
      if (!targetRole) {
        return { success: false, message: 'Role not found.' };
      }

      if (targetRole.isSystem || targetRole.isOwnerRole) {
        return { success: false, message: 'System protected roles cannot be deleted.' };
      }

      // Check if employees are assigned to this role
      const assignedCount = employees.filter((e) => e.roleId === roleId).length;
      if (assignedCount > 0) {
        return {
          success: false,
          message: `Cannot delete "${targetRole.name}" because it is currently assigned to ${assignedCount} employee(s). Reassign them first.`,
        };
      }

      setRoles((prev) => prev.filter((r) => r.id !== roleId));

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'role',
        targetId: roleId,
        targetName: targetRole.name,
        action: 'Role Deleted',
        note: `Permanently removed custom role "${targetRole.name}".`,
      });

      return { success: true, message: `Role "${targetRole.name}" deleted successfully.` };
    },
    [roles, employees, currentActor, logAction]
  );

  // Create employee
  const createEmployee = useCallback(
    (data: {
      name: string;
      email: string;
      phone: string;
      avatar?: string;
      roleId: string;
      status?: 'active' | 'inactive';
      assignedProperties: string[];
      propertyAccessScope?: 'all' | 'selected';
    }): Employee => {
      const role = roles.find((r) => r.id === data.roleId);
      const newEmployee: Employee = {
        id: `emp-${Date.now()}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar:
          data.avatar ||
          `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&auto=format&fit=crop&q=80`,
        roleId: data.roleId,
        roleName: role?.name || 'Property Manager',
        status: data.status || 'active',
        assignedProperties: data.assignedProperties.length ? data.assignedProperties : ['all'],
        propertyAccessScope: data.propertyAccessScope || (data.assignedProperties.includes('all') ? 'all' : 'selected'),
        lastActive: 'Just now',
        joinedAt: new Date().toISOString().split('T')[0],
      };

      setEmployees((prev) => [newEmployee, ...prev]);

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'employee',
        targetId: newEmployee.id,
        targetName: newEmployee.name,
        action: 'Employee Added',
        note: `Added employee ${newEmployee.name} with role ${newEmployee.roleName}.`,
      });

      return newEmployee;
    },
    [roles, currentActor, logAction]
  );

  // Update employee
  const updateEmployee = useCallback(
    (employeeId: string, updates: Partial<Employee>) => {
      const targetEmp = employees.find((e) => e.id === employeeId);
      if (!targetEmp) return;

      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === employeeId) {
            const role = updates.roleId ? roles.find((r) => r.id === updates.roleId) : undefined;
            return {
              ...e,
              ...updates,
              roleName: role ? role.name : e.roleName,
            };
          }
          return e;
        })
      );

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'employee',
        targetId: employeeId,
        targetName: updates.name || targetEmp.name,
        action: 'Employee Profile Updated',
        note: `Updated employee details for ${updates.name || targetEmp.name}.`,
      });
    },
    [employees, roles, currentActor, logAction]
  );

  // Change employee role
  const changeEmployeeRole = useCallback(
    (employeeId: string, newRoleId: string): boolean => {
      const targetEmp = employees.find((e) => e.id === employeeId);
      const newRole = roles.find((r) => r.id === newRoleId);
      if (!targetEmp || !newRole) return false;

      const oldRoleName = targetEmp.roleName;

      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === employeeId) {
            return {
              ...e,
              roleId: newRoleId,
              roleName: newRole.name,
            };
          }
          return e;
        })
      );

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'employee',
        targetId: employeeId,
        targetName: targetEmp.name,
        action: 'Role Changed',
        oldValue: oldRoleName,
        newValue: newRole.name,
        note: `Changed role for ${targetEmp.name} from "${oldRoleName}" to "${newRole.name}".`,
      });

      return true;
    },
    [employees, roles, currentActor, logAction]
  );

  // Toggle status (Active / Inactive)
  const toggleEmployeeStatus = useCallback(
    (employeeId: string) => {
      const targetEmp = employees.find((e) => e.id === employeeId);
      if (!targetEmp) return;

      const newStatus = targetEmp.status === 'active' ? 'inactive' : 'active';

      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === employeeId) {
            return { ...e, status: newStatus };
          }
          return e;
        })
      );

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'employee',
        targetId: employeeId,
        targetName: targetEmp.name,
        action: newStatus === 'active' ? 'Employee Activated' : 'Employee Deactivated',
        oldValue: targetEmp.status,
        newValue: newStatus,
        note: `${currentActor.name} marked ${targetEmp.name} as ${newStatus}.`,
      });
    },
    [employees, currentActor, logAction]
  );

  // Set individual permission override for employee
  const setEmployeeOverride = useCallback(
    (employeeId: string, permissionId: string, overrideValue: boolean | null) => {
      const targetEmp = employees.find((e) => e.id === employeeId);
      if (!targetEmp) return;

      const permDef = PERMISSION_CATALOG.find((p) => p.id === permissionId);
      const oldOverrides = targetEmp.overrides || {};
      const newOverrides = { ...oldOverrides };

      if (overrideValue === null) {
        delete newOverrides[permissionId];
      } else {
        newOverrides[permissionId] = overrideValue;
      }

      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === employeeId) {
            return { ...e, overrides: newOverrides };
          }
          return e;
        })
      );

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'permission',
        targetId: employeeId,
        targetName: `${targetEmp.name} (${targetEmp.roleName})`,
        action:
          overrideValue === null
            ? 'Override Cleared'
            : overrideValue
            ? 'Override Granted'
            : 'Override Denied',
        permissionId,
        permissionLabel: permDef?.label || permissionId,
        oldValue: oldOverrides[permissionId] ?? 'Inherited from Role',
        newValue: overrideValue ?? 'Inherited from Role',
        note: `Custom override ${
          overrideValue === null ? 'cleared' : overrideValue ? 'granted' : 'denied'
        } for "${permDef?.label || permissionId}" on employee ${targetEmp.name}.`,
      });
    },
    [employees, currentActor, logAction]
  );

  // Clear all employee overrides
  const clearEmployeeOverrides = useCallback(
    (employeeId: string) => {
      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === employeeId) {
            return { ...e, overrides: {} };
          }
          return e;
        })
      );
    },
    []
  );

  // Delete employee
  const deleteEmployee = useCallback(
    (employeeId: string): boolean => {
      const targetEmp = employees.find((e) => e.id === employeeId);
      if (!targetEmp) return false;

      // Prevent deleting the primary Owner account
      if (targetEmp.id === 'emp-1' || targetEmp.roleId === 'role-owner') {
        return false;
      }

      setEmployees((prev) => prev.filter((e) => e.id !== employeeId));

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'employee',
        targetId: employeeId,
        targetName: targetEmp.name,
        action: 'Employee Deleted',
        note: `Removed employee profile for ${targetEmp.name}.`,
      });

      return true;
    },
    [employees, currentActor, logAction]
  );

  // Bulk actions
  const bulkAssignRole = useCallback(
    (employeeIds: string[], roleId: string) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role) return;

      setEmployees((prev) =>
        prev.map((e) => {
          if (employeeIds.includes(e.id) && e.id !== 'emp-1') {
            return { ...e, roleId, roleName: role.name };
          }
          return e;
        })
      );

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'role',
        targetId: roleId,
        targetName: role.name,
        action: 'Bulk Role Assigned',
        note: `Assigned role "${role.name}" to ${employeeIds.length} employee(s).`,
      });
    },
    [roles, currentActor, logAction]
  );

  const bulkAssignProperties = useCallback(
    (employeeIds: string[], propertyIds: string[]) => {
      setEmployees((prev) =>
        prev.map((e) => {
          if (employeeIds.includes(e.id)) {
            return {
              ...e,
              assignedProperties: propertyIds,
              propertyAccessScope: propertyIds.includes('all') ? 'all' : 'selected',
            };
          }
          return e;
        })
      );

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'employee',
        targetId: 'bulk',
        targetName: 'Multiple Employees',
        action: 'Bulk Properties Assigned',
        note: `Updated property access scope for ${employeeIds.length} employee(s).`,
      });
    },
    [currentActor, logAction]
  );

  const bulkSetStatus = useCallback(
    (employeeIds: string[], status: 'active' | 'inactive') => {
      setEmployees((prev) =>
        prev.map((e) => {
          if (employeeIds.includes(e.id) && e.id !== 'emp-1') {
            return { ...e, status };
          }
          return e;
        })
      );

      logAction({
        actorId: currentActor.id,
        actorName: currentActor.name,
        targetType: 'employee',
        targetId: 'bulk',
        targetName: 'Multiple Employees',
        action: status === 'active' ? 'Bulk Activated' : 'Bulk Deactivated',
        note: `Marked ${employeeIds.length} employee(s) as ${status}.`,
      });
    },
    [currentActor, logAction]
  );

  const clearAuditLogs = useCallback(() => {
    setAuditLogs([]);
  }, []);

  const resetToDefaults = useCallback(() => {
    setRoles(INITIAL_ROLES);
    setEmployees(INITIAL_EMPLOYEES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.ROLES);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
  }, []);

  const value = useMemo(
    () => ({
      roles,
      employees,
      auditLogs,
      permissionCatalog: PERMISSION_CATALOG,
      selectedEmployeeId,
      setSelectedEmployeeId,
      currentActor,
      getEffectivePermissions,
      hasPermission,
      getRoleById,
      getEmployeeById,
      toggleRolePermission,
      batchUpdateRolePermissions,
      createRole,
      updateRole,
      duplicateRole,
      deleteRole,
      createEmployee,
      updateEmployee,
      changeEmployeeRole,
      toggleEmployeeStatus,
      setEmployeeOverride,
      clearEmployeeOverrides,
      deleteEmployee,
      bulkAssignRole,
      bulkAssignProperties,
      bulkSetStatus,
      logAction,
      clearAuditLogs,
      resetToDefaults,
    }),
    [
      roles,
      employees,
      auditLogs,
      selectedEmployeeId,
      currentActor,
      getEffectivePermissions,
      hasPermission,
      getRoleById,
      getEmployeeById,
      toggleRolePermission,
      batchUpdateRolePermissions,
      createRole,
      updateRole,
      duplicateRole,
      deleteRole,
      createEmployee,
      updateEmployee,
      changeEmployeeRole,
      toggleEmployeeStatus,
      setEmployeeOverride,
      clearEmployeeOverrides,
      deleteEmployee,
      bulkAssignRole,
      bulkAssignProperties,
      bulkSetStatus,
      logAction,
      clearAuditLogs,
      resetToDefaults,
    ]
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
