import React from 'react';
import { Icon } from '../../ui/Icon';

interface ChangeRoleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employeeName: string;
  currentRoleName: string;
  newRoleName: string;
}

export const ChangeRoleConfirmModal: React.FC<ChangeRoleConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  employeeName,
  currentRoleName,
  newRoleName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-role-title"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Icon name="shield" size={24} />
          </div>
          <div>
            <h3 id="change-role-title" className="text-lg font-black font-heading text-slate-900">
              Change employee role?
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Changing the role for <strong className="text-slate-900 font-bold">{employeeName}</strong> will immediately update this employee&apos;s permissions across all modules and properties.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between text-xs font-bold">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-heading">Current Role</span>
            <div className="text-slate-700">{currentRoleName}</div>
          </div>
          <Icon name="arrowRight" size={16} className="text-slate-400" />
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] text-emerald-600 uppercase font-heading">New Role</span>
            <div className="text-emerald-950 font-black">{newRoleName}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#062817] hover:bg-[#0d3d25] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Icon name="check" size={14} className="text-[#a3e635]" />
            <span>Confirm Role Change</span>
          </button>
        </div>
      </div>
    </div>
  );
};
