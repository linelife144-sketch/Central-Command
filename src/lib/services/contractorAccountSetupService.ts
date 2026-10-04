import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { setupAccountSchema } from '@/lib/auth/contractorOnboardingValidation';

type SetupClaim = { id: string; email: string; first_name: string; last_name: string; auth_user_id: string | null };

/** No account IDs or matching-record details are returned to the caller. */
export async function requestContractorAccountSetup(input: unknown, origin: string): Promise<void> {
  const parsed = setupAccountSchema.safeParse(input);
  if (!parsed.success) return;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_contractor_account_setup', { p_email: parsed.data.email });
  if (error) throw new Error('Account setup is temporarily unavailable.');
  if (!data) return;
  const claim = data as unknown as SetupClaim;
  if (!claim.auth_user_id) {
    const { error: createError } = await admin.auth.admin.createUser({
      email: claim.email, email_confirm: false,
      app_metadata: { role: 'CONTRACTOR', contractor_record_id: claim.id },
      user_metadata: { first_name: claim.first_name, last_name: claim.last_name },
    });
    // A duplicate/race must not trigger another email or attach another record.
    if (createError) return;
  }
  const mailClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false, flowType: 'implicit' } },
  );
  const { error: emailError } = await mailClient.auth.signInWithOtp({
    email: claim.email, options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm` },
  });
  // Keep eligible/unknown/duplicate responses identical, including provider mail
  // failures. Cooldown prevents rapid retries; log without exposing the email.
  if (emailError) console.error('Contractor setup verification email failed.');
}
