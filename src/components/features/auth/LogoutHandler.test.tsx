import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { LogoutHandler } from './LogoutHandler';

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LogoutHandler', () => {
  it('signs out of Supabase and redirects to /login', async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    render(<LogoutHandler />);

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  });

  it('still redirects to /login when sign-out fails', async () => {
    mocks.signOut.mockRejectedValue(new Error('network down'));
    render(<LogoutHandler />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  });

  it('renders a signing-out status message', () => {
    mocks.signOut.mockResolvedValue({ error: null });
    render(<LogoutHandler />);
    expect(screen.getByText(/signing you out/i)).toBeTruthy();
  });
});
