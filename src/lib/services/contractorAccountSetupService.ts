import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { AccessError } from '@/lib/auth/serverPermissions';
import { setupAccountSchema } from '@/lib/auth/contractorOnboardingValidation';

type SetupClaim = { id: string; email: string; first_name: string; last_name: string; auth_user_id: string | null; claim_token: string };

/** No account IDs or matching-record details are returned to the caller. */
export async function requestContractorAccountSetup(input: unknown, origin: string): Promise<void> {
  const parsed = setupAccountSchema.safeParse(input);
  if (!parsed.success) return;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_contractor_account_setup', { p_email: parsed.data.email });
  if (error) throw new AccessError(error.code === 'PGRST202' ? 'Account setup is not available yet. The database update has not been applied. Contact your administrator.' : 'Account setup is temporarily unavailable. Please try again later.', 503);
  if (!data) return;
  const claim = data as unknown as SetupClaim;
  let userId = claim.auth_user_id;
  if (!userId) {
    const { data, error: createError } = await admin.auth.admin.createUser({
      email: claim.email, email_confirm: false,
      app_metadata: { role: 'CONTRACTOR', contractor_record_id: claim.id },
      user_metadata: { first_name: claim.first_name, last_name: claim.last_name, contractor_record_id: claim.id, contractor_setup_claim_token: claim.claim_token },
    });
    if (createError || !data.user) {
      console.error('Contractor setup account creation failed.', { code: createError?.code, status: createError?.status });
      return;
    }
    userId = data.user.id;
  }
  // Ensure server-managed app metadata is present even when Auth persisted it
  // after the initial INSERT. Remove the one-use setup token from user metadata.
  const { error: metadataError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'CONTRACTOR', contractor_record_id: claim.id },
    user_metadata: { first_name: claim.first_name, last_name: claim.last_name },
  });
  if (metadataError) {
    console.error('Contractor setup metadata finalization failed.', { code: metadataError.code, status: metadataError.status });
    return;
  }
  const mailClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false, flowType: 'implicit' } },
  );
  const { error: emailError } = await mailClient.auth.signInWithOtp({
    email: claim.email, options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm?flow=contractor-setup` },
  });
  // Keep eligible/unknown/duplicate responses identical, including provider mail
  // failures. Cooldown prevents rapid retries; log without exposing the email.
  if (emailError) console.error('Contractor setup verification email failed.', { code: emailError.code, status: emailError.status });
}
