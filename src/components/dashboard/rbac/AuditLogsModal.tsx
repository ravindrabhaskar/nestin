import React, { useState, useMemo } from 'react';
import { useRBAC } from '../../../context/RBACContext';
import { Icon } from '../../ui/Icon';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose }) => {
  const { auditLogs, clearAuditLogs } = useRBAC();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'role' | 'employee' | 'permission'>('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesType = filterType === 'all' || log.targetType === filterType;
      const query = searchQuery.toLowerCase();
      const matchesQuery =
        !query ||
        log.actorName.toLowerCase().includes(query) ||
        log.targetName.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        (log.permissionLabel && log.permissionLabel.toLowerCase().includes(query)) ||
        (log.note && log.note.toLowerCase().includes(query));

      return matchesType && matchesQuery;
    });
  }, [auditLogs, filterType, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-logs-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#062817] text-[#a3e635] flex items-center justify-center font-bold">
              <Icon name="shield" size={20} />
            </div>
            <div>
              <h2 id="audit-logs-title" className="text-lg font-black font-heading text-slate-900">
                Security & Permission Audit Logs
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Immutable chronological ledger of role updates and permission overrides.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close audit log modal"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search actor, role, or permission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#062817]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            {(['all', 'permission', 'role', 'employee'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer shrink-0 ${
                  filterType === type
                    ? 'bg-[#062817] text-[#a3e635]'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {type === 'all' ? 'All Logs' : `${type}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Timeline List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Icon name="shield" size={32} className="text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No audit logs matching criteria.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const formattedDate = new Date(log.timestamp).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              const isGrant =
                log.action.toLowerCase().includes('grant') || log.action.toLowerCase().includes('enabled');
              const isRevoke =
                log.action.toLowerCase().includes('revoke') ||
                log.action.toLowerCase().includes('denied') ||
                log.action.toLowerCase().includes('deactivat');

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full font-heading ${
                          isGrant
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isRevoke
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-xs font-black text-slate-900 font-heading">{log.targetName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0">{formattedDate}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{log.note}</p>

                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Authorized by:</span>
                      <span className="font-bold text-slate-800">{log.actorName}</span>
                    </div>

                    {log.oldValue !== undefined && log.newValue !== undefined && (
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <span className="text-slate-400">{String(log.oldValue)}</span>
                        <span>→</span>
                        <span className="font-bold text-slate-800">{String(log.newValue)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Showing {filteredLogs.length} of {auditLogs.length} audit entries
          </span>
          <div className="flex items-center gap-2">
            {auditLogs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all audit log entries?')) {
                    clearAuditLogs();
                  }
                }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
              >
                Clear History
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#062817] text-[#a3e635] font-extrabold rounded-xl hover:bg-[#0d3d25] transition-colors cursor-pointer font-heading"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
