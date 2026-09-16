import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, Smartphone, Globe, AlertTriangle, KeyRound, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../lib/apiClient';

interface SecurityPanelProps {
  onNotice?: (message: string) => void;
}

/**
 * Account security controls backed by the API: sign-in method, password change, live session list with
 * per-device revocation, and account deletion.
 */
export const SecurityPanel: React.FC<SecurityPanelProps> = ({ onNotice }) => {
  const { user, changePassword, revokeSession, revokeOtherSessions, deleteAccount, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const notice = (msg: string) => onNotice?.(msg);
  const usesPassword = user?.authProvider !== 'google';
  const sessions = user?.activeSessions || [];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setIsSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notice('Password updated. Other devices have been signed out.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not change your password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      notice('Device signed out.');
    } catch (err) {
      notice(err instanceof Error ? err.message : 'Could not sign out that device.');
    }
  };

  const handleRevokeOthers = async () => {
    try {
      await revokeOtherSessions();
      notice('Signed out of all other devices.');
    } catch (err) {
      notice(err instanceof Error ? err.message : 'Could not sign out other devices.');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(usesPassword ? deletePassword : undefined);
      navigate('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete your account.');
      setIsDeleting(false);
    }
  };

  const deviceIcon = (device: string) => {
    if (/iphone|android|ipad|mobile/i.test(device)) return <Smartphone className="w-4 h-4" />;
    if (/mac|windows|linux|desktop/i.test(device)) return <Laptop className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* SIGN-IN METHOD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-slate-900">Sign-in method</h3>
            <p className="text-xs text-slate-500">
              {usesPassword ? 'Email & password' : 'Google account'} · {user?.email}
            </p>
          </div>
        </div>

        {user && user.emailVerified === false && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <span className="font-semibold">Your email address is not verified yet.</span>
            <button
              type="button"
              onClick={() =>
                ApiClient.auth
                  .resendVerification()
                  .then(() => notice('Verification email sent.'))
                  .catch((err) => notice(err.message))
              }
              className="font-bold underline cursor-pointer self-start sm:self-auto"
            >
              Resend verification email
            </button>
          </div>
        )}

        {usesPassword ? (
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              required
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a3e635]/60"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8, letters + numbers)"
              required
              minLength={8}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a3e635]/60"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a3e635]/60"
            />
            {passwordError && <p className="sm:col-span-3 text-xs font-semibold text-rose-600">{passwordError}</p>}
            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={isSavingPassword}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-[#a3e635] hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer font-heading flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isSavingPassword ? 'Updating…' : 'Update password'}</span>
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-slate-500">
            Your password is managed by Google.{' '}
            <a
              href="https://myaccount.google.com/security"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-900 underline"
            >
              Manage Google account
            </a>
          </p>
        )}
      </div>

      {/* ACTIVE SESSIONS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold font-heading text-slate-900">Active sessions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Devices currently signed in to your account.</p>
          </div>
          <button
            type="button"
            onClick={() => void refreshUser()}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {sessions.length === 0 && <p className="py-3 text-xs text-slate-500">No session details available.</p>}
          {sessions.map((s) => (
            <div key={s.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600">{deviceIcon(s.device)}</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold font-heading text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>
                      {s.browser} on {s.device}
                    </span>
                    {s.isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#a3e635]/30 text-[#2d5000]">
                        This device
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {s.location} · {s.ip} · {s.lastActive}
                  </div>
                </div>
              </div>
              {!s.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevoke(s.id)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer shrink-0"
                >
                  Sign out
                </button>
              )}
            </div>
          ))}
        </div>

        {sessions.some((s) => !s.isCurrent) && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRevokeOthers}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 hover:text-slate-900 transition-colors cursor-pointer font-heading flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out of all other devices</span>
            </button>
          </div>
        )}
      </div>

      {/* DELETE ACCOUNT */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold font-heading text-rose-600">Delete account</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanently close your NestIn account and sign out everywhere.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer font-heading shrink-0"
          >
            Delete account
          </button>
        </div>
      </div>

      {deleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900">Delete your account?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This cannot be undone. Your profile, saved properties and sessions will be removed. Bookings already
                confirmed with an owner remain on their records.
              </p>
            </div>
            {usesPassword && (
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            )}
            {deleteError && <p className="text-xs font-semibold text-rose-600">{deleteError}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || (usesPassword && !deletePassword)}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer font-heading"
              >
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
