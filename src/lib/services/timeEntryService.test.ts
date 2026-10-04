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
      stormEventId: 'storm-1',
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
    expect(queueLocalEntry).toHaveBeenCalledWith(expect.objectContaining({ storm_event_id: 'storm-1' }), 'CREATE');
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
      stormEventId: 'storm-1',
      workType: 'STANDARD_ASSESSMENT',
      workTypeRate: 100,
      breakMinutes: 0,
      location: {
        latitude: 27.95,
        longitude: -82.46,
        accuracy: 20,
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
      entry: buildTimeEntry({ sync_status: 'PENDING', storm_event_id: 'storm-1', contractor_role: 'DRIVER', pay_rate_applied: 50 }),
      breakMinutes: 10,
      location: {
        latitude: 27.95,
        longitude: -82.46,
        accuracy: 20,
      },
    });

    expect(updated.sync_status).toBe('PENDING');
    expect(updated.total_minutes).toBe(60);
    expect(updated.billable_minutes).toBe(50);
    expect(queueLocalEntry).toHaveBeenCalledWith(expect.objectContaining({ storm_event_id: 'storm-1', contractor_role: 'DRIVER', pay_rate_applied: 50 }), 'UPDATE');
    expect(updateRemoteEntry).not.toHaveBeenCalled();
    expect(queueLocalEntry).toHaveBeenCalledTimes(1);
  });

  it('clocks out online without writing to GENERATED ALWAYS columns', async () => {
    const updateRemoteEntry = vi.fn().mockResolvedValue(
      buildTimeEntry({
        clock_out_at: '2026-02-12T13:00:00.000Z',
        sync_status: 'SYNCED',
      }),
    );

    const service = createTimeEntryService({
      isOnline: () => true,
      now: () => new Date('2026-02-12T13:00:00.000Z'),
      fetchRemoteActiveEntry: vi.fn(),
      insertRemoteEntry: vi.fn(),
      updateRemoteEntry,
      getLocalActiveEntry: vi.fn().mockResolvedValue(null),
      queueLocalEntry: vi.fn(),
    });

    await service.clockOut({
      entry: buildTimeEntry({ sync_status: 'SYNCED' }),
      breakMinutes: 10,
      location: {
        latitude: 27.95,
        longitude: -82.46,
        accuracy: 20,
      },
    });

    expect(updateRemoteEntry).toHaveBeenCalledTimes(1);
    const [, updatePayload] = updateRemoteEntry.mock.calls[0];

    // total_minutes, billable_minutes, and billable_amount are Postgres
    // GENERATED ALWAYS columns — writing to them causes the update to be
    // rejected by the database. payroll_amount/utility_bill_amount are
    // computed server-side by a trigger and must not be asserted here.
    expect(updatePayload).not.toHaveProperty('total_minutes');
    expect(updatePayload).not.toHaveProperty('billable_minutes');
    expect(updatePayload).not.toHaveProperty('billable_amount');
    expect(updatePayload).not.toHaveProperty('payroll_amount');
    expect(updatePayload).not.toHaveProperty('utility_bill_amount');
    expect(updatePayload).not.toHaveProperty('work_type_rate');
    expect(updatePayload).not.toHaveProperty('contractor_role');

    expect(updatePayload).toMatchObject({
      clock_out_at: '2026-02-12T13:00:00.000Z',
      clock_out_latitude: 27.95,
      clock_out_longitude: -82.46,
      break_minutes: 10,
      sync_status: 'SYNCED',
    });
  });

  it('forwards stormEventId to the remote insert on clock-in', async () => {
    const insertRemoteEntry = vi.fn().mockResolvedValue(buildTimeEntry());

    const service = createTimeEntryService({
      isOnline: () => true,
      now: () => new Date('2026-02-12T12:00:00.000Z'),
      fetchRemoteActiveEntry: vi.fn(),
      insertRemoteEntry,
      updateRemoteEntry: vi.fn(),
      getLocalActiveEntry: vi.fn().mockResolvedValue(null),
      queueLocalEntry: vi.fn(),
    });

    await service.clockIn({
      contractorId: 'sub-1',
      workType: 'STANDARD_ASSESSMENT',
      workTypeRate: 100,
      breakMinutes: 0,
      stormEventId: 'storm-123',
      location: {
        latitude: 27.95,
        longitude: -82.46,
        accuracy: 20,
      },
    });

    expect(insertRemoteEntry).toHaveBeenCalledTimes(1);
    const [insertPayload] = insertRemoteEntry.mock.calls[0];
    expect(insertPayload.storm_event_id).toBe('storm-123');
  });

  it('refuses clock-in without a storm instead of queuing an invalid shift', async () => {
    const service = createTimeEntryService();
    await expect(service.clockIn({ contractorId: 'sub-1', workType: 'STANDARD_ASSESSMENT', workTypeRate: 100,
      breakMinutes: 0, location: { latitude: 27.95, longitude: -82.46, accuracy: 20 } })).rejects.toThrow('assigned ticket');
  });

  it('records a full 16-hour day without clipping or queuing', async () => {
    const updateRemoteEntry = vi.fn().mockResolvedValue(buildTimeEntry({ total_minutes: 960, payroll_amount: 1600 }));
    const queueLocalEntry = vi.fn();
    const service = createTimeEntryService({ now: () => new Date('2026-02-13T04:00:00Z'), isOnline: () => true, updateRemoteEntry, queueLocalEntry });
    const result = await service.clockOut({ entry: buildTimeEntry(), breakMinutes: 0,
      location: { latitude: 27.95, longitude: -82.46, accuracy: 20 } });
    expect(result.total_minutes).toBe(960);
    expect(result.payroll_amount).toBe(1600);
    expect(queueLocalEntry).not.toHaveBeenCalled();
  });

  it('does not disguise a backend validation rejection as an offline success', async () => {
    const queueLocalEntry = vi.fn();
    const service = createTimeEntryService({ isOnline: () => true, insertRemoteEntry: vi.fn().mockRejectedValue({ code: '23514', message: 'Invalid ticket' }), queueLocalEntry });
    await expect(service.clockIn({ contractorId: 'sub-1', stormEventId: 'storm-1', workType: 'STANDARD_ASSESSMENT', workTypeRate: 100,
      breakMinutes: 0, location: { latitude: 27.95, longitude: -82.46, accuracy: 20 } })).rejects.toMatchObject({ code: '23514' });
    expect(queueLocalEntry).not.toHaveBeenCalled();
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
