import { describe, expect, it, vi } from 'vitest';
import * as module from './timeEntryService';
import type { LocalTimeEntry, VehicleClaimShift } from '../db/dexie';

const scope = { profileId: 'profile-1', contractorId: 'contractor-1' };
function shift(id: string, overrides: Record<string, unknown> = {}): VehicleClaimShift & { is_deleted?: boolean } {
  return { id, contractor_id: scope.contractorId, clock_in_at: '2026-10-01T08:00:00Z', clock_out_at: '2026-10-01T16:00:00Z',
    calculation_version: 'AGREEMENT', vehicle_minutes: 120, vehicle_allowance_amount: 10, billable_minutes: 480, sync_status: 'SYNCED' as const, ...overrides };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function localShift(id: string, overrides: Partial<LocalTimeEntry> = {}): LocalTimeEntry {
  return { ...shift(id), work_type: 'TRAVEL', work_type_rate: 75, break_minutes: 0, status: 'PENDING', synced: false, sync_status: 'pending', ...overrides };
}
function setup(overrides: NonNullable<Parameters<typeof module.createVehicleShiftQueue>[0]> = {}) {
  const cache = new Map<string, import('../db/dexie').VehicleShiftCache>();
  const key = (actor: typeof scope) => `${actor.profileId}:${actor.contractorId}`;
  const dependencies = {
    isOnline: () => true,
    fetchClosedShifts: vi.fn().mockResolvedValue([shift('latest'), shift('older')]),
    fetchClaimedShiftIds: vi.fn().mockResolvedValue(['latest']),
    readLocalShifts: vi.fn().mockResolvedValue([]),
    readCache: async (actor: typeof scope) => cache.get(key(actor)),
    writeCache: async (value: import('../db/dexie').VehicleShiftCache) => { cache.set(key({ profileId: value.viewer_profile_id, contractorId: value.contractor_id }), value); },
  };
  return { service: module.createVehicleShiftQueue({ ...dependencies, ...overrides }), dependencies, cache, key };
}

describe('vehicle reimbursement shift queue', () => {
  it('recovers an earlier unclaimed shift when the newest is claimed', async () => {
    const { service } = setup();
    expect((await service.load(scope)).entries.map(row => row.id)).toEqual(['older']);
  });
  it('uses each saved shift eligibility and excludes open, deleted, unrelated and all claimed statuses', async () => {
    const { service } = setup({ fetchClosedShifts: async () => [
      shift('legacy-driver', { calculation_version: 'LEGACY', contractor_role: 'DRIVER', vehicle_minutes: 0 }),
      shift('recorded-assessor', { contractor_role: 'DAMAGE_ASSESSER' }),
      shift('legacy-assessor', { calculation_version: 'LEGACY', contractor_role: 'DAMAGE_ASSESSER' }),
      shift('no-use', { vehicle_minutes: 0 }), shift('open', { clock_out_at: undefined }),
      shift('deleted', { is_deleted: true }), shift('other', { contractor_id: 'other' }),
      shift('pending-claim'), shift('approved-claim'), shift('rejected-claim'),
    ], fetchClaimedShiftIds: async () => ['pending-claim', 'approved-claim', 'rejected-claim'] });
    expect((await service.load(scope)).entries.map(row => row.id)).toEqual(['legacy-driver', 'recorded-assessor']);
  });
  it('replaces online cache with an empty authoritative snapshot without resurrecting synced local rows offline', async () => {
    let online = true;
    const { service, dependencies } = setup({ isOnline: () => online, readLocalShifts: async () => [localShift('older', { synced: true, sync_status: 'synced' })] });
    await service.load(scope);
    dependencies.fetchClosedShifts.mockResolvedValueOnce([]);
    await service.load(scope);
    online = false;
    expect((await service.load(scope)).entries).toEqual([]);
  });
  it('keeps offline cached rows scoped to the viewer and contractor and includes unsynced vehicle-use rows without rewriting them', async () => {
    let online = true;
    const pending = localShift('queued', { clock_out_at: '2026-10-02T16:00:00Z', sync_status: 'pending', synced: false, vehicle_minutes: undefined, activity_intervals: [{ id: 'interval-1', kind: 'VEHICLE_USE', start_at: '2026-10-01T09:00:00Z', end_at: '2026-10-01T11:00:00Z' }], clock_out_photo_file: new Blob(['photo']), work_type: 'TRAVEL', work_type_rate: 500, break_minutes: 0, status: 'PENDING' });
    const { service, dependencies } = setup({ isOnline: () => online, readLocalShifts: async (actor: typeof scope) => actor.profileId === scope.profileId ? [pending] : [] });
    await service.load(scope);
    online = false;
    const result = await service.load(scope);
    expect(result.online).toBe(false);
    expect(result.entries.map(row => [row.id, row.sync_status])).toEqual([['queued', 'PENDING'], ['older', 'SYNCED']]);
    expect((await service.load({ ...scope, profileId: 'profile-2' })).entries).toEqual([]);
    expect((await service.load({ ...scope, contractorId: 'contractor-2' })).entries).toEqual([]);
    expect(pending.clock_out_photo_file).toBeInstanceOf(Blob);
    expect(dependencies.fetchClosedShifts).toHaveBeenCalledTimes(1);
  });
  it('stores only capture-required fields, never payroll, utility billing, photos or activity blobs', async () => {
    const { service, cache } = setup({ fetchClosedShifts: async () => [shift('older', { payroll_amount: 1000, pay_segments: [{ wage_amount: 1000 }], utility_bill_amount: 4000, clock_out_photo_file: new Blob(['secret']), activity_intervals: [] })] });
    await service.load(scope);
    const stored = [...cache.values()][0].entries[0];
    for (const field of ['payroll_amount', 'work_type_rate', 'pay_segments', 'utility_bill_amount', 'utility_bill_rate_applied', 'clock_out_photo_file', 'activity_intervals']) expect(stored).not.toHaveProperty(field);
    expect(stored.vehicle_allowance_amount).toBe(10);
  });
  it('propagates remote claim errors for a visible retry without treating cached rows as a successful refresh', async () => {
    const { service, dependencies } = setup();
    await service.load(scope);
    dependencies.fetchClaimedShiftIds.mockRejectedValueOnce(new Error('claim read failed'));
    await expect(service.load(scope)).rejects.toThrow('claim read failed');
    expect((await service.load(scope)).entries.map(row => row.id)).toEqual(['older']);
  });
  it('removes only the submitted shift and persists the exclusion across offline reloads and stale online reads', async () => {
    let online = true;
    const { service } = setup({ isOnline: () => online, fetchClaimedShiftIds: async () => [] });
    await service.load(scope);
    await service.markSubmitted(scope, 'older');
    expect((await service.load(scope)).entries.map(row => row.id)).toEqual(['latest']);
    online = false;
    expect((await service.load(scope)).entries.map(row => row.id)).toEqual(['latest']);
  });
  it('does not allow an older overlapping refresh to overwrite a newer cache snapshot', async () => {
    let online = true;
    const slow = deferred<ReturnType<typeof shift>[]>();
    const { service, dependencies } = setup({ isOnline: () => online, fetchClaimedShiftIds: async () => [] });
    dependencies.fetchClosedShifts.mockReturnValueOnce(slow.promise).mockResolvedValueOnce([]);
    const stale = service.load(scope);
    await vi.waitFor(() => expect(dependencies.fetchClosedShifts).toHaveBeenCalledTimes(1));
    await service.load(scope);
    slow.resolve([shift('old')]);
    await stale;
    online = false;
    expect((await service.load(scope)).entries).toEqual([]);
  });
});

describe('vehicle queue persistence ordering', () => {
  it('keeps a newer empty refresh authoritative even when an earlier cache write is delayed', async () => {
    let online = true;
    const release = deferred<void>();
    let stored: import('../db/dexie').VehicleShiftCache | undefined;
    let writeCount = 0;
    const { service, dependencies } = setup({ isOnline: () => online, fetchClaimedShiftIds: async () => [],
      readCache: async () => stored,
      writeCache: async value => { ++writeCount; if (writeCount === 1) await release.promise; stored = value; },
    });
    const older = service.load(scope);
    await vi.waitFor(() => expect(writeCount).toBe(1));
    dependencies.fetchClosedShifts.mockResolvedValueOnce([]);
    const newer = service.load(scope);
    await vi.waitFor(() => expect(dependencies.fetchClosedShifts).toHaveBeenCalledTimes(2));
    release.resolve();
    await Promise.all([older, newer]);
    online = false;
    expect((await service.load(scope)).entries).toEqual([]);
  });
});
