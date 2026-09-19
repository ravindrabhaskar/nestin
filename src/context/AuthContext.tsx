import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ApiClient, ApiError, tokenStore } from '../lib/apiClient';
import { disablePush } from '../lib/pwa';
import { UserLivingPreferences, UserNotificationSettings, UserPrivacySettings, TenantDocument } from '../types';
import {
  DEFAULT_LIVING_PREFERENCES,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
} from '../lib/domain/defaults';
import { requestGoogleCredential } from '../lib/googleIdentity';

export { DEFAULT_LIVING_PREFERENCES, DEFAULT_NOTIFICATION_SETTINGS, DEFAULT_PRIVACY_SETTINGS };

export type AppUserRole = 'super_admin' | 'owner' | 'employee' | 'tenant';

export interface UserSessionRecord {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  city?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  occupation?: 'Student' | 'Working Professional' | 'Job Seeker' | 'Intern' | 'Other';
  collegeOrCompany?: string;
  bio?: string;
  language?: string;
  role: AppUserRole;
  roles?: AppUserRole[];
  ownerId?: string | null;
  employeeId?: string;
  permissions?: Record<string, boolean>;
  authProvider?: string;
  createdAt?: string;
  livingPreferences?: UserLivingPreferences;
  notificationSettings?: UserNotificationSettings;
  privacySettings?: UserPrivacySettings;
  searchPreferences?: Record<string, unknown>;
  documents?: TenantDocument[];
  activeSessions?: UserSessionRecord[];
  emailVerified?: boolean;
}

