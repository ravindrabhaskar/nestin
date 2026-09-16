import { createClient } from '@supabase/supabase-js';

// Access Supabase environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  supabaseUrl.includes('.supabase.co')
);

// Fallback placeholder client or real Supabase client
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'nestin_supabase_auth',
    },
  }
);

// Interface for database User Profile
export interface DbProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  city?: string;
  role: 'tenant' | 'admin' | 'owner' | 'user';
  created_at?: string;
  updated_at?: string;
}

/**
 * Initiates Google OAuth with Supabase Auth
 */
export async function signInWithGoogle(role: 'tenant' | 'admin' | 'owner' = 'tenant') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
  }

  // Store desired role in localStorage so auth callback can assign it during initial profile creation
  try {
    localStorage.setItem('nestin_pending_role', role);
  } catch (e) {
    console.error('Failed to set pending role:', e);
  }

  const redirectUrl = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw new Error(formatAuthError(error.message));
  }

  return data;
}

/**
 * Signs up a new user with Email and Password
 */
export async function signUpWithEmail(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  city?: string;
  role?: 'tenant' | 'admin' | 'owner';
}) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase credentials not configured.') };
  }

  const { email, password, fullName, phone, city, role = 'tenant' } = params;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        city,
        role,
      },
    },
  });

  if (error) {
    throw new Error(formatAuthError(error.message));
  }

  // If user was created, upsert into profiles table to guarantee entry
  if (data.user) {
    await upsertUserProfile({
      id: data.user.id,
      full_name: fullName,
      email,
      phone,
      city,
      role,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
    });
  }

  return { data, error: null };
}

/**
 * Signs in an existing user with Email and Password
 */
export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase credentials not configured.') };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(formatAuthError(error.message));
  }

  return { data, error: null };
}

/**
 * Fetches user profile from profiles table
 */
export async function fetchUserProfile(userId: string): Promise<DbProfile | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching user profile:', error.message);
      return null;
    }

    return data as DbProfile | null;
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    return null;
  }
}

/**
 * Upserts user profile in profiles table
 */
export async function upsertUserProfile(profile: Partial<DbProfile> & { id: string }) {
  if (!isSupabaseConfigured) return null;

  try {
    const now = new Date().toISOString();
    const payload = {
      ...profile,
      last_login_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error.message);
      return null;
    }

    return data as DbProfile;
  } catch (err) {
    console.error('Failed to upsert profile:', err);
    return null;
  }
}

/**
 * Formats raw Supabase auth errors into user-friendly messages
 */
export function formatAuthError(msg: string): string {
  if (!msg) return 'An unexpected authentication error occurred.';
  const lower = msg.toLowerCase();
  
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Invalid email or password. Please double-check your credentials.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email address already exists. Please log in instead.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (lower.includes('popup closed') || lower.includes('cancelled')) {
    return 'Google authentication was cancelled.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }
  
  return msg;
}

export interface DemoRequestPayload {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  business_name?: string;
  property_count?: string;
  created_at?: string;
  status?: string;
}

/**
 * Submits a new Owner Demo Request to Supabase demo_requests table and local backup
 */
export async function submitDemoRequest(payload: DemoRequestPayload) {
  const requestData = {
    ...payload,
    created_at: new Date().toISOString(),
    status: 'pending',
  };

  // Always save locally to localStorage as backup
  try {
    const existing = JSON.parse(localStorage.getItem('nestin_demo_requests') || '[]');
    localStorage.setItem('nestin_demo_requests', JSON.stringify([requestData, ...existing]));
  } catch (e) {
    console.error('Failed saving local demo request:', e);
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('demo_requests').insert([requestData]).select();
      if (error) {
        console.warn('Supabase demo request notice:', error.message);
      } else {
        return { data, error: null };
      }
    } catch (err) {
      console.warn('Supabase demo request error:', err);
    }
  }

  return { data: requestData, error: null };
}

