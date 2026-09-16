import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured, fetchUserProfile, upsertUserProfile, formatAuthError } from '../lib/supabase';
import { ApiClient } from '../lib/apiClient';
import { NestInLogo } from '../components/NestInLogo';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const processAuthCallback = async () => {
      try {
        if (!isSupabaseConfigured) {
          navigate('/', { replace: true });
          return;
        }

        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const errorParam = searchParams.get('error') || hashParams.get('error');
        const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

        if (errorParam || errorDesc) {
          const friendly = formatAuthError(errorDesc || errorParam || 'Authentication was cancelled.');
          if (isMounted) setErrorMsg(friendly);
          setTimeout(() => navigate('/', { replace: true }), 2500);
          return;
        }

        const code = searchParams.get('code');
        let sessionUser = null;

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Exchange code error:', exchangeError);
            if (isMounted) setErrorMsg(formatAuthError(exchangeError.message));
            setTimeout(() => navigate('/', { replace: true }), 2500);
            return;
          }
          sessionUser = data?.session?.user;
        }

        if (!sessionUser) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            if (isMounted) setErrorMsg(formatAuthError(sessionError.message));
            setTimeout(() => navigate('/', { replace: true }), 2500);
            return;
          }
          sessionUser = session?.user;
        }

        if (!sessionUser) {
          // Delay briefly to allow auto-parsing of session hash
          await new Promise((res) => setTimeout(res, 600));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          sessionUser = retrySession?.user;
        }

        if (!sessionUser) {
          if (isMounted) setErrorMsg('No active user session detected. Please try logging in again.');
          setTimeout(() => navigate('/', { replace: true }), 2500);
          return;
        }

        await completeRedirect(sessionUser);
      } catch (err: any) {
        console.error('Error processing Auth Callback:', err);
        if (isMounted) setErrorMsg(formatAuthError(err?.message || 'An unexpected error occurred during authentication.'));
        setTimeout(() => navigate('/', { replace: true }), 2500);
      }
    };

    const completeRedirect = async (user: any) => {
      const pendingRole = (localStorage.getItem('nestin_pending_role') as 'tenant' | 'admin' | 'owner') || 'tenant';
      localStorage.removeItem('nestin_pending_role');

      // Fetch or create user profile in public.profiles table
      let dbProfile = await fetchUserProfile(user.id);

      if (!dbProfile) {
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'NestIn User';

        const avatarUrl =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;

        dbProfile = await upsertUserProfile({
          id: user.id,
          full_name: fullName,
          email: user.email || '',
          phone: user.user_metadata?.phone || '',
          avatar_url: avatarUrl,
          city: user.user_metadata?.city || 'Bengaluru',
          role: pendingRole,
        });
      } else {
        // Update last login timestamp for existing profile
        await upsertUserProfile({
          id: dbProfile.id,
          email: dbProfile.email,
          full_name: dbProfile.full_name,
          role: dbProfile.role,
        });
      }

      const role = dbProfile?.role || user.user_metadata?.role || pendingRole;

      // Obtain backend microservice cryptographic JWT for sessionUser
      try {
        const authRes = await ApiClient.auth.google({
          email: user.email,
          fullName: dbProfile?.full_name || user.email?.split('@')[0],
          avatarUrl: dbProfile?.avatar_url,
          role: role === 'owner' ? 'owner' : (role === 'admin' ? 'super_admin' : 'tenant'),
          googleToken: user.id,
        });
        if (authRes?.token) {
          localStorage.setItem('nestin_auth_token', authRes.token);
          localStorage.removeItem('nestin_user');
        }
      } catch (err) {
        console.warn('Backend token sync in AuthCallback:', err);
      }

      if (!isMounted) return;

      if (pendingRole === 'owner' || role === 'owner') {
        navigate('/owner/dashboard', { replace: true });
      } else if (pendingRole === 'admin' || role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    };

    processAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#121820] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 max-w-md w-full shadow-lg space-y-6">
        <div className="flex justify-center">
          <NestInLogo variant="dark" size="md" showTagline={false} />
        </div>

        {errorMsg ? (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black font-heading text-slate-900">
              Authentication Issue
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">{errorMsg}</p>
            <p className="text-[11px] text-slate-400 font-medium">Redirecting you home...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-slate-900 text-[#a3e635] rounded-2xl flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h2 className="text-xl font-black font-heading text-slate-900">
              Authenticating with NestIn
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verifying your security credentials and preparing your personalized dashboard...
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Secure Session Initialized</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
