import React, { useState, useMemo } from 'react';
import { useRBAC } from '../../../context/RBACContext';
import { Employee } from '../../../types/rbac';
import { SAMPLE_PROPERTIES_REFERENCE } from '../../../data/rbacData';
import { AuthorityMeter } from './AuthorityMeter';
import { AddEditEmployeeModal } from './AddEditEmployeeModal';
import { EmployeeDetailsModal } from './EmployeeDetailsModal';
import { EmployeeOverridesModal } from './EmployeeOverridesModal';
import { ChangeRoleConfirmModal } from './ChangeRoleConfirmModal';
import { Icon } from '../../ui/Icon';

interface EmployeesViewProps {
  onNavigateToRoles?: () => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ onNavigateToRoles }) => {
  const { employees, roles, toggleEmployeeStatus, deleteEmployee, changeEmployeeRole, bulkAssignRole, bulkSetStatus } =
    useRBAC();

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Bulk Selection
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [overrideEmployee, setOverrideEmployee] = useState<Employee | null>(null);
  const [changeRoleTarget, setChangeRoleTarget] = useState<{
    employee: Employee;
    newRoleId: string;
    newRoleName: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Role filter
      if (selectedRoleFilter !== 'all' && emp.roleId !== selectedRoleFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all' && emp.status !== selectedStatusFilter) {
        return false;
      }

      // Property filter
      if (selectedPropertyFilter !== 'all') {
        if (!emp.assignedProperties.includes('all') && !emp.assignedProperties.includes(selectedPropertyFilter)) {
          return false;
        }
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(query);
        const matchesEmail = emp.email.toLowerCase().includes(query);
        const matchesPhone = emp.phone && emp.phone.toLowerCase().includes(query);
        const matchesRole = emp.roleName.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesRole) {
          return false;
        }
      }

      return true;
    });
  }, [employees, selectedRoleFilter, selectedStatusFilter, selectedPropertyFilter, searchQuery]);

  // Bulk select helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
    } else {
      setSelectedEmployeeIds([]);
    }
  };

  const handleToggleRowSelect = (empId: string) => {
    setSelectedEmployeeIds((prev) => (prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]));
  };

  const isAllSelected =
    filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployeeIds.includes(e.id));

  // Role change with prompt
  const handleInitiateRoleChange = (employee: Employee, newRoleId: string) => {
    if (employee.roleId === newRoleId) return;
    const newRole = roles.find((r) => r.id === newRoleId);
    if (!newRole) return;

    setChangeRoleTarget({
      employee,
      newRoleId,
      newRoleName: newRole.name,
    });
  };

  const handleConfirmRoleChange = () => {
    if (changeRoleTarget) {
      changeEmployeeRole(changeRoleTarget.employee.id, changeRoleTarget.newRoleId);
      showToast(`Changed role for ${changeRoleTarget.employee.name} to "${changeRoleTarget.newRoleName}".`);
      setChangeRoleTarget(null);
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
      <AddEditEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEmployeeToEdit(null);
        }}
        employeeToEdit={employeeToEdit}
        onSuccess={(emp) => {
          showToast(`Employee "${emp.name}" saved successfully.`);
        }}
      />

      <EmployeeDetailsModal
        isOpen={!!detailEmployee}
        onClose={() => setDetailEmployee(null)}
        employee={detailEmployee}
        onEdit={(emp) => {
          setEmployeeToEdit(emp);
          setIsAddModalOpen(true);
        }}
        onManageOverrides={(emp) => {
          setOverrideEmployee(emp);
        }}
        onChangeRole={(emp) => {
          const altRole = roles.find((r) => r.id !== emp.roleId && !r.isOwnerRole);
          if (altRole) handleInitiateRoleChange(emp, altRole.id);
        }}
      />

      <EmployeeOverridesModal
        isOpen={!!overrideEmployee}
        onClose={() => setOverrideEmployee(null)}
        employee={overrideEmployee}
      />

      {changeRoleTarget && (
        <ChangeRoleConfirmModal
          isOpen={!!changeRoleTarget}
          onClose={() => setChangeRoleTarget(null)}
          onConfirm={handleConfirmRoleChange}
          employeeName={changeRoleTarget.employee.name}
          currentRoleName={changeRoleTarget.employee.roleName}
          newRoleName={changeRoleTarget.newRoleName}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">Employees</h1>
            <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-heading">
              {employees.length} Team Members
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage your team and control their access.</p>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToRoles && (
            <button
              type="button"
              onClick={onNavigateToRoles}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-2 font-heading"
            >
              <Icon name="shield" size={15} className="text-slate-500" />
              <span>Manage Roles</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEmployeeToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#062817] hover:bg-[#0d3d25] text-[#a3e635] font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 font-heading"
          >
            <Icon name="plus" size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#062817]"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              aria-label="Filter by Properties"
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#062817]"
            >
              <option value="all">All Roles ({roles.length})</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Property Filter */}
          <div>
            <select
              aria-label="Filter by Properties"
              value={selectedPropertyFilter}
              onChange={(e) => setSelectedPropertyFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#062817]"
            >
              <option value="all">All Properties</option>
              {SAMPLE_PROPERTIES_REFERENCE.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              aria-label="Filter by Account Statuses"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#062817]"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Suspended</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedEmployeeIds.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-950 font-heading">
                {selectedEmployeeIds.length} employee{selectedEmployeeIds.length > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <select
                aria-label="Assign role"
                onChange={(e) => {
                  if (e.target.value) {
                    bulkAssignRole(selectedEmployeeIds, e.target.value);
                    showToast('Role updated for selected employees.');
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="" disabled>
                  Assign Role...
                </option>
                {roles
                  .filter((r) => !r.isOwnerRole)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  bulkSetStatus(selectedEmployeeIds, 'active');
                  showToast('Selected employees marked active.');
                }}
                className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 font-bold rounded-xl cursor-pointer"
              >
                Activate All
              </button>

              <button
                type="button"
                onClick={() => {
                  bulkSetStatus(selectedEmployeeIds, 'inactive');
                  showToast('Selected employees deactivated.');
                }}
                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 font-bold rounded-xl cursor-pointer"
              >
                Deactivate All
              </button>

              <button
                type="button"
                onClick={() => setSelectedEmployeeIds([])}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 font-bold underline cursor-pointer"
              >
                Deselect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider font-heading">
                <th className="py-4 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-[#062817] focus:ring-[#062817] cursor-pointer"
                    aria-label="Select all employees"
                  />
                </th>
                <th className="py-4 px-4">Employee</th>
                <th className="py-4 px-4">Role & Authority</th>
                <th className="py-4 px-4">Contact Info</th>
                <th className="py-4 px-4">Assigned Properties</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4">Last Active</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs font-bold text-slate-500">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployeeIds.includes(emp.id);
                  const isOwner = emp.roleId === 'role-owner' || emp.id === 'emp-1';
                  const role = roles.find((r) => r.id === emp.roleId);
                  const hasOverrides = emp.overrides && Object.keys(emp.overrides).length > 0;

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-emerald-50/30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isOwner}
                          onChange={() => handleToggleRowSelect(emp.id)}
                          className="w-4 h-4 rounded text-[#062817] focus:ring-[#062817] cursor-pointer disabled:opacity-50"
                          aria-label={`Select ${emp.name}`}
                        />
                      </td>

                      {/* Employee Info */}
                      <td className="py-4 px-4">
                        <div
                          onClick={() => setDetailEmployee(emp)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                            <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900 group-hover:text-emerald-950 font-heading">
                              {emp.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Authority */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-black font-heading px-2 py-0.5 rounded-lg border"
                              style={{
                                backgroundColor: isOwner ? '#062817' : '#f8fafc',
                                color: isOwner ? '#a3e635' : '#0f172a',
                                borderColor: isOwner ? '#062817' : '#e2e8f0',
                              }}
                            >
                              {emp.roleName}
                            </span>
                            {hasOverrides && (
                              <span
                                className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-heading cursor-pointer"
                                onClick={() => setOverrideEmployee(emp)}
                                title="Custom permission overrides active"
                              >
                                Overrides
                              </span>
                            )}
                          </div>
                          {role && <AuthorityMeter level={role.authorityLevel} showLabel={false} size="sm" />}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-4">
                        <div className="text-xs text-slate-700 font-medium space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Icon name="mail" size={12} className="text-slate-400" />
                            <span className="truncate max-w-[150px]">{emp.email}</span>
                          </div>
                          {emp.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Icon name="phone" size={12} className="text-slate-400" />
                              <span>{emp.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Properties */}
                      <td className="py-4 px-4">
                        {emp.assignedProperties.includes('all') ? (
                          <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-heading">
                            All Properties (3)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {emp.assignedProperties.map((pId) => {
                              const prop = SAMPLE_PROPERTIES_REFERENCE.find((p) => p.id === pId);
                              return (
                                <span
                                  key={pId}
                                  className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                                >
                                  {prop ? prop.name.split('-')[0].trim() : pId}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          disabled={isOwner}
                          onClick={() => toggleEmployeeStatus(emp.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            isOwner
                              ? 'cursor-not-allowed opacity-80 bg-emerald-50 text-emerald-800'
                              : emp.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 cursor-pointer'
                          }`}
                          title={isOwner ? 'Owner account is permanently active' : 'Click to toggle status'}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          <span className="capitalize">{emp.status}</span>
                        </button>
                      </td>

                      {/* Last Active */}
                      <td className="py-4 px-4 text-xs text-slate-500 font-medium">{emp.lastActive}</td>

                      {/* Action Menu */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setDetailEmployee(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Employee Profile"
                          >
                            <Icon name="eye" size={15} />
                          </button>

                          {/* Edit profile */}
                          <button
                            type="button"
                            onClick={() => {
                              setEmployeeToEdit(emp);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Employee"
                          >
                            <Icon name="edit" size={15} />
                          </button>

                          {/* Custom Overrides */}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => setOverrideEmployee(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Configure Custom Permission Overrides"
                            >
                              <Icon name="shield" size={15} />
                            </button>
                          )}

                          {/* Delete employee */}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete ${emp.name}?`)) {
                                  deleteEmployee(emp.id);
                                  showToast(`Removed employee ${emp.name}.`);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Employee"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
