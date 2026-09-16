import React from 'react';
import { Icon } from '../../ui/Icon';

interface HighRiskConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  permissionLabel: string;
  roleName: string;
  actionType?: string;
}

export const HighRiskConfirmModal: React.FC<HighRiskConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  permissionLabel,
  roleName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Icon name="warning" size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-heading">
              High-Risk Permission
            </span>
            <h3 id="modal-title" className="text-lg font-black font-heading text-slate-900 mt-1">
              Give access to {permissionLabel}?
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Enabling this permission for <strong className="text-slate-900 font-bold">{roleName}</strong> grants elevated managerial authority (such as deleting records or processing refunds).
            </p>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Icon name="shield" size={14} className="text-amber-700" />
            <span>Security Precaution</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-snug">
            All actions performed by employees with this permission will be recorded in the security audit log with timestamps.
          </p>
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
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Icon name="check" size={14} />
            <span>Give Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};
