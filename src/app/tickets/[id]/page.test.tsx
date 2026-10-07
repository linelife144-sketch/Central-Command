import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTicketById: vi.fn(),
  notFound: vi.fn(),
  replace: vi.fn(),
  options: vi.fn(),
  setTicketDisabled: vi.fn(),
  profile: null as { id: string; role: string } | null,
  canManageTickets: false,
  confirm: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ticket-123' }),
  useRouter: () => ({ replace: mocks.replace }),
  notFound: mocks.notFound,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/services/ticketService', () => ({ ticketService: { getTicketById: mocks.getTicketById, setTicketDisabled: mocks.setTicketDisabled } }));
vi.mock('@/lib/services/ticketAssessmentWorkflow', () => ({ ticketAssessmentWorkflow: { options: mocks.options } }));
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  },
}));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: mocks.profile, can: () => mocks.canManageTickets }) }));
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
  Button: ({ children, onClick, disabled, ...props }: { children: ReactNode; onClick?: () => void; disabled?: boolean; [key: string]: unknown }) => <button onClick={onClick} disabled={disabled} {...props}>{children}</button>,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import TicketDetailPage from './page';

describe('ticket detail fetch errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile = null;
    mocks.canManageTickets = false;
    mocks.confirm.mockReturnValue(true);
    vi.stubGlobal('confirm', mocks.confirm);
    mocks.options.mockResolvedValue({ crews: [], teamLeads: [] });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

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

  it('returns to the tickets list after successfully disabling a ticket', async () => {
    mocks.profile = { id: 'staff-1', role: 'SUPER_ADMIN' };
    mocks.canManageTickets = true;
    const activeTicket = {
      id: 'ticket-123', ticket_number: 'CC-123', utility_client: 'Grid Electric', status: 'ASSIGNED',
      is_important: false, is_deleted: false, created_at: '2026-10-06T12:00:00.000Z',
      geofence_radius_meters: 500, work_description: 'Inspect the service location.',
    };
    mocks.getTicketById.mockResolvedValue(activeTicket);
    mocks.setTicketDisabled.mockResolvedValue({ ...activeTicket, is_deleted: true });
    mocks.confirm.mockReturnValue(true);

    render(<TicketDetailPage />);

    const disableButton = await screen.findByRole('button', { name: 'Disable ticket' });
    fireEvent.click(disableButton);

    await waitFor(() => expect(mocks.setTicketDisabled).toHaveBeenCalledWith('ticket-123', true));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.stringContaining('CC-123'));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/tickets'));
    expect(mocks.getTicketById).toHaveBeenCalledOnce();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('does not disable or navigate away when the confirmation is canceled', async () => {
    mocks.profile = { id: 'staff-1', role: 'SUPER_ADMIN' };
    mocks.canManageTickets = true;
    mocks.getTicketById.mockResolvedValue({
      id: 'ticket-123', ticket_number: 'CC-123', utility_client: 'Grid Electric', status: 'ASSIGNED',
      is_important: false, is_deleted: false, created_at: '2026-10-06T12:00:00.000Z',
      geofence_radius_meters: 500, work_description: 'Inspect the service location.',
    });
    mocks.confirm.mockReturnValue(false);

    render(<TicketDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Disable ticket' }));

    expect(mocks.confirm).toHaveBeenCalledOnce();
    expect(mocks.setTicketDisabled).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('offers restore on a disabled ticket and hides the action from users without edit permission', async () => {
    mocks.profile = { id: 'staff-1', role: 'SUPER_ADMIN' };
    mocks.canManageTickets = true;
    mocks.getTicketById.mockResolvedValue({
      id: 'ticket-123', ticket_number: 'CC-123', utility_client: 'Grid Electric', status: 'ASSIGNED',
      is_important: false, is_deleted: true, created_at: '2026-10-06T12:00:00.000Z',
      geofence_radius_meters: 500, work_description: 'Inspect the service location.',
    });
    mocks.setTicketDisabled.mockResolvedValue({ id: 'ticket-123', is_deleted: false });

    const { rerender } = render(<TicketDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore ticket' }));
    await waitFor(() => expect(mocks.setTicketDisabled).toHaveBeenCalledWith('ticket-123', false));
    expect(mocks.confirm).not.toHaveBeenCalled();

    mocks.canManageTickets = false;
    rerender(<TicketDetailPage />);
    expect(screen.queryByRole('button', { name: 'Disable ticket' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Restore ticket' })).toBeNull();
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
