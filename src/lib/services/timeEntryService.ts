import {
  db,
  queueTimeEntry,
  type LocalSyncStatus,
  type LocalTimeEntry,
  type SyncQueueOperation,
} from '../db/dexie';
import { APP_CONFIG } from '../config/appConfig';
import { validateTimeEntryDuration } from '../utils/validators';
import { calculateBillableMinutes } from '../utils/timeTracking';
import type { TimeEntry, WorkType, SyncStatus, TimeEntryStatus } from '../../types';
import type { Database } from '../../types/database';

type RemoteTimeEntryRow = Database['public']['Tables']['time_entries']['Row'];
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
  location: ClockLocation;
}

export interface ClockOutRequest {
  entry: TimeEntry;
  breakMinutes: number;
  location: ClockLocation;
}

interface TimeEntryServiceDependencies {
  isOnline: () => boolean;
  now: () => Date;
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
    clock_in_at: row.clock_in_at,
    clock_in_latitude: row.clock_in_latitude ?? undefined,
    clock_in_longitude: row.clock_in_longitude ?? undefined,
    clock_out_at: row.clock_out_at ?? undefined,
    clock_out_latitude: row.clock_out_latitude ?? undefined,
    clock_out_longitude: row.clock_out_longitude ?? undefined,
    work_type: row.work_type as WorkType,
    work_type_rate: row.work_type_rate,
    total_minutes: row.total_minutes ?? undefined,
    break_minutes: row.break_minutes,
    billable_minutes: row.billable_minutes ?? undefined,
    billable_amount: row.billable_amount ?? undefined,
    status: row.status as TimeEntryStatus,
    reviewed_by: row.reviewed_by ?? undefined,
    reviewed_at: row.reviewed_at ?? undefined,
    rejection_reason: row.rejection_reason ?? undefined,
    invoice_id: row.invoice_id ?? undefined,
    sync_status: (row.sync_status as SyncStatus) ?? 'SYNCED',
    created_at: row.created_at,
    updated_at: row.updated_at,
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
    clock_in_photo_url: entry.clock_in_photo_url,
    clock_out_at: entry.clock_out_at,
    clock_out_latitude: entry.clock_out_latitude,
    clock_out_longitude: entry.clock_out_longitude,
    clock_out_photo_url: entry.clock_out_photo_url,
    work_type: entry.work_type as WorkType,
    work_type_rate: entry.work_type_rate,
    break_minutes: entry.break_minutes,
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
    clock_in_photo_url: entry.clock_in_photo_url,
    clock_out_at: entry.clock_out_at,
    clock_out_latitude: entry.clock_out_latitude,
    clock_out_longitude: entry.clock_out_longitude,
    clock_out_photo_url: entry.clock_out_photo_url,
    work_type: entry.work_type,
    work_type_rate: entry.work_type_rate,
    break_minutes: entry.break_minutes,
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

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildClockInEntry(request: ClockInRequest, nowIso: string): TimeEntry {
  return {
    id: createEntryId(),
    contractor_id: request.contractorId,
    ticket_id: request.ticketId,
    clock_in_at: nowIso,
    clock_in_latitude: request.location.latitude,
    clock_in_longitude: request.location.longitude,
    clock_in_accuracy: request.location.accuracy,
    work_type: request.workType,
    work_type_rate: request.workTypeRate,
    break_minutes: request.breakMinutes,
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
    .select('*')
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
  const { data, error } = await (supabase.from('time_entries') as any).insert([payload]).select().single();
  if (error) {
    throw error;
  }

  return mapRemoteRowToTimeEntry(data as RemoteTimeEntryRow);
}

async function updateRemoteEntry(id: string, updates: RemoteTimeEntryUpdate): Promise<TimeEntry> {
  const { supabase } = await import('../supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('time_entries') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapRemoteRowToTimeEntry(data as RemoteTimeEntryRow);
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
      const nowIso = dependencies.now().toISOString();
      const pendingEntry = buildClockInEntry(request, nowIso);

      if (dependencies.isOnline()) {
        try {
          return await dependencies.insertRemoteEntry({
            contractor_id: request.contractorId,
            ticket_id: request.ticketId ?? null,
            clock_in_at: nowIso,
            clock_in_latitude: request.location.latitude,
            clock_in_longitude: request.location.longitude,
            work_type: request.workType,
            work_type_rate: request.workTypeRate,
            break_minutes: request.breakMinutes,
            status: 'PENDING',
            sync_status: 'SYNCED',
            created_at: nowIso,
            updated_at: nowIso,
          });
        } catch {
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

    async clockOut(request: ClockOutRequest): Promise<TimeEntry> {
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

      const breakMinutes = Math.max(0, request.breakMinutes);
      const billableMinutes = calculateBillableMinutes(durationValidation.durationMinutes, breakMinutes);
      const billableAmount = (billableMinutes / 60) * request.entry.work_type_rate;

      const updatedEntry: TimeEntry = {
        ...request.entry,
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
        return await dependencies.updateRemoteEntry(request.entry.id, {
          clock_out_at: nowIso,
          clock_out_latitude: request.location.latitude,
          clock_out_longitude: request.location.longitude,
          break_minutes: breakMinutes,
          total_minutes: durationValidation.durationMinutes,
          billable_minutes: billableMinutes,
          billable_amount: Number(billableAmount.toFixed(2)),
          updated_at: nowIso,
          sync_status: 'SYNCED',
        });
      } catch {
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
