import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Ticket } from '@/types';
import { getNavigationUrl, StatusUpdateFlow } from './StatusUpdateFlow';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  recordAction: vi.fn(),
  loadDraft: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/services/ticketFieldProgressWorkflow', () => ({ ticketFieldProgressWorkflow: { recordAction: mocks.recordAction } }));
vi.mock('@/lib/services/ticketAssessmentWorkflow', () => ({ ticketAssessmentWorkflow: { loadDraft: mocks.loadDraft } }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

const ticket = {
  id: 'ticket', ticket_number: 'CC-101', status: 'ASSIGNED', is_important: false,
  address: '123 Main Street', city: 'Shreveport', state: 'LA', zip_code: '71101',
  latitude: 32.5, longitude: -93.7, geofence_radius_meters: 500,
  assigned_to: 'assessor', assigned_driver_id: 'driver', team_lead_id: 'lead', crew_id: 'crew', storm_event_id: 'storm',
  utility_client: 'Grid Electric', created_at: '2026-10-06T10:00:00Z', updated_at: '2026-10-06T10:00:00Z', created_by: 'admin',
} as Ticket;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadDraft.mockResolvedValue(null);
  mocks.recordAction.mockResolvedValue({ ticket: { ...ticket, status: 'IN_ROUTE' }, offline: false });
});
afterEach(cleanup);

describe('contractor field action footer', () => {
  it('builds Apple Maps and Google Maps directions from the ticket address', () => {
    const apple = new URL(getNavigationUrl(ticket, { userAgent: 'iPhone', platform: 'iPhone' }));
    const google = new URL(getNavigationUrl(ticket, { userAgent: 'Android', platform: 'Linux armv8l' }));
    expect(apple.host).toBe('maps.apple.com');
    expect(apple.searchParams.get('daddr')).toBe('123 Main Street, Shreveport, LA 71101');
    expect(apple.searchParams.get('dirflg')).toBe('d');
    expect(google.host).toBe('www.google.com');
    expect(google.searchParams.get('destination')).toBe('123 Main Street, Shreveport, LA 71101');
    expect(google.searchParams.get('travelmode')).toBe('driving');
  });

  it('starts without requesting GPS and reports the saved En Route state', async () => {
    const onStatusUpdated = vi.fn();
    render(<StatusUpdateFlow ticket={ticket} userId="profile" contractorId="assessor" canEditAssessment onStatusUpdated={onStatusUpdated} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start ticket CC-101' }));

    await waitFor(() => expect(mocks.recordAction).toHaveBeenCalledWith({
      ticket, actorProfileId: 'profile', contractorId: 'assessor', action: 'START',
    }));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(onStatusUpdated).toHaveBeenCalledWith('IN_ROUTE');
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Ticket is en route.');
  });

  it('keeps Open navigation as a separate action while en route', () => {
    render(<StatusUpdateFlow ticket={{ ...ticket, status: 'IN_ROUTE' }} userId="profile" contractorId="assessor" canEditAssessment />);
    const link = screen.getByRole('link', { name: 'Open navigation' });
    expect(new URL(link.getAttribute('href')!).searchParams.get('destination')).toBe('123 Main Street, Shreveport, LA 71101');
    expect(screen.getByText(/Open the field checklist when you begin/)).not.toBeNull();
  });

  it('keeps pre-submission legacy COMPLETE work actionable for the assigned assessor', () => {
    render(<StatusUpdateFlow ticket={{ ...ticket, status: 'COMPLETE' }} userId="profile" contractorId="assessor" canEditAssessment />);
    expect(screen.getByRole('link', { name: 'Open assessment' }).getAttribute('href')).toBe('/tickets/ticket/assessment');
  });

  it('explains when an open ticket has no available field action', () => {
    render(<StatusUpdateFlow ticket={{ ...ticket, status: 'DRAFT' }} userId="profile" contractorId="assessor" canEditAssessment />);
    expect(screen.queryByText('Contact your team lead for the next step on this ticket.')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Start ticket CC-101' })).toBeNull();
  });
});
