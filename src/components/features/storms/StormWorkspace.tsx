 'use client';
import { useEffect, useState, useCallback } from 'react';
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
import { InvoiceGenerator } from '@/components/features/invoices';
import type { Ticket } from '@/types';
import { toast } from 'sonner';

export function StormWorkspace({ stormId }: { stormId: string }) {
  const { profile } = useAuth();
  const [storm, setStorm] = useState<StormEventSummary | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [roster, setRoster] = useState<StormRosterMember[]>([]);
  const [options, setOptions] = useState<Array<{ id: string; displayName: string }>>([]);
  const [selected, setSelected] = useState(''); const [name, setName] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const canManage = canPerformManagementAction(profile?.role, 'contractor_assignment_write');
  const reload = useCallback(async () => {
    setError('');
    try {
      const event = await stormEventService.getStormEventById(stormId);
      if (!event) throw new Error('Storm event not found.');
      setStorm(event);
      const [allTickets, members, available] = await Promise.all([ticketService.getTickets(), stormRosterService.list(stormId), stormRosterService.listOptions()]);
      setTickets(allTickets.filter(ticket => ticket.storm_event_id === stormId)); setRoster(members); setOptions(available);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to load storm.'); }
    finally { setLoading(false); }
  }, [stormId]);
  useEffect(() => { void reload(); }, [reload]);
  if (loading) return <p>Loading storm workspace...</p>;
  if (!storm) return <div role="alert">{error || 'Storm not found.'} <Link href="/admin/storms">Back to storm events</Link></div>;
  return <div className="space-y-8">
    <PageHeader title={storm.name} description={`${storm.utilityClient} · ${storm.status}`} backHref="/admin/storms">
      <Button asChild variant="storm"><Link href={`/storms/${stormId}/tickets/new`}>Create Ticket</Link></Button>
    </PageHeader>
    <div className="storm-surface border-l-4 border-l-grid-blue rounded-xl p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-grid-muted">Storm event code</p>
      <p className="mt-2 font-mono text-2xl font-bold">{storm.eventCode}</p>
      <p className="mt-3 text-sm text-grid-muted">Contractors, tickets, time, expenses, and billing belong to this event. Ticket forms use {storm.utilityClient} rules.</p>
    </div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <section className="storm-surface space-y-4 rounded-xl p-6" aria-labelledby="storm-contractors">
      <h2 id="storm-contractors" className="text-xl font-semibold">Contractors</h2>
      {roster.length ? <ul className="divide-y">{roster.map(member => <li key={member.contractorId} className="py-3">{member.displayName}</li>)}</ul> : <p className="text-sm text-grid-muted">No contractors assigned to this storm yet.</p>}
      {canManage && <form className="flex flex-wrap items-end gap-3" onSubmit={async event => {
        event.preventDefault(); setSaving(true);
        try { await stormRosterService.assign(stormId, selected); setSelected(''); await reload(); toast.success('Contractor added to this storm.'); }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to assign contractor.'); } finally { setSaving(false); }
      }}><div className="min-w-60 flex-1 space-y-2"><Label htmlFor="storm-contractor">Add an approved contractor</Label>
        <select id="storm-contractor" className="storm-contrast-field w-full rounded-md border p-2" value={selected} onChange={event => setSelected(event.target.value)} required>
          <option value="">Select contractor</option>{options.filter(option => !roster.some(member => member.contractorId === option.id)).map(option => <option key={option.id} value={option.id}>{option.displayName}</option>)}
        </select></div><Button disabled={!selected || saving} type="submit" variant="storm">{saving ? 'Adding...' : 'Add to Storm'}</Button></form>}
      {canManage && isSuperAdminTestingEnabled() ? <form className="flex flex-wrap items-end gap-3 border-t pt-4" onSubmit={async event => {
        event.preventDefault(); setSaving(true);
        try { const contractor = localTestStore.createContractor(name); await stormRosterService.assign(stormId, contractor.id); setName(''); await reload(); }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create test contractor.'); } finally { setSaving(false); }
      }}><div className="flex-1 space-y-2"><Label htmlFor="test-contractor-name">Test contractor name</Label><Input id="test-contractor-name" required value={name} onChange={event => setName(event.target.value)} /></div><Button disabled={saving} type="submit" variant="storm">Create Test Contractor</Button></form> : canManage ? <p className="text-sm"><Link className="text-grid-blue underline" href="/admin/contractors/invite">Onboard a new contractor</Link> before assigning them to this storm.</p> : null}
    </section>
    <section className="storm-surface space-y-4 rounded-xl p-6" aria-labelledby="storm-tickets"><h2 id="storm-tickets" className="text-xl font-semibold">Tickets · {tickets.length}</h2>
      {tickets.length ? <ul className="divide-y">{tickets.map(ticket => <li key={ticket.id} className="flex justify-between gap-3 py-3"><Link className="text-grid-blue underline" href={`/tickets/${ticket.id}`}>{ticket.ticket_number}</Link><span>{ticket.status}</span></li>)}</ul> : <p className="text-sm text-grid-muted">Create the first {storm.utilityClient} ticket for this event.</p>}
    </section>
    <section className="storm-surface space-y-4 rounded-xl p-6" aria-labelledby="storm-billing"><h2 id="storm-billing" className="text-xl font-semibold">Billing · {storm.eventCode}</h2>
      <p className="text-sm text-grid-muted">Only approved time and expenses from this storm are included.</p>
      <InvoiceGenerator stormEventId={stormId} generatedBy={profile?.id} />
    </section>
  </div>;
}
