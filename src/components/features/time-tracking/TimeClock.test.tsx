import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VehicleClaimShift } from '@/lib/db/dexie';
import type { TimeEntry } from '@/types';

const mocks = vi.hoisted(() => ({ profileId: 'profile-1', contractorId: 'contractor-1', load: vi.fn(), markSubmitted: vi.fn(), getActiveEntry: vi.fn(), getLastCompletedEntry: vi.fn(), rate: vi.fn(), tickets: vi.fn() }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { id: mocks.profileId } }) }));
vi.mock('@/hooks/useContractorId', () => ({ useContractorId: () => ({ contractorId: mocks.contractorId, isLoading: false }) }));
vi.mock('@/hooks/useGPSValidation', () => ({ useGPSValidation: () => ({ reading: { accuracy: null }, status: 'idle' }) }));
vi.mock('@/lib/services/timeEntryService', () => ({ timeEntryService: { getActiveEntry: mocks.getActiveEntry }, getLastCompletedEntry: mocks.getLastCompletedEntry, vehicleShiftQueue: { load: mocks.load, markSubmitted: mocks.markSubmitted } }));
vi.mock('@/lib/services/payrollService', () => ({ payrollService: { getContractorRateProfile: mocks.rate } }));
vi.mock('@/lib/services/ticketService', () => ({ ticketService: { getTicketsByAssignee: mocks.tickets } }));
vi.mock('@/components/features/time-tracking/WorkTypeSelector', () => ({ WorkTypeSelector: () => <div>Work type</div> }));
vi.mock('@/components/common/forms/PhotoCapture', () => ({ PhotoCapture: () => <div>Clock photo</div> }));
vi.mock('@/components/features/payroll/VehicleReimbursementCapture', () => ({ VehicleReimbursementCapture: ({ entry, onSubmitted }: { entry: VehicleClaimShift; onSubmitted: () => void }) => <button onClick={onSubmitted}>Submit shift {entry.id}</button> }));
// A native select test double keeps these tests focused on the real queue/state transitions.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children, disabled }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode; disabled?: boolean }) => {
    const trigger = React.Children.toArray(children)[0] as React.ReactElement<{ id?: string }>;
    return <select id={trigger.props.id} value={value} disabled={disabled} onChange={event => onValueChange(event.target.value)}>{children}</select>;
  },
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { TimeClock } from './TimeClock';
function shift(id: string, overrides: Partial<VehicleClaimShift> = {}): VehicleClaimShift {
  return { id, contractor_id: mocks.contractorId, clock_in_at: '2026-10-01T08:00:00Z', clock_out_at: '2026-10-01T16:00:00Z', calculation_version: 'AGREEMENT', vehicle_minutes: 120, billable_minutes: 480, vehicle_allowance_amount: 10, sync_status: 'SYNCED', ...overrides };
}
function completed(): TimeEntry { return { ...shift('latest'), payroll_amount: 600, total_minutes: 480, work_type: 'TRAVEL', work_type_rate: 75, break_minutes: 0, status: 'PENDING', created_at: '', updated_at: '' }; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { resolve, promise }; }

