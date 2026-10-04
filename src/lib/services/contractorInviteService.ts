import 'server-only';
import { compensationTermsSchema } from '@/lib/compensation/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { AccessError } from '@/lib/auth/serverPermissions';
import { contractorInviteSchema, inviteRedirectUrl } from '@/lib/auth/contractorInviteValidation';

export async function inviteContractor(actorId: string, input: unknown) {
  const payload = contractorInviteSchema.parse(input);
  const admin = createAdminClient();
  const audit = async (action: string, result: string, targetId?: string) => {
    const { error } = await admin.from('audit_logs').insert({ action, entity_type: 'contractor_invitation', entity_id: targetId ?? null, user_id: actorId, user_role: 'SUPER_ADMIN', new_values: { email: payload.email, result } });
    if (error) throw new Error('Invitation audit could not be saved.');
    if (action === 'INVITE_FAILED' && targetId) {
      const { error: statusError } = await admin.from('contractor_invitations').upsert({ profile_id: targetId, email: payload.email, first_name: payload.first_name, last_name: payload.last_name, invited_by: actorId, last_result: 'failed' }, { onConflict: 'profile_id' });
      if (statusError) throw new Error('The failed invitation was audited, but its status could not be saved.');
    }
  };
  const { data: existing, error: lookupError } = await admin.from('profiles').select('id,role').eq('email', payload.email).maybeSingle();
  if (lookupError) throw new Error('Unable to check the existing account.');
  let existingId: string | undefined;
  if (existing) {
    const { data, error } = await admin.auth.admin.getUserById(existing.id);
    if (error || !data.user) throw new Error('Unable to verify the existing account.');
    if (existing.role !== 'CONTRACTOR' || (data.user.app_metadata?.role && data.user.app_metadata.role !== 'CONTRACTOR') || data.user.email_confirmed_at) {
      await audit('INVITE_DUPLICATE_REJECTED', 'Account already active or has a staff role', existing.id);
      throw new AccessError('This email already has an active account. No new account was created.', 409);
    }
    if (!payload.resend) {
      await audit('INVITE_DUPLICATE_REJECTED', 'Unaccepted invite exists', existing.id);
      throw new AccessError('This contractor already has an invitation. Use Resend invite.', 409);
    }
    existingId = existing.id;
  } else if (payload.resend) throw new AccessError('No invitation exists for this email.', 404);

  // Persist validated setup before the provider sends mail. A resend reuses the original setup.
  const { data: savedSetup, error: setupLookupError } = await admin.from('contractor_invitation_pay_setups').select('email').eq('email', payload.email).maybeSingle();
  if (setupLookupError) throw setupLookupError;
  if (!savedSetup) {
    let compensation = payload.compensation;
    if (!compensation && existingId) {
      const { data: contractor, error: contractorError } = await admin.from('contractors').select('id').eq('profile_id', existingId).single();
      if (contractorError) throw contractorError;
      const { data: agreements, error: agreementError } = await admin.from('contractor_pay_agreements').select('terms').eq('contractor_id', contractor.id).lte('effective_from', new Date().toISOString()).order('effective_from', { ascending: false }).limit(1);
      if (agreementError) throw agreementError;
      compensation = agreements?.[0] ? compensationTermsSchema.parse(agreements[0].terms) : undefined;
    }
    if (!compensation) throw new AccessError('Configure contractor compensation before resending this invitation.', 422);
    const { error: setupError } = await admin.from('contractor_invitation_pay_setups').insert({ email: payload.email, actor_id: actorId, terms: compensation });
    if (setupError) throw setupError;
  }

  // Provider enforces a contractor role for new Auth users; no role is accepted from the caller.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(payload.email, {
    redirectTo: inviteRedirectUrl(), data: { first_name: payload.first_name, last_name: payload.last_name },
  });
  if (error || !data.user) {
    await audit('INVITE_FAILED', error?.message ?? 'No Auth user returned', existingId);
    throw new AccessError('The email provider could not send the invitation. Try again after checking email delivery settings.', 502);
  }
  if (data.user.app_metadata.role && data.user.app_metadata.role !== 'CONTRACTOR') {
    await audit('INVITE_FAILED', 'Unexpected existing Auth role', data.user.id);
    throw new AccessError('The existing account has a protected role.', 409);
  }
  const { error: metadataError } = await admin.auth.admin.updateUserById(data.user.id, { app_metadata: { ...data.user.app_metadata, role: 'CONTRACTOR' } });
  if (metadataError) {
    await audit('INVITE_FAILED', 'Email sent; trusted role metadata could not be saved', data.user.id);
    throw new AccessError('The email was sent, but account setup needs repair. Use Resend invite to retry.', 500);
  }
  // This transaction creates/repairs the business row, password gate, invite status and audit together.
  const { data: result, error: finalizeError } = await admin.rpc('finalize_contractor_invite', {
    p_actor_id: actorId, p_profile_id: data.user.id, p_first_name: payload.first_name, p_last_name: payload.last_name, p_email: payload.email, p_phone: payload.phone || '', p_resend: payload.resend,
  });
  if (finalizeError) {
    await audit('INVITE_FAILED', 'Email sent; contractor setup requires repair', data.user.id);
    throw new AccessError('The email was sent, but the contractor record could not be completed. Retry using Resend invite to repair setup.', 500);
  }
  const { error: paySetupError } = await admin.rpc('complete_invitation_pay_setup', { p_actor: actorId, p_profile: data.user.id, p_email: payload.email });
  if (paySetupError) {
    await audit('INVITE_FAILED', 'Compensation setup requires repair', data.user.id);
    throw new AccessError('The invitation was sent, but compensation setup needs repair. Resend to finish the saved setup.', 500);
  }
  return { invitation: result, message: payload.resend ? 'Invitation sent again.' : 'Invitation sent. The contractor will set their own password.' };
}
