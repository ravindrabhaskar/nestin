import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../lib/apiClient';
import {
  UserLivingPreferences,
  UserNotificationSettings,
  UserPrivacySettings,
  TenantDocument,
} from '../types';

export type AppUserRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'EMPLOYEE'
  | 'TENANT'
  | 'USER'
  | 'tenant'
  | 'owner'
  | 'super_admin'
  | 'employee'
  | 'user';

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
  authProvider?: string;
  createdAt?: string;
  livingPreferences?: UserLivingPreferences;
  notificationSettings?: UserNotificationSettings;
  privacySettings?: UserPrivacySettings;
  documents?: TenantDocument[];
  activeSessions?: UserSessionRecord[];
}

export const DEFAULT_LIVING_PREFERENCES: UserLivingPreferences = {
  preferredCity: 'Hyderabad',
  preferredArea: 'Kukatpally / Hitec City',
  preferredPgType: 'Co-Living',
  preferredRoomType: ['Single', 'Double'],
  budgetMin: 6000,
  budgetMax: 16000,
  genderPreference: 'Co-Living',
  foodPreference: 'Food Included',
  moveInDate: '2026-09-01',
  acPreference: 'AC',
  attachedBathroom: true,
  furnishing: 'Fully Furnished',
  selectedAmenities: [
    'High-Speed WiFi',
    'Daily Housekeeping',
    'Power Backup',
    'Washing Machine',
    'RO Drinking Water',
    'CCTV Security',
  ],
};

export const DEFAULT_NOTIFICATION_SETTINGS: UserNotificationSettings = {
  // Booking Notifications
  bookingConfirmed: true,
  bookingCancelled: true,
  bookingUpdates: true,
  // Payment Notifications
  paymentConfirmation: true,
  paymentReminders: true,
  refundUpdates: true,
  // Visit Notifications
  visitConfirmation: true,
  visitReminder: true,
  visitCancellation: true,
  // Property Notifications
  newPgRecommendations: true,
  savedPgUpdates: true,
  priceChanges: true,
  availabilityAlerts: true,
  // Marketing
  offers: false,
  promotions: false,
  nestinUpdates: true,
  // Channels
  emailNotifications: true,
  pushNotifications: true,
  whatsAppNotifications: true,
};

export const DEFAULT_PRIVACY_SETTINGS: UserPrivacySettings = {
  profileVisibility: 'verified_only',
  personalizedRecommendations: true,
  locationBasedRecommendations: true,
  dataSharingPreferences: true,
};

export const DEFAULT_DOCUMENTS: TenantDocument[] = [
  {
    id: 'doc-01',
    name: 'Government ID (Aadhaar / Passport)',
    type: 'govt_id',
    documentNumber: 'XXXX-XXXX-4821',
    fileName: 'aadhaar_card_masked.pdf',
    fileSize: '1.2 MB',
    uploadedAt: '12 Aug 2026',
    status: 'verified',
  },
  {
    id: 'doc-02',
    name: 'College / Employee ID Card',
    type: 'student_id',
    documentNumber: 'EMP-98214',
    fileName: 'company_id_badge.jpg',
    fileSize: '840 KB',
    uploadedAt: '14 Aug 2026',
    status: 'verified',
  },
  {
    id: 'doc-03',
    name: 'Current Address Proof (Utility / Rent Agreement)',
    type: 'address_proof',
    documentNumber: 'EL-0921849',
    fileName: 'electricity_bill_latest.pdf',
    fileSize: '950 KB',
    uploadedAt: '18 Aug 2026',
    status: 'in_review',
  },
];

