import { supabase } from '@/lib/supabase/client';
import { Ticket, TicketStatus, UserRole } from '@/types';
import { isValidTransition } from '@/lib/utils/statusTransitions';

export const ticketService = {
    async getTickets() {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Ticket[];
    },

    async getTicketById(id: string) {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Ticket;
    },

    async createTicket(ticket: Partial<Ticket>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('tickets') as any)
            .insert([ticket])
            .select()
            .single();

        if (error) throw error;
        return data as Ticket;
    },

    async updateTicket(id: string, updates: Partial<Ticket>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('tickets') as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Ticket;
    },

    async getTicketsByAssignee(assigneeId: string) {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('assigned_to', assigneeId)
            .order('created_at', { ascending: false });

        if (error) throw error;
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
        location?: { latitude: number; longitude: number; accuracy: number }
    ) {
        // 1. Get current status
        const ticket = await this.getTicketById(id);
        const currentStatus = ticket.status;

        // 2. Validate transition
        if (!isValidTransition(currentStatus, newStatus, role)) {
            throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus} for role ${role}`);
        }

        // 3. Start transaction-like update
        // Note: Supabase doesn't support multi-table transactions in a simple client call, 
        // but we can use an Edge Function or just sequential calls for this MVP.

        // Update ticket
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase.from('tickets') as any)
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
                updated_by: userId
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // Log history
        await this.logStatusChange(id, currentStatus, newStatus, userId, changeReason, location);

        return true;
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