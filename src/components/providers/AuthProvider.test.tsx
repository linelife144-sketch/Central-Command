import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), onAuthStateChange: vi.fn(), unsubscribe: vi.fn(),
  from: vi.fn(), single: vi.fn(), push: vi.fn(), signOut: vi.fn(), rpc: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/login' }));
vi.mock('@/lib/testing/superAdminTesting', () => ({
  isSuperAdminTestingEnabled: () => false, SUPER_ADMIN_TEST_PROFILE: { id: 'fake-user' },
}));
vi.mock('@/lib/supabase/client', () => ({ supabase: {
  auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange, signOut: mocks.signOut },
  from: mocks.from,
  rpc: mocks.rpc,
} }));
import { AuthProvider, useAuth } from './AuthProvider';

function State() {
  const auth = useAuth();
  return <><div>{auth.isLoading ? 'loading' : `${auth.user?.id ?? 'signed-out'}:${auth.profile?.role ?? 'no-profile'}`}</div><span>{auth.can('admin.time.view') ? 'time-visible' : 'time-hidden'}</span></>;
}

describe('real Supabase auth provider', () => {
  let onAuth: (event: string, session: { user: { id: string } } | null) => unknown;
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
    mocks.rpc.mockResolvedValue({ data: { 'admin.time.view': true }, error: null });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('keeps a verified worker identity on offline refresh and clears it on sign-out', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'real-user' } } }, error: null });
    mocks.single.mockResolvedValue({ data: { id: 'real-user', role: 'CONTRACTOR', is_active: true }, error: null });
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('real-user:CONTRACTOR')).toBeTruthy());
    const queries = mocks.from.mock.calls.length;
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => { window.dispatchEvent(new Event('focus')); onAuth('TOKEN_REFRESHED', { user: { id: 'real-user' } }); });
    await waitFor(() => expect(screen.getByText('real-user:CONTRACTOR')).toBeTruthy());
    expect(mocks.from.mock.calls.length).toBe(queries);
    expect(screen.getByText('time-hidden')).toBeTruthy();
    act(() => onAuth('SIGNED_OUT', null));
    await waitFor(() => expect(screen.getByText('signed-out:no-profile')).toBeTruthy());
  });

  it('cannot carry the previous worker profile into another offline account', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'real-user' } } }, error: null });
    mocks.single.mockResolvedValue({ data: { id: 'real-user', role: 'CONTRACTOR', is_active: true }, error: null });
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('real-user:CONTRACTOR')).toBeTruthy());
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => onAuth('SIGNED_IN', { user: { id: 'different-user' } }));
    await waitFor(() => expect(screen.getByText('different-user:no-profile')).toBeTruthy());
    expect(screen.getByText('time-hidden')).toBeTruthy();
  });

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

  it('clears old permissions immediately when the signed-in identity changes', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'real-user' } } }, error: null });
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('time-visible')).toBeTruthy());
    act(() => onAuth('SIGNED_OUT', null));
    expect(screen.getByText('time-hidden')).toBeTruthy();
  });

  it('fails closed when the permissions service returns no snapshot', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'real-user' } } }, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('real-user:SUPER_ADMIN')).toBeTruthy());
    expect(screen.getByText('time-hidden')).toBeTruthy();
  });
});
