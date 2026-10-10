 'use client';
import { type FormEvent, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { stormEventService, type StormEventSummary } from '@/lib/services/stormEventService';
import { ticketService } from '@/lib/services/ticketService';
import { stormRosterService, type StormRosterMember } from '@/lib/services/stormRosterService';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { localTestStore } from '@/lib/testing/localTestStore';
import { useAuth } from '@/components/providers/AuthProvider';
import { canPerformManagementAction } from '@/lib/auth/authorization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/common/layout/PageHeader';
import type { Ticket } from '@/types';
import { toast } from 'sonner';
import { getStaffTicketStatusLabel } from '@/lib/utils/statusUpdateFlow';
import { ROLE_LABELS } from '@/lib/config/appConfig';
import type { ContractorRole } from '@/types';
import { StormManagerEditor } from './StormManagerControl';

function parseOptionalRate(value: string, label: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) throw new Error(`${label} must be a nonnegative amount with cent precision.`);
  const rate = Number(value);
  if (!Number.isFinite(rate)) throw new Error(`${label} must be a valid amount.`);
  return rate;
}

function StormRosterCompensationEditor({ stormId, member, onSaved }: {
  stormId: string;
  member: StormRosterMember;
  onSaved: () => Promise<void>;
}) {
  const [payRateOverride, setPayRateOverride] = useState(member.payRateOverride?.toFixed(2) ?? '');
  const [vehicleHourlyRate, setVehicleHourlyRate] = useState(member.vehicleHourlyRate?.toFixed(2) ?? '');
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await stormRosterService.assign(stormId, member.contractorId, {
        payRateOverride: parseOptionalRate(payRateOverride, 'Contractor wage override'),
        vehicleHourlyRate: member.role === 'DRIVER' ? parseOptionalRate(vehicleHourlyRate, 'Hourly vehicle allowance') : null,
      });
      await onSaved();
      toast.success('Storm contractor compensation updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update storm contractor compensation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="basis-full text-sm">
      <summary className="cursor-pointer text-grid-blue underline">Edit storm compensation</summary>
      <form className="mt-3 grid gap-3 rounded-lg border border-white/15 p-3 sm:grid-cols-2" onSubmit={save}>
        <div className="space-y-2">
          <Label htmlFor={`roster-pay-override-${member.contractorId}`}>Contractor wage override ($/hr, optional)</Label>
          <Input id={`roster-pay-override-${member.contractorId}`} type="number" min="0" step="0.01" inputMode="decimal" value={payRateOverride} onChange={event => setPayRateOverride(event.target.value)} />
        </div>
        {member.role === 'DRIVER' ? (
          <div className="space-y-2">
            <Label htmlFor={`roster-vehicle-rate-${member.contractorId}`}>Hourly vehicle allowance ($/hr) *</Label>
            <Input id={`roster-vehicle-rate-${member.contractorId}`} type="number" min="0" step="0.01" inputMode="decimal" required value={vehicleHourlyRate} onChange={event => setVehicleHourlyRate(event.target.value)} />
          </div>
        ) : null}
        <div className="sm:col-span-2"><Button type="submit" size="sm" variant="storm" disabled={saving || (member.role === 'DRIVER' && !vehicleHourlyRate)}>{saving ? 'Saving…' : 'Save contractor rates'}</Button></div>
      </form>
    </details>
  );
}

