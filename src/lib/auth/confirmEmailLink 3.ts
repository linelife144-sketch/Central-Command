import type { SupabaseClient } from '@supabase/supabase-js';

type LinkAuth = Pick<SupabaseClient['auth'], 'verifyOtp' | 'setSession' | 'getSession'>;
const EMAIL_TYPES = ['email', 'signup', 'invite', 'recovery'] as const;
type EmailType = typeof EMAIL_TYPES[number];

/** Accept both custom token-hash templates and Supabase's standard invite redirect. */
export async function confirmEmailLink(auth: LinkAuth, url: URL) {
  const fragment = new URLSearchParams(url.hash.slice(1));
  const providerError = url.searchParams.get('error_description') || fragment.get('error_description');
  if (providerError) throw new Error(providerError);
  const type = url.searchParams.get('type') || fragment.get('type');
  const tokenHash = url.searchParams.get('token_hash');
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  let result;
  if (tokenHash) {
    if (!EMAIL_TYPES.includes(type as EmailType)) throw new Error('Invalid confirmation link. Please request a new one.');
    result = await auth.verifyOtp({ token_hash: tokenHash, type: type as EmailType });
  } else if (accessToken && refreshToken) {
    // Invitations may be opened on a different computer from the sender. They
    // carry an Auth-issued session rather than a browser-local PKCE verifier.
    result = await auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  } else {
    // The browser SDK may already have exchanged a PKCE code during startup.
    result = await auth.getSession();
  }
  if (result.error || !result.data.session) throw new Error(result.error?.message || 'Invalid confirmation link. Please request a new one.');
  return { session: result.data.session, type };
}
