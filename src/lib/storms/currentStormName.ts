import { resolveAdminActiveStormEvent, stormEventService, type StormEventSummary } from '@/lib/services/stormEventService';
import { ticketService } from '@/lib/services/ticketService';

const CLOSED_TICKET_STATUSES = new Set(['CLOSED', 'ARCHIVED', 'EXPIRED']);

export async function loadCurrentStormName(portal: 'admin' | 'contractor', contractorId?: string): Promise<string | null> {
  if (portal === 'admin') {
    return (await stormEventService.getAdminActiveStormEvent())?.name ?? null;
  }

  if (!contractorId) {
    return null;
  }

  const tickets = await ticketService.getTicketsByAssignee(contractorId);
  const stormIds = [...new Set(tickets
    .filter(ticket => ticket.storm_event_id && !CLOSED_TICKET_STATUSES.has(ticket.status.toUpperCase()))
    .map(ticket => ticket.storm_event_id as string))];
  const events = (await Promise.all(stormIds.map(id => stormEventService.getStormEventById(id))))
    .filter((event): event is StormEventSummary => event !== null);

  return resolveAdminActiveStormEvent(events)?.name ?? null;
}
