import { db, type LocalTimeEntry } from '../db/dexie';
import type { TimeEntry, TimeEntryStatus } from '../../types';
import type { Database } from '../../types/database';

type RemoteTimeEntryRow = Database['public']['Tables']['time_entries']['Row'];

type TimeEntryReviewDecision = Extract<TimeEntryStatus, 'APPROVED' | 'REJECTED'>;

interface RemoteTicketRow {
  id: string;
  ticket_number: string;
}

interface RemoteContractorRow {
  id: string;
  profile_id: string;
}

interface RemoteProfileRow {
  id: string;
  first_name: string;
  last_name: string;
}

export interface TimeEntryListFilters {
  contractorId?: string;
  status?: TimeEntryStatus | 'ALL';
  from?: string;
  to?: string;
}

export interface TimeEntryListItem extends TimeEntry {
  ticket_number?: string;
  contractor_name?: string;
}

export interface ReviewTimeEntryInput {
  entryId: string;
  reviewerId: string;
  decision: TimeEntryReviewDecision;
  rejectionReason?: string;
}

interface TimeEntryManagementDependencies {
  isOnline: () => boolean;
  fetchRemoteEntries: (filters: TimeEntryListFilters) => Promise<TimeEntryListItem[]>;
  getLocalEntries: (contractorId: string) => Promise<LocalTimeEntry[]>;
  reviewRemoteEntry: (input: ReviewTimeEntryInput) => Promise<TimeEntry>;
}

export interface TimeEntryManagementService {
  listEntries: (filters?: TimeEntryListFilters) => Promise<TimeEntryListItem[]>;
  reviewEntry: (input: ReviewTimeEntryInput) => Promise<TimeEntry>;
}

function toTimeEntryStatus(status: string): TimeEntryStatus {
  const normalized = status.toUpperCase();
  if (normalized === 'APPROVED') {
    return 'APPROVED';
  }

  if (normalized === 'REJECTED') {
    return 'REJECTED';
  }

  return 'PENDING';
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
    work_type: row.work_type as TimeEntry['work_type'],
    work_type_rate: row.work_type_rate,
    total_minutes: row.total_minutes ?? undefined,
    break_minutes: row.break_minutes,
    billable_minutes: row.billable_minutes ?? undefined,
    billable_amount: row.billable_amount ?? undefined,
    status: toTimeEntryStatus(row.status),
    reviewed_by: row.reviewed_by ?? undefined,
    reviewed_at: row.reviewed_at ?? undefined,
    rejection_reason: row.rejection_reason ?? undefined,
    invoice_id: row.invoice_id ?? undefined,
    sync_status: (row.sync_status as TimeEntry['sync_status']) ?? 'SYNCED',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapLocalEntryToListItem(entry: LocalTimeEntry): TimeEntryListItem {
  const createdAt = entry.created_at ?? entry.clock_in_at;
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
    work_type: entry.work_type as TimeEntry['work_type'],
    work_type_rate: entry.work_type_rate,
    break_minutes: entry.break_minutes,
    status: toTimeEntryStatus(entry.status),
    sync_status: entry.sync_status === 'synced' ? 'SYNCED' : entry.sync_status === 'failed' ? 'FAILED' : 'PENDING',
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function parseTimestamp(value?: string): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function entryMatchesFilters(entry: TimeEntryListItem, filters: TimeEntryListFilters): boolean {
  if (filters.status && filters.status !== 'ALL' && entry.status !== filters.status) {
    return false;
  }

  const entryClockIn = parseTimestamp(entry.clock_in_at);
  const fromTime = filters.from ? parseTimestamp(filters.from) : null;
  if (fromTime !== null && entryClockIn < fromTime) {
    return false;
  }

  const toTime = filters.to ? parseTimestamp(filters.to) : null;
  if (toTime !== null && entryClockIn > toTime) {
    return false;
  }

  return true;
}

function defaultIsOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

async function fetchTicketNumbers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  ticketIds: string[],
): Promise<Map<string, string>> {
  if (ticketIds.length === 0) {
    return new Map();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('tickets') as any)
      .select('id, ticket_number')
      .in('id', ticketIds);

    const rows = (data ?? []) as RemoteTicketRow[];
    return new Map(rows.map((row) => [row.id, row.ticket_number]));
  } catch {
    return new Map();
  }
}

