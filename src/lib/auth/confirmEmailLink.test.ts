import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmEmailLink } from './confirmEmailLink';

const session = { user: { id: 'invited-person' }, access_token: 'test-access' };
const calls = { verifyOtp: vi.fn(), setSession: vi.fn(), getSession: vi.fn() };
const auth = calls as unknown as SupabaseClient['auth'];
beforeEach(() => {
  vi.clearAllMocks();
  for (const call of Object.values(calls)) call.mockResolvedValue({ data: { session }, error: null });
});
describe('email confirmation callbacks', () => {
  it('verifies a custom invite token hash', async () => {
    const result = await confirmEmailLink(auth, new URL('http://localhost/auth/confirm?token_hash=test-hash&type=invite'));
    expect(calls.verifyOtp).toHaveBeenCalledWith({ token_hash: 'test-hash', type: 'invite' });
    expect(result.type).toBe('invite');
  });
  it('accepts a standard invite session opened on a different computer', async () => {
    const result = await confirmEmailLink(auth, new URL('http://localhost/auth/confirm#access_token=test-access&refresh_token=test-refresh&type=invite'));
    expect(calls.setSession).toHaveBeenCalledWith({ access_token: 'test-access', refresh_token: 'test-refresh' });
    expect(calls.verifyOtp).not.toHaveBeenCalled();
    expect(result.session.user.id).toBe('invited-person');
  });
  it('uses the session already exchanged by the browser SDK for PKCE', async () => {
    await confirmEmailLink(auth, new URL('http://localhost/auth/confirm?code=test-code'));
    expect(calls.getSession).toHaveBeenCalledOnce();
    expect(calls.setSession).not.toHaveBeenCalled();
  });
  it('rejects invalid link types and signed-out callbacks', async () => {
    await expect(confirmEmailLink(auth, new URL('http://localhost/auth/confirm?token_hash=test&type=admin'))).rejects.toThrow('Invalid confirmation');
    calls.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(confirmEmailLink(auth, new URL('http://localhost/auth/confirm'))).rejects.toThrow('Invalid confirmation');
  });
  it('shows expired-provider errors without attempting another token exchange', async () => {
    await expect(confirmEmailLink(auth, new URL('http://localhost/auth/confirm#error_description=Link%20expired'))).rejects.toThrow('Link expired');
    expect(calls.setSession).not.toHaveBeenCalled();
    expect(calls.getSession).not.toHaveBeenCalled();
  });
});
