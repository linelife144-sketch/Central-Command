import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Ticket } from '@/types';
import { TicketFieldActionButton } from './TicketFieldActionButton';

const mocks = vi.hoisted(() => ({ push: vi.fn(), recordAction: vi.fn(), toastSuccess: vi.fn(), toastError: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/services/ticketFieldProgressWorkflow', () => ({ ticketFieldProgressWorkflow: { recordAction: mocks.recordAction } }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

const rejectedTicket = {
  id: 'ticket-rejected', ticket_number: '2026100102', status: 'REJECTED',
  assigned_to: 'contractor', assigned_driver_id: null, crew_id: null, team_lead_id: null,
} as unknown as Ticket;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('legacy rejected ticket entry', () => {
  it('keeps Start visible and opens Ticket work without changing ticket status', () => {
    render(<TicketFieldActionButton ticket={rejectedTicket} actorProfileId="profile" contractorId="contractor" />);

    const start = screen.getByRole('link', { name: 'Start' });
    expect(start.getAttribute('href')).toBe('/tickets/ticket-rejected/work');
    expect(mocks.recordAction).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(rejectedTicket.status).toBe('REJECTED');
  });
});
