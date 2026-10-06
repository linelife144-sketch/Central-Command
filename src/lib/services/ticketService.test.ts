import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ticketService } from './ticketService';
import { ticketWorkflowRpc } from './ticketAssessmentWorkflow';
import type { Ticket } from '@/types';

const remote = vi.hoisted(() => ({ from: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: remote.from } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
vi.mock('@/lib/tickets/events', () => ({ notifyTicketsChanged: remote.notify }));
vi.mock('./ticketAssessmentWorkflow', () => ({ ticketWorkflowRpc: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ticketService, 'getTicketById').mockResolvedValue({ id: 'ticket', status: 'ASSIGNED' } as Ticket);
});

describe('guarded field status updates', () => {
  const gps = { latitude: 30.2, longitude: -92.1, accuracy: 12, capturedAt: '2026-10-06T15:00:00Z' };

  it('does not publish a success event when the server rejects the transition', async () => {
    vi.mocked(ticketWorkflowRpc).mockRejectedValueOnce(new Error('not saved'));

    await expect(ticketService.updateTicketStatus('ticket', 'IN_ROUTE', 'alex', 'CONTRACTOR', undefined, gps, { contractorId: 'crew-1' })).rejects.toThrow('not saved');
    expect(ticketWorkflowRpc).toHaveBeenCalledWith('update_ticket_field_status', {
      p_ticket_id: 'ticket', p_status: 'IN_ROUTE', p_latitude: gps.latitude, p_longitude: gps.longitude, p_accuracy: gps.accuracy,
    });
    expect(remote.notify).not.toHaveBeenCalled();
  });

  it('publishes only after the guarded server transition succeeds', async () => {
    vi.mocked(ticketWorkflowRpc).mockResolvedValueOnce(true);

    await expect(ticketService.updateTicketStatus('ticket', 'IN_ROUTE', 'alex', 'CONTRACTOR', undefined, gps, { contractorId: 'crew-1' })).resolves.toBe(true);
    expect(ticketWorkflowRpc).toHaveBeenCalledOnce();
    expect(remote.notify).toHaveBeenCalledOnce();
  });

  it('rejects a review approval attempted by a contractor before calling the server', async () => {
    vi.spyOn(ticketService, 'getTicketById').mockResolvedValueOnce({ id: 'ticket', status: 'PENDING_REVIEW' } as Ticket);

    await expect(ticketService.updateTicketStatus('ticket', 'APPROVED', 'alex', 'CONTRACTOR')).rejects.toThrow('Invalid status transition');
    expect(ticketWorkflowRpc).not.toHaveBeenCalled();
    expect(remote.notify).not.toHaveBeenCalled();
  });
});
