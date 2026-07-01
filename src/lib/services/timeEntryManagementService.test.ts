import { describe, expect, it, vi } from 'vitest';

import { createTimeEntryManagementService } from './timeEntryManagementService';
import type { LocalTimeEntry } from '../db/dexie';
import type { TimeEntry } from '../../types';

function buildLocalTimeEntry(overrides: Partial<LocalTimeEntry> = {}): LocalTimeEntry {
  return {
    id: 'local-1',
    contractor_id: 'sub-1',
    clock_in_at: '2026-02-12T08:00:00.000Z',
    clock_out_at: '2026-02-12T09:00:00.000Z',
    work_type: 'STANDARD_ASSESSMENT',
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
    work_type: 'STANDARD_ASSESSMENT',
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
