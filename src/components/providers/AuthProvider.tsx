'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { User as AppUser } from '@/types';
import { isSuperAdminTestingEnabled, SUPER_ADMIN_TEST_PROFILE } from '@/lib/testing/superAdminTesting';
import { resolvePermissions, type PermissionKey, type PermissionMap } from '@/lib/auth/permissionCatalog';

interface AuthContextType {
  user: User | null;
  profile: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  permissions: PermissionMap;
  can: (key: PermissionKey) => boolean;
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
  '/logout',
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
  const [permissions, setPermissions] = useState<PermissionMap>(DEV_BYPASS_AUTH ? resolvePermissions(DEV_MOCK_PROFILE.role) : {});

  const currentUserId = useRef<string | null>(DEV_BYPASS_AUTH ? DEV_MOCK_USER.id : null);

  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

  // Fetch user profile from profiles table
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (currentUserId.current !== userId) return;

      if (error) {
        setProfile(null);
        console.error('Error fetching profile:', error);
        if (DEV_BYPASS_AUTH) {
          setProfile(DEV_MOCK_PROFILE);
        }
        return;
      }

      if (data) {
        setProfile(data.is_active ? data as AppUser : null);
        if (data.role !== 'CONTRACTOR') {
          const { data: map, error: permissionsError } = await supabase.rpc('get_my_permissions' as never);
          if (currentUserId.current !== userId) return;
          const pendingMigration = permissionsError?.code === 'PGRST202' && permissionsError.message.includes('get_my_permissions');
          setPermissions(data.is_active ? pendingMigration ? resolvePermissions(data.role) : !permissionsError ? map as PermissionMap : {} : {});
        } else setPermissions({});
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
        currentUserId.current = null;
        setUser(null);
        setProfile(null);
        setPermissions({});
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

    let profileTimer: ReturnType<typeof setTimeout> | undefined;

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
          currentUserId.current = session.user.id;
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
      (_event, session) => {
        if (profileTimer) clearTimeout(profileTimer);
        currentUserId.current = session?.user.id ?? null;
        setUser(session?.user ?? null);
        setProfile(null);

        if (session?.user) {
          setIsLoading(true);
          // Supabase holds an auth lock during this callback. Read the profile
          // after it returns so login and subsequent API calls cannot deadlock.
          profileTimer = setTimeout(() => {
            void fetchProfile(session.user.id).finally(() => setIsLoading(false));
          }, 0);
        } else {
          setIsLoading(false);
        }
      }
    );

    return () => {
      if (profileTimer) clearTimeout(profileTimer);
      currentUserId.current = null;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (DEV_BYPASS_AUTH || !user?.id) return;
    const refresh = () => { if (document.visibilityState === 'visible') void refreshProfile(); };
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 30000);
    return () => { window.removeEventListener('focus', refresh); clearInterval(timer); };
    // Session identity is the lifetime of this refresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    permissions,
    can: (key: PermissionKey) => permissions[key] === true,
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
