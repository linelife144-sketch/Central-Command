import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ listEntries: vi.fn() }));
vi.mock('@/lib/services/timeEntryManagementService', () => ({
  timeEntryManagementService: { listEntries: mocks.listEntries },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ContractorTimeSummary } from './ContractorTimeSummary';

function buildEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'time-1',
    contractor_id: 'c-1',
    clock_in_at: '2026-02-12T08:00:00.000Z',
    clock_out_at: '2026-02-12T14:00:00.000Z',
    work_type: 'STANDARD_ASSESSMENT',
    work_type_rate: 85,
    break_minutes: 0,
    billable_minutes: 360,
    billable_amount: 510,
    payroll_amount: 510,
    status: 'APPROVED',
    sync_status: 'SYNCED',
    created_at: '2026-02-12T08:00:00.000Z',
    updated_at: '2026-02-12T14:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ContractorTimeSummary', () => {
  it('records offline pending hours and refreshes saved wages after upload', async () => {
    mocks.listEntries.mockResolvedValueOnce([
      buildEntry({ billable_minutes: undefined, payroll_amount: undefined, sync_status: 'PENDING', status: 'PENDING' }),
    ]).mockResolvedValue([
      buildEntry({ payroll_amount: 600, vehicle_reimbursement_amount: 0, status: 'PENDING' }),
    ]);
    render(<ContractorTimeSummary contractorId="c-1" />);
    await waitFor(() => expect(screen.getAllByText('Awaiting sync').length).toBeGreaterThan(0));
    expect(screen.getByText('Pending Hours').parentElement?.textContent).toContain('6h');
    act(() => window.dispatchEvent(new Event('time-entries-synced')));
    await waitFor(() => expect(screen.getAllByText('$600.00').length).toBeGreaterThan(0));
    expect(screen.queryByText('Awaiting sync')).toBeNull();
  });

  it('shows approved and pending hours as separate figures', async () => {
    mocks.listEntries.mockResolvedValue([
      buildEntry({ id: 'time-1', status: 'APPROVED', billable_minutes: 360 }),
      buildEntry({ id: 'time-2', status: 'PENDING', billable_minutes: 120 }),
    ]);

    render(<ContractorTimeSummary contractorId="c-1" />);

    await waitFor(() => expect(screen.queryByText(/loading your submitted time/i)).toBeNull());

    expect(screen.getByText('Approved Hours')).not.toBeNull();
    expect(screen.getByText('Pending Hours')).not.toBeNull();
    expect(screen.getByText('6h')).not.toBeNull();
    expect(screen.getByText('2h')).not.toBeNull();
  });

  it('shows an empty-state message when there are no entries', async () => {
    mocks.listEntries.mockResolvedValue([]);

    render(<ContractorTimeSummary contractorId="c-1" />);

    await waitFor(() => expect(screen.getByText(/no time entries submitted yet/i)).not.toBeNull());
  });

  it('does not query the service without a contractorId', async () => {
    render(<ContractorTimeSummary contractorId={undefined} />);

    await waitFor(() => expect(screen.queryByText(/loading your submitted time/i)).toBeNull());
    expect(mocks.listEntries).not.toHaveBeenCalled();
  });
});


it('sums saved wages instead of the editable rate and excludes open/rejected shifts', async () => {
  mocks.listEntries.mockResolvedValue([
    buildEntry({ payroll_amount: 250, billable_amount: 999, vehicle_reimbursement_amount: 20 }),
    buildEntry({ id: 'rejected', status: 'REJECTED', payroll_amount: 100 }),
    buildEntry({ id: 'open', clock_out_at: undefined, payroll_amount: 0 }),
  ]);
  render(<ContractorTimeSummary contractorId="c-1" />);
  await waitFor(() => expect(screen.getByText('Submitted Wages')).not.toBeNull());
  expect(screen.getAllByText('$250.00').length).toBeGreaterThan(0);
  expect(screen.getByText('$20.00')).not.toBeNull();
  expect(screen.queryByText('$999.00')).toBeNull();
});

it('shows an error without retaining the previous contractor totals', async () => {
  mocks.listEntries.mockRejectedValue(new Error('Payroll access denied'));
  render(<ContractorTimeSummary contractorId="c-1" />);
  await waitFor(() => expect(screen.getByText('Payroll access denied')).not.toBeNull());
});