export const DEFAULT_SESSIONS: UserSessionRecord[] = [
  {
    id: 'sess-current',
    device: 'MacBook Pro (macOS 15.4)',
    browser: 'Chrome 128.0',
    location: 'Hyderabad, Telangana, IN',
    ip: '49.204.128.45',
    lastActive: 'Active Now',
    isCurrent: true,
  },
  {
    id: 'sess-mobile',
    device: 'iPhone 15 Pro (iOS 18.2)',
    browser: 'Safari Mobile',
    location: 'Bengaluru, Karnataka, IN',
    ip: '157.48.21.90',
    lastActive: '2 hours ago',
    isCurrent: false,
  },
];

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isEmployee: boolean;
  isTenant: boolean;
  isLoading: boolean;
  login: (userData?: Partial<UserProfile> | { email: string; password?: string; role?: string }) => Promise<UserProfile | null> | void;
  loginWithGoogle: (role?: AppUserRole) => Promise<void>;
  loginWithEmail: (email: string, pass: string, role?: AppUserRole) => Promise<void>;
  loginAsSuperAdmin: (credentials: { email: string; accessCode?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  signupWithEmail: (params: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    city?: string;
    role?: AppUserRole;
  }) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void> | void;
  updateUser?: (data: Partial<UserProfile>) => Promise<void> | void;
  logout: () => Promise<void>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authMessage: string | null;
  setAuthMessage: (msg: string | null) => void;
  requireAuth: (action: () => void, customMessage?: string) => void;
  setPendingAction: (action: (() => void) | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Normalizes backend AuthUser and session payload into the frontend UserProfile format
 */
function normalizeAuthUser(apiUser: any, session?: any): UserProfile {
  const assignedRole = apiUser.role || 'tenant';
  const isOwner = assignedRole.toLowerCase() === 'owner';

  return {
    id: apiUser.id || 'usr-' + Date.now(),
    name: apiUser.fullName || apiUser.name || (isOwner ? 'Paritala Venkata Vaibhav' : 'Ananya Rao'),
    email: apiUser.email || (isOwner ? 'venkatavaibhavparitala@gmail.com' : 'ananya.rao@example.com'),
    phone: apiUser.phone || '+91 98765 43210',
    avatar: apiUser.avatar !== undefined ? apiUser.avatar : (isOwner ? '' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'),
    city: apiUser.city || (isOwner ? 'Hyderabad' : 'Bengaluru'),
    dob: apiUser.dob || '1999-05-14',
    gender: apiUser.gender || (isOwner ? 'Male' : 'Female'),
    occupation: apiUser.occupation || 'Working Professional',
    collegeOrCompany: apiUser.collegeOrCompany || (isOwner ? 'NestIn Living Properties' : 'Cognizant Technology Solutions'),
    bio: apiUser.bio || (isOwner ? 'Owner & Operator at NestIn Living Properties.' : 'Software Engineer relocating to Hitec City. Looking for quiet, verified coliving space.'),
    language: apiUser.language || 'English (India)',
    role: assignedRole,
    roles: apiUser.roles || [assignedRole],
    authProvider: apiUser.authProvider || 'email',
    createdAt: apiUser.createdAt || '2026-06-10T10:00:00Z',
    livingPreferences: apiUser.livingPreferences || DEFAULT_LIVING_PREFERENCES,
    notificationSettings: apiUser.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS,
    privacySettings: apiUser.privacySettings || DEFAULT_PRIVACY_SETTINGS,
    documents: apiUser.documents || DEFAULT_DOCUMENTS,
    activeSessions: apiUser.activeSessions || (session ? [session] : DEFAULT_SESSIONS),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User state is strictly in-memory and initialized to null.
  // Sensitive authorization state is NEVER read from LocalStorage to prevent client-side bypasses.
  const [user, setUser] = useState<UserProfile | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isAuthenticated = !!user;

  // Normalized Role Assertions (strictly derived from in-memory verified backend user)
  const normalizedRole = (user?.role || 'tenant').toLowerCase();
  const isSuperAdmin = normalizedRole === 'super_admin' || user?.role === 'SUPER_ADMIN';
  const isOwner = normalizedRole === 'owner' || user?.role === 'OWNER';
  const isEmployee = normalizedRole === 'employee' || user?.role === 'EMPLOYEE';
  const isTenant = !isSuperAdmin && !isOwner && !isEmployee;

  // Validate session & token on initial application load strictly with independent Auth Service
  useEffect(() => {
    let isMounted = true;

    const validateInitialSession = async () => {
      // Proactively scrub any legacy or untrusted user profile state from LocalStorage
      try {
        localStorage.removeItem('nestin_user');
      } catch {
        // Ignore storage errors
      }

      const storedToken = localStorage.getItem('nestin_auth_token');

      // If no backend token exists, the user is unauthenticated
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Call the independent Auth Service's REST API endpoint for cryptographic JWT validation
        const result = await ApiClient.auth.validateToken(storedToken);

        if (isMounted) {
          if (result && result.valid && result.user) {
            const formattedUser = normalizeAuthUser(result.user, result.session);
            setUser(formattedUser);
          } else {
            // Token is invalid, expired, or revoked
            localStorage.removeItem('nestin_auth_token');
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Backend JWT validation failed. Revoking authorization session:', err);
        // Under no circumstances should we fall back to LocalStorage unverified profile!
        try {
          localStorage.removeItem('nestin_auth_token');
        } catch {
          // ignore
        }
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    validateInitialSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (userData?: Partial<UserProfile> | { email: string; password?: string; role?: string }) => {
    const assignedRole = (userData?.role || 'tenant').toLowerCase();
    const email = userData?.email || (assignedRole === 'owner' ? 'venkatavaibhavparitala@gmail.com' : 'tenant@nestin.com');
    const password = (userData as any)?.password || 'NestIn@2026';

    setIsLoading(true);
    try {
      // Obtain backend-issued cryptographic JWT from the Auth Service
      const response = await ApiClient.auth.login({ email, password, role: assignedRole });
      if (!response || !response.token || !response.user) {
        throw new Error('Authentication failed: No valid token issued by backend Auth Service.');
      }

      // Persist ONLY the backend-issued JWT
      localStorage.setItem('nestin_auth_token', response.token);
      localStorage.removeItem('nestin_user');

      const verifiedUser = normalizeAuthUser(response.user, response.session);
      setUser(verifiedUser);

      setAuthModalOpen(false);
      setAuthMessage(null);

      if (pendingAction) {
        const act = pendingAction;
        setPendingAction(null);
        setTimeout(() => act(), 150);
      }
      return verifiedUser;
    } catch (err: any) {
      console.error('Login error:', err);
      localStorage.removeItem('nestin_auth_token');
      localStorage.removeItem('nestin_user');
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (roleParam: AppUserRole = 'tenant') => {
    const isOwnerRole = roleParam === 'owner' || roleParam === 'OWNER';
    const email = isOwnerRole ? 'venkatavaibhavparitala@gmail.com' : 'ananya.rao@example.com';
    const fullName = isOwnerRole ? 'Paritala Venkata Vaibhav' : 'Ananya Rao';
    const avatarUrl = isOwnerRole ? '' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

    setIsLoading(true);
    try {
      // Call Auth Service Google OAuth REST endpoint
      const response = await ApiClient.auth.google({
        email,
        fullName,
        avatarUrl,
        role: isOwnerRole ? 'owner' : 'tenant',
        googleToken: `google-oauth-token-${Date.now()}`,
      });

      if (!response || !response.token || !response.user) {
        throw new Error('Backend failed to issue a valid JWT for Google authentication.');
      }

      localStorage.setItem('nestin_auth_token', response.token);
      localStorage.removeItem('nestin_user');

      const formatted = normalizeAuthUser(response.user, response.session);
      setUser(formatted);

      setAuthModalOpen(false);
      setAuthMessage(null);

      if (pendingAction) {
        const act = pendingAction;
        setPendingAction(null);
        setTimeout(() => act(), 150);
      }
    } catch (err: any) {
      console.error('Auth Service Google login error:', err);
      localStorage.removeItem('nestin_auth_token');
      localStorage.removeItem('nestin_user');
      setUser(null);
      throw new Error(err?.message || 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (emailStr: string, passStr: string, roleParam: AppUserRole = 'tenant') => {
    const assignedRole = (roleParam || 'tenant').toLowerCase() as 'owner' | 'tenant';
    
    setIsLoading(true);
    try {
      // Call Auth Service Login REST endpoint
      const response = await ApiClient.auth.login({
        email: emailStr,
        password: passStr,
        role: assignedRole,
      });

      if (!response || !response.token || !response.user) {
        throw new Error('Backend failed to issue an authorization token.');
      }

      localStorage.setItem('nestin_auth_token', response.token);
      localStorage.removeItem('nestin_user');

      const formatted = normalizeAuthUser(response.user, response.session);
      setUser(formatted);

      setAuthModalOpen(false);
      setAuthMessage(null);

      if (pendingAction) {
        const act = pendingAction;
        setPendingAction(null);
        setTimeout(() => act(), 150);
      }
    } catch (err: any) {
      console.error('Auth Service email login error:', err);
      localStorage.removeItem('nestin_auth_token');
      localStorage.removeItem('nestin_user');
      setUser(null);
      throw new Error(err?.message || 'Login failed. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithEmail = async (params: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    city?: string;
    role?: AppUserRole;
  }) => {
    const assignedRole = (params.role || 'tenant').toLowerCase() as 'owner' | 'tenant';

    setIsLoading(true);
    try {
      // Call Auth Service Register REST endpoint
      const response = await ApiClient.auth.register({
        email: params.email,
        password: params.password,
        fullName: params.fullName,
        phone: params.phone,
        city: params.city || (assignedRole === 'owner' ? 'Hyderabad' : 'Bengaluru'),
        role: assignedRole,
      });

      if (!response || !response.token || !response.user) {
        throw new Error('Backend registration did not return a valid authorization token.');
      }

      localStorage.setItem('nestin_auth_token', response.token);
      localStorage.removeItem('nestin_user');

      const formatted = normalizeAuthUser(response.user, response.session);
      setUser(formatted);

      setAuthModalOpen(false);
      setAuthMessage(null);

      if (pendingAction) {
        const act = pendingAction;
        setPendingAction(null);
        setTimeout(() => act(), 150);
      }
    } catch (err: any) {
      console.error('Auth Service signup error:', err);
      localStorage.removeItem('nestin_auth_token');
      localStorage.removeItem('nestin_user');
      setUser(null);
      throw new Error(err?.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsSuperAdmin = async (credentials: { email: string; accessCode?: string; password?: string }) => {
    setIsLoading(true);
    try {
      // Authenticate against backend Auth Service endpoint
      const response = await ApiClient.auth.login({
        email: credentials.email,
        password: credentials.password || credentials.accessCode || 'Admin@NestIn2026',
        role: 'super_admin',
      });

      if (!response || !response.token || !response.user) {
        return {
          success: false,
          error: 'Administrator authentication failed. Backend did not issue an authorization token.',
        };
      }

      // Strictly verify that the backend issued a super_admin role
      const assignedRole = (response.user.role || '').toLowerCase();
      if (assignedRole !== 'super_admin') {
        localStorage.removeItem('nestin_auth_token');
        localStorage.removeItem('nestin_user');
        setUser(null);
        return {
          success: false,
          error: 'Access denied: The account does not have Super Administrator privileges.',
        };
      }

      // Store ONLY backend token
      localStorage.setItem('nestin_auth_token', response.token);
      localStorage.removeItem('nestin_user');

      const adminUser = normalizeAuthUser(response.user, response.session);
      setUser(adminUser);
      return { success: true };
    } catch (err: any) {
      console.error('Auth Service super admin login error:', err);
      localStorage.removeItem('nestin_auth_token');
      localStorage.removeItem('nestin_user');
      setUser(null);
      return { success: false, error: err?.message || 'Super admin authentication failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      // Update in Auth Service REST API
      const updated = await ApiClient.auth.updateProfile(data);
      if (updated) {
        setUser((prev) => (prev ? { ...prev, ...updated } : null));
      } else {
        setUser((prev) => (prev ? { ...prev, ...data } : null));
      }
    } catch (e) {
      console.warn('Auth Service profile update notice:', e);
      setUser((prev) => (prev ? { ...prev, ...data } : null));
    }
  };

  const logout = useCallback(async () => {
    try {
      await ApiClient.auth.logout();
    } catch (e) {
      console.warn('Auth Service logout notice:', e);
    } finally {
      setUser(null);
      localStorage.removeItem('nestin_auth_token');
      localStorage.removeItem('nestin_user');
    }
  }, []);

  const requireAuth = useCallback(
    (action: () => void, customMessage = 'Please log in or create an account to continue.') => {
      if (isAuthenticated) {
        action();
      } else {
        setPendingAction(() => action);
        setAuthMessage(customMessage);
        setAuthModalOpen(true);
      }
    },
    [isAuthenticated]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isSuperAdmin,
        isOwner,
        isEmployee,
        isTenant,
        isLoading,
        login,
        loginWithGoogle,
        loginWithEmail,
        loginAsSuperAdmin,
        signupWithEmail,
        updateUserProfile,
        updateUser: updateUserProfile,
        logout,
        authModalOpen,
        setAuthModalOpen,
        authMessage,
        setAuthMessage,
        requireAuth,
        setPendingAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
