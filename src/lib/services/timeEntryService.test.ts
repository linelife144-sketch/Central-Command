import { describe, expect, it, vi } from 'vitest';

import { createTimeEntryService } from './timeEntryService';
import type { LocalTimeEntry } from '../db/dexie';
import type { TimeEntry } from '../../types';

function buildTimeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'time-1',
    contractor_id: 'sub-1',
    ticket_id: undefined,
    clock_in_at: '2026-02-12T12:00:00.000Z',
    work_type: 'STANDARD_ASSESSMENT',
    work_type_rate: 100,
    break_minutes: 0,
    status: 'PENDING',
    sync_status: 'SYNCED',
    created_at: '2026-02-12T12:00:00.000Z',
    updated_at: '2026-02-12T12:00:00.000Z',
    ...overrides,
  };
}

function buildLocalTimeEntry(overrides: Partial<LocalTimeEntry> = {}): LocalTimeEntry {
  return {
    id: 'time-local-1',
    contractor_id: 'sub-1',
    clock_in_at: '2026-02-12T12:00:00.000Z',
    work_type: 'STANDARD_ASSESSMENT',
    work_type_rate: 100,
    break_minutes: 0,
    status: 'PENDING',
    synced: false,
    sync_status: 'pending',
    ...overrides,
  };
}

describe('createTimeEntryService', () => {
  it('queues clock-in locally when offline', async () => {
    const queueLocalEntry = vi.fn().mockResolvedValue('time-local-1');

    const service = createTimeEntryService({
      isOnline: () => false,
      now: () => new Date('2026-02-12T12:00:00.000Z'),
      fetchRemoteActiveEntry: vi.fn(),
      insertRemoteEntry: vi.fn(),
      updateRemoteEntry: vi.fn(),
      getLocalActiveEntry: vi.fn().mockResolvedValue(null),
      queueLocalEntry,
    });

    const entry = await service.clockIn({
      contractorId: 'sub-1',
      workType: 'STANDARD_ASSESSMENT',
      workTypeRate: 100,
      breakMinutes: 15,
      location: {
        latitude: 27.95,
        longitude: -82.46,
        accuracy: 20,
      },
    });

    expect(entry.sync_status).toBe('PENDING');
    expect(queueLocalEntry).toHaveBeenCalledTimes(1);
  });

  it('uses remote clock-in when online', async () => {
    const remoteEntry = buildTimeEntry();
    const insertRemoteEntry = vi.fn().mockResolvedValue(remoteEntry);

    const service = createTimeEntryService({
      isOnline: () => true,
      now: () => new Date('2026-02-12T12:00:00.000Z'),
      fetchRemoteActiveEntry: vi.fn(),
      insertRemoteEntry,
      updateRemoteEntry: vi.fn(),
      getLocalActiveEntry: vi.fn().mockResolvedValue(null),
      queueLocalEntry: vi.fn(),
    });

    const entry = await service.clockIn({
      contractorId: 'sub-1',
      workType: 'STANDARD_ASSESSMENT',
      workTypeRate: 100,
      breakMinutes: 0,
      location: {
        latitude: 27.95,
        longitude: -82.46,
      },
    });

    expect(entry.sync_status).toBe('SYNCED');
    expect(insertRemoteEntry).toHaveBeenCalledTimes(1);
  });

  it('queues clock-out updates for pending entries', async () => {
    const queueLocalEntry = vi.fn().mockResolvedValue('time-local-1');
    const updateRemoteEntry = vi.fn();

    const service = createTimeEntryService({
      isOnline: () => true,
      now: () => new Date('2026-02-12T13:00:00.000Z'),
      fetchRemoteActiveEntry: vi.fn(),
      insertRemoteEntry: vi.fn(),
      updateRemoteEntry,
      getLocalActiveEntry: vi.fn().mockResolvedValue(null),
      queueLocalEntry,
    });

    const updated = await service.clockOut({
      entry: buildTimeEntry({ sync_status: 'PENDING' }),
      breakMinutes: 10,
      location: {
        latitude: 27.95,
        longitude: -82.46,
      },
    });

    expect(updated.sync_status).toBe('PENDING');
    expect(updated.total_minutes).toBe(60);
    expect(updated.billable_minutes).toBe(50);
    expect(updateRemoteEntry).not.toHaveBeenCalled();
    expect(queueLocalEntry).toHaveBeenCalledTimes(1);
  });

  it('returns local active entry before remote lookup', async () => {
    const fetchRemoteActiveEntry = vi.fn();

    const service = createTimeEntryService({
      isOnline: () => true,
      now: () => new Date('2026-02-12T12:00:00.000Z'),
      fetchRemoteActiveEntry,
      insertRemoteEntry: vi.fn(),
      updateRemoteEntry: vi.fn(),
      getLocalActiveEntry: vi.fn().mockResolvedValue(buildLocalTimeEntry()),
      queueLocalEntry: vi.fn(),
    });

    const activeEntry = await service.getActiveEntry('sub-1');

    expect(activeEntry?.id).toBe('time-local-1');
    expect(fetchRemoteActiveEntry).not.toHaveBeenCalled();
  });
});
