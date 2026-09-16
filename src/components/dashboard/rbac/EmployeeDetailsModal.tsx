import React from 'react';
import { Employee } from '../../../types/rbac';
import { useRBAC } from '../../../context/RBACContext';
import { SAMPLE_PROPERTIES_REFERENCE } from '../../../data/rbacData';
import { AuthorityMeter } from './AuthorityMeter';
import { Icon } from '../../ui/Icon';

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit: (emp: Employee) => void;
  onManageOverrides: (emp: Employee) => void;
  onChangeRole: (emp: Employee) => void;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEdit,
  onManageOverrides,
  onChangeRole,
}) => {
  const { roles, getEffectivePermissions, permissionCatalog } = useRBAC();

  if (!isOpen || !employee) return null;

  const role = roles.find((r) => r.id === employee.roleId);
  const effectivePerms = getEffectivePermissions(employee.id);
  const totalGranted = Object.values(effectivePerms).filter(Boolean).length;
  const isOwner = employee.roleId === 'role-owner';

  const assignedPropertyNames = employee.assignedProperties.includes('all')
    ? 'All Properties (Unrestricted)'
    : employee.assignedProperties
        .map((pId) => SAMPLE_PROPERTIES_REFERENCE.find((p) => p.id === pId)?.name || pId)
        .join(', ');

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-details-title"
      >
        {/* Header Profile Section */}
        <div className="p-6 bg-slate-900 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <Icon name="close" size={18} />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-md shrink-0">
              <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 id="employee-details-title" className="text-xl font-black font-heading text-white">
                  {employee.name}
                </h2>
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full font-heading ${
                    employee.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {employee.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Icon name="mail" size={13} className="text-slate-400" />
                  {employee.email}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="phone" size={13} className="text-slate-400" />
                    {employee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Assigned Role:</span>
              <span className="font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                {employee.roleName}
              </span>
              {role && <AuthorityMeter level={role.authorityLevel} size="sm" />}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Last Active:</span>
              <span className="font-medium text-slate-200">{employee.lastActive}</span>
            </div>
          </div>
        </div>

        {/* Details & Effective Permissions */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Properties Scope */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wide font-heading">
              Property Access Scope
            </span>
            <p className="text-xs font-bold text-emerald-950">
              {assignedPropertyNames}
            </p>
          </div>

          {/* Quick Actions Row */}
          {!isOwner && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(employee);
                }}
                className="p-3 bg-white border border-slate-200 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Icon name="edit" size={14} />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChangeRole(employee);
                }}
                className="p-3 bg-white border border-slate-200 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Icon name="shield" size={14} />
                <span>Change Role</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onManageOverrides(employee);
                }}
                className="p-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/70 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Icon name="shield" size={14} />
                <span>Custom Overrides ({Object.keys(employee.overrides || {}).length})</span>
              </button>
            </div>
          )}

          {/* Effective Permissions Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-heading">
                Effective Granted Permissions ({totalGranted}/{permissionCatalog.length})
              </h3>
              {employee.overrides && Object.keys(employee.overrides).length > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-heading">
                  {Object.keys(employee.overrides).length} custom override(s) active
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {permissionCatalog.map((perm) => {
                const isGranted = !!effectivePerms[perm.id];
                const hasOverride = employee.overrides?.[perm.id] !== undefined;

                return (
                  <div
                    key={perm.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      isGranted
                        ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                        : 'bg-slate-50 border-slate-200/60 text-slate-400 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isGranted ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="font-bold truncate">{perm.label}</span>
                    </div>

                    {hasOverride && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0 font-heading">
                        Override
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#062817] hover:bg-[#0d3d25] text-[#a3e635] font-black text-xs rounded-xl shadow-md cursor-pointer font-heading"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
