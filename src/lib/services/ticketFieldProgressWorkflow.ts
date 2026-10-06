import { supabase } from '@/lib/supabase/client';
import { db, type TicketFieldProgressSnapshot, type LocalTicket } from '@/lib/db/dexie';
import type { Ticket, TicketStatus } from '@/types';
import { ticketWorkflowRpc } from '@/lib/services/ticketAssessmentWorkflow';
import { notifyTicketsChanged } from '@/lib/tickets/events';

export type TicketFieldAction = 'START' | 'OPEN_CHECKLIST';
type RecordOfflineInput = {
  ticket: Ticket;
  actorProfileId: string;
  contractorId: string;
} & (
  | { action: TicketFieldAction; nextStatus?: never; location?: never }
  // Older queued callers are converted to an action; their GPS snapshot is ignored.
  | { action?: never; nextStatus: 'IN_ROUTE' | 'ON_SITE'; location?: { latitude: number; longitude: number; accuracy: number; capturedAt?: string } }
);

const STATUS_FOR_ACTION: Record<TicketFieldAction, { from: 'ASSIGNED' | 'IN_ROUTE'; to: 'IN_ROUTE' | 'ON_SITE' }> = {
  START: { from: 'ASSIGNED', to: 'IN_ROUTE' },
  OPEN_CHECKLIST: { from: 'IN_ROUTE', to: 'ON_SITE' },
};

function queuedAction(row: TicketFieldProgressSnapshot): TicketFieldAction {
  // Existing devices may have GPS-based queue rows created before this release.
  return row.action ?? (row.to_status === 'IN_ROUTE' ? 'START' : 'OPEN_CHECKLIST');
}

function isAtOrBeyond(status: string, action: TicketFieldAction): boolean {
  if (action === 'START') {
    return ['IN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETE', 'NEEDS_REWORK', 'PENDING_REVIEW', 'APPROVED', 'CLOSED', 'ARCHIVED', 'EXPIRED'].includes(status);
  }
  return ['ON_SITE', 'IN_PROGRESS', 'COMPLETE', 'NEEDS_REWORK'].includes(status);
}

function isValidActor(ticket: Ticket, contractorId: string, action: TicketFieldAction): boolean {
  const hasDispatch = Boolean(ticket.crew_id && ticket.team_lead_id && ticket.assigned_to && ticket.assigned_driver_id && ticket.storm_event_id);
  if (!hasDispatch) return false;
  return action === 'START'
    ? contractorId === ticket.assigned_to || contractorId === ticket.assigned_driver_id
    : contractorId === ticket.assigned_to;
}

function localTicket(ticket: Ticket, values: Partial<LocalTicket>): LocalTicket {
  return {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    status: ticket.status,
    review_stage: ticket.review_stage,
    utility_submitted_at: ticket.utility_submitted_at,
    is_important: ticket.is_important,
    address: ticket.address,
    city: ticket.city,
    state: ticket.state,
    zip_code: ticket.zip_code,
    latitude: ticket.latitude ?? undefined,
    longitude: ticket.longitude ?? undefined,
    geofence_radius_meters: ticket.geofence_radius_meters,
    assigned_to: ticket.assigned_to ?? undefined,
    assigned_driver_id: ticket.assigned_driver_id,
    team_lead_id: ticket.team_lead_id,
    crew_id: ticket.crew_id,
    storm_event_id: ticket.storm_event_id ?? undefined,
    utility_client: ticket.utility_client,
    work_description: ticket.work_description ?? undefined,
    synced: true,
    sync_status: 'synced',
    updated_at: ticket.updated_at ?? ticket.created_at ?? new Date().toISOString(),
    ...values,
  };
}

async function cacheTicket(ticketId: string, ticket: Ticket, updates: Partial<LocalTicket> = {}) {
  const cached = await db.tickets.get(ticketId);
  await db.tickets.put({ ...localTicket(ticket, updates), ...cached, ...updates, id: ticketId });
}

function monotonicCaptureTime(rows: TicketFieldProgressSnapshot[]): string {
  const now = Date.now();
  const latest = rows.reduce((value, row) => Math.max(value, Date.parse(row.captured_at) || 0), 0);
  return new Date(Math.max(now, latest + 1)).toISOString();
}

