import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NestInLogo } from '../components/NestInLogo';

/**
 * Legacy OAuth landing route. Google Sign-In now completes in-app (see lib/googleIdentity.ts), so this
 * page simply forwards a signed-in user to the right portal and everyone else to the home page.
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, isOwner, isEmployee, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate('/', { replace: true });
    else if (isSuperAdmin) navigate('/admin', { replace: true });
    else if (isOwner || isEmployee) navigate('/owner/dashboard', { replace: true });
    else navigate('/profile', { replace: true });
  }, [isLoading, isAuthenticated, isOwner, isEmployee, isSuperAdmin, navigate]);

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#121820] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 max-w-md w-full shadow-lg space-y-6">
        <div className="flex justify-center">
          <NestInLogo variant="dark" size="md" showTagline={false} />
        </div>
        <div className="w-12 h-12 bg-slate-900 text-[#a3e635] rounded-2xl flex items-center justify-center mx-auto">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-xl font-black font-heading text-slate-900">Taking you to your dashboard</h2>
      </div>
    </div>
  );
};
