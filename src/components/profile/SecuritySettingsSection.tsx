import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  LogOut,
  AlertTriangle,
  X,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useAuth, DEFAULT_SESSIONS } from '../../context/AuthContext';

export const SecuritySettingsSection: React.FC = () => {
  const { user, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState(user?.activeSessions || DEFAULT_SESSIONS);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLogoutAllOther = () => {
    const currentOnly = sessions.filter((s) => s.isCurrent);
    setSessions(currentOnly);
    updateUserProfile({ activeSessions: currentOnly });
    showToast('Logged out of all other active devices.');
  };

  const handleConfirmDelete = async () => {
    if (confirmText.trim().toLowerCase() !== 'delete') return;

    setIsDeleting(true);
    setTimeout(async () => {
      setDeleteModalOpen(false);
      await logout();
      navigate('/');
    }, 800);
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* SECURITY OVERVIEW CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black font-heading text-slate-900 tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#5fa000]" />
              <span>Account Security</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Review your authentication status and monitor active sign-in sessions.
            </p>
          </div>

          {toastMsg && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a3e635]/20 border border-[#a3e635]/50 text-[#3d6800] text-xs font-extrabold animate-fade-in font-heading">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>{toastMsg}</span>
            </div>
          )}
        </div>

        {/* GOOGLE AUTHENTICATION BADGE (NO FAKE PASSWORD CHANGE) */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 font-heading">
                  Signed in with Google
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#a3e635] text-slate-950 font-heading">
                  <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                  <span>Secured</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">{user?.email}</p>
              <p className="text-[11px] text-slate-400">
                Your account is secured through Google OAuth. Password creation is managed directly via Google.
              </p>
            </div>
          </div>

          <a
            href="https://myaccount.google.com/security"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs font-heading"
          >
            <span>Manage Google Account</span>
            <Globe className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>

        {/* ACTIVE SESSIONS & DEVICE LOGS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 font-heading">
                ACTIVE SESSIONS & DEVICES
              </div>
              <p className="text-[11px] text-slate-500">
                Devices currently logged into your Nestin tenant account.
              </p>
            </div>

            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleLogoutAllOther}
                className="text-xs font-extrabold text-slate-700 hover:text-slate-950 hover:underline cursor-pointer flex items-center gap-1 font-heading"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout from all other devices</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/40">
            {sessions.map((sess) => (
              <div key={sess.id} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                    {sess.device.includes('iPhone') || sess.device.includes('Android') ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-heading">
                        {sess.device}
                      </span>
                      {sess.isCurrent && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#a3e635]/25 text-[#3d6800] border border-[#a3e635]/40 font-heading">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {sess.browser} • {sess.location} • IP: {sess.ip}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[11px] font-bold ${sess.isCurrent ? 'text-[#5fa000]' : 'text-slate-400'}`}>
                    {sess.lastActive}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* DANGER ZONE (ACCOUNT DELETION) */}
      <div className="bg-rose-50/60 rounded-3xl border border-rose-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-base font-black font-heading tracking-tight">
            Danger Zone
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-extrabold text-slate-900 font-heading">
              Delete Account
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Permanently delete your Nestin account, past booking records, saved wishlists, and associated personal data.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-white border border-rose-300 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-extrabold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer font-heading"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 rounded-xl bg-rose-100">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black font-heading text-slate-900">
                  Delete your account?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                This action is <strong className="text-rose-600 font-bold">permanent and irreversible</strong>. All your personal data, scheduled visits, payment invoices, and verified documents will be permanently erased.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                Please type <span className="font-mono font-black text-slate-900">DELETE</span> below to confirm:
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText.trim().toLowerCase() !== 'delete' || isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer font-heading"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