/** Kept for backwards compatibility with components that render an empty sessions list. */
export const DEFAULT_SESSIONS: UserSessionRecord[] = [];
export const DEFAULT_DOCUMENTS: TenantDocument[] = [];

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isEmployee: boolean;
  isTenant: boolean;
  isLoading: boolean;
  googleEnabled: boolean;
  demoMode: boolean;
  hasPermission: (permissionId: string) => boolean;
  /** Demo convenience: signs in with the demo account for the given role (only when the server is in demo mode). */
  login: (userData?: { email?: string; password?: string; role?: string }) => Promise<UserProfile | null>;
  loginWithGoogle: (role?: 'tenant' | 'owner') => Promise<UserProfile>;
  loginWithEmail: (email: string, pass: string, role?: 'tenant' | 'owner') => Promise<UserProfile>;
  loginAsSuperAdmin: (credentials: {
    email: string;
    accessCode?: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signupWithEmail: (params: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    city?: string;
    role?: 'tenant' | 'owner';
  }) => Promise<UserProfile>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeOtherSessions: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authMessage: string | null;
  setAuthMessage: (msg: string | null) => void;
  requireAuth: (action: () => void, customMessage?: string) => void;
  setPendingAction: (action: (() => void) | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_ACCOUNTS: Record<string, { email: string; password: string }> = {
  owner: { email: 'owner@nestin.com', password: 'NestIn@2026' },
  tenant: { email: 'tenant@nestin.com', password: 'NestIn@2026' },
  employee: { email: 'staff@nestin.com', password: 'NestIn@2026' },
};

function normalizeAuthUser(apiUser: any): UserProfile {
  const role = String(apiUser.role || 'tenant').toLowerCase() as AppUserRole;
  return {
    id: apiUser.id,
    name: apiUser.fullName || apiUser.name || apiUser.email,
    email: apiUser.email,
    phone: apiUser.phone,
    avatar: apiUser.avatar,
    city: apiUser.city,
    dob: apiUser.dob,
    gender: apiUser.gender,
    occupation: apiUser.occupation,
    collegeOrCompany: apiUser.collegeOrCompany,
    bio: apiUser.bio,
    language: apiUser.language,
    role,
    roles: apiUser.roles || [role],
    ownerId: apiUser.ownerId ?? null,
    employeeId: apiUser.employeeId,
    permissions: apiUser.permissions,
    authProvider: apiUser.authProvider,
    createdAt: apiUser.createdAt,
    livingPreferences: apiUser.livingPreferences || DEFAULT_LIVING_PREFERENCES,
    notificationSettings: apiUser.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS,
    privacySettings: apiUser.privacySettings || DEFAULT_PRIVACY_SETTINGS,
    searchPreferences: apiUser.searchPreferences,
    documents: apiUser.documents || [],
    activeSessions: apiUser.activeSessions || [],
    emailVerified: apiUser.emailVerified !== false,
  };
}

function friendlyError(err: unknown, fallback: string): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error(fallback);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User state is in-memory only and always derived from a backend-validated session token.
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const isAuthenticated = !!user;
  const role = user?.role;
  const isSuperAdmin = role === 'super_admin';
  const isOwner = role === 'owner';
  const isEmployee = role === 'employee';
  const isTenant = role === 'tenant';

  const applySession = useCallback((response: { user: any; token: string }) => {
    tokenStore.set(response.token);
    const profile = normalizeAuthUser(response.user);
    setUser(profile);
    setAuthModalOpen(false);
    setAuthMessage(null);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) setTimeout(action, 150);
    return profile;
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Validate the stored token with the server on load; never trust client-side state alone.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await ApiClient.auth.config();
        if (mounted) {
          setGoogleClientId(cfg.googleClientId);
          setDemoMode(!!cfg.demoMode);
        }
      } catch {
        // server unreachable — the UI still renders in a logged-out state
      }
      if (!tokenStore.get()) {
        if (mounted) setIsLoading(false);
        return;
      }
      try {
        const result = await ApiClient.auth.validateToken();
        if (mounted) setUser(result?.valid && result.user ? normalizeAuthUser(result.user) : null);
      } catch {
        if (mounted) clearSession();
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    const unsubscribe = tokenStore.onUnauthorized(() => {
      if (mounted) setUser(null);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [clearSession]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await ApiClient.auth.login({ email, password });
        return applySession(response);
      } catch (err) {
        throw friendlyError(err, 'Login failed. Please verify your email and password.');
      } finally {
        setIsLoading(false);
      }
    },
    [applySession]
  );

  const login = useCallback(
    async (userData?: { email?: string; password?: string; role?: string }) => {
      const demo = DEMO_ACCOUNTS[(userData?.role || 'tenant').toLowerCase()] || DEMO_ACCOUNTS.tenant;
      const email = userData?.email || demo.email;
      const password = userData?.password || demo.password;
      setIsLoading(true);
      try {
        return applySession(await ApiClient.auth.login({ email, password }));
      } catch (err) {
        throw friendlyError(err, 'Login failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [applySession]
  );

  const loginWithGoogle = useCallback(
    async (roleParam: 'tenant' | 'owner' = 'tenant') => {
      if (!googleClientId) {
        throw new Error(
          'Google Sign-In is not configured for this deployment yet. Please continue with email and password.'
        );
      }
      setIsLoading(true);
      try {
        const credential = await requestGoogleCredential(googleClientId);
        return applySession(await ApiClient.auth.google({ credential, role: roleParam }));
      } catch (err) {
        throw friendlyError(err, 'Google authentication failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, googleClientId]
  );

  const signupWithEmail = useCallback(
    async (params: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      city?: string;
      role?: 'tenant' | 'owner';
    }) => {
      setIsLoading(true);
      try {
        return applySession(
          await ApiClient.auth.register({ ...params, role: params.role === 'owner' ? 'owner' : 'tenant' })
        );
      } catch (err) {
        throw friendlyError(err, 'Registration failed. Please check your details.');
      } finally {
        setIsLoading(false);
      }
    },
    [applySession]
  );

  const loginAsSuperAdmin = useCallback(
    async (credentials: { email: string; accessCode?: string; password?: string }) => {
      setIsLoading(true);
      try {
        const response = await ApiClient.auth.adminLogin({
          email: credentials.email,
          password: credentials.password || '',
          accessCode: credentials.accessCode || '',
        });
        if (String(response.user?.role).toLowerCase() !== 'super_admin') {
          return { success: false, error: 'Access denied: the account does not have Super Administrator privileges.' };
        }
        applySession(response);
        return { success: true };
      } catch (err) {
        return { success: false, error: friendlyError(err, 'Super admin authentication failed.').message };
      } finally {
        setIsLoading(false);
      }
    },
    [applySession]
  );

  const refreshUser = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      setUser(normalizeAuthUser(await ApiClient.auth.me()));
    } catch {
      // handled by the unauthorized listener when the session is gone
    }
  }, []);

  const updateUserProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!user) return;
      const { activeSessions: _s, documents: _d, permissions: _p, role: _r, id: _i, email: _e, ...patch } = data;
      // Optimistic update, then reconcile with the server's canonical profile.
      setUser((prev) => (prev ? { ...prev, ...patch } : prev));
      try {
        const updated = await ApiClient.auth.updateProfile({ ...patch, fullName: patch.name });
        setUser(normalizeAuthUser(updated));
      } catch (err) {
        await refreshUser();
        throw friendlyError(err, 'Could not save your profile.');
      }
    },
    [user, refreshUser]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await ApiClient.auth.changePassword({ currentPassword, newPassword });
        await refreshUser();
      } catch (err) {
        throw friendlyError(err, 'Could not change your password.');
      }
    },
    [refreshUser]
  );

  const revokeSession = useCallback(
    async (sessionId: string) => {
      await ApiClient.auth.revokeSession(sessionId);
      await refreshUser();
    },
    [refreshUser]
  );

  const revokeOtherSessions = useCallback(async () => {
    const sessions = await ApiClient.auth.getSessions();
    await Promise.all(sessions.filter((s) => !s.isCurrent).map((s) => ApiClient.auth.revokeSession(s.id)));
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      if (tokenStore.get()) {
        // Detach this device's push subscription first so the next person to sign in here never
        // receives the previous account's notifications.
        await disablePush().catch(() => undefined);
        await ApiClient.auth.logout();
      }
    } catch {
      // token may already be invalid
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const deleteAccount = useCallback(
    async (password?: string) => {
      try {
        await ApiClient.auth.deleteAccount(password);
      } catch (err) {
        throw friendlyError(err, 'Could not delete your account.');
      }
      clearSession();
    },
    [clearSession]
  );

  const requireAuth = useCallback(
    (action: () => void, customMessage = 'Please log in or create an account to continue.') => {
      if (isAuthenticated) {
        action();
      } else {
        pendingActionRef.current = action;
        setAuthMessage(customMessage);
        setAuthModalOpen(true);
      }
    },
    [isAuthenticated]
  );

  const setPendingAction = useCallback((action: (() => void) | null) => {
    pendingActionRef.current = action;
  }, []);

  const hasPermission = useCallback(
    (permissionId: string) => {
      if (!user) return false;
      if (user.role === 'owner' || user.role === 'super_admin') return true;
      return !!user.permissions?.[permissionId];
    },
    [user]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isSuperAdmin,
      isOwner,
      isEmployee,
      isTenant,
      isLoading,
      googleEnabled: !!googleClientId,
      demoMode,
      hasPermission,
      login,
      loginWithGoogle,
      loginWithEmail,
      loginAsSuperAdmin,
      signupWithEmail,
      updateUserProfile,
      updateUser: updateUserProfile,
      changePassword,
      revokeSession,
      revokeOtherSessions,
      deleteAccount,
      refreshUser,
      logout,
      authModalOpen,
      setAuthModalOpen,
      authMessage,
      setAuthMessage,
      requireAuth,
      setPendingAction,
    }),
    [
      user,
      isAuthenticated,
      isSuperAdmin,
      isOwner,
      isEmployee,
      isTenant,
      isLoading,
      googleClientId,
      demoMode,
      hasPermission,
      login,
      loginWithGoogle,
      loginWithEmail,
      loginAsSuperAdmin,
      signupWithEmail,
      updateUserProfile,
      changePassword,
      revokeSession,
      revokeOtherSessions,
      deleteAccount,
      refreshUser,
      logout,
      authModalOpen,
      authMessage,
      requireAuth,
      setPendingAction,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
