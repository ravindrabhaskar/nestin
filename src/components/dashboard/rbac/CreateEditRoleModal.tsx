import React, { useState, useEffect } from 'react';
import { Role, AuthorityLevel, PermissionGroupKey } from '../../../types/rbac';
import { useRBAC } from '../../../context/RBACContext';
import { PermissionToggle } from './PermissionToggle';
import { AuthorityMeter } from './AuthorityMeter';
import { Icon } from '../../ui/Icon';

interface CreateEditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: Role | null;
  onSuccess?: (role: Role) => void;
}

const GROUPS: PermissionGroupKey[] = [
  'OVERVIEW',
  'PROPERTY MANAGEMENT',
  'CRM',
  'BUSINESS',
  'COMMUNICATION',
  'SETTINGS',
];

export const CreateEditRoleModal: React.FC<CreateEditRoleModalProps> = ({ isOpen, onClose, roleToEdit, onSuccess }) => {
  const { createRole, updateRole, permissionCatalog, roles } = useRBAC();

  const isEditing = !!roleToEdit;
  const isOwnerRole = roleToEdit?.isOwnerRole;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [authorityLevel, setAuthorityLevel] = useState<AuthorityLevel>('medium');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [presetSourceId, setPresetSourceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleToEdit) {
      setName(roleToEdit.name);
      setDescription(roleToEdit.description);
      setAuthorityLevel(roleToEdit.authorityLevel);
      setPermissions({ ...roleToEdit.permissions });
      setPresetSourceId('');
    } else {
      setName('');
      setDescription('');
      setAuthorityLevel('medium');
      // Default: copy from Property Manager or empty
      const defaultPerms: Record<string, boolean> = {};
      permissionCatalog.forEach((p) => {
        defaultPerms[p.id] = false;
      });
      // Enable common default permissions
      defaultPerms['dashboard.view'] = true;
      defaultPerms['properties.view'] = true;
      defaultPerms['leads.view'] = true;
      defaultPerms['bookings.view'] = true;
      setPermissions(defaultPerms);
      setPresetSourceId('');
    }
    setError(null);
  }, [roleToEdit, isOpen, permissionCatalog]);

  const handleApplyPreset = (sourceRoleId: string) => {
    setPresetSourceId(sourceRoleId);
    const sourceRole = roles.find((r) => r.id === sourceRoleId);
    if (sourceRole) {
      setPermissions({ ...sourceRole.permissions });
      setAuthorityLevel(sourceRole.authorityLevel);
      if (!name) {
        setName(`${sourceRole.name} Custom`);
      }
    }
  };

  const handleTogglePermission = (permId: string) => {
    if (isOwnerRole) return;
    setPermissions((prev) => ({
      ...prev,
      [permId]: !prev[permId],
    }));
  };

  const handleToggleGroupAll = (groupKey: PermissionGroupKey, enable: boolean) => {
    if (isOwnerRole) return;
    const groupPerms = permissionCatalog.filter((p) => p.group === groupKey);
    setPermissions((prev) => {
      const updated = { ...prev };
      groupPerms.forEach((p) => {
        updated[p.id] = enable;
      });
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }

    if (isEditing && roleToEdit) {
      updateRole(roleToEdit.id, {
        name: name.trim(),
        description: description.trim(),
        authorityLevel,
        permissions,
      });
      if (onSuccess) onSuccess({ ...roleToEdit, name, description, authorityLevel, permissions });
    } else {
      const newRole = createRole({
        name: name.trim(),
        description: description.trim(),
        authorityLevel,
        permissions,
      });
      if (onSuccess) onSuccess(newRole);
    }

    onClose();
  };

  if (!isOpen) return null;

  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalPermCount = permissionCatalog.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-edit-role-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#062817] text-[#a3e635] flex items-center justify-center font-bold">
              <Icon name="shield" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="create-edit-role-title" className="text-lg font-black font-heading text-slate-900">
                  {isEditing ? `Edit Role: ${roleToEdit.name}` : 'Create New Custom Role'}
                </h2>
                {roleToEdit?.isSystem && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-heading">
                    System Role
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Configure role identity, authority rating, and granular module permissions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold flex items-center gap-2">
              <Icon name="error" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Selector (Only for new role) */}
          {!isEditing && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wide font-heading">
                  Start with a Role Preset Template
                </label>
                <span className="text-[11px] text-slate-500">Optional speed template</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleApplyPreset(r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                      presetSourceId === r.id
                        ? 'bg-[#062817] text-[#a3e635] border-[#062817] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 font-heading">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isOwnerRole}
                placeholder="e.g. Cluster Operations Manager"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#062817] disabled:bg-slate-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 font-heading">Authority Level Rating</label>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Authority level"
                  value={authorityLevel}
                  onChange={(e) => setAuthorityLevel(e.target.value as AuthorityLevel)}
                  disabled={isOwnerRole}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0F5132] disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="full">Full Access (Root Owner)</option>
                  <option value="high">High (Executive / Lead Manager)</option>
                  <option value="medium">Medium (Managerial operations)</option>
                  <option value="low">Low (Front Desk & Inquiries)</option>
                  <option value="limited">Limited (Specialized / Support)</option>
                </select>
                <div className="shrink-0 pl-1">
                  <AuthorityMeter level={authorityLevel} showLabel={false} size="sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-900 font-heading">Role Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the operational responsibilities and scope of this role..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#062817]"
            />
          </div>

          {/* Permissions Matrix Checklist */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-black font-heading text-slate-900">Granular Module Permissions</h3>
                <p className="text-xs text-slate-500">
                  {enabledCount} of {totalPermCount} permissions enabled for this role
                </p>
              </div>

              {/* Group Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedGroupFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                    selectedGroupFilter === 'all'
                      ? 'bg-[#062817] text-[#a3e635]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({totalPermCount})
                </button>
                {GROUPS.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setSelectedGroupFilter(grp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                      selectedGroupFilter === grp
                        ? 'bg-[#062817] text-[#a3e635]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>

            {/* Permission Group Sections */}
            <div className="space-y-4">
              {GROUPS.filter((g) => selectedGroupFilter === 'all' || selectedGroupFilter === g).map((grp) => {
                const groupPerms = permissionCatalog.filter((p) => p.group === grp);
                const groupEnabledCount = groupPerms.filter((p) => permissions[p.id]).length;

                return (
                  <div key={grp} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                    {/* Section Header */}
                    <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 font-heading">
                          {grp}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-heading">
                          {groupEnabledCount}/{groupPerms.length}
                        </span>
                      </div>

                      {!isOwnerRole && (
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleGroupAll(grp, true)}
                            className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Grant All
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            type="button"
                            onClick={() => handleToggleGroupAll(grp, false)}
                            className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                          >
                            Revoke All
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Items in this group */}
                    <div className="divide-y divide-slate-100">
                      {groupPerms.map((perm) => {
                        const isEnabled = !!permissions[perm.id];
                        return (
                          <div
                            key={perm.id}
                            className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{perm.label}</span>
                                {perm.isHighRisk && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-heading">
                                    High-Risk
                                  </span>
                                )}
                                <span className="text-[10px] uppercase font-mono text-slate-400">
                                  {perm.actionType}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{perm.description}</p>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <span
                                className={`text-[11px] font-extrabold font-heading ${
                                  isEnabled ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {isEnabled ? 'Access' : 'Denied'}
                              </span>
                              <PermissionToggle
                                checked={isEnabled}
                                disabled={isOwnerRole}
                                disabledTooltip="System Owner has permanent full access"
                                onChange={() => handleTogglePermission(perm.id)}
                                ariaLabel={`${perm.label} for ${name || 'role'}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-[#062817] hover:bg-[#0d3d25] text-[#a3e635] font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer font-heading flex items-center gap-2"
          >
            <Icon name="check" size={16} />
            <span>{isEditing ? 'Save Changes' : 'Create Role'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
