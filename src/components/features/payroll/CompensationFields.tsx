'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_LABELS } from '@/lib/config/appConfig';
import { payrollService } from '@/lib/services/payrollService';
import { getPayrollConfiguration } from '@/lib/compensation/service';
import { compensationTermsSchema, payWorkTypes, type CompensationTerms, type PayrollConfiguration } from '@/lib/compensation/validation';
import type { ContractorRole } from '@/types';

export interface CompensationDraft {
  role: ContractorRole | ''; base_hourly_rate: number; work_type_rates: CompensationTerms['work_type_rates'];
  mode: '' | 'FLAT' | 'WEEKLY_TIERS'; multiplier: number; tiers: { after_hours: number; multiplier: number }[];
  driver_eligible: boolean; vehicle_allowance_enabled: boolean; vehicle_hourly_rate: number;
  week_start_day: number; timezone: string;
}
export function emptyCompensationDraft(): CompensationDraft {
  return { role: '', base_hourly_rate: 0, work_type_rates: {}, mode: '', multiplier: 0, tiers: [], driver_eligible: false, vehicle_allowance_enabled: false, vehicle_hourly_rate: 0, week_start_day: 0, timezone: '' };
}
export function termsToDraft(terms: CompensationTerms): CompensationDraft {
  const { policy, ...rest } = terms;
  return { ...rest, mode: policy.mode, multiplier: policy.mode === 'FLAT' ? policy.multiplier : 0, tiers: policy.mode === 'WEEKLY_TIERS' ? policy.tiers : [] };
}
export function draftToTerms(draft: CompensationDraft): CompensationTerms {
  const { mode, multiplier, tiers, ...rest } = draft;
  return compensationTermsSchema.parse({ ...rest, policy: mode === 'FLAT' ? { mode, multiplier } : { mode, tiers } });
}
export function CompensationFields({ value, onChange, disabled = false }: { value: CompensationDraft; onChange: (value: CompensationDraft) => void; disabled?: boolean }) {
  const [config, setConfig] = useState<PayrollConfiguration | null>(null);
  const [customModes, setCustomModes] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  useEffect(() => { let active = true; void getPayrollConfiguration().then(result => { if (active) setConfig(result); }).catch(() => { if (active) setError('Unable to load saved pay choices. Refresh before saving.'); }); return () => { active = false; }; }, []);
  const update = (changes: Partial<CompensationDraft>) => onChange({ ...value, ...changes });
  const blocked = disabled || !config;
  const applyRoleDefaults = async () => {
    try {
      const rates = (await payrollService.getRoleRateDefaults()).filter(rate => rate.role === value.role);
      const base = rates.find(rate => rate.workType === 'STANDARD_ASSESSMENT')?.hourlyRate;
      if (!base) throw new Error('No role wage is configured. Enter a base wage.');
      update({ base_hourly_rate: base, work_type_rates: Object.fromEntries(rates.filter(rate => rate.hourlyRate !== base).map(rate => [rate.workType, rate.hourlyRate])) });
      setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load role wages.'); }
  };
  const options = config?.multiplier_options ?? [];
  const multiplierField = (id: string, selected: number, change: (value: number) => void) => <div className="space-y-2"><Label htmlFor={id}>Pay multiplier</Label><Select disabled={blocked} value={customModes[id] ? 'CUSTOM' : options.some(option => option.value === selected) ? String(selected) : selected > 0 ? 'CUSTOM' : ''} onValueChange={choice => { setCustomModes(previous => ({ ...previous, [id]: choice === 'CUSTOM' })); change(choice === 'CUSTOM' ? selected || config!.flat_multiplier : Number(choice)); }}><SelectTrigger id={id}><SelectValue placeholder="Select multiplier" /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.label} value={String(option.value)}>{option.label} ({option.value}×)</SelectItem>)}<SelectItem value="CUSTOM">Custom multiplier</SelectItem></SelectContent></Select><Input aria-label={`${id} custom value`} type="number" min="0.000001" step="any" value={selected || ''} disabled={blocked} onChange={event => change(Number(event.target.value))} /></div>;
  return <fieldset disabled={blocked} className="space-y-5 rounded-2xl border border-grid-blue/20 bg-gradient-to-br from-grid-storm-50 to-white p-4 sm:p-5">
    <legend className="px-2 font-semibold text-grid-navy">Contractor pay agreement</legend>
    {error && <p role="alert" className="text-sm text-grid-danger-ink">{error}</p>}
    {!config && !error && <p className="text-sm text-grid-body">Loading saved pay choices…</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="pay-role">Role</Label><Select disabled={blocked} value={value.role} onValueChange={role => update({ role: role as ContractorRole })}><SelectTrigger id="pay-role"><SelectValue placeholder="Select role" /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([role, label]) => <SelectItem key={role} value={role}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="pay-base">Base hourly wage ($)</Label><Input id="pay-base" required type="number" min="0.01" step="0.01" value={value.base_hourly_rate || ''} onChange={event => update({ base_hourly_rate: Number(event.target.value) })} /></div>
      <div className="space-y-2"><Label htmlFor="pay-mode">Pay policy</Label><Select disabled={blocked} value={value.mode} onValueChange={mode => update({ mode: mode as CompensationDraft['mode'], multiplier: value.multiplier || config!.flat_multiplier, tiers: value.tiers.length ? value.tiers : [{ after_hours: 0, multiplier: config!.flat_multiplier }], timezone: value.timezone || config!.timezone, week_start_day: value.timezone ? value.week_start_day : config!.week_start_day })}><SelectTrigger id="pay-mode"><SelectValue placeholder="Select a policy" /></SelectTrigger><SelectContent><SelectItem value="FLAT">Flat multiplier for all hours</SelectItem><SelectItem value="WEEKLY_TIERS">Weekly pay tiers</SelectItem></SelectContent></Select></div>
      {value.mode === 'FLAT' && multiplierField('flat-multiplier', value.multiplier, multiplier => update({ multiplier }))}
    </div>
    <Button type="button" variant="outline" disabled={blocked || !value.role} onClick={() => void applyRoleDefaults()}>Use configured role wages</Button>
    {value.mode === 'WEEKLY_TIERS' && <div className="space-y-3">{value.tiers.map((tier, index) => <div key={index} className="grid items-end gap-3 rounded-xl border bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"><div className="space-y-2"><Label htmlFor={`tier-${index}`}>After weekly hours</Label><Input id={`tier-${index}`} required type="number" min="0" max="168" step="any" readOnly={index === 0} value={tier.after_hours} onChange={event => update({ tiers: value.tiers.map((item, position) => position === index ? { ...item, after_hours: Number(event.target.value) } : item) })} /></div>{multiplierField(`tier-multiplier-${index}`, tier.multiplier, multiplier => update({ tiers: value.tiers.map((item, position) => position === index ? { ...item, multiplier } : item) }))}{index > 0 && <Button type="button" variant="ghost" disabled={blocked} onClick={() => update({ tiers: value.tiers.filter((_, position) => position !== index) })}>Remove</Button>}</div>)}<Button type="button" variant="outline" disabled={blocked || value.tiers.length >= 10} onClick={() => update({ tiers: [...value.tiers, { after_hours: value.tiers.at(-1)?.after_hours ?? 0, multiplier: config!.flat_multiplier }] })}>Add weekly tier</Button><p className="text-xs text-grid-body">Enter increasing thresholds. The first tier starts at zero. All paid work counts toward the week.</p></div>}
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="week-start">Workweek starts</Label><Select disabled={blocked} value={String(value.week_start_day)} onValueChange={day => update({ week_start_day: Number(day) })}><SelectTrigger id="week-start"><SelectValue /></SelectTrigger><SelectContent>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,index) => <SelectItem key={day} value={String(index)}>{day} at midnight</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="pay-timezone">Workweek time zone</Label><Select disabled={blocked} value={value.timezone} onValueChange={timezone => update({ timezone })}><SelectTrigger id="pay-timezone"><SelectValue placeholder="Select time zone" /></SelectTrigger><SelectContent>{Array.from(new Set([value.timezone, config?.timezone, ...(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [])])).filter((zone): zone is string => !!zone).map(zone => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}</SelectContent></Select></div></div>
    <details className="rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-medium text-grid-navy">Work-type wage overrides</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{payWorkTypes.map(type => <div key={type} className="space-y-1"><Label htmlFor={`override-${type}`}>{type.toLowerCase().replaceAll('_', ' ')}</Label><Input id={`override-${type}`} type="number" min="0.01" step="0.01" placeholder="Use base wage" value={value.work_type_rates[type] ?? ''} onChange={event => { const rates = { ...value.work_type_rates }; if (!event.target.value) delete rates[type]; else rates[type] = Number(event.target.value); update({ work_type_rates: rates }); }} /></div>)}</div></details>
    <div className="space-y-3 border-t pt-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.driver_eligible} onChange={event => update({ driver_eligible: event.target.checked, vehicle_allowance_enabled: event.target.checked && value.vehicle_allowance_enabled })} />Eligible driver</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={blocked || !value.driver_eligible} checked={value.vehicle_allowance_enabled} onChange={event => update({ vehicle_allowance_enabled: event.target.checked })} />Vehicle allowance enabled</label>{value.vehicle_allowance_enabled && <div className="max-w-sm space-y-2"><Label htmlFor="vehicle-rate">Allowance per vehicle-use hour ($)</Label><Input id="vehicle-rate" required type="number" min="0.01" step="0.01" value={value.vehicle_hourly_rate || ''} onChange={event => update({ vehicle_hourly_rate: Number(event.target.value) })} /><p className="text-xs text-grid-body">Recorded vehicle-use hours are paid separately from wages.</p></div>}</div>
  </fieldset>;
}
