import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getTickets: vi.fn() }));
vi.mock('./ticketService', () => ({ ticketService: { getTickets: mocks.getTickets } }));
vi.mock('./contractorService', () => ({ contractorService: { listContractors: vi.fn() } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
import { dashboardTicketService } from './dashboardTicketService';
beforeEach(() => mocks.getTickets.mockReset());
describe('recent ticket storm scope', () => {
  it('filters before limiting, even when another storm has newer tickets', async () => {
    mocks.getTickets.mockResolvedValue([
      { id: 'b', ticket_number: '002', storm_event_id: 'storm-b', created_at: '2026-10-09', status: 'DRAFT' },
      { id: 'a', ticket_number: '001', storm_event_id: 'storm-a', created_at: '2026-10-08', status: 'DRAFT' },
    ]);
    const rows = await dashboardTicketService.getRecentTickets(1, { stormEventId: 'storm-a' });
    expect(rows.map(row => row.id)).toEqual(['a']);
    expect(mocks.getTickets).toHaveBeenCalledWith({ stormEventId: 'storm-a' });
  });
});
