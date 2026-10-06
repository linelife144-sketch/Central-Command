'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPayAgreements, savePayAgreement } from '@/lib/compensation/service';
import type { PayAgreement } from '@/lib/compensation/validation';
import { CompensationFields, emptyCompensationDraft, termsToDraft, draftToTerms, type CompensationDraft } from './CompensationFields';

export function PayAgreementEditor({ contractorId, canEdit }: { contractorId: string; canEdit: boolean }) {
  const [agreements, setAgreements] = useState<PayAgreement[]>([]);
  const [draft, setDraft] = useState<CompensationDraft>(emptyCompensationDraft);
  const [effective, setEffective] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { const records = await getPayAgreements(contractorId); setAgreements(records); const current = records.find(record => Date.parse(record.effective_from) <= Date.now()); if (current) setDraft(termsToDraft(current.terms)); setError(''); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load pay agreements.'); } }, [contractorId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const save = async () => { setSaving(true); try { await savePayAgreement(contractorId, { effective_from: effective ? new Date(effective).toISOString() : new Date().toISOString(), terms: draftToTerms(draft) }); await load(); toast.success('New pay agreement saved. Earlier payroll is preserved.'); } catch (failure) { toast.error(failure instanceof Error ? failure.message : 'Unable to save agreement.'); } finally { setSaving(false); } };
  return <Card><CardHeader><CardTitle>Pay agreements</CardTitle></CardHeader><CardContent className="space-y-4">{error && <p role="alert" className="text-grid-danger-ink">{error}</p>}<CompensationFields value={draft} onChange={setDraft} disabled={!canEdit || saving} /><div className="space-y-2"><Label htmlFor="agreement-effective">Effective time</Label><Input id="agreement-effective" type="datetime-local" value={effective} disabled={!canEdit || saving} onChange={event => setEffective(event.target.value)} /><p className="text-xs text-grid-body">Leave blank to apply now. An active shift is split at this time. Closed payroll stays unchanged.</p></div>{canEdit && <Button onClick={() => void save()} disabled={saving || !!error}>{saving ? 'Saving…' : 'Save new agreement'}</Button>}<details><summary className="cursor-pointer font-medium">Agreement history ({agreements.length})</summary><ol className="mt-3 space-y-3">{agreements.map(agreement => <li key={agreement.id} className="rounded-xl border p-3 text-sm"><strong>{new Date(agreement.effective_from).toLocaleString()}</strong><p>${agreement.terms.base_hourly_rate.toFixed(2)}/hour · {agreement.terms.policy.mode === 'FLAT' ? `${agreement.terms.policy.multiplier}× all hours` : agreement.terms.policy.tiers.map(tier => `${tier.after_hours}+ h: ${tier.multiplier}×`).join(' · ')}</p><p>{agreement.terms.timezone} · vehicle allowance {agreement.terms.vehicle_allowance_enabled ? `$${agreement.terms.vehicle_hourly_rate}/vehicle-use hour` : 'disabled'}</p></li>)}</ol></details></CardContent></Card>;
}
