import React, { useState } from 'react';
import { Role, PermissionGroupKey, PermissionDefinition } from '../../../types/rbac';
import { useRBAC } from '../../../context/RBACContext';
import { PermissionToggle } from './PermissionToggle';
import { Icon } from '../../ui/Icon';
import { HighRiskConfirmModal } from './HighRiskConfirmModal';

interface PermissionMatrixViewProps {
  roles: Role[];
  searchQuery: string;
  selectedGroupFilter: string;
  onEditRole?: (role: Role) => void;
}

const GROUPS: PermissionGroupKey[] = [
  'OVERVIEW',
  'PROPERTY MANAGEMENT',
  'CRM',
  'BUSINESS',
  'COMMUNICATION',
  'SETTINGS',
];

export const PermissionMatrixView: React.FC<PermissionMatrixViewProps> = ({
  roles,
  searchQuery,
  selectedGroupFilter,
  onEditRole,
}) => {
  const { permissionCatalog, toggleRolePermission } = useRBAC();

  // High-risk prompt state
  const [highRiskTarget, setHighRiskTarget] = useState<{
    roleId: string;
    roleName: string;
    permission: PermissionDefinition;
  } | null>(null);

  // Mobile selected role view
  const [activeMobileRoleId, setActiveMobileRoleId] = useState<string>(roles[0]?.id || 'role-owner');

  // Collapsible category state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleToggle = (role: Role, perm: PermissionDefinition) => {
    if (role.isOwnerRole) return;

    const currentValue = !!role.permissions[perm.id];
    // If enabling a high-risk permission that is currently false, prompt
    if (!currentValue && perm.isHighRisk) {
      setHighRiskTarget({
        roleId: role.id,
        roleName: role.name,
        permission: perm,
      });
      return;
    }

    toggleRolePermission(role.id, perm.id);
  };

  const handleConfirmHighRisk = () => {
    if (highRiskTarget) {
      toggleRolePermission(highRiskTarget.roleId, highRiskTarget.permission.id);
      setHighRiskTarget(null);
    }
  };

  const filteredCatalog = permissionCatalog.filter((p) => {
    const matchesGroup = selectedGroupFilter === 'all' || p.group === selectedGroupFilter;
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      !query ||
      p.label.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.group.toLowerCase().includes(query) ||
      p.actionType.toLowerCase().includes(query);

    return matchesGroup && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* High-Risk Confirmation Dialog */}
      {highRiskTarget && (
        <HighRiskConfirmModal
          isOpen={!!highRiskTarget}
          onClose={() => setHighRiskTarget(null)}
          onConfirm={handleConfirmHighRisk}
          permissionLabel={highRiskTarget.permission.label}
          roleName={highRiskTarget.roleName}
        />
      )}

      {/* Mobile Role Switcher (Visible on small screens) */}
      <div className="lg:hidden bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <label className="text-[11px] font-black uppercase text-slate-500 font-heading">Select Role to Configure</label>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveMobileRoleId(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                activeMobileRoleId === r.id
                  ? 'bg-[#062817] text-[#a3e635] border-[#062817] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop/Tablet Permission Matrix Table */}
      <div className="hidden lg:block bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-black text-slate-700 uppercase tracking-wider font-heading sticky left-0 bg-slate-50 z-20 min-w-[320px] max-w-[360px] shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  Module & Permission Name
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="py-4 px-4 text-center text-xs font-black text-slate-900 font-heading min-w-[140px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[120px]">{role.name}</span>
                        {onEditRole && (
                          <button
                            type="button"
                            onClick={() => onEditRole(role)}
                            className="text-slate-400 hover:text-slate-900 cursor-pointer"
                            title={`Edit ${role.name}`}
                          >
                            <Icon name="edit" size={12} />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {role.authorityLevel}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body by Group */}
            <tbody className="divide-y divide-slate-100">
              {GROUPS.filter((grp) => selectedGroupFilter === 'all' || selectedGroupFilter === grp).map((grp) => {
                const groupPerms = filteredCatalog.filter((p) => p.group === grp);
                if (groupPerms.length === 0) return null;

                const isCollapsed = !!collapsedGroups[grp];

                return (
                  <React.Fragment key={grp}>
                    {/* Category Group Header Row */}
                    <tr
                      onClick={() => toggleGroupCollapse(grp)}
                      className="bg-slate-100/75 hover:bg-slate-100 cursor-pointer transition-colors border-y border-slate-200/90 select-none"
                    >
                      <td colSpan={roles.length + 1} className="py-2.5 px-6 sticky left-0 z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon
                              name={isCollapsed ? 'arrowRight' : 'arrowDown'}
                              size={14}
                              className="text-slate-500"
                            />
                            <span className="text-xs font-black text-slate-900 uppercase tracking-wider font-heading">
                              {grp}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-heading">
                              {groupPerms.length} permissions
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Permissions rows inside category */}
                    {!isCollapsed &&
                      groupPerms.map((perm) => (
                        <tr key={perm.id} className="hover:bg-slate-50/60 transition-colors group">
                          {/* Sticky Permission Name & Description */}
                          <td className="py-3 px-6 sticky left-0 bg-white group-hover:bg-slate-50/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">
                                {perm.label}
                              </span>
                              {perm.isHighRisk && (
                                <span
                                  className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-heading"
                                  title="Elevated security impact"
                                >
                                  High-Risk
                                </span>
                              )}
                              <span className="text-[10px] font-mono uppercase text-slate-400">{perm.actionType}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-snug">
                              {perm.description}
                            </p>
                          </td>

                          {/* Role Toggle Switch Columns */}
                          {roles.map((role) => {
                            const isChecked = role.isOwnerRole ? true : !!role.permissions[perm.id];

                            return (
                              <td key={`${role.id}-${perm.id}`} className="py-3 px-4 text-center align-middle">
                                <PermissionToggle
                                  checked={isChecked}
                                  disabled={role.isOwnerRole}
                                  disabledTooltip="System Owner has permanent full access"
                                  onChange={() => handleToggle(role, perm)}
                                  ariaLabel={`${perm.label} for ${role.name}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card-Based Permission View */}
      <div className="lg:hidden space-y-3">
        {(() => {
          const currentRole = roles.find((r) => r.id === activeMobileRoleId) || roles[0];
          if (!currentRole) return null;

          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black font-heading text-slate-900">{currentRole.name} Permissions</h3>
                  <p className="text-xs text-slate-500 font-medium">{currentRole.description}</p>
                </div>
                {currentRole.isOwnerRole && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-heading">
                    Full Access
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {GROUPS.filter((grp) => selectedGroupFilter === 'all' || selectedGroupFilter === grp).map((grp) => {
                  const groupPerms = filteredCatalog.filter((p) => p.group === grp);
                  if (groupPerms.length === 0) return null;

                  return (
                    <div key={grp} className="rounded-xl border border-slate-200/80 overflow-hidden">
                      <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200/80 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-800 font-heading">{grp}</span>
                        <span className="text-[10px] font-bold text-slate-500">{groupPerms.length} items</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {groupPerms.map((perm) => {
                          const isChecked = currentRole.isOwnerRole ? true : !!currentRole.permissions[perm.id];

                          return (
                            <div key={perm.id} className="p-3 flex items-center justify-between gap-3">
                              <div className="flex-1 pr-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900">{perm.label}</span>
                                  {perm.isHighRisk && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-heading">
                                      High-Risk
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{perm.description}</p>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                <span
                                  className={`text-xs font-extrabold font-heading ${
                                    isChecked ? 'text-emerald-700' : 'text-rose-600'
                                  }`}
                                >
                                  {isChecked ? 'Access' : 'Denied'}
                                </span>
                                <PermissionToggle
                                  checked={isChecked}
                                  disabled={currentRole.isOwnerRole}
                                  disabledTooltip="System Owner has permanent full access"
                                  onChange={() => handleToggle(currentRole, perm)}
                                  ariaLabel={`${perm.label} for ${currentRole.name}`}
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
          );
        })()}
      </div>
    </div>
  );
};
