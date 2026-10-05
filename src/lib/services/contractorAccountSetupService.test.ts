import { beforeEach, describe, expect, it, vi } from 'vitest';
const remote = vi.hoisted(() => ({ rpc: vi.fn(), createUser: vi.fn(), updateUserById: vi.fn(), otp: vi.fn(), createPublic: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: remote.rpc, auth: { admin: { createUser: remote.createUser, updateUserById: remote.updateUserById } } }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: remote.createPublic }));
import { requestContractorAccountSetup } from './contractorAccountSetupService';
beforeEach(() => {
  vi.resetAllMocks(); remote.createPublic.mockReturnValue({ auth: { signInWithOtp: remote.otp } });
  remote.createUser.mockResolvedValue({ data: { user: { id: 'created-user' } }, error: null });
  remote.updateUserById.mockResolvedValue({ error: null });
  remote.otp.mockResolvedValue({ error: null });
  remote.rpc.mockResolvedValue({ data: null, error: null });
});
describe('contractor-requested account setup', () => {
  it('does not create accounts or send emails for invalid or unknown emails', async () => {
    await requestContractorAccountSetup({ email: 'invalid' }, 'http://localhost:3000');
    expect(remote.rpc).not.toHaveBeenCalled();
    await requestContractorAccountSetup({ email: 'unknown@example.test' }, 'http://localhost:3000');
    expect(remote.createUser).not.toHaveBeenCalled(); expect(remote.otp).not.toHaveBeenCalled();
  });
  it('creates an unconfirmed, passwordless account with server-managed linkage then sends verification', async () => {
    remote.rpc.mockResolvedValue({ data: { id: 'record', email: 'qa@example.test', first_name: 'QA', last_name: 'Added', auth_user_id: null, claim_token: 'token-123' }, error: null });
    expect(await requestContractorAccountSetup({ email: ' QA@EXAMPLE.TEST ' }, 'http://localhost:3001')).toBeUndefined();
    expect(remote.rpc).toHaveBeenCalledWith('claim_contractor_account_setup', { p_email: 'qa@example.test' });
    expect(remote.createUser).toHaveBeenCalledWith({ email: 'qa@example.test', email_confirm: false, app_metadata: { role: 'CONTRACTOR', contractor_record_id: 'record' }, user_metadata: { first_name: 'QA', last_name: 'Added', contractor_record_id: 'record', contractor_setup_claim_token: 'token-123' } });
    expect(remote.createUser.mock.calls[0][0]).not.toHaveProperty('password');
    expect(remote.otp).toHaveBeenCalledWith({ email: 'qa@example.test', options: { shouldCreateUser: false, emailRedirectTo: 'http://localhost:3001/auth/confirm?flow=contractor-setup' } });
  });
  it('a valid cooldown-controlled retry only resends to the existing pending account', async () => {
    remote.rpc.mockResolvedValue({ data: { id: 'record', email: 'qa@example.test', auth_user_id: 'same-user' }, error: null });
    await requestContractorAccountSetup({ email: 'qa@example.test' }, 'http://localhost:3000');
    expect(remote.createUser).not.toHaveBeenCalled(); expect(remote.otp).toHaveBeenCalledOnce();
  });
  it('duplicate or mismatched provisioning errors cannot trigger an email', async () => {
    remote.rpc.mockResolvedValue({ data: { id: 'record', email: 'qa@example.test', auth_user_id: null }, error: null });
    remote.createUser.mockResolvedValue({ error: { message: 'Already registered' } });
    await requestContractorAccountSetup({ email: 'qa@example.test' }, 'http://localhost:3000');
    expect(remote.otp).not.toHaveBeenCalled();
  });
});

it('reports globally unavailable setup without exposing whether an email matches', async () => {
  remote.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
  await expect(requestContractorAccountSetup({ email: 'qa@example.test' }, 'http://localhost:3000')).rejects.toMatchObject({ status: 503, message: expect.stringContaining('database update') });
  expect(remote.createUser).not.toHaveBeenCalled(); expect(remote.otp).not.toHaveBeenCalled();
});
