import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AccessError } from '@/lib/auth/serverPermissions';

export async function requireOnboardingContractor() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new AccessError('Please sign in.', 401);
  if (!user.email_confirmed_at) throw new AccessError('Verify your email first.', 403);
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin.from('profiles').select('id,role,is_active,must_reset_password,first_name,last_name').eq('id', user.id).single();
  if (profileError || !profile?.is_active || profile.role !== 'CONTRACTOR' || profile.must_reset_password) throw new AccessError('Finish account password setup with an active contractor account.', 403);
  const { data: contractor, error: contractorError } = await admin.from('contractors').select('id,profile_id,first_name,last_name,business_email,address_line1,address_line2,city,state,zip_code,onboarding_completed_at,vehicle_registration_photo_path').eq('profile_id', user.id).eq('is_deleted', false).single();
  if (contractorError || !contractor || contractor.business_email?.toLowerCase() !== user.email?.toLowerCase()) throw new AccessError('Your account is not linked to an added contractor.', 403);
  const { data: agreement, error: agreementError } = await admin.from('contractor_pay_agreements').select('terms').eq('contractor_id', contractor.id).lte('effective_from', new Date().toISOString()).order('effective_from', { ascending: false }).limit(1).maybeSingle();
  if (agreementError) throw new AccessError('Unable to load your driver requirement.', 503);
  const terms = agreement?.terms as { driver_eligible?: boolean } | undefined;
  return { admin, user, profile, contractor, driverRequired: terms?.driver_eligible === true };
}
