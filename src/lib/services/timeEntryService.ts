import { v4 as uuid } from 'uuid';
import { uploadClockPhoto, clockPhotoPath } from '../compensation/clockPhotos';
import { changeTimeInterval, closeTimeIntervals, breakMinutesFromIntervals, type TimeInterval } from '../compensation/validation';
import { TIME_ENTRY_WAGE_COLUMNS, type WageTimeEntryRow } from '../compensation/timeEntryProjection';
import {
  db,
  queueTimeEntry,
  type LocalSyncStatus,
  type LocalTimeEntry,
  type VehicleClaimShift,
  type VehicleShiftCache,
  type SyncQueueOperation,
} from '../db/dexie';
import { APP_CONFIG } from '../config/appConfig';
import { timeEntrySchema, validateGPS, validateTimeEntryDuration } from '../utils/validators';
import { calculateBillableMinutes } from '../utils/timeTracking';
import type { TimeEntry, WorkType, SyncStatus, TimeEntryStatus } from '../../types';
import type { Database } from '../../types/database';

type RemoteTimeEntryRow = WageTimeEntryRow;
type RemoteTimeEntryInsert = Database['public']['Tables']['time_entries']['Insert'];
type RemoteTimeEntryUpdate = Database['public']['Tables']['time_entries']['Update'];

interface ClockLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface ClockInRequest {
  contractorId: string;
  workType: WorkType;
  workTypeRate: number;
  breakMinutes: number;
  ticketId?: string;
  stormEventId?: string;
  location: ClockLocation;
  photoFile?: File;
}

export interface ClockOutRequest {
  entry: TimeEntry;
  breakMinutes: number;
  location: ClockLocation;
  photoFile?: File;
}

interface TimeEntryServiceDependencies {
  isOnline: () => boolean;
  now: () => Date;
  uploadPhoto: typeof uploadClockPhoto;
  fetchRemoteActiveEntry: (contractorId: string) => Promise<TimeEntry | null>;
  insertRemoteEntry: (payload: RemoteTimeEntryInsert) => Promise<TimeEntry>;
  updateRemoteEntry: (id: string, updates: RemoteTimeEntryUpdate) => Promise<TimeEntry>;
  queueLocalEntry: (entry: LocalTimeEntry, operation: SyncQueueOperation) => Promise<string>;
  getLocalActiveEntry: (contractorId: string) => Promise<LocalTimeEntry | null>;
}

function toSyncStatus(value: LocalSyncStatus): SyncStatus {
  if (value === 'synced') {
    return 'SYNCED';
  }

  if (value === 'failed') {
    return 'FAILED';
  }

  return 'PENDING';
}

function toLocalSyncStatus(value: SyncStatus): LocalSyncStatus {
  if (value === 'SYNCED') {
    return 'synced';
  }

  if (value === 'FAILED') {
    return 'failed';
  }

  return 'pending';
}

