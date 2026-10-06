import { supabase } from '@/lib/supabase/client';
import { db, type TicketFieldProgressSnapshot, type LocalTicket } from '@/lib/db/dexie';
import type { Ticket } from '@/types';
import { ticketWorkflowRpc } from '@/lib/services/ticketAssessmentWorkflow';
import { notifyTicketsChanged } from '@/lib/tickets/events';

type FieldProgressStatus = TicketFieldProgressSnapshot['to_status'];

function isLaterServerStatus(status: string, target: FieldProgressStatus): boolean {
  if (target === 'IN_ROUTE') return ['ON_SITE', 'IN_PROGRESS', 'COMPLETE', 'PENDING_REVIEW', 'APPROVED', 'CLOSED', 'ARCHIVED'].includes(status);
  return ['IN_PROGRESS', 'COMPLETE', 'PENDING_REVIEW', 'APPROVED', 'CLOSED', 'ARCHIVED'].includes(status);
}

async function refreshLocalTicket(ticketId: string, updates: Partial<LocalTicket>) {
  const cached = await db.tickets.get(ticketId);
  if (!cached) return;
  await db.tickets.put({ ...cached, ...updates });
}

export const ticketFieldProgressWorkflow = {
  async recordOffline(input: {
    ticket: Ticket;
    actorProfileId: string;
    contractorId: string;
    nextStatus: FieldProgressStatus;
    location: { latitude: number; longitude: number; accuracy: number; capturedAt?: string };
  }): Promise<void> {
    const { ticket, actorProfileId, contractorId, nextStatus, location } = input;
    const fromStatus = nextStatus === 'IN_ROUTE' ? 'ASSIGNED' : 'IN_ROUTE';
    if (ticket.status !== fromStatus) throw new Error(`Ticket is ${ticket.status.toLowerCase().replaceAll('_', ' ')} and cannot move to ${nextStatus.toLowerCase().replaceAll('_', ' ')}.`);
    if (!ticket.crew_id || !ticket.team_lead_id || !ticket.assigned_to || !ticket.assigned_driver_id) {
      throw new Error('A team lead and assigned crew are required before fieldwork can start.');
    }

    const id = `${actorProfileId}:${ticket.id}:${nextStatus}`;
    const row: TicketFieldProgressSnapshot = {
      id,
      actor_profile_id: actorProfileId,
      contractor_id: contractorId,
      ticket_id: ticket.id,
      from_status: fromStatus,
      to_status: nextStatus,
      team_lead_id: ticket.team_lead_id,
      crew_id: ticket.crew_id,
      assigned_to: ticket.assigned_to,
      assigned_driver_id: ticket.assigned_driver_id,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      captured_at: location.capturedAt ?? new Date().toISOString(),
    };

    await db.transaction('rw', db.ticketFieldProgressQueue, db.tickets, async () => {
      const existing = await db.ticketFieldProgressQueue.get(id);
      if (!existing) await db.ticketFieldProgressQueue.add(row);
      const cached = await db.tickets.get(ticket.id);
      if (cached) await db.tickets.put({ ...cached, status: nextStatus, synced: false, sync_status: 'pending', field_progress_pending: true, field_progress_error: undefined, updated_at: row.captured_at });
    });
    notifyTicketsChanged();
  },

  async process(actorProfileId: string): Promise<{ failed: number; pending: number; errors: string[] }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const pending = await db.ticketFieldProgressQueue.where('actor_profile_id').equals(actorProfileId).count();
      return { failed: 0, pending, errors: [] };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || authData.user?.id !== actorProfileId) throw new Error('Field progress sync account mismatch. Sign in with the account that started this ticket.');

    const rows = await db.ticketFieldProgressQueue.where('actor_profile_id').equals(actorProfileId).sortBy('captured_at');
    const errors: string[] = [];
    let failed = 0;

    for (const row of rows) {
      try {
        const { data: ticket, error } = await supabase.from('tickets')
          .select('id,status,team_lead_id,crew_id,assigned_to,assigned_driver_id')
          .eq('id', row.ticket_id)
          .single();
        if (error || !ticket) throw new Error(error?.message ?? 'Assigned ticket is no longer available.');
        if (ticket.team_lead_id !== row.team_lead_id || ticket.crew_id !== row.crew_id || ticket.assigned_to !== row.assigned_to || ticket.assigned_driver_id !== row.assigned_driver_id) {
          throw new Error('The ticket assignment changed before field progress synced. Ask your team lead to review this ticket.');
        }

        if (ticket.status !== row.to_status && !isLaterServerStatus(ticket.status, row.to_status)) {
          if (ticket.status !== row.from_status) throw new Error(`Ticket status changed to ${ticket.status.replaceAll('_', ' ')} before this action synced.`);
          await ticketWorkflowRpc<Ticket>('update_ticket_field_status', {
            p_ticket_id: row.ticket_id,
            p_status: row.to_status,
            p_latitude: row.latitude,
            p_longitude: row.longitude,
            p_accuracy: row.accuracy,
          });
        }

        await db.ticketFieldProgressQueue.delete(row.id);
        const remaining = await db.ticketFieldProgressQueue.where('[actor_profile_id+ticket_id]').equals([actorProfileId, row.ticket_id]).count();
        await refreshLocalTicket(row.ticket_id, { field_progress_pending: remaining > 0, field_progress_error: undefined, sync_status: remaining > 0 ? 'pending' : 'synced', synced: remaining === 0 });
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : 'Ticket progress could not sync.';
        errors.push(message);
        await db.ticketFieldProgressQueue.update(row.id, { last_error: message });
        await refreshLocalTicket(row.ticket_id, { field_progress_pending: true, field_progress_error: message, sync_status: 'failed', synced: false });
      }
    }

    const pending = await db.ticketFieldProgressQueue.where('actor_profile_id').equals(actorProfileId).count();
    if (rows.length) notifyTicketsChanged();
    return { failed, pending, errors };
  },
};
