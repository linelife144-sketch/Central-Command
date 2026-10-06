import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DashboardDispatch } from './DashboardDispatch';

const mockTickets = [
  {
    id: 'ticket-1',
    ticket_number: 'TK-1001',
    status: 'DRAFT',
    utility_client: 'Pacific Power',
    address: '100 Main St',
    city: 'Portland',
    state: 'OR',
    zip_code: '97201',
    is_important: false,
    team_lead_id: null,
    crew_id: null,
    created_at: '2026-10-06T10:00:00Z',
    geofence_radius_meters: 500,
  },
  {
    id: 'ticket-2',
    ticket_number: 'TK-1002',
    status: 'ASSIGNED',
    utility_client: 'Energy Corp',
    address: '200 Oak Ave',
    city: 'Salem',
    state: 'OR',
    zip_code: '97301',
    is_important: true,
    team_lead_id: 'lead-1',
    crew_id: null,
    created_at: '2026-10-06T11:00:00Z',
    geofence_radius_meters: 500,
  },
];

const mockOptions = {
  teamLeads: [{ id: 'lead-1', name: 'Commander Shepherd' }],
  crews: [
    {
      id: 'crew-1',
      name: 'Alpha Crew',
      teamLeadId: 'lead-1',
      driverId: 'drv-1',
      assessorId: 'ass-1',
      driverName: 'Driver Bob',
      assessorName: 'Assessor Alice',
    },
  ],
  workers: [
    { id: 'drv-2', name: 'Driver Dan', role: 'DRIVER' },
    { id: 'ass-2', name: 'Assessor Ann', role: 'DAMAGE_ASSESSER' },
  ],
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    profile: { id: 'admin-1', role: 'SUPER_ADMIN' },
    can: (perm: string) => true,
  }),
}));

vi.mock('@/lib/services/ticketService', () => ({
  ticketService: {
    getTickets: vi.fn().mockImplementation(async () => mockTickets),
  },
}));

vi.mock('@/lib/services/ticketAssessmentWorkflow', () => ({
  ticketAssessmentWorkflow: {
    options: vi.fn().mockImplementation(async () => mockOptions),
    assignLead: vi.fn().mockResolvedValue({}),
    assignCrew: vi.fn().mockResolvedValue({}),
    createCrew: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DashboardDispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading and dispatch queue', async () => {
    render(<DashboardDispatch />);

    expect(screen.getByRole('heading', { name: /team & crew dispatch/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('TK-1001')).toBeTruthy();
      expect(screen.getByText('TK-1002')).toBeTruthy();
    });
  });

  it('shows filter pills with ticket counts', async () => {
    render(<DashboardDispatch />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all \(2\)/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /needs lead \(1\)/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /needs crew \(1\)/i })).toBeTruthy();
    });
  });

  it('displays selected ticket details and assignment status', async () => {
    render(<DashboardDispatch />);

    await waitFor(() => {
      // First ticket is auto-selected
      expect(screen.getByRole('heading', { name: /ticket TK-1001/i })).toBeTruthy();
      expect(screen.getByText(/awaiting team lead/i)).toBeTruthy();
    });
  });

  it('switches selected ticket on click', async () => {
    render(<DashboardDispatch />);

    await waitFor(() => {
      expect(screen.getByText('TK-1002')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('TK-1002'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ticket TK-1002/i })).toBeTruthy();
      expect(screen.getAllByText('Commander Shepherd').length).toBeGreaterThan(0);
    });
  });
});
