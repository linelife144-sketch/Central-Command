import { describe, expect, it, vi } from 'vitest';

import { createTimeEntryManagementService, mapRemoteRowToTimeEntry } from './timeEntryManagementService';
import type { LocalTimeEntry } from '../db/dexie';
import type { Database } from '../../types/database';
import type { TimeEntry } from '../../types';

function buildLocalTimeEntry(overrides: Partial<LocalTimeEntry> = {}): LocalTimeEntry {
  return {
    id: 'local-1',
    contractor_id: 'sub-1',
    clock_in_at: '2026-02-12T08:00:00.000Z',
    clock_out_at: '2026-02-12T09:00:00.000Z',
    work_type: 'Working',
    work_type_rate: 95,
    break_minutes: 0,
    status: 'PENDING',
    synced: false,
    sync_status: 'pending',
    ...overrides,
  };
}

function buildTimeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'time-1',
    contractor_id: 'sub-1',
    clock_in_at: '2026-02-12T08:00:00.000Z',
    clock_out_at: '2026-02-12T09:00:00.000Z',
    work_type: 'Working',
    work_type_rate: 95,
    break_minutes: 0,
    status: 'PENDING',
    sync_status: 'SYNCED',
    created_at: '2026-02-12T08:00:00.000Z',
    updated_at: '2026-02-12T09:00:00.000Z',
    ...overrides,
  };
}

