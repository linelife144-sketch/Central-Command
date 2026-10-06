import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  ticket: { id: 'ticket', ticket_number: 'CC-101', status: 'IN_ROUTE', assigned_to: 'assessor' } as Record<string, unknown>,
  recordAction: vi.fn(),
  profile: { id: 'profile', role: 'CONTRACTOR', first_name: 'Alex' },
  can: vi.fn(() => false),
}));

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'ticket' }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/common/layout/PageHeader', () => ({ PageHeader: (props: { title: string; description: string }) => <header><h1>{props.title}</h1><p>{props.description}</p></header> }));
vi.mock('@/components/features/assessments', () => ({ AssessmentForm: () => <div data-testid="assessment-form">Editable assessment</div> }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: mocks.profile, can: mocks.can }) }));
vi.mock('@/hooks/useContractorId', () => ({ useContractorId: () => ({ contractorId: 'assessor' }) }));
vi.mock('@/lib/services/ticketService', () => ({ ticketService: { getTicketById: vi.fn(async () => ({ ...mocks.ticket })) } }));
vi.mock('@/lib/services/ticketFieldProgressWorkflow', () => ({ ticketFieldProgressWorkflow: { recordAction: mocks.recordAction } }));

import TicketAssessmentPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile = { id: 'profile', role: 'CONTRACTOR', first_name: 'Alex' };
  mocks.ticket = { id: 'ticket', ticket_number: 'CC-101', status: 'IN_ROUTE', assigned_to: 'assessor' };
});
afterEach(cleanup);

describe('direct field checklist navigation', () => {
  it('records On Site before displaying the editable assessment form', async () => {
    let resolveAction!: (value: { ticket: Record<string, unknown>; offline: boolean }) => void;
    mocks.recordAction.mockReturnValueOnce(new Promise(resolve => { resolveAction = resolve; }));
    render(<TicketAssessmentPage />);

    await waitFor(() => expect(mocks.recordAction).toHaveBeenCalledWith({
      ticket: mocks.ticket,
      actorProfileId: 'profile',
      contractorId: 'assessor',
      action: 'OPEN_CHECKLIST',
    }));
    expect(screen.getByRole('status').textContent).toMatch(/Recording arrival/);
    expect(screen.queryByTestId('assessment-form')).toBeNull();

    await act(async () => {
      resolveAction({ ticket: { ...mocks.ticket, status: 'ON_SITE' }, offline: false });
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('assessment-form')).not.toBeNull());
  });

  it('requires the contractor to start an Assigned ticket first', async () => {
    mocks.ticket.status = 'ASSIGNED';
    render(<TicketAssessmentPage />);

    expect(await screen.findByText('Start the ticket before opening its field checklist.')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Go to Ticket work' }).getAttribute('href')).toBe('/tickets/ticket/work');
    expect(mocks.recordAction).not.toHaveBeenCalled();
    expect(screen.queryByTestId('assessment-form')).toBeNull();
  });
});
