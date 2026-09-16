import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, ArrowLeft, Home, Building2, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// -------------------------------------------------------------
// 1. OWNER & EMPLOYEE ROUTE GUARD
// -------------------------------------------------------------
interface ProtectedOwnerRouteProps {
  children: React.ReactNode;
}

export const ProtectedOwnerRoute: React.FC<ProtectedOwnerRouteProps> = ({ children }) => {
  const { isAuthenticated, isOwner, isEmployee, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#a3e635] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Verifying Partner Authorization...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or role is Tenant/User (No Owner permissions)
  if (!isAuthenticated || (!isOwner && !isEmployee)) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold font-heading">
              <Lock className="w-3.5 h-3.5" />
              <span>Owner & Partner Portal Only</span>
            </div>
            <h2 className="text-2xl font-black text-white font-heading">
              Access Restricted (403)
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              This section is reserved exclusively for registered PG Owners and property management staff.
              {user ? ` You are currently signed in as "${user.name}" (${user.role}).` : ' Please sign in with an authorized Owner account.'}
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('/for-owners')}
              className="w-full py-3 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer font-heading"
            >
              <Building2 className="w-4 h-4" />
              <span>Switch to / Sign In as Owner</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/find-pg')}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Return to Resident Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// -------------------------------------------------------------
// 2. SUPER ADMIN ROUTE GUARD
// -------------------------------------------------------------
interface ProtectedSuperAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedSuperAdminRoute: React.FC<ProtectedSuperAdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isSuperAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Verifying Root Administrator Credentials...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or NOT Super Admin
  if (!isAuthenticated || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/40 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[11px] font-black uppercase tracking-wider font-heading">
              <Shield className="w-3.5 h-3.5" />
              <span>Platform Administration Zone</span>
            </div>
            <h2 className="text-2xl font-black text-white font-heading">
              Unauthorized Access (403)
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              This system is strictly isolated and restricted to authorized NestIn Super Administrators.
              All access attempts are logged and monitored.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer font-heading"
            >
              <Lock className="w-4 h-4" />
              <span>Super Admin Login</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Return to Public Website</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// -------------------------------------------------------------
// 3. TENANT / RESIDENT ROUTE GUARD
// -------------------------------------------------------------
interface ProtectedTenantRouteProps {
  children: React.ReactNode;
}

export const ProtectedTenantRoute: React.FC<ProtectedTenantRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, setAuthModalOpen, setAuthMessage } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-800 mx-auto flex items-center justify-center">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-950 font-heading">
              Resident Sign-In Required
            </h3>
            <p className="text-xs text-slate-500">
              Please sign in to your resident account to view your bookings, saved properties, and profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAuthMessage('Sign in to access your tenant account');
              setAuthModalOpen(true);
            }}
            className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-[#a3e635] font-black text-xs rounded-xl shadow-md transition-all cursor-pointer font-heading"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
