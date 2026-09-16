import React from 'react';
import { Icon } from '../ui/Icon';

interface AccessRestrictedViewProps {
  requiredPermission?: string;
  onGoToDashboard?: () => void;
}

export const AccessRestrictedView: React.FC<AccessRestrictedViewProps> = ({
  requiredPermission = 'this section',
  onGoToDashboard,
}) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200 shadow-xs">
        <Icon name="warning" size={32} />
      </div>

      <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-100/60 px-3 py-1 rounded-full font-heading">
        Access Restricted
      </span>

      <h2 className="text-2xl font-black font-heading text-slate-900 mt-2">
        You don&apos;t have permission to access {requiredPermission}
      </h2>

      <p className="text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed font-medium">
        Your assigned operational role does not grant viewing or management access to this module. Please contact your Property Owner or Management in Role Settings to request access.
      </p>

      {onGoToDashboard && (
        <button
          type="button"
          onClick={onGoToDashboard}
          className="mt-6 px-6 py-2.5 bg-[#0F5132] hover:bg-[#146c43] text-[#a3e635] font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer font-heading flex items-center gap-2"
        >
          <Icon name="dashboard" size={16} />
          <span>Go to Dashboard Overview</span>
        </button>
      )}
    </div>
  );
};
