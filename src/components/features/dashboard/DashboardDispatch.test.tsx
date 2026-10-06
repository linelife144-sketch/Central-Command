import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContractorDispatchTicket } from '@/lib/services/contractorDashboardService';

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.params }));
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: { id: 'contractor-profile', role: 'CONTRACTOR' } }),
}));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props}>{children}</h2>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));
vi.mock('@/components/ui/input', () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock('@/components/features/tickets/TicketStatusBadge', () => ({ TicketStatusBadge: ({ status }: { status: string }) => <span>{status}</span> }));
vi.mock('@/lib/utils/formatters', () => ({ formatAddress: (...parts: string[]) => parts.filter(Boolean).join(', ') }));

import { DashboardDispatch, getActiveAssignedDispatchTickets } from './DashboardDispatch';

const tickets: ContractorDispatchTicket[] = [
  {
    id: 'ticket-1', ticket_number: 'CC-101', status: 'ASSIGNED', address: '1 Main St', city: 'Dallas', state: 'TX',
    utility_client: 'Grid Electric', due_date: null, updated_at: '2026-10-06T10:00:00Z', is_important: false,
    storm_event_id: 'storm-1', team_lead_id: 'lead-1', crew_id: 'crew-1', teamLeadName: 'Team Lead One',
    crewName: 'Crew One', driverName: 'Driver One', assessorName: 'Assessor One',
  },
  {
    id: 'ticket-2', ticket_number: 'CC-102', status: 'ASSIGNED', address: '2 Oak St', city: 'Austin', state: 'TX',
    utility_client: 'Grid Electric', due_date: null, updated_at: '2026-10-06T11:00:00Z', is_important: true,
    storm_event_id: 'storm-1', team_lead_id: 'lead-2', crew_id: 'crew-2', teamLeadName: 'Team Lead Two',
    crewName: 'Crew Two', driverName: 'Driver Two', assessorName: 'Assessor Two',
  },
];

describe('DashboardDispatch on the contractor dashboard', () => {
  beforeEach(() => {
    mocks.params = new URLSearchParams();
  });

  afterEach(() => cleanup());

  it('selects the ticket from the dashboard deep link and shows its team and crew read-only', async () => {
    mocks.params = new URLSearchParams('dispatchTicketId=ticket-2');
    render(<DashboardDispatch tickets={tickets} />);

    expect(screen.getByText('Team Lead Two')).toBeTruthy();
    expect(screen.getByText('Crew Two')).toBeTruthy();
    expect(screen.getByText('Driver Two')).toBeTruthy();
    expect(screen.getByText('Assessor Two')).toBeTruthy();
    expect(screen.queryByText('Assign team lead')).toBeNull();
    expect(screen.queryByText('Assign crew')).toBeNull();
    expect(screen.queryByText('Create a crew')).toBeNull();
  });

  it('shows an empty state when the contractor has no active tickets', () => {
    render(<DashboardDispatch tickets={[]} />);

    expect(screen.getByText(/team and crew details will appear here when a ticket is assigned to you/i)).toBeTruthy();
  });

  it('filters out closed tickets from the contractor dispatch queue', () => {
    expect(getActiveAssignedDispatchTickets([
      ...tickets,
      { ...tickets[0], id: 'closed-ticket', ticket_number: 'CC-103', status: 'CLOSED' },
    ]).map(ticket => ticket.id)).toEqual(['ticket-1', 'ticket-2']);
  });

  it('does not silently show a different assignment for an unavailable deep-link ticket', () => {
    mocks.params = new URLSearchParams('dispatchTicketId=not-assigned-to-this-contractor');
    render(<DashboardDispatch tickets={tickets} />);

    expect(screen.getByText(/that ticket is not part of your assigned work/i)).toBeTruthy();
    expect(screen.queryByText('Team Lead One')).toBeNull();
    expect(screen.queryByText('Team Lead Two')).toBeNull();
  });
});