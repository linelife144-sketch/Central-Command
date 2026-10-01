'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { User as AppUser } from '@/types';
import { isSuperAdminTestingEnabled, SUPER_ADMIN_TEST_PROFILE } from '@/lib/testing/superAdminTesting';

interface AuthContextType {
  user: User | null;
  profile: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/set-password',
  '/magic-link',
  '/forbidden',
];

const DEV_BYPASS_AUTH = isSuperAdminTestingEnabled();
const DEV_MOCK_PROFILE = SUPER_ADMIN_TEST_PROFILE;

const DEV_MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@gridelectric.com',
  app_metadata: {},
  user_metadata: {
    first_name: 'David',
    last_name: 'McCarty',
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(DEV_BYPASS_AUTH ? DEV_MOCK_USER : null);
  const [profile, setProfile] = useState<AppUser | null>(DEV_BYPASS_AUTH ? DEV_MOCK_PROFILE : null);
  const [isLoading, setIsLoading] = useState(!DEV_BYPASS_AUTH);

  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

  // Fetch user profile from profiles table
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        if (DEV_BYPASS_AUTH) {
          setProfile(DEV_MOCK_PROFILE);
        }
        return;
      }

      if (data) {
        setProfile(data as AppUser);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      if (DEV_BYPASS_AUTH) {
        setProfile(DEV_MOCK_PROFILE);
      }
    }
  };

  const refreshProfile = async () => {
    if (user?.id && user.id !== DEV_MOCK_PROFILE.id) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    if (DEV_BYPASS_AUTH) {
      router.push('/admin/dashboard');
      return;
    }
    try {
      await supabase.auth.signOut();
      if (!DEV_BYPASS_AUTH) {
        setUser(null);
        setProfile(null);
        router.push('/login');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    // The local test identity never reads or changes an existing Supabase session.
    if (DEV_BYPASS_AUTH) return;

    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (DEV_BYPASS_AUTH) {
            setUser(DEV_MOCK_USER);
            setProfile(DEV_MOCK_PROFILE);
          }
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (DEV_BYPASS_AUTH) {
          setUser(DEV_MOCK_USER);
          setProfile(DEV_MOCK_PROFILE);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (DEV_BYPASS_AUTH) {
          setUser(DEV_MOCK_USER);
          setProfile(DEV_MOCK_PROFILE);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (DEV_BYPASS_AUTH) {
          setUser(DEV_MOCK_USER);
          setProfile(DEV_MOCK_PROFILE);
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle route protection
  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    if (!isLoading) {
      if (!user && !isPublicRoute) {
        router.push('/login');
      }
    }
  }, [user, isLoading, pathname, isPublicRoute, router]);

  const value = {
    user,
    profile,
    isLoading,
    isAuthenticated: DEV_BYPASS_AUTH ? true : !!user,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
