import { supabase } from '@/lib/supabase/client';
import { Ticket, TicketStatus, UserRole } from '@/types';
import { isValidTransition } from '@/lib/utils/statusTransitions';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { localTestStore } from '@/lib/testing/localTestStore';
import { notifyTicketsChanged } from '@/lib/tickets/events';
import type { LocalTicket } from '@/lib/db/dexie';

type TicketAssignmentColumn = 'crew_id' | 'team_lead_id';

async function getTicketsForAssignment(column: TicketAssignmentColumn, assignmentId: string): Promise<Ticket[]> {
    if (!assignmentId) return [];
    if (isSuperAdminTestingEnabled()) {
        return localTestStore.getTickets().filter(ticket => ticket[column] === assignmentId);
    }

    const { db } = await import('@/lib/db/dexie');
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return (await db.tickets.toArray()).filter(ticket => ticket[column] === assignmentId) as unknown as Ticket[];
    }

    const query = supabase.from('tickets').select('*');
    const result = column === 'crew_id'
        ? await query.eq('crew_id', assignmentId).order('created_at', { ascending: false })
        : await query.eq('team_lead_id', assignmentId).order('created_at', { ascending: false });

    if (result.error) throw result.error;
    const rows = (result.data ?? []) as unknown as Ticket[];
    const { cacheTickets } = await import('@/lib/db/dexie');
    await cacheTickets(rows as unknown as LocalTicket[]);
    return rows;
}

