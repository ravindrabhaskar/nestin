import { useFocusTrap } from '../lib/useFocusTrap';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle, Building2, User, Mail, Lock, Phone, ArrowRight } from 'lucide-react';
import { NestInLogo } from './NestInLogo';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../lib/apiClient';
import { useScrollLock } from '../hooks/useScrollLock';
import { LoadingSpinner } from './ui/LoadingSpinner';

export interface NestInAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'tenant' | 'owner';
  initialTab?: 'login' | 'signup';
}

export const NestInAuthModal: React.FC<NestInAuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'tenant',
  initialTab = 'login',
}) => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithEmail, signupWithEmail, authMessage, login, googleEnabled, demoMode } = useAuth();

  /** Routes the user to the portal that matches the account's real role (not the tab they picked). */
  const routeForRole = (userRole: string) => {
    if (userRole === 'owner' || userRole === 'employee') return '/owner/dashboard';
    if (userRole === 'super_admin') return '/admin';
    return '/profile';
  };
  useScrollLock(isOpen);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  const [role, setRole] = useState<'tenant' | 'owner'>(initialRole);
  const [mode, setMode] = useState<'login' | 'signup'>(initialTab);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setInfoMsg('');
    if (!email) {
      setErrorMsg('Enter your email address first, then click "Forgot password?".');
      return;
    }
    try {
      await ApiClient.auth.forgotPassword(email);
      setInfoMsg(`If an account exists for ${email}, a reset link has been sent. Check your inbox.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not send the reset email.');
    }
  };

  // Manual form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRole(initialRole);
      setMode(initialTab);
      setErrorMsg('');
      setIsGoogleLoading(false);
      setIsEmailLoading(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
    }
  }, [isOpen, initialRole, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      const profile = await loginWithGoogle(role);
      onClose();
      navigate(routeForRole(profile.role));
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMsg(err.message || 'Google authentication failed. Please try again.');
    }
  };

  const handleDemoLogin = async (demoRole: 'owner' | 'tenant' | 'employee') => {
    setIsEmailLoading(true);
    setErrorMsg('');
    try {
      const profile = await login({ role: demoRole });
      onClose();
      if (profile) navigate(routeForRole(profile.role));
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    if (mode === 'signup' && !fullName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    setIsEmailLoading(true);

    try {
      const profile =
        mode === 'login'
          ? await loginWithEmail(email, password, role)
          : await signupWithEmail({ fullName, email, password, phone, role });
      onClose();
      navigate(routeForRole(profile.role));
    } catch (err: any) {
      setIsEmailLoading(false);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nestin-auth-title"
            data-testid="auth-modal"
            className="relative w-full max-w-md bg-white rounded-3xl sm:rounded-[32px] overflow-hidden shadow-2xl z-10 border border-slate-100 flex flex-col my-auto"
          >
            {/* Top Header */}
            <div className="p-6 sm:p-7 pb-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100/80 relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <NestInLogo variant="light" size="sm" showTagline={false} />
              </div>

              <h2
                id="nestin-auth-title"
                className="text-xl sm:text-2xl font-black text-[#121820] font-heading tracking-tight"
              >
                {role === 'owner'
                  ? mode === 'login'
                    ? 'Owner Portal Sign In'
                    : 'Register Property'
                  : mode === 'login'
                    ? 'Welcome back'
                    : 'Create your account'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {role === 'owner'
                  ? 'Manage your PG properties, occupancy, and leads in one unified dashboard.'
                  : mode === 'login'
                    ? 'Access verified student stays, bookings, and platform features.'
                    : 'Join thousands of students and residents across India.'}
              </p>

              {authMessage && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{authMessage}</span>
                </div>
              )}
            </div>

            {/* Form Body */}
            <div className="p-6 sm:p-7 space-y-4">
              {/* Account Role Selector */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setRole('tenant');
                    setErrorMsg('');
                  }}
                  className={`py-2 px-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    role === 'tenant' ? 'bg-white text-[#121820] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Resident</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('owner');
                    setErrorMsg('');
                  }}
                  className={`py-2 px-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    role === 'owner' ? 'bg-[#0F5132] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${role === 'owner' ? 'text-[#a3e635]' : ''}`} />
                  <span>PG Owner</span>
                </button>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 bg-slate-100/70 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    mode === 'login' ? 'bg-white text-[#121820] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                  }}
                  className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    mode === 'signup' ? 'bg-white text-[#121820] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {role === 'owner' ? 'Join as Partner' : 'Register'}
                </button>
              </div>

              {/* Google One-Click Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading || isEmailLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{role === 'owner' ? 'Continue with Google as Owner' : 'Continue with Google'}</span>
                  </>
                )}
              </button>

              {!googleEnabled && (
                <p className="text-[10px] text-slate-400 text-center -mt-2">
                  Google Sign-In is not configured on this deployment yet — use email &amp; password.
                </p>
              )}

              {demoMode && (
                <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
                  <span>Try a demo account:</span>
                  {(['tenant', 'owner', 'employee'] as const).map((demoRole) => (
                    <button
                      key={demoRole}
                      type="button"
                      onClick={() => handleDemoLogin(demoRole)}
                      disabled={isEmailLoading || isGoogleLoading}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-[#a3e635]/40 text-slate-800 capitalize cursor-pointer disabled:opacity-50"
                    >
                      {demoRole === 'employee' ? 'Staff' : demoRole}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  or with email
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                  {errorMsg}
                </div>
              )}
              {infoMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                  {infoMsg}
                </div>
              )}

              {/* Email / Pass Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {role === 'owner' ? 'Owner / Partner Name' : 'Full Name'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white outline-hidden"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={role === 'owner' ? 'owner@nestin.io' : 'ananya.rao@example.com'}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white outline-hidden"
                    />
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Phone Number {role === 'owner' ? '(Required for verification)' : '(Optional)'}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required={role === 'owner'}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white outline-hidden"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isEmailLoading || isGoogleLoading}
                  className={`w-full py-3 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 font-heading ${
                    role === 'owner' ? 'bg-[#0F5132] hover:bg-[#146c43]' : 'bg-[#0F5132] hover:bg-[#146c43]'
                  }`}
                >
                  {isEmailLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <span>
                        {role === 'owner'
                          ? mode === 'login'
                            ? 'Sign In to Owner Dashboard'
                            : 'Create Owner Account'
                          : mode === 'login'
                            ? 'Sign In'
                            : 'Create Account'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#a3e635]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
