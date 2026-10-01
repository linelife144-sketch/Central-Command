import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { auth: { signInWithPassword: vi.fn() } } }));
afterEach(cleanup);
describe('login hydration safety', () => {
  it('uses POST and disables credential entry in server-rendered HTML', () => {
    const html = renderToString(createElement(LoginForm));
    expect(html).toContain('method="post"');
    expect(html).toMatch(/<input[^>]*type="password"[^>]*disabled/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });
  it('enables login after client hydration', async () => {
    render(createElement(LoginForm));
    await waitFor(() => expect((screen.getByRole('button', {name:'Sign in'}) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByLabelText('Password') as HTMLInputElement).disabled).toBe(false);
  });
});