beforeEach(() => {
  mocks.profileId = 'profile-1'; mocks.contractorId = 'contractor-1';
  mocks.getActiveEntry.mockResolvedValue(null); mocks.getLastCompletedEntry.mockResolvedValue(completed());
  mocks.rate.mockResolvedValue({ workTypeRates: { TRAVEL: 75 }, driverEligible: false });
  mocks.tickets.mockResolvedValue([]); mocks.markSubmitted.mockResolvedValue(undefined);
  mocks.load.mockResolvedValue({ entries: [shift('older'), shift('oldest')], online: true });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('TimeClock unclaimed vehicle shifts', () => {
  it('shows earlier eligible shifts separately from the latest completed wage summary and selects the intended shift', async () => {
    render(<TimeClock />);
    await screen.findByLabelText('Reimbursement shift');
    expect(screen.getByText('Last Completed Entry')).toBeTruthy();
    expect(screen.getByText('$600.00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit shift older' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Reimbursement shift'), { target: { value: 'oldest' } });
    expect(screen.getByRole('button', { name: 'Submit shift oldest' })).toBeTruthy();
    expect(mocks.load).toHaveBeenCalledWith({ profileId: 'profile-1', contractorId: 'contractor-1' });
  });
  it('removes only the submitted shift, refreshes claims and leaves the completed wage summary visible', async () => {
    const changed = vi.fn(); render(<TimeClock onEntriesChanged={changed} />);
    await screen.findByRole('button', { name: 'Submit shift older' });
    mocks.load.mockResolvedValueOnce({ entries: [shift('oldest')], online: true });
    fireEvent.click(screen.getByRole('button', { name: 'Submit shift older' }));
    await screen.findByRole('button', { name: 'Submit shift oldest' });
    expect(mocks.markSubmitted).toHaveBeenCalledWith({ profileId: 'profile-1', contractorId: 'contractor-1' }, 'older');
    expect(screen.getByText('$600.00')).toBeTruthy(); expect(changed).toHaveBeenCalled();
  });
  it('clears stale candidates on failure, offers retry and preserves a selected eligible shift on later sync', async () => {
    render(<TimeClock />); await screen.findByLabelText('Reimbursement shift');
    fireEvent.change(screen.getByLabelText('Reimbursement shift'), { target: { value: 'oldest' } });
    act(() => window.dispatchEvent(new Event('time-entries-synced')));
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
    expect((screen.getByLabelText('Reimbursement shift') as HTMLSelectElement).value).toBe('oldest');
    mocks.load.mockRejectedValueOnce(new Error('network unavailable'));
    act(() => window.dispatchEvent(new Event('time-entries-synced')));
    await screen.findByText(/Unable to load reimbursement shifts/);
    expect(screen.queryByRole('button', { name: /Submit shift/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry reimbursement shifts' }));
    await screen.findByRole('button', { name: 'Submit shift older' });
  });
  it('shows queued and offline shifts as unavailable until online synchronization', async () => {
    mocks.load.mockResolvedValueOnce({ entries: [shift('queued', { sync_status: 'PENDING' })], online: false });
    render(<TimeClock />);
    await screen.findByText(/This shift is queued for sync/);
    expect(screen.queryByRole('button', { name: /Submit shift/ })).toBeNull();
    mocks.load.mockResolvedValue({ entries: [shift('queued')], online: true });
    act(() => window.dispatchEvent(new Event('online')));
    await screen.findByRole('button', { name: 'Submit shift queued' });
    mocks.load.mockResolvedValue({ entries: [shift('queued')], online: false });
    act(() => window.dispatchEvent(new Event('offline')));
    await screen.findByText(/Connect to the internet to submit/);
    expect(screen.queryByRole('button', { name: /Submit shift/ })).toBeNull();
  });
  it('ignores prior-actor async results immediately after the verified actor changes', async () => {
    const slow = deferred<{ entries: VehicleClaimShift[]; online: boolean }>();
    mocks.load.mockReturnValueOnce(slow.promise);
    const view = render(<TimeClock />);
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
    mocks.profileId = 'profile-2'; mocks.contractorId = 'contractor-2';
    mocks.getLastCompletedEntry.mockResolvedValue(null);
    mocks.load.mockResolvedValueOnce({ entries: [shift('actor-2')], online: true });
    view.rerender(<TimeClock />);
    await screen.findByRole('button', { name: 'Submit shift actor-2' });
    await act(async () => { slow.resolve({ entries: [shift('prior-actor', { contractor_id: 'contractor-1' })], online: true }); await slow.promise; });
    expect(screen.queryByRole('button', { name: 'Submit shift prior-actor' })).toBeNull();
    expect(screen.queryByText('$600.00')).toBeNull();
  });
  it('ignores an older overlapping UI refresh after a newer authoritative empty result', async () => {
    const slow = deferred<{ entries: VehicleClaimShift[]; online: boolean }>();
    mocks.load.mockReturnValueOnce(slow.promise);
    render(<TimeClock />); await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
    mocks.load.mockResolvedValueOnce({ entries: [], online: true });
    act(() => window.dispatchEvent(new Event('time-entries-synced')));
    await screen.findByText('No unclaimed vehicle shifts.');
    await act(async () => { slow.resolve({ entries: [shift('stale')], online: true }); await slow.promise; });
    expect(screen.queryByRole('button', { name: 'Submit shift stale' })).toBeNull();
  });
});

describe('completed wage read actor isolation', () => {
  it('ignores a previous actor completed-summary response after switching profiles', async () => {
    const slow = deferred<TimeEntry>();
    mocks.getLastCompletedEntry.mockReturnValueOnce(slow.promise);
    const view = render(<TimeClock />);
    await waitFor(() => expect(mocks.getLastCompletedEntry).toHaveBeenCalledTimes(1));
    mocks.profileId = 'profile-2'; mocks.contractorId = 'contractor-2';
    mocks.getLastCompletedEntry.mockResolvedValueOnce(null);
    mocks.load.mockResolvedValueOnce({ entries: [], online: true });
    view.rerender(<TimeClock />);
    await screen.findByText('No unclaimed vehicle shifts.');
    await act(async () => { slow.resolve(completed()); await slow.promise; });
    expect(screen.queryByText('Last Completed Entry')).toBeNull();
  });
});
