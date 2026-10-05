import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AccessError, assertSameOrigin } from '@/lib/auth/serverPermissions';
import { accountPasswordSchema } from '@/lib/auth/contractorOnboardingValidation';
import { getLandingPathForRole } from '@/lib/auth/roleLanding';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw new AccessError('Please sign in.', 401);
    if (!user.email_confirmed_at) throw new AccessError('Verify your email first.', 403);
    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('role,is_active,must_reset_password').eq('id', user.id).single();
    if (!profile?.is_active || !profile.must_reset_password) throw new AccessError('Active account setup required.', 403);
    if (profile.role === 'CONTRACTOR') {
      const { data: contractor } = await admin.from('contractors').select('id,business_email').eq('profile_id', user.id).eq('is_deleted', false).single();
      if (!contractor || contractor.business_email?.toLowerCase() !== user.email?.toLowerCase()) throw new AccessError('Linked contractor required.', 403);
    }
    const { password } = accountPasswordSchema.parse(await request.json());
    const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, { password });
    if (passwordError) throw new AccessError('Unable to set your password. Please try again.', 400);
    const { error: flagError } = await admin.rpc('complete_account_password_setup', { p_profile_id: user.id });
    if (flagError) throw new AccessError('Password saved; please retry setup to finish your account.', 503);
    if (profile.role === 'CONTRACTOR') {
      const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
      if (signOutError) throw new AccessError('Password saved. Sign out, then sign in with your new password.', 503);
      return NextResponse.json({ next: '/login?setup=complete' }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json({ next: getLandingPathForRole(profile.role) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ZodError ? 'Use at least 12 characters with uppercase, lowercase, a number, and a special character.' : error instanceof AccessError ? error.message : 'Unable to set password.' }, { status: error instanceof AccessError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500 });
  }
}
