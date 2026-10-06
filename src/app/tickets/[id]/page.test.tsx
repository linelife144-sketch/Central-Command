import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTicketById: vi.fn(),
  notFound: vi.fn(),
  options: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ticket-123' }),
  notFound: mocks.notFound,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/services/ticketService', () => ({ ticketService: { getTicketById: mocks.getTicketById } }));
vi.mock('@/lib/services/ticketAssessmentWorkflow', () => ({ ticketAssessmentWorkflow: { options: mocks.options } }));
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  },
}));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: null, can: () => false }) }));
vi.mock('@/hooks/useContractorId', () => ({ useContractorId: () => ({ contractorId: null }) }));
vi.mock('@/components/common/layout/PageHeader', () => ({
  PageHeader: ({ title, children }: { title: string; children: ReactNode }) => <header><h1>{title}</h1>{children}</header>,
}));
vi.mock('@/components/features/tickets/TicketStatusBadge', () => ({ TicketStatusBadge: () => null }));
vi.mock('@/components/features/tickets/TicketImportanceBadge', () => ({ TicketImportanceBadge: () => null }));
vi.mock('@/lib/utils/formatters', () => ({ formatDate: () => '', formatAddress: () => '' }));
vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => <div>Loading ticket</div> }));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));
vi.mock('@/components/features/tickets/StatusUpdateFlow', () => ({ StatusUpdateFlow: () => null }));
vi.mock('@/components/features/tickets/UtilityTicketDetails', () => ({ UtilityTicketDetails: () => null }));
vi.mock('@/components/features/tickets/StatusHistoryTimeline', () => ({ StatusHistoryTimeline: () => null }));
vi.mock('@/components/features/tickets/TicketPrintButton', () => ({ TicketPrintButton: () => null }));
vi.mock('@/components/features/tickets/TicketAssessments', () => ({ TicketAssessments: () => null }));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));

import TicketDetailPage from './page';

describe('ticket detail fetch errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.options.mockResolvedValue({ crews: [], teamLeads: [] });
  });

  afterEach(() => cleanup());

  it('shows a retryable network error instead of rendering a 404, then loads the ticket on retry', async () => {
    mocks.getTicketById
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        id: 'ticket-123',
        ticket_number: 'CC-123',
        utility_client: 'Grid Electric',
        status: 'ASSIGNED',
        is_important: false,
        created_at: '2026-10-06T12:00:00.000Z',
        geofence_radius_meters: 500,
        work_description: 'Inspect the service location.',
        address: '100 Main Street',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75001',
      });

    render(<TicketDetailPage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'Unable to connect to the server. Please check your internet connection and try again.',
    );
    expect(mocks.notFound).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ticket CC-123' })).toBeTruthy());
    expect(mocks.getTicketById).toHaveBeenCalledTimes(2);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('renders the 404 only when PostgREST confirms that the ticket query returned no rows', async () => {
    mocks.getTicketById.mockRejectedValue({
      code: 'PGRST116',
      details: 'The result contains 0 rows',
      message: 'JSON object requested, multiple (or no) rows returned',
    });

    render(<TicketDetailPage />);

    await waitFor(() => expect(mocks.notFound).toHaveBeenCalledOnce());
  });
});
