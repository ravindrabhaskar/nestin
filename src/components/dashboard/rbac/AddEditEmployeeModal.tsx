import React, { useState, useEffect } from 'react';
import { Employee } from '../../../types/rbac';
import { useRBAC } from '../../../context/RBACContext';
import { SAMPLE_PROPERTIES_REFERENCE } from '../../../data/rbacData';
import { AuthorityMeter } from './AuthorityMeter';
import { Icon } from '../../ui/Icon';

interface AddEditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit?: Employee | null;
  onSuccess?: (employee: Employee) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
];

export const AddEditEmployeeModal: React.FC<AddEditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employeeToEdit,
  onSuccess,
}) => {
  const { createEmployee, updateEmployee, roles } = useRBAC();

  const isEditing = !!employeeToEdit;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[0]);
  const [roleId, setRoleId] = useState('role-property-manager');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isAllProperties, setIsAllProperties] = useState(true);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeToEdit) {
      setName(employeeToEdit.name);
      setEmail(employeeToEdit.email);
      setPhone(employeeToEdit.phone || '');
      setAvatar(employeeToEdit.avatar || AVATAR_PRESETS[0]);
      setRoleId(employeeToEdit.roleId);
      setStatus(employeeToEdit.status === 'inactive' ? 'inactive' : 'active');
      const allProps = employeeToEdit.assignedProperties.includes('all');
      setIsAllProperties(allProps);
      setSelectedPropertyIds(allProps ? [] : employeeToEdit.assignedProperties);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setAvatar(AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)]);
      setRoleId(roles.find((r) => !r.isOwnerRole)?.id || 'role-property-manager');
      setStatus('active');
      setIsAllProperties(true);
      setSelectedPropertyIds([]);
    }
    setError(null);
  }, [employeeToEdit, isOpen, roles]);

  const selectedRole = roles.find((r) => r.id === roleId);

  const handleToggleProperty = (propId: string) => {
    setIsAllProperties(false);
    setSelectedPropertyIds((prev) => {
      if (prev.includes(propId)) {
        const next = prev.filter((id) => id !== propId);
        if (next.length === 0) setIsAllProperties(true);
        return next;
      }
      return [...prev, propId];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Employee full name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Valid work email address is required.');
      return;
    }

    const assigned = isAllProperties ? ['all'] : selectedPropertyIds.length ? selectedPropertyIds : ['all'];

    if (isEditing && employeeToEdit) {
      updateEmployee(employeeToEdit.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar,
        roleId,
        status,
        assignedProperties: assigned,
        propertyAccessScope: isAllProperties ? 'all' : 'selected',
      });
      if (onSuccess) {
        onSuccess({
          ...employeeToEdit,
          name,
          email,
          phone,
          avatar,
          roleId,
          roleName: selectedRole?.name || 'Employee',
          status,
          assignedProperties: assigned,
          propertyAccessScope: isAllProperties ? 'all' : 'selected',
        });
      }
    } else {
      const newEmp = createEmployee({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar,
        roleId,
        status,
        assignedProperties: assigned,
        propertyAccessScope: isAllProperties ? 'all' : 'selected',
      });
      if (onSuccess) onSuccess(newEmp);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-edit-employee-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#062817] text-[#a3e635] flex items-center justify-center font-bold">
              <Icon name="employees" size={20} />
            </div>
            <div>
              <h2 id="add-edit-employee-title" className="text-lg font-black font-heading text-slate-900">
                {isEditing ? `Edit Team Member: ${employeeToEdit.name}` : 'Add New Employee'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Set up employee profile, operational role, and property assignments.
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold flex items-center gap-2">
              <Icon name="error" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Profile Photo Preset Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-900 font-heading">
              Profile Photo
            </label>
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(preset)}
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    avatar === preset
                      ? 'border-[#062817] ring-2 ring-[#a3e635] scale-105'
                      : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 font-heading">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Reddy"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#062817]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 font-heading">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ramesh@example.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#062817]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 font-heading">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 94401 82934"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#062817]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 font-heading">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#062817]"
              >
                <option value="active">Active (Full system login enabled)</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          {/* Role Selection with Authority Preview */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 font-heading">
                Assign Operational Role <span className="text-rose-500">*</span>
              </label>
              {selectedRole && (
                <AuthorityMeter level={selectedRole.authorityLevel} size="sm" />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roles.map((r) => {
                const isSelected = roleId === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setRoleId(r.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'bg-white border-[#062817] shadow-xs ring-2 ring-[#062817]/10'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 font-heading">
                        {r.name}
                      </span>
                      {r.isSystem && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      {r.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Properties (Property-level access scope) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-slate-900 font-heading">
                  Property-Level Access Scope
                </label>
                <p className="text-[11px] text-slate-500">
                  Control which PG properties this employee is authorized to view & manage.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAllProperties(!isAllProperties);
                  if (!isAllProperties) setSelectedPropertyIds([]);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  isAllProperties
                    ? 'bg-[#062817] text-[#a3e635] border-[#062817]'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {isAllProperties ? '✓ All Properties' : 'Select Specific'}
              </button>
            </div>

            {!isAllProperties && (
              <div className="space-y-2 pt-1">
                {SAMPLE_PROPERTIES_REFERENCE.map((prop) => {
                  const isChecked = selectedPropertyIds.includes(prop.id);
                  return (
                    <div
                      key={prop.id}
                      onClick={() => handleToggleProperty(prop.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'bg-emerald-50/50 border-emerald-500/70 text-emerald-950'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon name="properties" size={16} className={isChecked ? 'text-emerald-700' : 'text-slate-400'} />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{prop.name}</div>
                          <div className="text-[11px] text-slate-500">{prop.location}</div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Icon name="check" size={12} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
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
            <span>{isEditing ? 'Save Employee Profile' : 'Add Employee'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
