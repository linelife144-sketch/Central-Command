import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Ticket } from '@/types';
import { getNavigationUrl, StatusUpdateFlow } from './StatusUpdateFlow';

const mocks = vi.hoisted(() => ({
  refreshAndValidate: vi.fn(),
  updateTicketStatus: vi.fn(),
  loadDraft: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/hooks/useGPSValidation', () => ({ useGPSValidation: () => ({ status: 'ready', refreshAndValidate: mocks.refreshAndValidate }) }));
vi.mock('@/lib/services/ticketService', () => ({ ticketService: { updateTicketStatus: mocks.updateTicketStatus } }));
vi.mock('@/lib/services/ticketAssessmentWorkflow', () => ({ ticketAssessmentWorkflow: { loadDraft: mocks.loadDraft } }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

const ticket = {
  id: 'ticket', ticket_number: 'CC-101', status: 'ASSIGNED', is_important: false,
  address: '123 Main Street', city: 'Shreveport', state: 'LA', zip_code: '71101',
  latitude: 32.5, longitude: -93.7, geofence_radius_meters: 500,
  assigned_to: 'assessor', assigned_driver_id: 'driver', team_lead_id: 'lead', crew_id: 'crew',
  utility_client: 'Grid Electric', created_at: '2026-10-06T10:00:00Z', updated_at: '2026-10-06T10:00:00Z', created_by: 'admin',
} as Ticket;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadDraft.mockResolvedValue(null);
  mocks.updateTicketStatus.mockResolvedValue(true);
  mocks.refreshAndValidate.mockResolvedValue({
    status: 'ready', reading: { latitude: 32.5, longitude: -93.7, accuracy: 8 },
    validation: { gpsValid: true, withinGeofence: true }, lastUpdatedAt: '2026-10-06T10:05:00Z',
  });
});
afterEach(cleanup);

describe('contractor field action footer', () => {
  it('builds Apple Maps and Google Maps directions with the ticket address', () => {
    const apple = new URL(getNavigationUrl(ticket, { userAgent: 'iPhone', platform: 'iPhone' }));
    const google = new URL(getNavigationUrl(ticket, { userAgent: 'Android', platform: 'Linux armv8l' }));
    expect(apple.host).toBe('maps.apple.com');
    expect(apple.searchParams.get('daddr')).toBe('123 Main Street, Shreveport, LA 71101');
    expect(apple.searchParams.get('dirflg')).toBe('d');
    expect(google.host).toBe('www.google.com');
    expect(google.searchParams.get('destination')).toBe('123 Main Street, Shreveport, LA 71101');
    expect(google.searchParams.get('travelmode')).toBe('driving');
  });

  it('persists one GPS-validated start, then opens navigation', async () => {
    const onStatusUpdated = vi.fn();
    const openNavigation = vi.fn();
    render(<StatusUpdateFlow ticket={ticket} userId="profile" contractorId="assessor" canEditAssessment userRole="CONTRACTOR" onStatusUpdated={onStatusUpdated} openNavigation={openNavigation} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(mocks.updateTicketStatus).toHaveBeenCalledTimes(1));
    expect(mocks.updateTicketStatus).toHaveBeenCalledWith('ticket', 'IN_ROUTE', 'profile', 'CONTRACTOR', undefined, {
      latitude: 32.5, longitude: -93.7, accuracy: 8, capturedAt: '2026-10-06T10:05:00Z',
    }, { contractorId: 'assessor' });
    expect(onStatusUpdated).toHaveBeenCalledWith('IN_ROUTE');
    expect(openNavigation).toHaveBeenCalledTimes(1);
    expect(new URL(openNavigation.mock.calls[0][0]).searchParams.get('destination')).toBe('123 Main Street, Shreveport, LA 71101');
  });

  it('does not start when the GPS reading fails the accuracy requirement', async () => {
    mocks.refreshAndValidate.mockResolvedValue({
      status: 'ready', reading: { latitude: 32.5, longitude: -93.7, accuracy: 250 },
      validation: { gpsValid: false, gpsError: 'Location accuracy must be 100 metres or better.' }, lastUpdatedAt: null,
    });
    const openNavigation = vi.fn();
    render(<StatusUpdateFlow ticket={ticket} userId="profile" contractorId="assessor" canEditAssessment userRole="CONTRACTOR" openNavigation={openNavigation} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Location accuracy must be 100 metres or better.'));
    expect(mocks.updateTicketStatus).not.toHaveBeenCalled();
    expect(openNavigation).not.toHaveBeenCalled();
  });

  it('keeps pre-submission legacy COMPLETE work actionable for the assigned assessor', () => {
    render(<StatusUpdateFlow ticket={{ ...ticket, status: 'COMPLETE' }} userId="profile" contractorId="assessor" canEditAssessment userRole="CONTRACTOR" />);

    expect(screen.getByRole('link', { name: 'Open assessment' }).getAttribute('href')).toBe('/tickets/ticket/assessment');
  });

  it('explains when an open ticket has no available field action', () => {
    render(<StatusUpdateFlow ticket={{ ...ticket, status: 'DRAFT' }} userId="profile" contractorId="assessor" canEditAssessment userRole="CONTRACTOR" />);

    expect(screen.queryByText('Contact your team lead for the next step on this ticket.')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
  });
});
