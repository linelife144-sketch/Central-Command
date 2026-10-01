// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  create: vi.fn(), getUser: vi.fn(), signOut: vi.fn(), single: vi.fn(),
  select: vi.fn(), eq: vi.fn(), from: vi.fn(),
}));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.create }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
import { updateSession } from './middleware';

describe('real Supabase session routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ single: mocks.single });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.create.mockReturnValue({
      auth: { getUser: mocks.getUser, signOut: mocks.signOut }, from: mocks.from,
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'real-user' } } });
    mocks.single.mockResolvedValue({ data: { role: 'SUPER_ADMIN', is_active: true, must_reset_password: false }, error: null });
  });

  it('uses the publishable key and preserves every refreshed cookie on login redirect', async () => {
    mocks.getUser.mockImplementation(async () => {
      const cookies = mocks.create.mock.calls[0][2].cookies;
      cookies.setAll([
        { name: 'sb-session.0', value: 'chunk-zero', options: { path: '/', httpOnly: true } },
        { name: 'sb-session.1', value: 'chunk-one', options: { path: '/', httpOnly: true } },
      ]);
      return { data: { user: { id: 'real-user' } } };
    });
    const request = new NextRequest('http://localhost:3000/login');
    const response = await updateSession(request);
    expect(mocks.create.mock.calls[0][1]).toBe('sb_publishable_test');
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin/dashboard');
    expect(response.cookies.get('sb-session.0')?.value).toBe('chunk-zero');
    expect(response.cookies.get('sb-session.1')?.value).toBe('chunk-one');
    expect(request.cookies.get('sb-session.1')?.value).toBe('chunk-one');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('requires real auth for the dashboard', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(new NextRequest('http://localhost:3000/admin/dashboard'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fadmin%2Fdashboard');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('reads the reset requirement and keeps account setup accessible', async () => {
    mocks.single.mockResolvedValue({ data: { role: 'SUPER_ADMIN', is_active: true, must_reset_password: true }, error: null });
    const response = await updateSession(new NextRequest('http://localhost:3000/admin/dashboard'));
    expect(mocks.select).toHaveBeenCalledWith('role, is_active, must_reset_password');
    expect(response.headers.get('location')).toBe('http://localhost:3000/set-password');
  });

  it('signs out inactive accounts and preserves the expired cookie on redirect', async () => {
    mocks.single.mockResolvedValue({ data: { role: 'SUPER_ADMIN', is_active: false }, error: null });
    mocks.signOut.mockImplementation(async () => {
      mocks.create.mock.calls[0][2].cookies.setAll([{ name: 'sb-session', value: '', options: { maxAge: 0, path: '/' } }]);
      return { error: null };
    });
    const response = await updateSession(new NextRequest('http://localhost:3000/admin/dashboard'));
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
    expect(response.cookies.get('sb-session')?.value).toBe('');
  });

  it('does not route contractors to admin pages', async () => {
    mocks.single.mockResolvedValue({ data: { role: 'CONTRACTOR', is_active: true }, error: null });
    const response = await updateSession(new NextRequest('http://localhost:3000/admin/dashboard'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/forbidden');
  });
});