async function fetchContractorNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contractorIds: string[],
): Promise<Map<string, string>> {
  if (contractorIds.length === 0) {
    return new Map();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contractors } = await (supabase.from('contractors') as any)
      .select('id, profile_id')
      .in('id', contractorIds);

    const contractorRows = (contractors ?? []) as RemoteContractorRow[];
    if (contractorRows.length === 0) {
      return new Map();
    }

    const profileIds = Array.from(
      new Set(contractorRows.map((row) => row.profile_id).filter((value) => Boolean(value))),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase.from('profiles') as any)
      .select('id, first_name, last_name')
      .in('id', profileIds);

    const profileRows = (profiles ?? []) as RemoteProfileRow[];
    const profileNameById = new Map(
      profileRows.map((profile) => [profile.id, `${profile.first_name} ${profile.last_name}`.trim()]),
    );

    return new Map(
      contractorRows.map((row) => [
        row.id,
        profileNameById.get(row.profile_id) ?? row.id,
      ]),
    );
  } catch {
    return new Map();
  }
}

async function fetchRemoteEntries(filters: TimeEntryListFilters): Promise<TimeEntryListItem[]> {
  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('time_entries') as any)
    .select('*')
    .order('clock_in_at', { ascending: false });

  if (filters.contractorId) {
    query = query.eq('contractor_id', filters.contractorId);
  }

  if (filters.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status);
  }

  if (filters.from) {
    query = query.gte('clock_in_at', filters.from);
  }

  if (filters.to) {
    query = query.lte('clock_in_at', filters.to);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RemoteTimeEntryRow[];
  const entries = rows.map(mapRemoteRowToTimeEntry);

  const ticketIds = Array.from(
    new Set(entries.map((entry) => entry.ticket_id).filter((value): value is string => Boolean(value))),
  );
  const contractorIds = Array.from(new Set(entries.map((entry) => entry.contractor_id)));

  const [ticketNumberById, contractorNameById] = await Promise.all([
    fetchTicketNumbers(supabase, ticketIds),
    fetchContractorNames(supabase, contractorIds),
  ]);

  return entries.map((entry) => ({
    ...entry,
    ticket_number: entry.ticket_id ? ticketNumberById.get(entry.ticket_id) : undefined,
    contractor_name: contractorNameById.get(entry.contractor_id),
  }));
}

async function getLocalEntries(contractorId: string): Promise<LocalTimeEntry[]> {
  const localEntries = await db.timeEntries.where('contractor_id').equals(contractorId).toArray();

  return localEntries.sort((left, right) => parseTimestamp(right.clock_in_at) - parseTimestamp(left.clock_in_at));
}

async function reviewRemoteEntry(input: ReviewTimeEntryInput): Promise<TimeEntry> {
  const { supabase } = await import('../supabase/client');
  const nowIso = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('time_entries') as any)
    .update({
      status: input.decision,
      reviewed_by: input.reviewerId,
      reviewed_at: nowIso,
      rejection_reason: input.decision === 'REJECTED' ? input.rejectionReason ?? null : null,
      updated_at: nowIso,
    })
    .eq('id', input.entryId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapRemoteRowToTimeEntry(data as RemoteTimeEntryRow);
}

const defaultDependencies: TimeEntryManagementDependencies = {
  isOnline: defaultIsOnline,
  fetchRemoteEntries,
  getLocalEntries,
  reviewRemoteEntry,
};

export function createTimeEntryManagementService(
  overrides: Partial<TimeEntryManagementDependencies> = {},
): TimeEntryManagementService {
  const dependencies: TimeEntryManagementDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async listEntries(filters: TimeEntryListFilters = {}): Promise<TimeEntryListItem[]> {
      if (!dependencies.isOnline()) {
        if (!filters.contractorId) {
          return [];
        }

        const localEntries = await dependencies.getLocalEntries(filters.contractorId);
        return localEntries
          .map(mapLocalEntryToListItem)
          .filter((entry) => entryMatchesFilters(entry, filters));
      }

      try {
        return await dependencies.fetchRemoteEntries(filters);
      } catch (error) {
        if (!filters.contractorId) {
          throw error;
        }

        const localEntries = await dependencies.getLocalEntries(filters.contractorId);
        return localEntries
          .map(mapLocalEntryToListItem)
          .filter((entry) => entryMatchesFilters(entry, filters));
      }
    },

    async reviewEntry(input: ReviewTimeEntryInput): Promise<TimeEntry> {
      if (!dependencies.isOnline()) {
        throw new Error('Time entry review requires an internet connection.');
      }

      if (input.decision === 'REJECTED' && !input.rejectionReason?.trim()) {
        throw new Error('Rejection reason is required when rejecting a time entry.');
      }

      return dependencies.reviewRemoteEntry(input);
    },
  };
}

export const timeEntryManagementService = createTimeEntryManagementService();
