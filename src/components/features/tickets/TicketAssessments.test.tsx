import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { TicketAssessments } from './TicketAssessments';
import type { Ticket } from '@/types';

const mocks = vi.hoisted(() => ({ draft: vi.fn(), rows: vi.fn(), submit: vi.fn(), review: vi.fn(), role: 'CONTRACTOR' }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'actor', role: mocks.role }, can: () => mocks.role !== 'CONTRACTOR' }) }));
vi.mock('@/hooks/useContractorId', () => ({ useContractorId: () => ({ contractorId: 'assessor' }) }));
vi.mock('@/lib/services/ticketAssessmentWorkflow', () => ({ ticketAssessmentWorkflow: { loadDraft: mocks.draft, loadAssessments: mocks.rows, submit: mocks.submit, review: mocks.review } }));
vi.mock('@/components/features/assessments/FieldAssessmentSheet', () => ({ FieldAssessmentReadback: () => <p>Saved checklist readback</p> }));

const ticket = { id: 'ticket', ticket_number: 'CC-100', status: 'ON_SITE', assigned_to: 'assessor', team_lead_id: 'lead', review_stage: 'FIELDWORK' } as Ticket;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = 'CONTRACTOR';
  mocks.draft.mockResolvedValue(null);
  mocks.rows.mockResolvedValue([]);
});
afterEach(cleanup);

describe('ticket assessment records', () => {
  it('does not render an empty procedural assessment panel for contractors', async () => {
    const { container } = render(<TicketAssessments ticket={ticket} onChanged={() => {}} />);
    await waitFor(() => expect(screen.queryByText('Loading assessment…')).toBeNull());
    expect(container.querySelector('#assessment')).toBeNull();
    expect(screen.queryByText(/workflow steps|standard operating procedure|field status flow/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /team lead review/i })).toBeNull();
  });

  it('does not claim the ticket has no assessment when persistence cannot be read', async () => {
    mocks.rows.mockRejectedValue(new Error('Assessment access unavailable'));
    render(<TicketAssessments ticket={ticket} onChanged={() => {}} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Assessment access unavailable'));
    expect(screen.queryByText(/Assessment required\./)).toBeNull();
  });

  it('shows a saved draft without exposing submission or staff workflow controls', async () => {
    mocks.draft.mockResolvedValue({ assessment_id: 'revision', field_assessment: {}, photo_evidence: [], saved_at: '2026-10-06T12:00:00Z', dirty: false });
    mocks.submit.mockResolvedValue('SUBMITTED');
    render(<TicketAssessments ticket={ticket} onChanged={() => {}} />);
    await waitFor(() => expect(screen.getByText('Saved checklist readback')).toBeDefined());
    expect(screen.getByText('Saved assessment draft')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Submit for team lead review/i })).toBeNull();
    expect(screen.queryByText(/Review · team lead|Final review · CEO/)).toBeNull();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('shows correction notes when a team lead returns the submitted record', async () => {
    mocks.rows.mockResolvedValue([{ id: 'revision', created_at: '2026-10-06', review_stage: 'NEEDS_REWORK', team_review_notes: 'Please add a pole damage photo.', field_assessment: {}, photo_evidence: [] }]);
    render(<TicketAssessments ticket={{ ...ticket, status: 'NEEDS_REWORK', current_assessment_id: 'revision', review_stage: 'CORRECTIONS' }} onChanged={() => {}} />);
    await waitFor(() => expect(screen.getByText('Please add a pole damage photo.')).toBeDefined());
    expect(screen.getByText('Corrections requested')).toBeDefined();
    expect(screen.queryByText(/workflow steps|Field Status Flow/i)).toBeNull();
  });

  it('keeps final approval controls away from a team lead', async () => {
    mocks.role = 'ADMIN';
    mocks.rows.mockResolvedValue([{ id: 'revision', created_at: '2026-10-06', review_stage: 'FINAL_REVIEW', field_assessment: {}, photo_evidence: [] }]);
    render(<TicketAssessments ticket={{ ...ticket, status: 'PENDING_REVIEW', review_stage: 'FINAL_REVIEW', team_lead_id: 'actor', current_assessment_id: 'revision' }} onChanged={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Final review · CEO/)).toBeDefined());
    expect(screen.queryByRole('button', { name: 'Grant final approval' })).toBeNull();
    expect(screen.queryByText(/four stage|workflow overview/i)).toBeNull();
  });
});
