import { describe, expect, it } from 'vitest';
import { summarizeTickets, type PersonalTicket } from './contractorDashboardService';
import { getContractorTicketStatus } from '@/lib/utils/statusUpdateFlow';

function ticket(id: string, status: string): PersonalTicket {
  return {
    id,
    ticket_number: `CC-${id}`,
    status: status as PersonalTicket['status'],
    address: '1 Main St',
    city: 'Shreveport',
    state: 'LA',
    utility_client: 'Grid Electric',
    due_date: null,
    updated_at: '2026-10-06T12:00:00Z',
    is_important: false,
    storm_event_id: null,
    team_lead_id: null,
    crew_id: null,
  };
}

describe('contractor ticket summary', () => {
  it('counts submitted work as closed and returned corrections as open', () => {
    const rows = [
      ticket('1', 'ASSIGNED'),
      ticket('2', 'IN_ROUTE'),
      ticket('3', 'ON_SITE'),
      ticket('4', 'COMPLETE'),
      ticket('5', 'NEEDS_REWORK'),
      ticket('6', 'PENDING_REVIEW'),
      ticket('7', 'APPROVED'),
      ticket('8', 'CLOSED'),
    ];

    const summary = summarizeTickets(rows);
    expect(summary.open).toBe(5);
    expect(summary.closed).toBe(3);
    expect(summary.needsRework).toBe(1);
    expect(summary.recent.map(row => row.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(rows.map(row => getContractorTicketStatus(row.status))).toEqual([
      'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN', 'CLOSED', 'CLOSED', 'CLOSED',
    ]);
  });
});
