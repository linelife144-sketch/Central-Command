import { describe, expect, it, vi } from 'vitest';
import { createTimeEntryUploadQueue } from './timeEntryUploadQueue';
import type { LocalTimeEntry } from '../db/dexie';
const entry = (id: string, start: string, owner = 'worker'): LocalTimeEntry => ({ id, contractor_id: owner, clock_in_at: start,
  work_type: 'TRAVEL', work_type_rate: 65, break_minutes: 0, status: 'PENDING', synced: false, sync_status: 'pending' });
describe('time-entry sync', () => {
  it('syncs only the signed-in worker, in chronological order, with persisted snapshots', async () => {
    const saveRemote = vi.fn().mockResolvedValue({ payroll_amount: 1300, overtime_minutes: 480 });
    const markSynced = vi.fn();
    const queue = createTimeEntryUploadQueue({ isOnline: () => true, getOwnContractorId: async () => 'worker',
      getPending: async () => [entry('later', '2026-10-02'), entry('other', '2026-10-01', 'another'), entry('earlier', '2026-10-01')], saveRemote, markSynced });
    expect(await queue.process()).toEqual({ uploaded: 2, failed: 0 });
    expect(saveRemote.mock.calls.map(([e]) => e.id)).toEqual(['earlier', 'later']);
    expect(markSynced).toHaveBeenCalledWith(expect.anything(), { payroll_amount: 1300, overtime_minutes: 480 });
  });
  it('stops on an earlier validation failure so later shifts cannot consume the wrong overtime allowance', async () => {
    const saveRemote = vi.fn().mockRejectedValue(new Error('Ticket rejected')); const markFailed = vi.fn();
    const queue = createTimeEntryUploadQueue({ isOnline: () => true, getOwnContractorId: async () => 'worker',
      getPending: async () => [entry('first', '2026-10-01'), entry('second', '2026-10-02')], saveRemote, markFailed });
    expect(await queue.process()).toEqual({ uploaded: 0, failed: 1 });
    expect(saveRemote).toHaveBeenCalledTimes(1); expect(markFailed).toHaveBeenCalledWith('first', 'Ticket rejected');
  });
  it('does not upload while offline or signed out', async () => {
    const getPending = vi.fn();
    const offline = createTimeEntryUploadQueue({ isOnline: () => false, getPending });
    expect(await offline.process()).toEqual({ uploaded: 0, failed: 0 }); expect(getPending).not.toHaveBeenCalled();
    const signedOut = createTimeEntryUploadQueue({ isOnline: () => true, getOwnContractorId: async () => null, getPending });
    expect(await signedOut.process()).toEqual({ uploaded: 0, failed: 0 }); expect(getPending).not.toHaveBeenCalled();
  });
});
