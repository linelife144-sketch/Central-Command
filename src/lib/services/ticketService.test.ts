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

describe('retired generic field status updates', () => {
  it('requires Start for contractor En Route updates instead of the old GPS RPC', async () => {
    await expect(ticketService.updateTicketStatus('ticket', 'IN_ROUTE', 'alex', 'CONTRACTOR'))
      .rejects.toThrow('Use Start to set this ticket En Route.');
    expect(ticketWorkflowRpc).not.toHaveBeenCalled();
    expect(remote.notify).not.toHaveBeenCalled();
  });

  it('requires opening the checklist for contractor On Site updates', async () => {
    vi.spyOn(ticketService, 'getTicketById').mockResolvedValueOnce({ id: 'ticket', status: 'IN_ROUTE' } as Ticket);
    await expect(ticketService.updateTicketStatus('ticket', 'ON_SITE', 'alex', 'CONTRACTOR'))
      .rejects.toThrow('Open the field checklist to set this ticket On Site.');
    expect(ticketWorkflowRpc).not.toHaveBeenCalled();
  });

  it('rejects a review approval attempted by a contractor before calling the server', async () => {
    vi.spyOn(ticketService, 'getTicketById').mockResolvedValueOnce({ id: 'ticket', status: 'PENDING_REVIEW' } as Ticket);
    await expect(ticketService.updateTicketStatus('ticket', 'APPROVED', 'alex', 'CONTRACTOR')).rejects.toThrow('Invalid status transition');
    expect(ticketWorkflowRpc).not.toHaveBeenCalled();
    expect(remote.notify).not.toHaveBeenCalled();
  });
});
