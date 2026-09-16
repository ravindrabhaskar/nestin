export type AuthorityLevel = 'full' | 'high' | 'medium' | 'low' | 'limited';

export type PermissionActionType = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'manage' | 'refund' | 'publish';

export type PermissionGroupKey = 
  | 'OVERVIEW'
  | 'PROPERTY MANAGEMENT'
  | 'CRM'
  | 'BUSINESS'
  | 'COMMUNICATION'
  | 'SETTINGS';

export interface PermissionDefinition {
  id: string;
  label: string;
  description: string;
  group: PermissionGroupKey;
  actionType: PermissionActionType;
  isHighRisk?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean;
  isOwnerRole?: boolean;
  authorityLevel: AuthorityLevel;
  permissions: Record<string, boolean>;
  color: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  roleId: string;
  roleName: string;
  status: 'active' | 'inactive' | 'pending';
  assignedProperties: string[]; // ['all'] or property IDs
  propertyAccessScope: 'all' | 'selected' | 'assigned_records';
  overrides?: Record<string, boolean>; // employee specific overrides (true = granted, false = revoked)
  lastActive: string;
  joinedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  targetType: 'role' | 'employee' | 'permission';
  targetId: string;
  targetName: string;
  action: string;
  permissionId?: string;
  permissionLabel?: string;
  oldValue?: string | boolean;
  newValue?: string | boolean;
  note?: string;
}
