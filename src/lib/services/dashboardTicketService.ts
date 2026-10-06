import { contractorService } from '@/lib/services/contractorService';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { localTestStore } from '@/lib/testing/localTestStore';
import { ticketService } from '@/lib/services/ticketService';
import type { Ticket } from '@/types';
import { getStaffTicketStatusLabel } from '@/lib/utils/statusUpdateFlow';

export interface DashboardTicketRow {
  id: string;
  ticketNumber: string;
  location: string;
  status: string;
  assignedTo: string;
  dueAt: string;
}

export const dashboardTicketService = {
  async getRecentTickets(limit = 8): Promise<DashboardTicketRow[]> {
    const ticketRows = await ticketService.getTickets() as Array<Ticket & { is_deleted?: boolean | null }>;
    const tickets = ticketRows.filter(ticket => !ticket.is_deleted)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    const recent = tickets.slice(0, limit);
    const assigneeName = new Map<string, string>();
    if (isSuperAdminTestingEnabled()) {
      for (const contractor of localTestStore.listContractors()) assigneeName.set(contractor.id, contractor.displayName);
    } else {
      const assignedIds = new Set(recent.map(ticket => ticket.assigned_to).filter((id): id is string => Boolean(id)));
      if (assignedIds.size) {
        const contractors = await contractorService.listContractors();
        for (const contractor of contractors) {
          if (assignedIds.has(contractor.id)) assigneeName.set(contractor.id, contractor.fullName);
        }
      }
    }
    return recent.map((ticket: Ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      location: [ticket.address, ticket.city, ticket.state].filter(Boolean).join(', '),
      status: getStaffTicketStatusLabel(ticket.status, ticket.review_stage, ticket.utility_submitted_at),
      assignedTo: ticket.assigned_to ? assigneeName.get(ticket.assigned_to) ?? 'Contractor assigned' : 'Unassigned',
      dueAt: ticket.due_date ? new Date(ticket.due_date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—',
    }));
  },
};
