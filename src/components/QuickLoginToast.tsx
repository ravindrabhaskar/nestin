import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Check, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './ui/LoadingSpinner';

const AUTO_DISMISS_DURATION = 6500; // ms

export const QuickLoginToast: React.FC = () => {
  const { quickLoginToast, hideQuickLoginToast, addToWishlist } = useWishlist();
  const { loginWithGoogle, setAuthModalOpen, setAuthMessage, setPendingAction } = useAuth();

  const [isHovered, setIsHovered] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [progress, setProgress] = useState(100);

  const remainingTimeRef = useRef<number>(AUTO_DISMISS_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const property = quickLoginToast.property;

  // Reset state when toast opens with a new property
  useEffect(() => {
    if (quickLoginToast.isOpen) {
      setIsLoadingGoogle(false);
      setJustSaved(false);
      setProgress(100);
      remainingTimeRef.current = AUTO_DISMISS_DURATION;
    }
  }, [quickLoginToast.isOpen, property?.id]);

  // Handle countdown and auto-dismiss with hover pause
  useEffect(() => {
    if (!quickLoginToast.isOpen || justSaved || isLoadingGoogle) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (isHovered) {
      // Paused while user hovers to interact
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = 50;
    timerRef.current = setInterval(() => {
      remainingTimeRef.current -= interval;
      const pct = Math.max(0, (remainingTimeRef.current / AUTO_DISMISS_DURATION) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        hideQuickLoginToast();
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quickLoginToast.isOpen, isHovered, justSaved, isLoadingGoogle, hideQuickLoginToast]);

  const handleQuickGoogleLogin = async () => {
    try {
      setIsLoadingGoogle(true);
      await loginWithGoogle('tenant');
      if (property) {
        addToWishlist(property);
      }
      setJustSaved(true);
      setTimeout(() => {
        hideQuickLoginToast();
        setJustSaved(false);
      }, 1500);
    } catch (err) {
      console.error('Quick Google login error:', err);
      if (property) {
        setPendingAction(() => addToWishlist(property));
      }
      setAuthMessage('Sign in to save properties to your favorites.');
      setAuthModalOpen(true);
      hideQuickLoginToast();
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleOpenEmailLogin = () => {
    if (property) {
      setPendingAction(() => addToWishlist(property));
    }
    setAuthMessage('Sign in to save this property to your favorites and access it anytime.');
    setAuthModalOpen(true);
    hideQuickLoginToast();
  };

  return (
    <AnimatePresence>
      {quickLoginToast.isOpen && (
        <div
          id="quick-login-toast-wrapper"
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-[400px] pointer-events-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.div
            id="quick-login-toast"
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="bg-[#121820] text-white rounded-2xl shadow-2xl border border-slate-700/80 p-4 relative overflow-hidden backdrop-blur-xl select-none"
          >
            {/* Top Bar: Tag & Close Button */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a3e635] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#a3e635]"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#a3e635]">Quick Login</span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-slate-300 text-xs font-semibold flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-400 fill-red-400 inline" />
                  Save to Favorites
                </span>
              </div>

              <button
                type="button"
                id="quick-login-dismiss-btn"
                onClick={hideQuickLoginToast}
                aria-label="Dismiss quick login notification"
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success State When Favorited via Quick Login */}
            {justSaved ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-3 flex items-center gap-3 text-white"
              >
                <div className="w-10 h-10 rounded-xl bg-[#a3e635]/20 text-[#a3e635] flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 stroke-[3] text-[#a3e635]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Saved to Favorites!</h4>
                  <p className="text-xs text-slate-300">
                    {property?.name ? `"${property.name}" added to your wishlist.` : 'Added to your favorites.'}
                  </p>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Middle Content: Property Thumbnail & Context */}
                <div className="flex items-start gap-3 mb-3.5 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                  {property?.image ? (
                    <img
                      src={property.image}
                      alt={property.name || 'Property'}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#a3e635]/15 text-[#a3e635] flex items-center justify-center shrink-0">
                      <Heart className="w-6 h-6 fill-[#a3e635]/30 text-[#a3e635]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white line-clamp-1">
                      {property?.name || property?.title || 'Nestin Co-Living Stay'}
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                      Log in to save this stay to your favorites and access it from any device.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  {/* Google Quick Login Button */}
                  <button
                    type="button"
                    id="quick-login-google-btn"
                    onClick={handleQuickGoogleLogin}
                    disabled={isLoadingGoogle}
                    className="w-full sm:flex-1 py-2.5 px-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    {isLoadingGoogle ? (
                      <LoadingSpinner size="sm" variant="google" />
                    ) : (
                      <>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                        <span className="truncate">Quick Login with Google</span>
                      </>
                    )}
                  </button>

                  {/* Email Sign In Option */}
                  <button
                    type="button"
                    id="quick-login-email-btn"
                    onClick={handleOpenEmailLogin}
                    className="w-full sm:w-auto py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>More Options</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </>
            )}

            {/* Subtle Progress Bar */}
            {!justSaved && !isLoadingGoogle && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#a3e635] to-[#4ade80] transition-all duration-75 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