describe('createTimeEntryManagementService', () => {
  it('keeps offline personal entries in their persisted storm and contractor scope', async () => {
    const service = createTimeEntryManagementService({ isOnline: () => false, getLocalEntries: vi.fn().mockResolvedValue([
      buildLocalTimeEntry({ id: 'alpha', storm_event_id: 'storm-a' }),
      buildLocalTimeEntry({ id: 'bravo', storm_event_id: 'storm-b' }),
    ]) });
    expect((await service.listEntries({ contractorId: 'sub-1', stormEventId: 'storm-a' })).map(row => row.id)).toEqual(['alpha']);
  });
  it('reports unavailable management time offline instead of an empty successful list', async () => {
    const service = createTimeEntryManagementService({ isOnline: () => false });
    await expect(service.listEntries({ stormEventId: 'storm-a' })).rejects.toThrow(/connection/i);
  });
  it('caches worker snapshots and keeps a queued clock-out visible over an open server shift', async () => {
    const cacheRemoteEntries = vi.fn().mockResolvedValue(undefined);
    const remote = buildTimeEntry({ id: 'queued', clock_out_at: undefined });
    const local = buildLocalTimeEntry({ id: 'queued', payroll_amount: undefined });
    const service = createTimeEntryManagementService({
      isOnline: () => true,
      fetchRemoteEntries: vi.fn().mockResolvedValue([remote]),
      cacheRemoteEntries,
      getLocalEntries: vi.fn().mockResolvedValue([
        local, buildLocalTimeEntry({ id: 'other-worker', contractor_id: 'other' }),
      ]),
    });
    const result = await service.listEntries({ contractorId: 'sub-1' });
    expect(cacheRemoteEntries).toHaveBeenCalledWith('sub-1', [remote]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'queued', clock_out_at: local.clock_out_at, sync_status: 'PENDING' });
  });

  it('keeps a successful remote payroll response when local storage fails', async () => {
    const remote = buildTimeEntry({ payroll_amount: 123 });
    const service = createTimeEntryManagementService({
      isOnline: () => true,
      fetchRemoteEntries: vi.fn().mockResolvedValue([remote]),
      cacheRemoteEntries: vi.fn().mockRejectedValue(new Error('Quota exceeded')),
      getLocalEntries: vi.fn().mockRejectedValue(new Error('Database unavailable')),
    });
    expect(await service.listEntries({ contractorId: 'sub-1' })).toEqual([remote]);
  });

  it('loads contractor entries from local cache while offline', async () => {
    const service = createTimeEntryManagementService({
      isOnline: () => false,
      fetchRemoteEntries: vi.fn(),
      reviewRemoteEntry: vi.fn(),
      getLocalEntries: vi
        .fn()
        .mockResolvedValue([
          buildLocalTimeEntry({ id: 'local-2', clock_in_at: '2026-02-12T10:00:00.000Z', status: 'APPROVED' }),
          buildLocalTimeEntry({ id: 'local-1', clock_in_at: '2026-02-12T08:00:00.000Z', status: 'PENDING' }),
        ]),
    });

    const entries = await service.listEntries({
      contractorId: 'sub-1',
      status: 'PENDING',
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe('local-1');
    expect(entries[0]?.status).toBe('PENDING');
  });

  it('uses remote entries when online', async () => {
    const remoteEntries = [
      {
        ...buildTimeEntry({ id: 'remote-1' }),
        ticket_number: 'GES-260245',
        contractor_name: 'John Smith',
      },
    ];
    const fetchRemoteEntries = vi.fn().mockResolvedValue(remoteEntries);

    const service = createTimeEntryManagementService({
      isOnline: () => true,
      fetchRemoteEntries,
      reviewRemoteEntry: vi.fn(),
      getLocalEntries: vi.fn(),
    });

    const entries = await service.listEntries({ status: 'ALL' });

    expect(fetchRemoteEntries).toHaveBeenCalledWith({ status: 'ALL' });
    expect(entries[0]?.id).toBe('remote-1');
    expect(entries[0]?.ticket_number).toBe('GES-260245');
  });

  it('falls back to local entries when remote list fails for contractor view', async () => {
    const getLocalEntries = vi.fn().mockResolvedValue([
      buildLocalTimeEntry({ id: 'local-fallback', status: 'PENDING' }),
    ]);

    const service = createTimeEntryManagementService({
      isOnline: () => true,
      fetchRemoteEntries: vi.fn().mockRejectedValue(new Error('network error')),
      reviewRemoteEntry: vi.fn(),
      getLocalEntries,
    });

    const entries = await service.listEntries({ contractorId: 'sub-1' });

    expect(getLocalEntries).toHaveBeenCalledWith('sub-1');
    expect(entries[0]?.id).toBe('local-fallback');
  });

  it('rejects review actions when offline', async () => {
    const service = createTimeEntryManagementService({
      isOnline: () => false,
      fetchRemoteEntries: vi.fn(),
      getLocalEntries: vi.fn(),
      reviewRemoteEntry: vi.fn(),
    });

    await expect(
      service.reviewEntry({
        entryId: 'time-1',
        reviewerId: 'admin-1',
        decision: 'APPROVED',
      }),
    ).rejects.toThrow('internet connection');
  });

  it('requires rejection reason when rejecting time entries', async () => {
    const reviewRemoteEntry = vi.fn();
    const service = createTimeEntryManagementService({
      isOnline: () => true,
      fetchRemoteEntries: vi.fn(),
      getLocalEntries: vi.fn(),
      reviewRemoteEntry,
    });

    await expect(
      service.reviewEntry({
        entryId: 'time-1',
        reviewerId: 'admin-1',
        decision: 'REJECTED',
      }),
    ).rejects.toThrow('Rejection reason is required');

    expect(reviewRemoteEntry).not.toHaveBeenCalled();
  });

  it('submits remote review actions when online', async () => {
    const reviewRemoteEntry = vi.fn().mockResolvedValue(
      buildTimeEntry({
        status: 'APPROVED',
        reviewed_by: 'admin-1',
        reviewed_at: '2026-02-12T12:00:00.000Z',
      }),
    );

    const service = createTimeEntryManagementService({
      isOnline: () => true,
      fetchRemoteEntries: vi.fn(),
      getLocalEntries: vi.fn(),
      reviewRemoteEntry,
    });

    const reviewedEntry = await service.reviewEntry({
      entryId: 'time-1',
      reviewerId: 'admin-1',
      decision: 'APPROVED',
    });

    expect(reviewRemoteEntry).toHaveBeenCalledWith({
      entryId: 'time-1',
      reviewerId: 'admin-1',
      decision: 'APPROVED',
    });
    expect(reviewedEntry.status).toBe('APPROVED');
  });
});


describe('time-review snapshot mapping', () => {
  it('keeps server costing snapshots, including zero values', () => {
    const row = { ...buildTimeEntry(), storm_event_id: 'storm-1', contractor_role: 'DRIVER', pay_rate_applied: 50, payroll_amount: 200, utility_bill_rate_applied: 0, utility_bill_amount: 0 } as unknown as Database['public']['Tables']['time_entries']['Row'];
    expect(mapRemoteRowToTimeEntry(row)).toMatchObject({ storm_event_id: 'storm-1', contractor_role: 'DRIVER', pay_rate_applied: 50, payroll_amount: 200 });
    expect(mapRemoteRowToTimeEntry(row)).not.toHaveProperty('utility_bill_amount');
  });
  it('preserves saved snapshots when using the offline cache', async () => {
    const service = createTimeEntryManagementService({ isOnline: () => false, fetchRemoteEntries: vi.fn(), reviewRemoteEntry: vi.fn(), getLocalEntries: vi.fn().mockResolvedValue([buildLocalTimeEntry({ payroll_amount: 200, storm_event_id: 'storm-1' })]) });
    expect((await service.listEntries({ contractorId: 'sub-1' }))[0]).toMatchObject({ payroll_amount: 200, storm_event_id: 'storm-1' });
  });
});