function mapRemoteRowToTimeEntry(row: RemoteTimeEntryRow): TimeEntry {
  return {
    id: row.id,
    contractor_id: row.contractor_id,
    ticket_id: row.ticket_id ?? undefined,
    storm_event_id: row.storm_event_id ?? undefined,
    clock_in_at: row.clock_in_at,
    clock_in_latitude: row.clock_in_latitude ?? undefined,
    clock_in_longitude: row.clock_in_longitude ?? undefined,
    clock_in_accuracy: row.clock_in_accuracy ?? undefined,
    clock_out_at: row.clock_out_at ?? undefined,
    clock_out_latitude: row.clock_out_latitude ?? undefined,
    clock_out_longitude: row.clock_out_longitude ?? undefined,
    clock_out_accuracy: row.clock_out_accuracy ?? undefined,
    work_type: row.work_type as WorkType,
    work_type_rate: row.work_type_rate,
    total_minutes: row.calculation_version === 'AGREEMENT' && row.clock_out_at ? (Date.parse(row.clock_out_at) - Date.parse(row.clock_in_at)) / 60000 : row.total_minutes ?? undefined,
    break_minutes: row.break_minutes ?? 0,
    billable_minutes: row.paid_minutes_exact ?? row.billable_minutes ?? undefined,
    billable_amount: row.billable_amount ?? undefined,
    status: row.status as TimeEntryStatus,
    reviewed_by: row.reviewed_by ?? undefined,
    reviewed_at: row.reviewed_at ?? undefined,
    rejection_reason: row.rejection_reason ?? undefined,
    invoice_id: row.invoice_id ?? undefined,
    sync_status: (row.sync_status as SyncStatus) ?? 'SYNCED',
    created_at: row.created_at ?? row.clock_in_at,
    updated_at: row.updated_at ?? row.created_at ?? row.clock_in_at,
    // Payroll/billing snapshot — written by the private.apply_time_entry_costing()
    // trigger. Surfaced for display only; never recomputed client-side.
    contractor_role: row.contractor_role ?? undefined,
    pay_rate_applied: row.pay_rate_applied ?? undefined,
    clock_in_photo_url: row.clock_in_photo_url ?? undefined,
    clock_out_photo_url: row.clock_out_photo_url ?? undefined,
    payroll_amount: row.payroll_amount ?? undefined,
    activity_intervals: (row.activity_intervals ?? []) as unknown as TimeEntry['activity_intervals'],
    pay_segments: (row.pay_segments ?? []) as unknown as TimeEntry['pay_segments'],
    paid_minutes_exact: row.paid_minutes_exact ?? undefined,
    vehicle_minutes: row.vehicle_minutes ?? undefined,
    vehicle_allowance_amount: row.vehicle_allowance_amount ?? undefined,
    calculation_version: row.calculation_version,
    regular_minutes: row.regular_minutes ?? undefined,
    overtime_minutes: row.overtime_minutes ?? undefined,
    regular_pay_amount: row.regular_pay_amount ?? undefined,
    overtime_pay_amount: row.overtime_pay_amount ?? undefined,
    overtime_rate_applied: row.overtime_rate_applied ?? undefined,
  };
}

