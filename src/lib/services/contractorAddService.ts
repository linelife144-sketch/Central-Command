import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { AccessError } from '@/lib/auth/serverPermissions';
import { contractorAddSchema } from '@/lib/auth/contractorAddValidation';

export async function addContractor(actorId: string, input: unknown) {
  const payload = contractorAddSchema.parse(input);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('add_contractor_record', {
    p_actor_id: actorId, p_first_name: payload.first_name, p_last_name: payload.last_name,
    p_email: payload.email, p_phone: payload.phone, p_terms: payload.compensation,
  });
  if (error) {
    if (error.code === '23505') throw new AccessError('A contractor or account already uses this email address.', 409);
    if (error.code === '42501') throw new AccessError('You do not have permission to add contractors.', 403);
    if (error.code === '23514' || error.code === '22023') throw new AccessError(error.message, 400);
    throw new Error('Unable to save the contractor. Please try again.');
  }
  if (!data) throw new Error('The contractor was not saved. Please try again.');
  return { contractor: data, message: 'Contractor added. They can set up their account from the login screen.' };
}
