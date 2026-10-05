// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const remote = vi.hoisted(() => ({ user: vi.fn(), signOut: vi.fn(), from: vi.fn(), single: vi.fn(), updateUser: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: remote.user, signOut: remote.signOut } }) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: remote.from, auth: { admin: { updateUserById: remote.updateUser } }, rpc: remote.rpc }) }));
import { POST } from './route';
const request = (password = 'StrongPassword1!', extra = {}) => new Request('http://localhost/api/auth/complete-password-setup', { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://localhost' }, body: JSON.stringify({ password, ...extra }) });
beforeEach(() => {
  vi.resetAllMocks(); remote.user.mockResolvedValue({ data: { user: { id: 'verified', email: 'qa@example.test', email_confirmed_at: 'now' } }, error: null });
  remote.signOut.mockResolvedValue({ error: null });
  const chain = { select: vi.fn(), eq: vi.fn(), single: remote.single }; chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); remote.from.mockReturnValue(chain);
  remote.single.mockResolvedValueOnce({ data: { role: 'CONTRACTOR', is_active: true, must_reset_password: true }, error: null }).mockResolvedValueOnce({ data: { id: 'record', business_email: 'qa@example.test' }, error: null });
  remote.updateUser.mockResolvedValue({ error: null }); remote.rpc.mockResolvedValue({ error: null });
});
describe('first password setup', () => {
  it('saves a strong password only for the verified linked identity and routes to onboarding', async () => {
    const response = await POST(request()); expect(response.status).toBe(200); expect(await response.json()).toEqual({ next: '/login?setup=complete' });
    expect(remote.updateUser).toHaveBeenCalledWith('verified', { password: 'StrongPassword1!' });
    expect(remote.rpc).toHaveBeenCalledWith('complete_account_password_setup', { p_profile_id: 'verified' });
  });
  it('unverified, inactive, mismatched or already completed setup cannot change password', async () => {
    remote.user.mockResolvedValue({ data: { user: { id: 'verified', email: 'qa@example.test' } }, error: null });
    expect((await POST(request())).status).toBe(403); expect(remote.updateUser).not.toHaveBeenCalled();
    remote.user.mockResolvedValue({ data: { user: { id: 'verified', email: 'wrong@example.test', email_confirmed_at: 'now' } }, error: null });
    expect((await POST(request())).status).toBe(403); expect(remote.updateUser).not.toHaveBeenCalled();
  });
  it('weak passwords and client identity injection are rejected without modifying Auth', async () => {
    expect((await POST(request('weak'))).status).toBe(400); expect(remote.updateUser).not.toHaveBeenCalled();
  });
  it('does not clear password gate if Auth rejects the password', async () => {
    remote.updateUser.mockResolvedValue({ error: { message: 'Provider rejected' } });
    expect((await POST(request())).status).toBe(400); expect(remote.rpc).not.toHaveBeenCalled();
  });
});

it('inactive and already-set-up accounts cannot invoke first-password setup', async () => {
  for (const profile of [{role:'CONTRACTOR',is_active:false,must_reset_password:true},{role:'CONTRACTOR',is_active:true,must_reset_password:false}]) {
    remote.single.mockReset().mockResolvedValueOnce({ data: profile });
    expect((await POST(request())).status).toBe(403);
  }
  expect(remote.updateUser).not.toHaveBeenCalled();
});
it('client-supplied account IDs cannot redirect a password change', async () => {
  expect((await POST(request('StrongPassword1!', { profile_id: 'another-user' }))).status).toBe(400);
  expect(remote.updateUser).not.toHaveBeenCalled();
});
