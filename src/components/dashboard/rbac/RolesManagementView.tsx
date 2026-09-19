import React, { useState } from 'react';
import { useRBAC } from '../../../context/RBACContext';
import { Role } from '../../../types/rbac';
import { RoleCard } from './RoleCard';
import { PermissionMatrixView } from './PermissionMatrixView';
import { CreateEditRoleModal } from './CreateEditRoleModal';
import { AuditLogsModal } from './AuditLogsModal';
import { Icon } from '../../ui/Icon';

export const RolesManagementView: React.FC = () => {
  const { roles, employees, duplicateRole, deleteRole } = useRBAC();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditRole = (role: Role) => {
    setRoleToEdit(role);
    setIsCreateModalOpen(true);
  };

  const handleDuplicate = (role: Role) => {
    const cloned = duplicateRole(role.id);
    showToast(`Role "${cloned.name}" duplicated successfully.`);
  };

  const handleDelete = (role: Role) => {
    if (window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      const res = deleteRole(role.id);
      showToast(res.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#062817] text-[#a3e635] px-4 py-2.5 rounded-2xl shadow-xl border border-emerald-800 text-xs font-bold font-heading flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <Icon name="check" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <CreateEditRoleModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setRoleToEdit(null);
        }}
        roleToEdit={roleToEdit}
        onSuccess={(saved) => {
          showToast(`Role "${saved.name}" saved successfully.`);
        }}
      />

      <AuditLogsModal isOpen={isAuditLogsModalOpen} onClose={() => setIsAuditLogsModalOpen(false)} />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
              Roles & Permissions
            </h1>
            <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-heading">
              RBAC v2.4
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Control what each team member can view, edit, approve, and manage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAuditLogsModalOpen(true)}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-2 font-heading"
          >
            <Icon name="shield" size={15} className="text-slate-500" />
            <span>Audit Logs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#062817] hover:bg-[#0d3d25] text-[#a3e635] font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 font-heading"
          >
            <Icon name="plus" size={16} />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {/* Top Role Summary Cards (Matches uploaded visual reference!) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
            Configured System & Custom Roles ({roles.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Click edit icon on any card to modify role properties
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {roles.map((role) => {
            const count = employees.filter((e) => e.roleId === role.id).length;
            return (
              <RoleCard
                key={role.id}
                role={role}
                userCount={count}
                onEdit={handleEditRole}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Icon name="search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search permissions or modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#062817]"
            />
          </div>

          {/* Category Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'OVERVIEW', label: 'Overview' },
              { id: 'PROPERTY MANAGEMENT', label: 'Properties' },
              { id: 'CRM', label: 'CRM' },
              { id: 'BUSINESS', label: 'Business' },
              { id: 'COMMUNICATION', label: 'Communication' },
              { id: 'SETTINGS', label: 'Settings' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedGroupFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 font-heading ${
                  selectedGroupFilter === cat.id
                    ? 'bg-[#062817] text-[#a3e635]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend Information */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <strong className="text-emerald-950 font-bold">🟢 Access Granted</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <strong className="text-rose-950 font-bold">🔴 Access Denied</strong>
            </span>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Changes take effect immediately across all active employee sessions.
          </span>
        </div>
      </div>

      {/* Main Master Matrix Table */}
      <PermissionMatrixView
        roles={roles}
        searchQuery={searchQuery}
        selectedGroupFilter={selectedGroupFilter}
        onEditRole={handleEditRole}
      />
    </div>
  );
};
