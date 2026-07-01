// Central Command - Auth Store (Zustand)

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@/types';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  
  // Computed
  isAdmin: () => boolean;
  isTeamLead: () => boolean;
  isContractor: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        error: null,
      }),
      
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      
      setLoading: (value) => set({ isLoading: value }),
      
      setError: (error) => set({ error }),
      
      logout: () => set({
        user: null,
        isAuthenticated: false,
        error: null,
      }),
      
      // Computed helpers
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'SUPER_ADMIN';
      },
      
      isTeamLead: () => {
        const { user } = get();
        return user?.role === 'TEAM_LEAD';
      },
      
      isContractor: () => {
        const { user } = get();
        return user?.role === 'CONTRACTOR';
      },
      
      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