export const ticketFieldProgressWorkflow = {
  async recordAction(input: {
    ticket: Ticket;
    actorProfileId: string;
    contractorId: string;
    action: TicketFieldAction;
  }): Promise<{ ticket: Ticket & { field_progress_pending?: boolean; field_progress_error?: string }; offline: boolean }> {
    const { ticket, actorProfileId, contractorId, action } = input;
    const transition = STATUS_FOR_ACTION[action];
    if (!isValidActor(ticket, contractorId, action)) {
      throw new Error(action === 'OPEN_CHECKLIST'
        ? 'Only the assigned assessor can open this field checklist.'
        : 'A dispatched driver or assessor is required before fieldwork can start.');
    }
    if (ticket.status !== transition.from) {
      throw new Error(action === 'OPEN_CHECKLIST' && ticket.status === 'ASSIGNED'
        ? 'Start the ticket before opening its field checklist.'
        : `Ticket is ${ticket.status.toLowerCase().replaceAll('_', ' ')} and cannot complete this action.`);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.recordOffline({ ticket, actorProfileId, contractorId, action });
      return { ticket: { ...ticket, status: transition.to as TicketStatus, field_progress_pending: true }, offline: true };
    }

    const saved = await ticketWorkflowRpc<Ticket>('record_ticket_field_action', {
      p_ticket_id: ticket.id,
      p_action: action,
    });
    await cacheTicket(ticket.id, saved, { field_progress_pending: false, field_progress_error: undefined, sync_status: 'synced', synced: true });
    notifyTicketsChanged();
    return { ticket: saved, offline: false };
  },

  async recordOffline(input: RecordOfflineInput): Promise<void> {
    const { ticket, actorProfileId, contractorId } = input;
    const action = input.action ?? (input.nextStatus === 'IN_ROUTE' ? 'START' : 'OPEN_CHECKLIST');
    const transition = STATUS_FOR_ACTION[action];
    if (ticket.status !== transition.from) {
      throw new Error(`Ticket is ${ticket.status.toLowerCase().replaceAll('_', ' ')} and cannot complete this action.`);
    }
    if (action === 'OPEN_CHECKLIST' && contractorId !== ticket.assigned_to) {
      throw new Error('Only the assigned assessor can open this field checklist.');
    }
    if (action === 'START' && contractorId !== ticket.assigned_to && contractorId !== ticket.assigned_driver_id) {
      throw new Error('Only the assigned driver or assessor can start this ticket.');
    }
    if (!isValidActor(ticket, contractorId, action)) {
      throw new Error('A matching active dispatched crew is required before field progress can be saved.');
    }

    const queued = await db.ticketFieldProgressQueue
      .where('[actor_profile_id+ticket_id]')
      .equals([actorProfileId, ticket.id])
      .toArray();
    const capturedAt = monotonicCaptureTime(queued);
    const id = `${actorProfileId}:${ticket.id}:${transition.to}`;
    const row: TicketFieldProgressSnapshot = {
      id,
      action,
      actor_profile_id: actorProfileId,
      contractor_id: contractorId,
      ticket_id: ticket.id,
      from_status: transition.from,
      to_status: transition.to,
      team_lead_id: ticket.team_lead_id!,
      crew_id: ticket.crew_id!,
      assigned_to: ticket.assigned_to!,
      assigned_driver_id: ticket.assigned_driver_id!,
      captured_at: capturedAt,
    };

    await db.transaction('rw', db.ticketFieldProgressQueue, db.tickets, async () => {
      const existing = await db.ticketFieldProgressQueue.get(id);
      if (!existing) await db.ticketFieldProgressQueue.add(row);
      const cached = await db.tickets.get(ticket.id);
      const updates: Partial<LocalTicket> = {
        status: transition.to,
        synced: false,
        sync_status: 'pending',
        field_progress_pending: true,
        field_progress_error: undefined,
        updated_at: capturedAt,
      };
      if (cached) await db.tickets.put({ ...cached, ...updates });
      else await db.tickets.put(localTicket(ticket, updates));
    });
    notifyTicketsChanged();
  },

  async process(actorProfileId: string): Promise<{ failed: number; pending: number; errors: string[] }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const pending = await db.ticketFieldProgressQueue.where('actor_profile_id').equals(actorProfileId).count();
      return { failed: 0, pending, errors: [] };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || authData.user?.id !== actorProfileId) {
      const rows = await db.ticketFieldProgressQueue.where('actor_profile_id').equals(actorProfileId).toArray();
      const message = 'Field progress is saved under a different signed-in account. Sign back in with the account that performed the action.';
      for (const row of rows) {
        await db.ticketFieldProgressQueue.update(row.id, { last_error: message });
        await db.tickets.update(row.ticket_id, { status: row.from_status, field_progress_pending: true, field_progress_error: message, sync_status: 'failed', synced: false });
      }
      if (rows.length) notifyTicketsChanged();
      throw new Error(message);
    }

    const rows = await db.ticketFieldProgressQueue.where('actor_profile_id').equals(actorProfileId).sortBy('captured_at');
    rows.sort((left, right) => {
      const time = left.captured_at.localeCompare(right.captured_at);
      return time || (left.to_status === 'IN_ROUTE' ? -1 : right.to_status === 'IN_ROUTE' ? 1 : 0);
    });
    const errors: string[] = [];
    const blockedTickets = new Set<string>();
    let failed = 0;

    for (const row of rows) {
      if (blockedTickets.has(row.ticket_id)) continue;
      const action = queuedAction(row);
      const expected = STATUS_FOR_ACTION[action];
      try {
        const { data: ticket, error } = await supabase.from('tickets')
          .select('id,status,updated_at,team_lead_id,crew_id,assigned_to,assigned_driver_id')
          .eq('id', row.ticket_id)
          .single();
        if (error || !ticket) throw new Error(error?.message ?? 'Assigned ticket is no longer available.');

        if (ticket.team_lead_id !== row.team_lead_id || ticket.crew_id !== row.crew_id || ticket.assigned_to !== row.assigned_to || ticket.assigned_driver_id !== row.assigned_driver_id) {
          throw new Error('The ticket assignment changed before field progress synced. Ask your team lead to review this action.');
        }

        if (!isAtOrBeyond(ticket.status, action) && ticket.status !== expected.from) {
          throw new Error(`Ticket status changed to ${ticket.status.replaceAll('_', ' ')} before this action synced.`);
        }

        let authoritative: Ticket | undefined;
        if (ticket.status === expected.from) {
          authoritative = await ticketWorkflowRpc<Ticket>('record_ticket_field_action', {
            p_ticket_id: row.ticket_id,
            p_action: action,
          });
          await cacheTicket(row.ticket_id, authoritative, { field_progress_pending: true });
        }

        await db.ticketFieldProgressQueue.delete(row.id);
        const remainingRows = await db.ticketFieldProgressQueue.where('[actor_profile_id+ticket_id]').equals([actorProfileId, row.ticket_id]).toArray();
        const remaining = remainingRows.length > 0;
        await db.tickets.update(row.ticket_id, {
          status: authoritative?.status ?? ticket.status,
          updated_at: authoritative?.updated_at ?? ticket.updated_at ?? undefined,
          field_progress_pending: remaining,
          field_progress_error: undefined,
          sync_status: remaining ? 'pending' : 'synced',
          synced: !remaining,
        });
      } catch (error) {
        failed += 1;
        blockedTickets.add(row.ticket_id);
        const message = error instanceof Error ? error.message : 'Ticket progress could not sync.';
        errors.push(message);
        await db.ticketFieldProgressQueue.update(row.id, { last_error: message });

        // Reflect the latest server state after an assignment, authorization,
        // or transition conflict; keep the queued action visible for resolution.
        const { data: latest } = await supabase.from('tickets')
          .select('id,status,updated_at')
          .eq('id', row.ticket_id)
          .maybeSingle();
        await db.tickets.update(row.ticket_id, {
          status: latest?.status ?? expected.from,
          ...(latest?.updated_at ? { updated_at: latest.updated_at } : {}),
          field_progress_pending: true,
          field_progress_error: message,
          sync_status: 'failed',
          synced: false,
        });
      }
    }

    const pending = await db.ticketFieldProgressQueue.where('actor_profile_id').equals(actorProfileId).count();
    if (rows.length) notifyTicketsChanged();
    return { failed, pending, errors };
  },
};
