import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { syncBus, SyncNotice } from '../lib/syncBus';

/** Surfaces background persistence results (errors, staff credentials, re-verification notices). */
export const SyncNoticeToast: React.FC = () => {
  const [notices, setNotices] = useState<SyncNotice[]>([]);

  useEffect(() => {
    return syncBus.subscribe((notice) => {
      setNotices((prev) => [...prev.slice(-3), notice]);
      const ttl = notice.kind === 'success' ? 12000 : 7000;
      setTimeout(() => setNotices((prev) => prev.filter((n) => n.id !== notice.id)), ttl);
    });
  }, []);

  if (notices.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] space-y-2 max-w-sm font-sans" role="status" aria-live="polite">
      {notices.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur ${
            n.kind === 'error'
              ? 'bg-rose-50/95 border-rose-200 text-rose-800'
              : n.kind === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          {n.kind === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : n.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed break-words">
            {n.message}
            {n.action && (
              <>
                {' '}
                <a href={n.action.href} className="underline font-black hover:opacity-80">
                  {n.action.label} →
                </a>
              </>
            )}
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNotices((prev) => prev.filter((x) => x.id !== n.id))}
            className="ml-auto text-current/60 hover:text-current cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