export const ticketService = {
    async getUtilityPayload(id: string): Promise<Record<string, unknown> | null> {
        if (isSuperAdminTestingEnabled()) return localTestStore.getPayload(id);
        const { data, error } = await supabase.from('ticket_payloads').select('payload').eq('ticket_id', id).maybeSingle();
        if (error) throw error;
        return data ? (data as { payload: Record<string, unknown> }).payload : null;
    },

    /**
     * Batched lookup of utility payloads, keyed by ticket id. Used by list
     * views (e.g. the ticket queue) that need a payload-derived field, such
     * as the feeder/circuit number, without issuing one request per row.
     */
    async getUtilityPayloadsByTicketIds(ids: string[]): Promise<Record<string, Record<string, unknown>>> {
        if (ids.length === 0) return {};
        if (isSuperAdminTestingEnabled()) {
            return Object.fromEntries(
                ids.map((id) => [id, localTestStore.getPayload(id)]).filter(([, payload]) => payload !== null) as [string, Record<string, unknown>][]
            );
        }
        const { data, error } = await supabase.from('ticket_payloads').select('ticket_id, payload').in('ticket_id', ids);
        if (error) throw error;
        return Object.fromEntries(
            (data as { ticket_id: string; payload: Record<string, unknown> }[]).map((row) => [row.ticket_id, row.payload])
        );
    },
    async getTickets() {
        if (isSuperAdminTestingEnabled()) return localTestStore.getTickets();
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Ticket[];
    },

    async getTicketsByCrew(crewId: string) {
        return getTicketsForAssignment('crew_id', crewId);
    },

    async getTicketsByTeamLead(teamLeadId: string) {
        return getTicketsForAssignment('team_lead_id', teamLeadId);
    },

    async getTicketById(id: string) {
        if (isSuperAdminTestingEnabled()) return localTestStore.getTicketById(id);
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const {db}=await import('@/lib/db/dexie');
            const cached=await db.tickets.get(id);
            if (!cached) throw new Error('This ticket is not stored on this device. Reconnect to load it.');
            return cached as unknown as Ticket;
        }
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        const {db}=await import('@/lib/db/dexie');
        await db.tickets.put({...data,assigned_to:data.assigned_to??undefined,storm_event_id:data.storm_event_id??undefined,work_description:data.work_description??undefined,latitude:data.latitude??undefined,longitude:data.longitude??undefined,updated_at:data.updated_at??data.created_at??new Date().toISOString(),synced:true,sync_status:'synced'});
        return data as Ticket;
    },

    async createTicket(ticket: Partial<Ticket>) {
        if (isSuperAdminTestingEnabled()) { const created = localTestStore.createTicket(ticket); notifyTicketsChanged(); return created; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('tickets') as any)
            .insert([ticket])
            .select()
            .single();

        if (error) throw error;
        notifyTicketsChanged();
        return data as Ticket;
    },

    async updateTicket(id: string, updates: Partial<Ticket>) {
        if (isSuperAdminTestingEnabled()) { const updated = localTestStore.updateTicket(id, updates); notifyTicketsChanged(); return updated; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('tickets') as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        notifyTicketsChanged();
        return data as Ticket;
    },

    async setTicketDisabled(id: string, disabled: boolean): Promise<Ticket> {
        const { data, error } = await supabase.rpc('set_ticket_disabled', {
            p_ticket_id: id,
            p_disabled: disabled,
        });
        if (error) throw error;
        if (!data) throw new Error('Ticket was not returned after the update.');
        notifyTicketsChanged();
        return data as Ticket;
    },

    async assignTicket(id: string, contractorId: string): Promise<Ticket> {
        if (!contractorId) throw new Error('Select a contractor.');
        if (isSuperAdminTestingEnabled()) { const updated = localTestStore.assignTicket(id, contractorId); notifyTicketsChanged(); return updated; }
        const ticket = await this.getTicketById(id);
        // Roster membership and storm compensation must be saved before ticket assignment.
        return this.updateTicket(id, {
            assigned_to: contractorId,
            status: ticket.status === 'DRAFT' ? 'ASSIGNED' : ticket.status,
            updated_at: new Date().toISOString(),
        });
    },

    async getTicketsByAssignee(assigneeId: string) {
        if (isSuperAdminTestingEnabled()) {
            return localTestStore.getTickets().filter((ticket) => ticket.assigned_to === assigneeId);
        }
        const { db } = await import('@/lib/db/dexie');
        if (typeof navigator !== 'undefined' && !navigator.onLine) return await db.tickets.filter(t=>t.assigned_to===assigneeId||t.assigned_driver_id===assigneeId).toArray() as unknown as Ticket[];
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .or(`assigned_to.eq.${assigneeId},assigned_driver_id.eq.${assigneeId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        await db.tickets.bulkPut((data??[]).map(ticket=>({...ticket,updated_at:ticket.updated_at??ticket.created_at??new Date().toISOString(),assigned_to:ticket.assigned_to??undefined,storm_event_id:ticket.storm_event_id??undefined,work_description:ticket.work_description??undefined,latitude:ticket.latitude??undefined,longitude:ticket.longitude??undefined,synced:true,sync_status:'synced' as const})));
        return data as Ticket[];
    },

    /**
     * Updates a ticket status and logs the change in history.
     */
    async updateTicketStatus(
        id: string,
        newStatus: TicketStatus,
        userId: string,
        role: UserRole,
        changeReason?: string,
        location?: { latitude: number; longitude: number; accuracy: number; capturedAt?: string },
    ) {
        // 1. Get current status
        const ticket = await this.getTicketById(id);
        const currentStatus = ticket.status;

        // 2. Validate transition
        if (!isValidTransition(currentStatus, newStatus, role)) {
            throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus} for role ${role}`);
        }

        if (newStatus === 'IN_ROUTE' || newStatus === 'ON_SITE') {
            throw new Error(newStatus === 'IN_ROUTE'
                ? 'Use Start to set this ticket En Route.'
                : 'Open the field checklist to set this ticket On Site.');
        }

        if (isSuperAdminTestingEnabled()) {
            localTestStore.updateTicketStatus(id, newStatus, userId, changeReason, location);
            notifyTicketsChanged();
            return true;
        }

        void location;
        throw new Error('This ticket status must be changed through its dedicated workflow action.');
    },

    /**
     * Logs a status change in the history table.
     */
    async logStatusChange(
        ticketId: string,
        fromStatus: TicketStatus | null,
        toStatus: TicketStatus,
        changedBy: string,
        changeReason?: string,
        location?: { latitude: number; longitude: number; accuracy: number }
    ) {
        if (isSuperAdminTestingEnabled()) {
            localTestStore.logStatusChange(ticketId, fromStatus, toStatus, changedBy, changeReason, location);
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('ticket_status_history') as any)
            .insert([{
                ticket_id: ticketId,
                from_status: fromStatus,
                to_status: toStatus,
                changed_by: changedBy,
                change_reason: changeReason,
                gps_latitude: location?.latitude,
                gps_longitude: location?.longitude,
                gps_accuracy: location?.accuracy,
                changed_at: new Date().toISOString()
            }]);

        if (error) throw error;
    },

    /**
     * Fetches status history for a specific ticket.
     */
    async getStatusHistory(ticketId: string) {
        if (isSuperAdminTestingEnabled()) return localTestStore.getStatusHistory(ticketId);
        const { data, error } = await supabase
            .from('ticket_status_history')
            .select(`
                *,
                profiles:changed_by (
                    first_name,
                    last_name
                )
            `)
            .eq('ticket_id', ticketId)
            .order('changed_at', { ascending: false });

        if (error) throw error;
        return data;
    }
};
