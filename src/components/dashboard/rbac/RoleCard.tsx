import React from 'react';
import { Role } from '../../../types/rbac';
import { AuthorityMeter } from './AuthorityMeter';
import { Icon } from '../../ui/Icon';

interface RoleCardProps {
  role: Role;
  userCount: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: (role: Role) => void;
  onDuplicate?: (role: Role) => void;
  onDelete?: (role: Role) => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  userCount,
  isSelected = false,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const isOwner = role.isOwnerRole;

  return (
    <div
      onClick={onSelect}
      className={`relative group bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between min-w-[210px] ${
        isSelected
          ? 'border-[#062817] ring-2 ring-[#062817]/10 bg-slate-50/50'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Top Header Row: User count & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
          {userCount} {userCount === 1 ? 'USER' : 'USERS'}
        </span>

        <div className="flex items-center gap-1">
          {role.isSystem && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60"
              title="System protected role"
            >
              System
            </span>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(role);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title={`Edit ${role.name}`}
            >
              <Icon name="edit" size={14} />
            </button>
          )}

          {onDuplicate && !isOwner && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(role);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title={`Duplicate ${role.name}`}
            >
              <Icon name="copy" size={14} />
            </button>
          )}

          {onDelete && !role.isSystem && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(role);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title={`Delete ${role.name}`}
            >
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Role Title & Description */}
      <div className="my-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: role.color || '#062817' }}
          />
          <h3 className="text-base font-extrabold font-heading text-slate-900 tracking-tight truncate">
            {role.name}
          </h3>
        </div>
        <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium leading-snug">
          {role.description}
        </p>
      </div>

      {/* Bottom Authority Level & Meter */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">
          AUTHORITY
        </div>
        <AuthorityMeter level={role.authorityLevel} showLabel={true} size="sm" />
      </div>
    </div>
  );
};
