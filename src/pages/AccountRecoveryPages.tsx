import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { ApiClient } from '../lib/apiClient';
import { NestInLogo } from '../components/NestInLogo';
import { useAuth } from '../context/AuthContext';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#FAF9F5] text-[#121820] flex items-center justify-center p-6 font-sans">
    <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 max-w-md w-full shadow-lg space-y-6">
      <div className="flex justify-center">
        <NestInLogo variant="dark" size="md" showTagline={false} />
      </div>
      {children}
    </div>
  </div>
);

/** /reset-password?token=… — choose a new password from the emailed link. */
export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await ApiClient.auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h1 className="text-xl font-black font-heading">Invalid reset link</h1>
          <p className="text-xs text-slate-500">Request a new link from the sign-in screen using “Forgot password?”.</p>
          <Link to="/" className="inline-block text-xs font-bold underline">
            Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {done ? (
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-black font-heading">Password updated</h1>
          <p className="text-xs text-slate-500">You have been signed out everywhere. Sign in with your new password.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="text-center">
            <KeyRound className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <h1 className="text-xl font-black font-heading">Choose a new password</h1>
            <p className="text-xs text-slate-500 mt-1">At least 8 characters with letters and numbers.</p>
          </div>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3e635]/60"
          />
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3e635]/60"
          />
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-slate-900 text-[#a3e635] font-black text-sm disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </Shell>
  );
};

/** /verify-email?token=… — confirms the address from the emailed link. */
export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const { refreshUser } = useAuth();
  const token = params.get('token') || '';
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    ApiClient.auth
      .verifyEmail(token)
      .then(async () => {
        setState('ok');
        await refreshUser();
      })
      .catch((err) => {
        setState('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed.');
      });
  }, [token, refreshUser]);

  return (
    <Shell>
      <div className="text-center space-y-3">
        {state === 'working' && <Loader2 className="w-10 h-10 text-slate-700 mx-auto animate-spin" />}
        {state === 'ok' && <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />}
        {state === 'error' && <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />}
        <h1 className="text-xl font-black font-heading">
          {state === 'working' ? 'Verifying your email…' : state === 'ok' ? 'Email verified' : 'Could not verify'}
        </h1>
        <p className="text-xs text-slate-500">
          {state === 'ok' ? 'Thanks — your account is now fully active.' : message}
        </p>
        <Link to="/" className="inline-block text-xs font-bold underline">
          Continue to NestIn
        </Link>
      </div>
    </Shell>
  );
};
