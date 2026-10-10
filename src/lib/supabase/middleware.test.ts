// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  create: vi.fn(), getUser: vi.fn(), signOut: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(),
  select: vi.fn(), eq: vi.fn(), from: vi.fn(), rpc: vi.fn(),
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
    mocks.eq.mockReturnValue({ single: mocks.single, eq: mocks.eq, maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'record', onboarding_completed_at: null }, error: null });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.create.mockReturnValue({
      auth: { getUser: mocks.getUser, signOut: mocks.signOut }, from: mocks.from, rpc: mocks.rpc,
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'real-user' } } });
    mocks.single.mockResolvedValue({ data: { role: 'SUPER_ADMIN', is_active: true, must_reset_password: false }, error: null });
    mocks.rpc.mockResolvedValue({ data: { 'admin.dashboard.view': true, 'admin.tickets.view': true }, error: null });
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

  it('routes a native Storm Manager using verified profile permissions', async () => {
    mocks.single.mockResolvedValue({ data: { role: 'STORM_MANAGER', is_active: true, must_reset_password: false }, error: null });
    expect((await updateSession(new NextRequest('http://localhost:3000/login'))).headers.get('location')).toBe('http://localhost:3000/admin/dashboard');
    expect((await updateSession(new NextRequest('http://localhost:3000/admin/dashboard'))).headers.get('location')).toBeNull();
    expect((await updateSession(new NextRequest('http://localhost:3000/contractor/dashboard'))).headers.get('location')).toBe('http://localhost:3000/forbidden');
  });

  it('denies a pasted hidden module URL and does not loop on forbidden', async () => {
    mocks.rpc.mockResolvedValue({data:{'admin.time.view':false},error:null});
    expect((await updateSession(new NextRequest('http://localhost:3000/admin/time-review'))).headers.get('location')).toBe('http://localhost:3000/forbidden');
    expect((await updateSession(new NextRequest('http://localhost:3000/forbidden'))).headers.get('location')).toBeNull();
  });
  it('uses the first permitted module when the dashboard is hidden', async () => {
    mocks.rpc.mockResolvedValue({data:{'admin.dashboard.view':false,'admin.time.view':true},error:null});
    expect((await updateSession(new NextRequest('http://localhost:3000/login'))).headers.get('location')).toBe('http://localhost:3000/admin/time-review');
    expect((await updateSession(new NextRequest('http://localhost:3000/admin/dashboard'))).headers.get('location')).toBe('http://localhost:3000/admin/time-review');
  });
  it('fails closed on permission errors and retains defaults only before the migration exists', async () => {
    mocks.rpc.mockResolvedValue({data:null,error:{code:'42501',message:'denied'}});
    expect((await updateSession(new NextRequest('http://localhost:3000/admin/dashboard'))).headers.get('location')).toBe('http://localhost:3000/forbidden');
    mocks.rpc.mockResolvedValue({data:null,error:{code:'PGRST202',message:'get_my_permissions is missing'}});
    expect((await updateSession(new NextRequest('http://localhost:3000/admin/dashboard'))).headers.get('location')).toBeNull();
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

describe('contractor onboarding routing', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.create.mockReturnValue({ auth: { getUser: mocks.getUser, signOut: mocks.signOut }, from: mocks.from, rpc: mocks.rpc });
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'contractor-user' } } });
    mocks.from.mockReturnValue({ select: mocks.select }); mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ single: mocks.single, eq: mocks.eq, maybeSingle: mocks.maybeSingle });
    mocks.single.mockResolvedValue({ data: { role: 'CONTRACTOR', is_active: true, must_reset_password: false }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'record', onboarding_completed_at: null }, error: null });
  });
  it('requires onboarding for every operational route and permits the form itself', async () => {
    for (const path of ['/login','/contractor/dashboard','/contractor/time','/tickets','/contractor/expenses']) expect((await updateSession(new NextRequest(`http://localhost:3000${path}`))).headers.get('location')).toBe('http://localhost:3000/contractor/onboarding');
    expect((await updateSession(new NextRequest('http://localhost:3000/contractor/onboarding'))).headers.get('location')).toBeNull();
  });
  it('password setup precedes onboarding', async () => {
    mocks.single.mockResolvedValue({ data: { role: 'CONTRACTOR', is_active: true, must_reset_password: true }, error: null });
    expect((await updateSession(new NextRequest('http://localhost:3000/contractor/onboarding'))).headers.get('location')).toBe('http://localhost:3000/set-password');
  });
  it('completed onboarding opens portal; missing links or database failures fail closed', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'record', onboarding_completed_at: 'now' }, error: null });
    expect((await updateSession(new NextRequest('http://localhost:3000/contractor/time'))).headers.get('location')).toBeNull();
    expect((await updateSession(new NextRequest('http://localhost:3000/contractor/onboarding'))).headers.get('location')).toBe('http://localhost:3000/contractor/dashboard');
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Missing' } });
    expect((await updateSession(new NextRequest('http://localhost:3000/contractor/time'))).headers.get('location')).toBe('http://localhost:3000/forbidden');
  });
  it('the new setup path is public for signed-out users', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await updateSession(new NextRequest('http://localhost:3000/setup-account'))).headers.get('location')).toBeNull();
  });
});

it('lets the confirmation page verify a new link before enforcing password setup', async () => {
  mocks.single.mockResolvedValue({ data: { role: 'CONTRACTOR', is_active: true, must_reset_password: true }, error: null });
  expect((await updateSession(new NextRequest('http://localhost:3000/auth/confirm?token_hash=verification&type=email'))).headers.get('location')).toBeNull();
});
