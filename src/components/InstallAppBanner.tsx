import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { installPrompt } from '../lib/pwa';

const DISMISS_KEY = 'nestin_install_dismissed_at';

/** Small "Add NestIn to your home screen" prompt shown once the browser allows installation. */
export const InstallAppBanner: React.FC = () => {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return Date.now() - at < 7 * 86400000;
    } catch {
      return false;
    }
  });

  useEffect(() => installPrompt.subscribe(setAvailable), []);

  if (!available || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[95] max-w-xs w-[calc(100%-2rem)] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 flex items-start gap-3 font-sans"
      role="dialog"
      aria-label="Install NestIn"
    >
      <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black font-heading">Get the NestIn app</div>
        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
          Add to your home screen for faster access and booking alerts.
        </p>
        <button
          type="button"
          onClick={() => installPrompt.show().then((r) => r !== 'unavailable' && dismiss())}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#a3e635] text-slate-950 text-[11px] font-black cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Install
        </button>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="text-slate-500 hover:text-white cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
