import { TIME_ENTRY_WAGE_COLUMNS, type WageTimeEntryRow } from '../compensation/timeEntryProjection';
import { db, type LocalTimeEntry } from '../db/dexie';
import type { TimeEntry, TimeEntryStatus } from '../../types';

type RemoteTimeEntryRow = WageTimeEntryRow;

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
  vehicle_reimbursement_amount?: number;
  vehicle_claim_status?: string;
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
  cacheRemoteEntries: (contractorId: string, entries: TimeEntryListItem[]) => Promise<void>;
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

export function mapRemoteRowToTimeEntry(row: RemoteTimeEntryRow): TimeEntry {
  return {
    id: row.id,
    contractor_id: row.contractor_id,
    ticket_id: row.ticket_id ?? undefined,
    clock_in_at: row.clock_in_at,
    clock_in_latitude: row.clock_in_latitude ?? undefined,
    clock_in_longitude: row.clock_in_longitude ?? undefined,
    clock_in_accuracy: row.clock_in_accuracy ?? undefined,
    clock_out_at: row.clock_out_at ?? undefined,
    clock_out_latitude: row.clock_out_latitude ?? undefined,
    clock_out_longitude: row.clock_out_longitude ?? undefined,
    clock_out_accuracy: row.clock_out_accuracy ?? undefined,
    work_type: row.work_type as TimeEntry['work_type'],
    work_type_rate: row.work_type_rate,
    total_minutes: row.calculation_version === 'AGREEMENT' && row.clock_out_at ? (Date.parse(row.clock_out_at) - Date.parse(row.clock_in_at)) / 60000 : row.total_minutes ?? undefined,
    break_minutes: row.break_minutes ?? 0,
    billable_minutes: row.paid_minutes_exact ?? row.billable_minutes ?? undefined,
    billable_amount: row.billable_amount ?? undefined,
    storm_event_id: row.storm_event_id ?? undefined,
    contractor_role: row.contractor_role ?? undefined,
    pay_rate_applied: row.pay_rate_applied ?? undefined,
    payroll_amount: row.payroll_amount ?? undefined,
    activity_intervals: (row.activity_intervals ?? []) as unknown as TimeEntry['activity_intervals'],
    pay_segments: (row.pay_segments ?? []) as unknown as TimeEntry['pay_segments'],
    paid_minutes_exact: row.paid_minutes_exact ?? undefined,
    vehicle_minutes: row.vehicle_minutes ?? undefined,
    vehicle_allowance_amount: row.vehicle_allowance_amount ?? undefined,
    vehicle_hourly_rate_applied: row.vehicle_hourly_rate_applied ?? undefined,
    calculation_version: row.calculation_version,
    regular_minutes: row.regular_minutes ?? undefined,
    overtime_minutes: row.overtime_minutes ?? undefined,
    regular_pay_amount: row.regular_pay_amount ?? undefined,
    overtime_pay_amount: row.overtime_pay_amount ?? undefined,
    overtime_rate_applied: row.overtime_rate_applied ?? undefined,
    status: toTimeEntryStatus(row.status ?? 'PENDING'),
    reviewed_by: row.reviewed_by ?? undefined,
    reviewed_at: row.reviewed_at ?? undefined,
    rejection_reason: row.rejection_reason ?? undefined,
    invoice_id: row.invoice_id ?? undefined,
    sync_status: (row.sync_status as TimeEntry['sync_status']) ?? 'SYNCED',
    created_at: row.created_at ?? row.clock_in_at,
    updated_at: row.updated_at ?? row.created_at ?? row.clock_in_at,
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
    clock_in_accuracy: entry.clock_in_accuracy,
    clock_in_photo_url: entry.clock_in_photo_url,
    clock_out_at: entry.clock_out_at,
    clock_out_latitude: entry.clock_out_latitude,
    clock_out_longitude: entry.clock_out_longitude,
    clock_out_accuracy: entry.clock_out_accuracy,
    clock_out_photo_url: entry.clock_out_photo_url,
    work_type: entry.work_type as TimeEntry['work_type'],
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
    total_minutes: entry.total_minutes,
    billable_minutes: entry.billable_minutes,
    billable_amount: entry.billable_amount,
    ticket_number: entry.ticket_number,
    contractor_name: entry.contractor_name,
    vehicle_reimbursement_amount: entry.vehicle_reimbursement_amount,
    vehicle_claim_status: entry.vehicle_claim_status,
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
    .select(TIME_ENTRY_WAGE_COLUMNS)
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

  const claimByEntry = new Map<string, { amount: number; status: string }>();
  if (entries.length) {
    const { data: claims, error: claimError } = await supabase
      .from('time_entry_vehicle_claims')
      .select('time_entry_id, amount, status')
      .in('time_entry_id', entries.map(entry => entry.id));
    if (claimError) throw claimError;
    for (const claim of claims ?? []) claimByEntry.set(claim.time_entry_id, claim);
  }

  return entries.map((entry) => ({
    ...entry,
    vehicle_reimbursement_amount: claimByEntry.get(entry.id)?.status === 'APPROVED'
      ? claimByEntry.get(entry.id)!.amount : 0,
    vehicle_claim_status: claimByEntry.get(entry.id)?.status,
    ticket_number: entry.ticket_id ? ticketNumberById.get(entry.ticket_id) : undefined,
    contractor_name: contractorNameById.get(entry.contractor_id),
  }));
}

async function getLocalEntries(contractorId: string): Promise<LocalTimeEntry[]> {
  const localEntries = await db.timeEntries.where('contractor_id').equals(contractorId).toArray();

  return localEntries.sort((left, right) => parseTimestamp(right.clock_in_at) - parseTimestamp(left.clock_in_at));
}

async function cacheRemoteEntries(contractorId: string, entries: TimeEntryListItem[]): Promise<void> {
  const { supabase } = await import('../supabase/client');
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return;
  const { data: owner } = await supabase.from('contractors').select('id').eq('profile_id', user.id).maybeSingle();
  if (owner?.id !== contractorId) return;
  await db.transaction('rw', db.timeEntries, async () => {
    for (const entry of entries) {
      if (entry.contractor_id !== contractorId) continue;
      const existing = await db.timeEntries.get(entry.id);
      // A fetched open server shift must not overwrite a queued offline clock-out.
      if (existing && existing.sync_status !== 'synced') continue;
      await db.timeEntries.put({ ...entry, synced: true, sync_status: 'synced', retry_count: 0 });
    }
  });
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
    .select(TIME_ENTRY_WAGE_COLUMNS)
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
  cacheRemoteEntries,
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
        const remote = await dependencies.fetchRemoteEntries(filters);
        if (!filters.contractorId) return remote;
        // Reading payroll remains usable when local storage is full or unavailable.
        await dependencies.cacheRemoteEntries(filters.contractorId, remote).catch(() => undefined);
        const local = await dependencies.getLocalEntries(filters.contractorId).catch(() => []);
        const merged = new Map(remote.map(entry => [entry.id, entry]));
        for (const entry of local) {
          if (entry.contractor_id === filters.contractorId && entry.sync_status !== 'synced') {
            merged.set(entry.id, mapLocalEntryToListItem(entry));
          }
        }
        return [...merged.values()].filter(entry => entryMatchesFilters(entry, filters))
          .sort((left, right) => parseTimestamp(right.clock_in_at) - parseTimestamp(left.clock_in_at));
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