export function StormWorkspace({ stormId }: { stormId: string }) {
  const { profile, permissions } = useAuth();
  const [storm, setStorm] = useState<StormEventSummary | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [roster, setRoster] = useState<StormRosterMember[]>([]);
  const [options, setOptions] = useState<Array<{ id: string; displayName: string; role: ContractorRole }>>([]);
  const [selected, setSelected] = useState(''); const [name, setName] = useState('');
  const [payRateOverride, setPayRateOverride] = useState(''); const [vehicleHourlyRate, setVehicleHourlyRate] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const canManage = canPerformManagementAction(profile?.role, 'contractor_assignment_write', permissions);
  const canManageCompensation = canManage && permissions['admin.payroll.edit'];
  const reload = useCallback(async (reloadOptions?: { throwOnError?: boolean }) => {
    setError('');
    try {
      const event = await stormEventService.getStormEventById(stormId);
      if (!event) throw new Error('Storm event not found.');
      const [allTickets, members, available] = await Promise.all([permissions['admin.tickets.view'] ? ticketService.getTickets() : Promise.resolve([]), permissions['admin.assignments.view'] ? stormRosterService.list(stormId) : Promise.resolve([]), canManage ? stormRosterService.listOptions() : Promise.resolve([])]);
      setStorm(event);
      setTickets(allTickets.filter(ticket => ticket.storm_event_id === stormId)); setRoster(members); setOptions(available);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load storm.');
      if (reloadOptions?.throwOnError) throw error;
    }
    finally { setLoading(false); }
  }, [stormId, permissions, canManage]);
  useEffect(() => { void Promise.resolve().then(() => reload()); }, [reload]);
  if (loading) return <p>Loading storm workspace...</p>;
  if (!storm) return <div role="alert">{error || 'Storm not found.'} <Link href="/admin/storms">Back to storm events</Link></div>;
  const selectedRole = options.find((option) => option.id === selected)?.role;
  const isClosed = storm.status === 'CLOSED';
  const assignmentCompensation = () => ({
    payRateOverride: parseOptionalRate(payRateOverride, 'Contractor wage override'),
    vehicleHourlyRate: selectedRole === 'DRIVER' ? parseOptionalRate(vehicleHourlyRate, 'Hourly vehicle allowance') : null,
  });
  return <div className="space-y-8">
    <PageHeader title={storm.name} description={`${storm.utilityClient} · ${storm.status}`} backHref="/admin/storms">
      {permissions['admin.tickets.edit'] && <Button asChild variant="storm"><Link href={`/storms/${stormId}/tickets/new`}>Create Ticket</Link></Button>}
    </PageHeader>
    <div className="storm-surface border-l-4 border-l-grid-blue rounded-xl p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-grid-muted">Storm event code</p>
      <p className="mt-2 font-mono text-2xl font-bold">{storm.eventCode}</p>
      <p className="mt-3 text-sm text-grid-muted">Contractors, tickets, time, and expenses belong to this event. Ticket forms use {storm.utilityClient} rules.</p>
    </div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {permissions['admin.storms.view'] && <StormManagerEditor key={`${profile?.id}-${storm.id}-${storm.responsibleManagerId ?? 'none'}`} stormId={storm.id} managerId={storm.responsibleManagerId ?? null} canEdit={!!permissions['admin.storms.edit'] && !isClosed} onSaved={() => reload({ throwOnError: true })} />}
    {permissions['admin.assignments.view'] && <section className="storm-surface space-y-4 rounded-xl p-6" aria-labelledby="storm-contractors">
      <h2 id="storm-contractors" className="text-xl font-semibold text-white">Contractors</h2>
      {roster.length ? <ul className="divide-y">{roster.map(member => <li key={member.contractorId} className="flex flex-wrap items-center justify-between gap-2 py-3">
        <span>{member.displayName} <span className="text-sm text-grid-muted">· {ROLE_LABELS[member.role]}</span></span>
        {permissions['admin.payroll.view'] && <span className="text-sm text-grid-muted">
          {member.payRateOverride === null ? 'Role wage' : `Storm override $${Number(member.payRateOverride).toFixed(2)}/hr`}
          {member.role === 'DRIVER' ? ` · ${member.vehicleHourlyRate === null ? 'Vehicle allowance not configured' : `Vehicle $${Number(member.vehicleHourlyRate).toFixed(2)}/hr`}` : ''}
        </span>}
        {canManageCompensation && !isClosed && <StormRosterCompensationEditor key={`${member.contractorId}-${member.payRateOverride ?? 'none'}-${member.vehicleHourlyRate ?? 'none'}`} stormId={stormId} member={member} onSaved={reload} />}
      </li>)}</ul> : <p className="text-sm text-grid-muted">No contractors assigned to this storm yet.</p>}
      {canManageCompensation && !isClosed && <form className="grid gap-3 border-t pt-4 sm:grid-cols-2" onSubmit={async event => {
        event.preventDefault(); setSaving(true);
        try { await stormRosterService.assign(stormId, selected, assignmentCompensation()); setSelected(''); setPayRateOverride(''); setVehicleHourlyRate(''); await reload(); toast.success('Contractor and storm compensation saved.'); }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to assign contractor.'); } finally { setSaving(false); }
      }}>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="storm-contractor">Add an active contractor</Label>
          <select id="storm-contractor" className="storm-contrast-field w-full rounded-md border p-2" value={selected} onChange={event => { setSelected(event.target.value); setPayRateOverride(''); setVehicleHourlyRate(''); }} required>
            <option value="">Select contractor</option>{options.filter(option => !roster.some(member => member.contractorId === option.id)).map(option => <option key={option.id} value={option.id}>{option.displayName} · {ROLE_LABELS[option.role]}</option>)}
          </select>
        </div>
        <div className="space-y-2"><Label htmlFor="storm-contractor-pay-override">Contractor wage override ($/hr, optional)</Label>
          <Input id="storm-contractor-pay-override" type="number" min="0" step="0.01" inputMode="decimal" value={payRateOverride} onChange={event => setPayRateOverride(event.target.value)} />
          <p className="text-xs text-grid-muted">Leave blank to use this role’s wage for this storm.</p>
        </div>
        {selectedRole === 'DRIVER' ? <div className="space-y-2"><Label htmlFor="storm-driver-vehicle-rate">Hourly vehicle allowance ($/hr) *</Label>
          <Input id="storm-driver-vehicle-rate" type="number" min="0" step="0.01" inputMode="decimal" required value={vehicleHourlyRate} onChange={event => setVehicleHourlyRate(event.target.value)} />
          <p className="text-xs text-grid-muted">Paid only for recorded vehicle-use time.</p>
        </div> : <p className="self-center text-sm text-grid-muted">Vehicle allowance applies to Driver assignments only.</p>}
        <div className="sm:col-span-2"><Button disabled={!selected || saving || (selectedRole === 'DRIVER' && !vehicleHourlyRate)} type="submit" variant="storm">{saving ? 'Saving assignment…' : 'Add to Storm'}</Button></div>
      </form>}
      {canManage && !canManageCompensation && !isClosed && <p className="text-sm text-grid-muted">Payroll editing permission is required to add a contractor with storm-specific compensation.</p>}
      {isClosed && canManage && <p className="text-sm text-grid-muted">This storm is closed; contractor compensation and roster assignments are locked.</p>}
      {canManage && isSuperAdminTestingEnabled() ? <form className="flex flex-wrap items-end gap-3 border-t pt-4" onSubmit={async event => {
        event.preventDefault(); setSaving(true);
        try { const contractor = localTestStore.createContractor(name); await stormRosterService.assign(stormId, contractor.id, { payRateOverride: null, vehicleHourlyRate: null }); setName(''); await reload(); }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create test contractor.'); } finally { setSaving(false); }
      }}><div className="flex-1 space-y-2"><Label htmlFor="test-contractor-name">Test contractor name</Label><Input id="test-contractor-name" required value={name} onChange={event => setName(event.target.value)} /></div><Button disabled={saving} type="submit" variant="storm">Create Test Contractor</Button></form> : canManage ? <p className="text-sm"><Link className="text-grid-blue underline" href="/admin/contractors/add">Add a new contractor</Link> before assigning them to this storm.</p> : null}
    </section>}
    <section className="storm-surface space-y-4 rounded-xl p-6" aria-labelledby="storm-tickets"><h2 id="storm-tickets" className="text-xl font-semibold text-white">Tickets · {tickets.length}</h2>
      {tickets.length ? <ul className="divide-y">{tickets.map(ticket => <li key={ticket.id} className="flex justify-between gap-3 py-3"><Link className="text-grid-blue underline" href={`/tickets/${ticket.id}`}>{ticket.ticket_number}</Link><span>{getStaffTicketStatusLabel(ticket.status, ticket.review_stage, ticket.utility_submitted_at)}</span></li>)}</ul> : <p className="text-sm text-grid-muted">Create the first {storm.utilityClient} ticket for this event.</p>}
    </section>

  </div>;
}
