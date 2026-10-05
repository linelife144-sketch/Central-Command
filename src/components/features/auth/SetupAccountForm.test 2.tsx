import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const remote = vi.hoisted(() => ({ verify: vi.fn(), push: vi.fn(), refresh: vi.fn(), fetch: vi.fn() }));
const router = { push: remote.push, refresh: remote.refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { auth: { verifyOtp: remote.verify } } }));
import { SetupAccountForm } from './SetupAccountForm';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('fetch', remote.fetch); remote.fetch.mockResolvedValue({ ok: true, json: async () => ({ message: 'Generic response' }) }); });
async function requestSetup() {
  render(<SetupAccountForm />); fireEvent.change(screen.getByLabelText('Contractor email'), { target: { value: 'qa@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify email' })); await screen.findByLabelText('Verification code');
}
describe('account setup email and verification', () => {
  it('shows the generic response without claiming an account exists', async () => {
    await requestSetup(); expect(screen.getByRole('status').textContent).toContain('If this email belongs to an added contractor');
    expect(remote.fetch).toHaveBeenCalledWith('/api/auth/setup-account', expect.objectContaining({ body: JSON.stringify({ email: 'qa@example.test' }) }));
  });
  it('expired and reused verification codes keep the user out of password setup', async () => {
    remote.verify.mockResolvedValue({ error: { message: 'Expired or reused' }, data: { session: null } });
    await requestSetup(); fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to password setup' }));
    expect((await screen.findByRole('alert')).textContent).toContain('invalid or expired'); expect(remote.push).not.toHaveBeenCalled();
  });
  it('a verified email session proceeds to password setup', async () => {
    remote.verify.mockResolvedValue({ error: null, data: { session: { user: { id: 'verified' } } } });
    await requestSetup(); fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to password setup' }));
    await waitFor(() => expect(remote.push).toHaveBeenCalledWith('/set-password'));
  });
});

it('shows a pending database update instead of suggesting an email was sent', async () => {
  remote.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Account setup is not available yet. The database update has not been applied.' }) });
  render(<SetupAccountForm />); fireEvent.change(screen.getByLabelText('Contractor email'), { target: { value: 'qa@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
  expect((await screen.findByRole('alert')).textContent).toContain('database update');
  expect(screen.queryByLabelText('Verification code')).toBeNull();
});
