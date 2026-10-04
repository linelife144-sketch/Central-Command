import { compensationTermsSchema, payAgreementInputSchema, type PayAgreement, type PayAgreementInput, type PayrollConfiguration } from './validation';

export async function getPayrollConfiguration(): Promise<PayrollConfiguration> {
  const { supabase } = await import('@/lib/supabase/client');
  const { data, error } = await supabase.from('payroll_configuration').select('flat_multiplier,week_start_day,timezone,legacy_vehicle_hourly_rate,multiplier_options').single();
  if (error) throw error;
  return data as unknown as PayrollConfiguration;
}
export async function getPayAgreements(contractorId: string): Promise<PayAgreement[]> {
  const { supabase } = await import('@/lib/supabase/client');
  const { db } = await import('@/lib/db/dexie');
  // Session identity scopes this convenience cache; server reads/writes still require RLS.
  const { data: sessionData } = await supabase.auth.getSession();
  const viewerId = sessionData.session?.user.id;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (!viewerId) throw new Error('Sign in to access saved compensation.');
    const cached = await db.payAgreements.where('[viewer_profile_id+contractor_id]').equals([viewerId, contractorId]).toArray();
    if (!cached.length) throw new Error('Connect once to download your compensation agreement.');
    return cached.sort((a, b) => Date.parse(b.effective_from) - Date.parse(a.effective_from));
  }
  const { data, error } = await supabase.from('contractor_pay_agreements').select('id,contractor_id,effective_from,terms,created_at,created_by').eq('contractor_id', contractorId).order('effective_from', { ascending: false });
  if (error) throw error;
  const agreements = (data ?? []).map(row => ({ ...row, terms: compensationTermsSchema.parse(row.terms) }));
  if (viewerId) {
    const { data: owner } = await supabase.from('contractors').select('profile_id').eq('id', contractorId).single();
    if (owner?.profile_id === viewerId) await db.payAgreements.bulkPut(agreements.map(row => ({ ...row, viewer_profile_id: viewerId })));
  }
  return agreements;
}
export async function savePayAgreement(contractorId: string, input: PayAgreementInput): Promise<PayAgreement> {
  const { supabase } = await import('@/lib/supabase/client');
  const value = payAgreementInputSchema.parse(input);
  const { data, error } = await supabase.from('contractor_pay_agreements').insert({ contractor_id: contractorId, ...value }).select('id,contractor_id,effective_from,terms,created_at,created_by').single();
  if (error) throw error;
  return { ...data, terms: compensationTermsSchema.parse(data.terms) };
}
