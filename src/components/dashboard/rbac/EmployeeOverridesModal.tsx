import React, { useState } from 'react';
import { Employee, PermissionGroupKey } from '../../../types/rbac';
import { useRBAC } from '../../../context/RBACContext';
import { PermissionToggle } from './PermissionToggle';
import { Icon } from '../../ui/Icon';

interface EmployeeOverridesModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const GROUPS: PermissionGroupKey[] = [
  'OVERVIEW',
  'PROPERTY MANAGEMENT',
  'CRM',
  'BUSINESS',
  'COMMUNICATION',
  'SETTINGS',
];

export const EmployeeOverridesModal: React.FC<EmployeeOverridesModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const {
    roles,
    permissionCatalog,
    setEmployeeOverride,
    clearEmployeeOverrides,
  } = useRBAC();

  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !employee) return null;

  const role = roles.find((r) => r.id === employee.roleId);
  const overrides = employee.overrides || {};
  const isOwner = employee.roleId === 'role-owner';

  const overrideCount = Object.keys(overrides).length;

  const filteredPerms = permissionCatalog.filter((p) => {
    const matchesGroup = selectedGroup === 'all' || p.group === selectedGroup;
    const matchesSearch =
      !searchQuery ||
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-overrides-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 shrink-0">
              <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="employee-overrides-title" className="text-lg font-black font-heading text-slate-900">
                  Custom Overrides: {employee.name}
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-heading">
                  {employee.roleName}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Effective Priority: Employee Override &gt; Role Permission.
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

        {/* Informational Sub-header */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Icon
              name="search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Filter permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#062817]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              Active Overrides: <strong className="text-emerald-700">{overrideCount}</strong>
            </span>
            {overrideCount > 0 && (
              <button
                type="button"
                onClick={() => clearEmployeeOverrides(employee.id)}
                className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-colors cursor-pointer border border-rose-200/60"
              >
                Reset All to Role Defaults
              </button>
            )}
          </div>
        </div>

        {/* Group Tabs */}
        <div className="px-5 sm:px-6 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto bg-white">
          <button
            type="button"
            onClick={() => setSelectedGroup('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              selectedGroup === 'all'
                ? 'bg-[#062817] text-[#a3e635]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {GROUPS.map((grp) => (
            <button
              key={grp}
              type="button"
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                selectedGroup === grp
                  ? 'bg-[#062817] text-[#a3e635]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {filteredPerms.map((perm) => {
            const roleDefault = !!role?.permissions[perm.id];
            const hasOverride = overrides[perm.id] !== undefined;
            const effectiveValue = hasOverride ? overrides[perm.id] : roleDefault;

            return (
              <div
                key={perm.id}
                className={`p-3.5 sm:px-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  hasOverride
                    ? 'bg-amber-50/40 border-amber-300/80 shadow-2xs'
                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">{perm.label}</span>
                    <span className="text-[10px] uppercase font-mono text-slate-400">
                      {perm.group}
                    </span>

                    {hasOverride ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-heading">
                        Custom Override
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        Inherited from {employee.roleName} ({roleDefault ? 'Granted' : 'Denied'})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    {perm.description}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Reset button if override exists */}
                  {hasOverride && (
                    <button
                      type="button"
                      onClick={() => setEmployeeOverride(employee.id, perm.id, null)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer underline"
                    >
                      Reset to Default
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-extrabold font-heading ${
                        effectiveValue ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {effectiveValue ? 'Granted' : 'Denied'}
                    </span>

                    <PermissionToggle
                      checked={effectiveValue}
                      disabled={isOwner}
                      disabledTooltip="Owner account has permanent full permissions"
                      onChange={(nextState) => {
                        // If next state equals role default, we can clear the override or set it explicitly
                        if (nextState === roleDefault) {
                          setEmployeeOverride(employee.id, perm.id, null);
                        } else {
                          setEmployeeOverride(employee.id, perm.id, nextState);
                        }
                      }}
                      ariaLabel={`Override for ${perm.label}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Changes to overrides are applied and recorded in the audit log immediately.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#062817] hover:bg-[#0d3d25] text-[#a3e635] font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer font-heading"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
