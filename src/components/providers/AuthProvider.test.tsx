import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), onAuthStateChange: vi.fn(), unsubscribe: vi.fn(),
  from: vi.fn(), single: vi.fn(), push: vi.fn(), signOut: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/login' }));
vi.mock('@/lib/testing/superAdminTesting', () => ({
  isSuperAdminTestingEnabled: () => false, SUPER_ADMIN_TEST_PROFILE: { id: 'fake-user' },
}));
vi.mock('@/lib/supabase/client', () => ({ supabase: {
  auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange, signOut: mocks.signOut },
  from: mocks.from,
} }));
import { AuthProvider, useAuth } from './AuthProvider';

function State() {
  const auth = useAuth();
  return <div>{auth.isLoading ? 'loading' : `${auth.user?.id ?? 'signed-out'}:${auth.profile?.role ?? 'no-profile'}`}</div>;
}

describe('real Supabase auth provider', () => {
  let onAuth: (event: string, session: any) => unknown;
  let authLocked: boolean;
  beforeEach(() => {
    vi.clearAllMocks(); authLocked = false;
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.onAuthStateChange.mockImplementation(callback => {
      onAuth = callback;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });
    mocks.from.mockImplementation(() => {
      if (authLocked) throw new Error('Profile query attempted while Supabase auth lock is held');
      return { select: () => ({ eq: () => ({ single: mocks.single }) }) };
    });
    mocks.single.mockResolvedValue({ data: { id: 'real-user', role: 'SUPER_ADMIN', is_active: true }, error: null });
  });
  afterEach(cleanup);

  it('starts signed out instead of using a synthetic Super Admin', async () => {
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('signed-out:no-profile')).toBeTruthy());
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns from the auth callback before querying the real profile', async () => {
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('signed-out:no-profile')).toBeTruthy());
    act(() => {
      authLocked = true;
      expect(onAuth('SIGNED_IN', { user: { id: 'real-user' } })).toBeUndefined();
      expect(mocks.from).not.toHaveBeenCalled();
      authLocked = false;
    });
    await waitFor(() => expect(screen.getByText('real-user:SUPER_ADMIN')).toBeTruthy());
  });

  it('cancels a pending profile fetch when the user signs out', async () => {
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('signed-out:no-profile')).toBeTruthy());
    act(() => {
      onAuth('SIGNED_IN', { user: { id: 'real-user' } });
      onAuth('SIGNED_OUT', null);
    });
    await waitFor(() => expect(screen.getByText('signed-out:no-profile')).toBeTruthy());
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