function mapLocalEntryToTimeEntry(entry: LocalTimeEntry): TimeEntry {
  const createdAt = entry.created_at ?? new Date().toISOString();
  const updatedAt = entry.updated_at ?? createdAt;

  return {
    id: entry.id,
    contractor_id: entry.contractor_id,
    ticket_id: entry.ticket_id,
    clock_in_at: entry.clock_in_at,
    clock_in_latitude: entry.clock_in_latitude,
    clock_in_longitude: entry.clock_in_longitude,
    clock_in_accuracy: entry.clock_in_accuracy,
    clock_in_photo_url: entry.clock_in_photo_url,
    clock_in_photo_file: entry.clock_in_photo_file,
    clock_out_photo_file: entry.clock_out_photo_file,
    clock_out_at: entry.clock_out_at,
    clock_out_latitude: entry.clock_out_latitude,
    clock_out_longitude: entry.clock_out_longitude,
    clock_out_accuracy: entry.clock_out_accuracy,
    clock_out_photo_url: entry.clock_out_photo_url,
    work_type: entry.work_type as WorkType,
    work_type_rate: entry.work_type_rate,
    break_minutes: entry.break_minutes,
    storm_event_id: entry.storm_event_id,
    contractor_role: entry.contractor_role,
    pay_rate_applied: entry.pay_rate_applied,
    payroll_amount: entry.payroll_amount,
    activity_intervals: entry.activity_intervals,
    pay_segments: entry.pay_segments,
    paid_minutes_exact: entry.paid_minutes_exact,
    vehicle_minutes: entry.vehicle_minutes,
    vehicle_allowance_amount: entry.vehicle_allowance_amount,
    calculation_version: entry.calculation_version,
    overtime_rate_applied: entry.overtime_rate_applied,
    overtime_pay_amount: entry.overtime_pay_amount,
    regular_pay_amount: entry.regular_pay_amount,
    overtime_minutes: entry.overtime_minutes,
    regular_minutes: entry.regular_minutes,
    status: entry.status as TimeEntryStatus,
    sync_status: toSyncStatus(entry.sync_status),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function mapTimeEntryToLocalEntry(entry: TimeEntry): LocalTimeEntry {
  return {
    id: entry.id,
    contractor_id: entry.contractor_id,
    ticket_id: entry.ticket_id,
    clock_in_at: entry.clock_in_at,
    clock_in_latitude: entry.clock_in_latitude,
    clock_in_longitude: entry.clock_in_longitude,
    clock_in_accuracy: entry.clock_in_accuracy,
    clock_in_photo_url: entry.clock_in_photo_url,
    clock_in_photo_file: entry.clock_in_photo_file,
    clock_out_photo_file: entry.clock_out_photo_file,
    clock_out_at: entry.clock_out_at,
    clock_out_latitude: entry.clock_out_latitude,
    clock_out_longitude: entry.clock_out_longitude,
    clock_out_accuracy: entry.clock_out_accuracy,
    clock_out_photo_url: entry.clock_out_photo_url,
    work_type: entry.work_type,
    work_type_rate: entry.work_type_rate,
    break_minutes: entry.break_minutes,
    storm_event_id: entry.storm_event_id,
    contractor_role: entry.contractor_role,
    pay_rate_applied: entry.pay_rate_applied,
    payroll_amount: entry.payroll_amount,
    activity_intervals: entry.activity_intervals,
    pay_segments: entry.pay_segments,
    paid_minutes_exact: entry.paid_minutes_exact,
    vehicle_minutes: entry.vehicle_minutes,
    vehicle_allowance_amount: entry.vehicle_allowance_amount,
    calculation_version: entry.calculation_version,
    overtime_rate_applied: entry.overtime_rate_applied,
    overtime_pay_amount: entry.overtime_pay_amount,
    regular_pay_amount: entry.regular_pay_amount,
    overtime_minutes: entry.overtime_minutes,
    regular_minutes: entry.regular_minutes,
    status: entry.status,
    synced: entry.sync_status === 'SYNCED',
    sync_status: toLocalSyncStatus(entry.sync_status),
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  };
}

function createEntryId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return uuid();
}

function buildClockInEntry(request: ClockInRequest, nowIso: string): TimeEntry {
  return {
    id: createEntryId(),
    contractor_id: request.contractorId,
    ticket_id: request.ticketId,
    storm_event_id: request.stormEventId,
    clock_in_at: nowIso,
    clock_in_latitude: request.location.latitude,
    clock_in_longitude: request.location.longitude,
    clock_in_accuracy: request.location.accuracy,
    work_type: request.workType,
    work_type_rate: request.workTypeRate,
    break_minutes: request.breakMinutes,
    activity_intervals: [],
    calculation_version: 'AGREEMENT',
    clock_in_photo_file: request.photoFile,
    status: 'PENDING',
    sync_status: 'PENDING',
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function defaultIsOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

async function fetchRemoteActiveEntry(contractorId: string): Promise<TimeEntry | null> {
  const { supabase } = await import('../supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (supabase.from('time_entries') as any)
    .select(TIME_ENTRY_WAGE_COLUMNS)
    .eq('contractor_id', contractorId)
    .is('clock_out_at', null)
    .order('clock_in_at', { ascending: false })
    .limit(1);
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return mapRemoteRowToTimeEntry(data[0] as RemoteTimeEntryRow);
}

async function insertRemoteEntry(payload: RemoteTimeEntryInsert): Promise<TimeEntry> {
  const { supabase } = await import('../supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('time_entries') as any).insert([payload]).select(TIME_ENTRY_WAGE_COLUMNS).single();
  if (error) {
    throw error;
  }

  const mapped = mapRemoteRowToTimeEntry(data as RemoteTimeEntryRow);
  await db.timeEntries.put({ ...mapTimeEntryToLocalEntry(mapped), synced: true, sync_status: 'synced' });
  return mapped;
}

async function updateRemoteEntry(id: string, updates: RemoteTimeEntryUpdate): Promise<TimeEntry> {
  const { supabase } = await import('../supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('time_entries') as any)
    .update(updates)
    .eq('id', id)
    .select(TIME_ENTRY_WAGE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const mapped = mapRemoteRowToTimeEntry(data as RemoteTimeEntryRow);
  await db.timeEntries.put({ ...mapTimeEntryToLocalEntry(mapped), synced: true, sync_status: 'synced' });
  return mapped;
}

async function getLocalActiveEntry(contractorId: string): Promise<LocalTimeEntry | null> {
  const localEntries = await db.timeEntries.where('contractor_id').equals(contractorId).toArray();
  const activeLocal = localEntries
    .filter((entry) => !entry.clock_out_at)
    .sort((left, right) => {
      const leftAt = Date.parse(left.clock_in_at);
      const rightAt = Date.parse(right.clock_in_at);
      return rightAt - leftAt;
    })[0];

  return activeLocal ?? null;
}

const defaultDependencies: TimeEntryServiceDependencies = {
  isOnline: defaultIsOnline,
  now: () => new Date(),
  uploadPhoto: uploadClockPhoto,
  fetchRemoteActiveEntry,
  insertRemoteEntry,
  updateRemoteEntry,
  queueLocalEntry: queueTimeEntry,
  getLocalActiveEntry,
};

export interface TimeEntryService {
  getActiveEntry: (contractorId: string) => Promise<TimeEntry | null>;
  clockIn: (request: ClockInRequest) => Promise<TimeEntry>;
  clockOut: (request: ClockOutRequest) => Promise<TimeEntry>;
  recordActivity: (entry: TimeEntry, kind: TimeInterval['kind'], action: 'START' | 'STOP') => Promise<TimeEntry>;
}

export function createTimeEntryService(
  overrides: Partial<TimeEntryServiceDependencies> = {},
): TimeEntryService {
  const dependencies: TimeEntryServiceDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async getActiveEntry(contractorId: string) {
      const localActive = await dependencies.getLocalActiveEntry(contractorId);
      if (localActive) {
        return mapLocalEntryToTimeEntry(localActive);
      }

      if (!dependencies.isOnline()) {
        return null;
      }

      try {
        return await dependencies.fetchRemoteActiveEntry(contractorId);
      } catch {
        return null;
      }
    },

    async clockIn(request: ClockInRequest): Promise<TimeEntry> {
      timeEntrySchema.parse({ work_type: request.workType, break_minutes: request.breakMinutes });
      const gps = validateGPS(request.location.latitude, request.location.longitude, request.location.accuracy ?? null);
      if (!gps.valid) throw new Error(gps.error);
      if (!request.stormEventId) throw new Error('Select an assigned ticket with a storm event before clocking in.');
      const nowIso = dependencies.now().toISOString();
      const pendingEntry = buildClockInEntry(request, nowIso);
      if (request.photoFile) pendingEntry.clock_in_photo_url = clockPhotoPath(request.contractorId, pendingEntry.id, 'in');

      if (dependencies.isOnline()) {
        try {
          if (request.photoFile) await dependencies.uploadPhoto(request.contractorId, pendingEntry.id, 'in', request.photoFile);
          return await dependencies.insertRemoteEntry({
            id: pendingEntry.id,
            clock_in_photo_url: pendingEntry.clock_in_photo_url,
            activity_intervals: [],
            contractor_id: request.contractorId,
            ticket_id: request.ticketId ?? null,
            storm_event_id: request.stormEventId ?? null,
            clock_in_at: nowIso,
            clock_in_latitude: request.location.latitude,
            clock_in_longitude: request.location.longitude,
            clock_in_accuracy: request.location.accuracy,
            work_type: request.workType,
            work_type_rate: request.workTypeRate,
            break_minutes: request.breakMinutes,
            status: 'PENDING',
            sync_status: 'SYNCED',
            created_at: nowIso,
            updated_at: nowIso,
          });
        } catch (error) {
          // A server validation/RLS rejection is not an offline success.
          if (error && typeof error === 'object' && 'code' in error) throw error;
          // Fall through to local queue.
        }
      }

      const queuedEntry = {
        ...pendingEntry,
        sync_status: 'PENDING' as SyncStatus,
      };
      const localEntry = mapTimeEntryToLocalEntry(queuedEntry);
      await dependencies.queueLocalEntry(localEntry, 'CREATE');
      return queuedEntry;
    },

    async recordActivity(entry, kind, action) {
      if (entry.clock_out_at) throw new Error('This shift is already closed.');
      const nowIso = dependencies.now().toISOString();
      const intervals = changeTimeInterval(entry.activity_intervals ?? [], kind, action, nowIso);
      const updated = { ...entry, activity_intervals: intervals, updated_at: nowIso };
      if (dependencies.isOnline() && entry.sync_status === 'SYNCED') {
        try { return await dependencies.updateRemoteEntry(entry.id, { activity_intervals: intervals, updated_at: nowIso }); }
        catch (error) { if (error && typeof error === 'object' && 'code' in error) throw error; }
      }
      const queued = { ...updated, sync_status: 'PENDING' as const };
      await dependencies.queueLocalEntry(mapTimeEntryToLocalEntry(queued), 'UPDATE');
      return queued;
    },

    async clockOut(request: ClockOutRequest): Promise<TimeEntry> {
      timeEntrySchema.parse({ work_type: request.entry.work_type, break_minutes: request.entry.calculation_version === 'AGREEMENT' ? 0 : request.breakMinutes });
      const gps = validateGPS(request.location.latitude, request.location.longitude, request.location.accuracy ?? null);
      if (!gps.valid) throw new Error(gps.error);
      const nowIso = dependencies.now().toISOString();
      const clockOutAt = new Date(nowIso);
      const clockInAt = new Date(request.entry.clock_in_at);
      const durationValidation = validateTimeEntryDuration(
        clockInAt,
        clockOutAt,
        APP_CONFIG.MAX_TIME_ENTRY_HOURS,
      );

      if (!durationValidation.valid) {
        throw new Error(durationValidation.error ?? 'Time entry duration is invalid.');
      }

      const activities = closeTimeIntervals(request.entry.activity_intervals ?? [], nowIso);
      const breakMinutes = request.entry.calculation_version === 'AGREEMENT' ? breakMinutesFromIntervals(activities, nowIso) : Math.max(0, request.breakMinutes);
      if (breakMinutes > durationValidation.durationMinutes) throw new Error('Break cannot exceed the shift duration.');
      const billableMinutes = calculateBillableMinutes(durationValidation.durationMinutes, breakMinutes);
      const billableAmount = (billableMinutes / 60) * request.entry.work_type_rate;

      const updatedEntry: TimeEntry = {
        ...request.entry,
        activity_intervals: activities,
        clock_out_photo_file: request.photoFile,
        clock_out_photo_url: request.photoFile ? clockPhotoPath(request.entry.contractor_id, request.entry.id, 'out') : request.entry.clock_out_photo_url,
        clock_out_at: nowIso,
        clock_out_latitude: request.location.latitude,
        clock_out_longitude: request.location.longitude,
        clock_out_accuracy: request.location.accuracy,
        break_minutes: breakMinutes,
        total_minutes: durationValidation.durationMinutes,
        billable_minutes: billableMinutes,
        billable_amount: Number(billableAmount.toFixed(2)),
        updated_at: nowIso,
      };

      const shouldQueueLocally = !dependencies.isOnline() || request.entry.sync_status !== 'SYNCED';
      if (shouldQueueLocally) {
        const localEntry = mapTimeEntryToLocalEntry({
          ...updatedEntry,
          sync_status: 'PENDING',
        });
        await dependencies.queueLocalEntry(localEntry, 'UPDATE');
        return {
          ...updatedEntry,
          sync_status: 'PENDING',
        };
      }

      try {
        if (request.photoFile) await dependencies.uploadPhoto(request.entry.contractor_id, request.entry.id, 'out', request.photoFile);
        // total_minutes, billable_minutes, and billable_amount are GENERATED
        // ALWAYS columns in Postgres — they cannot be written directly.
        // payroll_amount, utility_bill_amount, and the rate snapshots are
        // computed server-side by the private.apply_time_entry_costing()
        // BEFORE trigger from clock_out_at/break_minutes. Only writable
        // columns are sent here; the server is the source of truth for
        // every money figure.
        return await dependencies.updateRemoteEntry(request.entry.id, {
          activity_intervals: activities,
          clock_out_photo_url: updatedEntry.clock_out_photo_url,
          clock_out_at: nowIso,
          clock_out_latitude: request.location.latitude,
          clock_out_longitude: request.location.longitude,
          clock_out_accuracy: request.location.accuracy,
          break_minutes: Math.round(breakMinutes),
          updated_at: nowIso,
          sync_status: 'SYNCED',
        });
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) throw error;
        const localEntry = mapTimeEntryToLocalEntry({
          ...updatedEntry,
          sync_status: 'PENDING',
        });
        await dependencies.queueLocalEntry(localEntry, 'UPDATE');
        return {
          ...updatedEntry,
          sync_status: 'PENDING',
        };
      }
    },
  };
}

export const timeEntryService = createTimeEntryService();

/** Recover the wage-only completed shift after sync or a page reload. */
export async function getLastCompletedEntry(contractorId: string): Promise<TimeEntry | null> {
  const local = await db.timeEntries.where('contractor_id').equals(contractorId).toArray();
  const cached = local.filter(row => row.clock_out_at).sort((a,b) => Date.parse(b.clock_out_at!) - Date.parse(a.clock_out_at!))[0];
  if (!defaultDependencies.isOnline()) return cached ? mapLocalEntryToTimeEntry(cached) : null;
  const { supabase } = await import('../supabase/client');
  const { data, error } = await supabase.from('time_entries').select(TIME_ENTRY_WAGE_COLUMNS).eq('contractor_id', contractorId).eq('is_deleted', false).not('clock_out_at','is',null).order('clock_out_at',{ascending:false}).limit(1);
  if (error) throw error;
  if (cached && cached.sync_status !== 'synced' && (!data?.[0] || Date.parse(cached.clock_out_at!) >= Date.parse(data[0].clock_out_at!))) return mapLocalEntryToTimeEntry(cached);
  if (!data?.[0]) return null;
  return mapRemoteRowToTimeEntry(data[0]);
}

export interface VehicleShiftScope { profileId: string; contractorId: string }
interface VehicleShiftQueueDependencies {
  isOnline: () => boolean;
  fetchClosedShifts: (contractorId: string) => Promise<Array<VehicleClaimShift & { is_deleted?: boolean }>>;
  fetchClaimedShiftIds: (contractorId: string) => Promise<string[]>;
  readLocalShifts: (scope: VehicleShiftScope) => Promise<LocalTimeEntry[]>;
  readCache: (scope: VehicleShiftScope) => Promise<VehicleShiftCache | undefined>;
  writeCache: (snapshot: VehicleShiftCache) => Promise<void>;
}

const VEHICLE_SHIFT_COLUMNS = 'id,contractor_id,clock_in_at,clock_out_at,contractor_role,calculation_version,vehicle_minutes,vehicle_allowance_amount,billable_minutes,sync_status' as const;

function captureShift(row: VehicleClaimShift): VehicleClaimShift {
  return {
    id: row.id, contractor_id: row.contractor_id, clock_in_at: row.clock_in_at,
    clock_out_at: row.clock_out_at, contractor_role: row.contractor_role,
    calculation_version: row.calculation_version, vehicle_minutes: row.vehicle_minutes,
    vehicle_allowance_amount: row.vehicle_allowance_amount, billable_minutes: row.billable_minutes,
    sync_status: row.sync_status,
  };
}

function hasVehicleEligibility(row: VehicleClaimShift): boolean {
  return row.calculation_version === 'LEGACY'
    ? row.contractor_role === 'DRIVER'
    : (row.vehicle_minutes ?? 0) > 0;
}

const vehicleQueueDependencies: VehicleShiftQueueDependencies = {
  isOnline: defaultIsOnline,
  async fetchClosedShifts(contractorId) {
    const { supabase } = await import('../supabase/client');
    const rows: VehicleClaimShift[] = [];
    // PostgREST caps each response. Read every page so old unclaimed shifts remain reachable.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('time_entries').select(VEHICLE_SHIFT_COLUMNS)
        .eq('contractor_id', contractorId).eq('is_deleted', false).not('clock_out_at', 'is', null)
        .order('clock_out_at', { ascending: false }).order('id').range(from, from + 999);
      if (error) throw error;
      for (const row of data ?? []) rows.push(captureShift({ ...row,
        clock_out_at: row.clock_out_at ?? undefined, contractor_role: row.contractor_role ?? undefined,
        vehicle_minutes: row.vehicle_minutes ?? undefined, vehicle_allowance_amount: row.vehicle_allowance_amount ?? undefined,
        billable_minutes: row.billable_minutes ?? undefined, sync_status: row.sync_status as SyncStatus,
      }));
      if ((data?.length ?? 0) < 1000) return rows;
    }
  },
  async fetchClaimedShiftIds(contractorId) {
    const { supabase } = await import('../supabase/client');
    const ids: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('time_entry_vehicle_claims').select('time_entry_id')
        .eq('contractor_id', contractorId).order('id').range(from, from + 999);
      if (error) throw error;
      ids.push(...(data ?? []).map(row => row.time_entry_id));
      if ((data?.length ?? 0) < 1000) return ids;
    }
  },
  async readLocalShifts(scope) {
    const identity = await db.contractorIdentities.get(scope.profileId);
    if (identity?.contractor_id !== scope.contractorId) return [];
    return db.timeEntries.where('contractor_id').equals(scope.contractorId).toArray();
  },
  readCache: scope => db.vehicleShiftQueues.get([scope.profileId, scope.contractorId]),
  async writeCache(snapshot) { await db.vehicleShiftQueues.put(snapshot); },
};

export function createVehicleShiftQueue(overrides: Partial<VehicleShiftQueueDependencies> = {}) {
  const dependencies = { ...vehicleQueueDependencies, ...overrides };
  const revisions = new Map<string, number>();
  const cacheWrites = new Map<string, Promise<void>>();
  const submittedShifts = new Map<string, Set<string>>();
  const scopeKey = (scope: VehicleShiftScope) => JSON.stringify([scope.profileId, scope.contractorId]);
  const nextRevision = (scope: VehicleShiftScope) => {
    const key = scopeKey(scope);
    const value = (revisions.get(key) ?? 0) + 1;
    revisions.set(key, value);
    return value;
  };
  const validCache = (cache: VehicleShiftCache | undefined, scope: VehicleShiftScope) =>
    cache?.viewer_profile_id === scope.profileId && cache.contractor_id === scope.contractorId ? cache : undefined;
  const writeSnapshot = (scope: VehicleShiftScope, revision: number, snapshot: VehicleShiftCache) => {
    const key = scopeKey(scope);
    // IndexedDB writes can finish after another refresh starts. Serialize them per actor
    // so the newer snapshot is always the last persisted state.
    const pending = (cacheWrites.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      if (revisions.get(key) === revision) await dependencies.writeCache(snapshot);
    });
    cacheWrites.set(key, pending);
    return pending.finally(() => { if (cacheWrites.get(key) === pending) cacheWrites.delete(key); });
  };

  return {
    async load(scope: VehicleShiftScope): Promise<{ entries: VehicleClaimShift[]; online: boolean }> {
      if (!scope.profileId || !scope.contractorId) throw new Error('A verified contractor profile is required.');
      const revision = nextRevision(scope);
      const online = dependencies.isOnline();
      const [local, stored] = await Promise.all([dependencies.readLocalShifts(scope), dependencies.readCache(scope)]);
      const cached = validCache(stored, scope);
      let source = cached?.entries ?? [];
      const claimed = new Set([...(cached?.claimed_shift_ids ?? []), ...(submittedShifts.get(scopeKey(scope)) ?? [])]);
      if (online) {
        const [remote, claimIds] = await Promise.all([
          dependencies.fetchClosedShifts(scope.contractorId), dependencies.fetchClaimedShiftIds(scope.contractorId),
        ]);
        claimIds.forEach(id => claimed.add(id));
        source = remote.filter(row => !row.is_deleted);
      }
      const entries = new Map<string, VehicleClaimShift>();
      for (const row of source) {
        if (row.contractor_id === scope.contractorId && row.clock_out_at && !claimed.has(row.id) && hasVehicleEligibility(row)) entries.set(row.id, captureShift(row));
      }
      for (const row of local) {
        if (row.contractor_id !== scope.contractorId || !row.clock_out_at || row.is_deleted || row.sync_status === 'synced' || claimed.has(row.id)) continue;
        const pending = captureShift({ ...row, sync_status: toSyncStatus(row.sync_status) });
        const recordedUse = row.calculation_version !== 'LEGACY' && row.activity_intervals?.some(interval => interval.kind === 'VEHICLE_USE');
        if (hasVehicleEligibility(pending) || recordedUse) entries.set(row.id, pending);
      }
      const result = [...entries.values()].sort((a, b) => Date.parse(b.clock_out_at!) - Date.parse(a.clock_out_at!));
      if (online && revisions.get(scopeKey(scope)) === revision) {
        await writeSnapshot(scope, revision, { viewer_profile_id: scope.profileId, contractor_id: scope.contractorId,
          entries: result.filter(row => row.sync_status === 'SYNCED'), claimed_shift_ids: [...claimed] });
      }
      return { entries: result, online };
    },
    async markSubmitted(scope: VehicleShiftScope, shiftId: string): Promise<void> {
      const revision = nextRevision(scope);
      const submitted = submittedShifts.get(scopeKey(scope)) ?? new Set<string>();
      submitted.add(shiftId); submittedShifts.set(scopeKey(scope), submitted);
      await cacheWrites.get(scopeKey(scope))?.catch(() => undefined);
      const cached = validCache(await dependencies.readCache(scope), scope);
      await writeSnapshot(scope, revision, { viewer_profile_id: scope.profileId, contractor_id: scope.contractorId,
        entries: (cached?.entries ?? []).filter(row => row.id !== shiftId),
        claimed_shift_ids: [...new Set([...(cached?.claimed_shift_ids ?? []), shiftId])] });
    },
  };
}

export const vehicleShiftQueue = createVehicleShiftQueue();
