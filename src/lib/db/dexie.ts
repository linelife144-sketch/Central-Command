import { scrubBillingFields } from '../compensation/timeEntryProjection';
import type { TimeInterval, PaySegment, PayAgreement } from '../compensation/validation';
// Central Command - Dexie.js IndexedDB Configuration

import Dexie, { Table } from 'dexie';
import type { ContractorRole } from '@/types';

export type LocalSyncStatus = 'pending' | 'synced' | 'failed';
export type SyncQueueOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncQueueStatus = 'pending' | 'processing' | 'synced' | 'failed';
export type ConflictResolutionStrategy = 'LOCAL' | 'SERVER' | 'MERGED';

// Types for local database
export interface LocalTicket {
  id: string;
  ticket_number: string;
  status: string;
  is_important: boolean;
  address: string;
  latitude?: number;
  longitude?: number;
  assigned_to?: string;
  utility_client: string;
  work_description?: string;
  synced: boolean;
  sync_status?: LocalSyncStatus;
  last_error?: string;
  updated_at: string;
}

export interface LocalTimeEntry {
  id: string;
  contractor_id: string;
  ticket_id?: string;
  storm_event_id?: string;
  clock_in_at: string;
  clock_in_latitude?: number;
  clock_in_longitude?: number;
  clock_in_accuracy?: number;
  clock_in_photo_url?: string;
  clock_in_photo_file?: Blob;
  clock_out_photo_file?: Blob;
  clock_out_at?: string;
  clock_out_latitude?: number;
  clock_out_longitude?: number;
  clock_out_accuracy?: number;
  clock_out_photo_url?: string;
  work_type: string;
  work_type_rate: number;
  break_minutes: number;
  status: string;
  synced: boolean;
  sync_status: LocalSyncStatus;
  retry_count?: number;
  last_error?: string;
  created_at?: string;
  updated_at?: string;
  // Payroll/billing snapshot — mirrors the server-side trigger-written
  // columns. Populated on sync; absent/undefined for entries still queued
  // offline that haven't been written to the server yet.
  contractor_role?: ContractorRole;
  pay_rate_applied?: number;
  payroll_amount?: number;
  regular_minutes?: number;
  overtime_minutes?: number;
  regular_pay_amount?: number;
  overtime_pay_amount?: number;
  overtime_rate_applied?: number;
  activity_intervals?: TimeInterval[];
  pay_segments?: PaySegment[];
  paid_minutes_exact?: number;
  vehicle_minutes?: number;
  vehicle_allowance_amount?: number;
  calculation_version?: string;
  total_minutes?: number;
  billable_minutes?: number;
  billable_amount?: number;
  ticket_number?: string;
  contractor_name?: string;
  vehicle_reimbursement_amount?: number;
  vehicle_claim_status?: string;
}

export interface LocalExpenseReport {
  id: string;
  contractor_id: string;
  report_period_start: string;
  report_period_end: string;
  total_amount: number;
  mileage_total?: number;
  item_count?: number;
  status: string;
  synced: boolean;
  sync_status?: LocalSyncStatus;
  created_at?: string;
  updated_at?: string;
}

export interface LocalExpenseItem {
  id: string;
  expense_report_id: string;
  category: string;
  description: string;
  amount: number;
  currency?: string;
  expense_date: string;
  receipt_url?: string;
  receipt_ocr_text?: string;
  mileage_start?: number;
  mileage_end?: number;
  mileage_rate?: number;
  mileage_calculated_amount?: number;
  from_location?: string;
  to_location?: string;
  policy_flags?: string[];
  requires_approval?: boolean;
  approval_reason?: string;
  ticket_id?: string;
  billable_to_client?: boolean;
  created_at?: string;
  updated_at?: string;
  synced: boolean;
}

export interface LocalAssessment {
  id: string;
  ticket_id: string;
  contractor_id: string;
  safety_observations: unknown;
  damage_cause?: string;
  weather_conditions?: string;
  estimated_repair_hours?: number;
  priority?: string;
  immediate_actions?: string;
  repair_vs_replace?: string;
  estimated_repair_cost?: number;
  assessed_by?: string;
  assessed_at?: string;
  digital_signature?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  equipment_items?: unknown;
  photo_metadata?: unknown;
  synced: boolean;
  sync_status: LocalSyncStatus;
  last_error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LocalPhoto {
  id: string;
  file: Blob;
  preview: string;
  type: string;
  entity_type: string;
  entity_id: string;
  gps_latitude?: number;
  gps_longitude?: number;
  captured_at?: string;
  checksum: string;
  uploaded: boolean;
  upload_status: 'pending' | 'uploaded' | 'failed';
  retry_count?: number;
  last_error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncQueueItem {
  id: string;
  operation: SyncQueueOperation;
  entity_type: string;
  entity_id: string;
  payload: unknown;
  status: SyncQueueStatus;
  retry_count: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalSyncConflict {
  id: string;
  entity_type: string;
  entity_id: string;
  sync_queue_item_id?: string;
  local_payload: unknown;
  server_payload?: unknown;
  resolved_payload?: unknown;
  detected_at: string;
  resolved: boolean;
  resolved_at?: string;
  resolution_strategy?: ConflictResolutionStrategy;
}

export interface GPSLocation {
  id: string;
  ticket_id?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
  synced: boolean;
}

function nowIsoTimestamp(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deriveSyncStatus(synced: boolean, syncStatus?: LocalSyncStatus): LocalSyncStatus {
  if (syncStatus) {
    return syncStatus;
  }

  return synced ? 'synced' : 'pending';
}

function normalizeTicketForCache(ticket: LocalTicket): LocalTicket {
  const syncStatus = deriveSyncStatus(true, ticket.sync_status);

  return {
    ...ticket,
    synced: true,
    sync_status: syncStatus,
    last_error: ticket.last_error,
  };
}

function normalizeTimeEntryForQueue(timeEntry: LocalTimeEntry): LocalTimeEntry {
  const timestamp = nowIsoTimestamp();

  return {
    ...scrubBillingFields(timeEntry),
    synced: false,
    sync_status: 'pending',
    retry_count: timeEntry.retry_count ?? 0,
    created_at: timeEntry.created_at ?? timestamp,
    updated_at: timestamp,
  };
}

function normalizePhotoForQueue(photo: Omit<LocalPhoto, 'id'> & { id: string }): LocalPhoto {
  const timestamp = nowIsoTimestamp();

  return {
    ...photo,
    uploaded: photo.uploaded ?? false,
    upload_status: photo.upload_status ?? 'pending',
    retry_count: photo.retry_count ?? 0,
    created_at: photo.created_at ?? timestamp,
    updated_at: timestamp,
  };
}

function sortByUpdatedAtDescending<T extends { updated_at?: string }>(items: T[]): T[] {
  return items.sort((left, right) => {
    const leftTime = left.updated_at ? Date.parse(left.updated_at) : 0;
    const rightTime = right.updated_at ? Date.parse(right.updated_at) : 0;
    return rightTime - leftTime;
  });
}

/**
 * Backfills payroll fields on a pre-v4 LocalTimeEntry. Exported so the
 * Dexie version(4) upgrade logic can be unit tested directly without
 * requiring a real IndexedDB implementation (none is available in this
 * project's jsdom-based test environment).
 */
export function backfillTimeEntryPayrollFields(entry: LocalTimeEntry): LocalTimeEntry {
  if (entry.pay_rate_applied !== undefined) {
    return entry;
  }

  return {
    ...entry,
    pay_rate_applied: entry.work_type_rate,
  };
}

function toIsoTimestamp(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return fallback;
}

// Dexie Database Class
export class GridElectricDatabase extends Dexie {
  // Tables
  tickets!: Table<LocalTicket>;
  timeEntries!: Table<LocalTimeEntry>;
  expenseReports!: Table<LocalExpenseReport>;
  expenseItems!: Table<LocalExpenseItem>;
  assessments!: Table<LocalAssessment>;
  photos!: Table<LocalPhoto>;
  syncQueue!: Table<SyncQueueItem>;
  conflicts!: Table<LocalSyncConflict>;
  gpsLocations!: Table<GPSLocation>;
  payAgreements!: Table<PayAgreement & { viewer_profile_id: string }>;

  constructor() {
    super('GridElectricDB');

    this.version(1).stores({
      tickets: 'id, ticket_number, status, assigned_to, synced, updated_at',
      timeEntries: 'id, contractor_id, ticket_id, status, synced, sync_status',
      expenseReports: 'id, contractor_id, status, synced',
      expenseItems: 'id, expense_report_id, synced',
      assessments: 'id, ticket_id, contractor_id, synced, sync_status',
      photos: 'id, entity_type, entity_id, uploaded, upload_status',
      syncQueue: 'id, entity_type, created_at',
      conflicts: 'id, entity_type, entity_id, resolved, detected_at',
      gpsLocations: 'id, ticket_id, timestamp, synced',
    });

    this.version(2)
      .stores({
        tickets:
          '&id, ticket_number, status, assigned_to, synced, sync_status, updated_at, [assigned_to+status]',
        timeEntries:
          '&id, contractor_id, ticket_id, status, synced, sync_status, updated_at, [contractor_id+sync_status]',
        expenseReports: '&id, contractor_id, status, synced',
        expenseItems: '&id, expense_report_id, synced',
        assessments: '&id, ticket_id, contractor_id, synced, sync_status',
        photos:
          '&id, entity_type, entity_id, uploaded, upload_status, retry_count, updated_at, [entity_type+entity_id]',
        syncQueue:
          '&id, entity_type, entity_id, operation, status, retry_count, created_at, [entity_type+entity_id]',
        conflicts: '&id, entity_type, entity_id, resolved, detected_at, sync_queue_item_id',
        gpsLocations: '&id, ticket_id, timestamp, synced',
      })
      .upgrade(async (transaction) => {
        await transaction.table('tickets').toCollection().modify((ticket: LocalTicket) => {
          ticket.sync_status = deriveSyncStatus(ticket.synced, ticket.sync_status);
          ticket.synced = ticket.sync_status === 'synced';
        });

        await transaction.table('timeEntries').toCollection().modify((timeEntry: LocalTimeEntry) => {
          timeEntry.retry_count = timeEntry.retry_count ?? 0;
          timeEntry.created_at = timeEntry.created_at ?? nowIsoTimestamp();
          timeEntry.updated_at = timeEntry.updated_at ?? nowIsoTimestamp();
        });

        await transaction.table('photos').toCollection().modify((photo: LocalPhoto) => {
          photo.retry_count = photo.retry_count ?? 0;
          photo.upload_status = photo.upload_status ?? (photo.uploaded ? 'uploaded' : 'pending');
          photo.created_at = photo.created_at ?? nowIsoTimestamp();
          photo.updated_at = photo.updated_at ?? nowIsoTimestamp();
        });

        await transaction.table('syncQueue').toCollection().modify((item: {
          status?: SyncQueueStatus;
          retry_count?: number;
          created_at?: unknown;
          updated_at?: unknown;
        }) => {
          const fallbackTimestamp = nowIsoTimestamp();
          item.status = item.status ?? 'pending';
          item.retry_count = item.retry_count ?? 0;
          const createdAt = toIsoTimestamp(item.created_at, fallbackTimestamp);
          item.created_at = createdAt;
          item.updated_at = toIsoTimestamp(item.updated_at, createdAt);
        });
      });

    this.version(3).stores({
      tickets:
        '&id, ticket_number, status, assigned_to, synced, sync_status, updated_at, [assigned_to+status]',
      timeEntries:
        '&id, contractor_id, ticket_id, status, synced, sync_status, updated_at, [contractor_id+sync_status]',
      expenseReports: '&id, contractor_id, status, synced',
      expenseItems: '&id, expense_report_id, synced',
      assessments: '&id, ticket_id, contractor_id, synced, sync_status',
      photos:
        '&id, entity_type, entity_id, uploaded, upload_status, retry_count, updated_at, [entity_type+entity_id]',
      syncQueue:
        '&id, entity_type, entity_id, operation, status, retry_count, created_at, [entity_type+entity_id]',
      conflicts:
        '&id, entity_type, entity_id, resolved, detected_at, sync_queue_item_id, [entity_type+entity_id]',
      gpsLocations: '&id, ticket_id, timestamp, synced',
    });

    // v4: time entries gain storm_event_id plus the server-trigger-written
    // payroll/billing snapshot fields (contractor_role, pay_rate_applied,
    // payroll_amount, utility_bill_rate_applied, utility_bill_amount). The
    // schema string is unchanged — none of the new fields are indexed —
    // but Dexie requires a version bump whenever stored object shape
    // changes so existing offline rows are visited and backfilled.
    this.version(4)
      .stores({
        tickets:
          '&id, ticket_number, status, assigned_to, synced, sync_status, updated_at, [assigned_to+status]',
        timeEntries:
          '&id, contractor_id, ticket_id, status, synced, sync_status, updated_at, [contractor_id+sync_status]',
        expenseReports: '&id, contractor_id, status, synced',
        expenseItems: '&id, expense_report_id, synced',
        assessments: '&id, ticket_id, contractor_id, synced, sync_status',
        photos:
          '&id, entity_type, entity_id, uploaded, upload_status, retry_count, updated_at, [entity_type+entity_id]',
        syncQueue:
          '&id, entity_type, entity_id, operation, status, retry_count, created_at, [entity_type+entity_id]',
        conflicts:
          '&id, entity_type, entity_id, resolved, detected_at, sync_queue_item_id, [entity_type+entity_id]',
        gpsLocations: '&id, ticket_id, timestamp, synced',
      })
      .upgrade(async (transaction) => {
        await transaction.table('timeEntries').toCollection().modify((timeEntry: LocalTimeEntry) => {
          // Pre-v4 rows never had a wage trigger run against them locally.
          // Seed pay_rate_applied from the existing work_type_rate so older
          // queued/offline entries still show a sensible wage until they
          // sync and the server snapshot takes over.
          const backfilled = backfillTimeEntryPayrollFields(timeEntry);
          timeEntry.pay_rate_applied = backfilled.pay_rate_applied;
        });
      });
    this.version(5).stores({}).upgrade(async transaction => {
      await transaction.table('timeEntries').toCollection().modify(row => {
        delete row.utility_bill_amount; delete row.utility_bill_rate_applied;
      });
      await transaction.table('syncQueue').toCollection().modify(row => {
        if (row.entity_type === 'time_entry' && row.payload && typeof row.payload === 'object') row.payload = scrubBillingFields(row.payload);
      });
      await transaction.table('conflicts').toCollection().modify(row => {
        if (row.entity_type === 'time_entry') for (const key of ['local_payload', 'server_payload', 'resolved_payload']) {
          if (row[key] && typeof row[key] === 'object') row[key] = scrubBillingFields(row[key]);
        }
      });
    });
    this.version(6).stores({ payAgreements: '&id, contractor_id, viewer_profile_id, [viewer_profile_id+contractor_id]' });

  }
}

// Export singleton instance
export const db = new GridElectricDatabase();

async function getLatestSyncItemForEntity(
  entityType: string,
  entityId: string,
): Promise<SyncQueueItem | undefined> {
  return db.syncQueue
    .where('[entity_type+entity_id]')
    .equals([entityType, entityId])
    .reverse()
    .first();
}

// Helper functions for sync operations
export async function addToSyncQueue(
  operation: SyncQueueOperation,
  entityType: string,
  entityId: string,
  payload: unknown,
): Promise<string> {
  const id = createId();
  const timestamp = nowIsoTimestamp();

  await db.syncQueue.put({
    id,
    operation,
    entity_type: entityType,
    entity_id: entityId,
    payload,
    status: 'pending',
    retry_count: 0,
    created_at: timestamp,
    updated_at: timestamp,
  });

  return id;
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('status').anyOf('pending', 'failed').sortBy('created_at');
}

export async function getSyncQueueItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('created_at').toArray();
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  await db.syncQueue.delete(id);
}

export async function markSyncItemProcessing(id: string): Promise<void> {
  await db.syncQueue.update(id, {
    status: 'processing',
    updated_at: nowIsoTimestamp(),
  });
}

export async function markSyncItemSynced(id: string): Promise<void> {
  await db.syncQueue.update(id, {
    status: 'synced',
    last_error: undefined,
    updated_at: nowIsoTimestamp(),
  });
}

export async function markSyncItemFailed(id: string, error: string): Promise<void> {
  const item = await db.syncQueue.get(id);
  if (!item) {
    return;
  }

  await db.syncQueue.update(id, {
    status: 'failed',
    retry_count: item.retry_count + 1,
    last_error: error,
    updated_at: nowIsoTimestamp(),
  });
}

export async function updateSyncRetry(id: string, error: string): Promise<void> {
  await markSyncItemFailed(id, error);
}

export async function retrySyncQueueItem(id: string): Promise<void> {
  await db.syncQueue.update(id, {
    status: 'pending',
    last_error: undefined,
    updated_at: nowIsoTimestamp(),
  });
}

export async function createSyncConflict(
  input: Omit<LocalSyncConflict, 'id' | 'detected_at' | 'resolved'>,
): Promise<string> {
  const id = createId();

  await db.conflicts.put({
    ...input,
    id,
    detected_at: nowIsoTimestamp(),
    resolved: false,
  });

  return id;
}

export async function createSyncConflictFromQueueItem(
  syncQueueItemId: string,
  serverPayload?: unknown,
): Promise<string | null> {
  const item = await db.syncQueue.get(syncQueueItemId);
  if (!item) {
    return null;
  }

  await markSyncItemFailed(item.id, item.last_error ?? 'Conflict detected');

  return createSyncConflict({
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    sync_queue_item_id: item.id,
    local_payload: item.payload,
    server_payload: serverPayload,
  });
}

export async function getUnresolvedSyncConflicts(): Promise<LocalSyncConflict[]> {
  const conflicts = await db.conflicts.filter((conflict) => !conflict.resolved).toArray();
  return conflicts.sort((left, right) => Date.parse(right.detected_at) - Date.parse(left.detected_at));
}

export async function resolveSyncConflict(
  id: string,
  strategy: ConflictResolutionStrategy,
  resolvedPayload?: unknown,
): Promise<void> {
  const conflict = await db.conflicts.get(id);
  if (!conflict) {
    return;
  }

  const resolutionTime = nowIsoTimestamp();
  const resolutionPayload =
    resolvedPayload ??
    (strategy === 'SERVER' ? conflict.server_payload : conflict.local_payload);

  await db.conflicts.update(id, {
    resolved: true,
    resolved_at: resolutionTime,
    resolved_payload: resolutionPayload,
    resolution_strategy: strategy,
  });

  if (!conflict.sync_queue_item_id) {
    return;
  }

  if (strategy === 'SERVER') {
    await markSyncItemSynced(conflict.sync_queue_item_id);
    return;
  }

  await db.syncQueue.update(conflict.sync_queue_item_id, {
    payload: resolutionPayload,
    status: 'pending',
    last_error: undefined,
    updated_at: resolutionTime,
  });
}

// Ticket caching for offline access
export interface CachedTicketFilters {
  assignedTo?: string;
  status?: string;
}

function normalizeTicketFilters(filters?: string | CachedTicketFilters): CachedTicketFilters {
  if (!filters) {
    return {};
  }

  if (typeof filters === 'string') {
    return { assignedTo: filters };
  }

  return filters;
}

export async function cacheTickets(tickets: LocalTicket[]): Promise<void> {
  if (tickets.length === 0) {
    return;
  }

  await db.tickets.bulkPut(tickets.map((ticket) => normalizeTicketForCache(ticket)));
}

export async function cacheTicket(ticket: LocalTicket): Promise<void> {
  await db.tickets.put(normalizeTicketForCache(ticket));
}

export async function replaceTicketCache(tickets: LocalTicket[]): Promise<void> {
  await db.transaction('rw', db.tickets, async () => {
    await db.tickets.clear();
    if (tickets.length > 0) {
      await db.tickets.bulkPut(tickets.map((ticket) => normalizeTicketForCache(ticket)));
    }
  });
}

export async function getCachedTicketById(id: string): Promise<LocalTicket | undefined> {
  return db.tickets.get(id);
}

export async function getCachedTickets(filters?: string | CachedTicketFilters): Promise<LocalTicket[]> {
  const normalizedFilters = normalizeTicketFilters(filters);
  const { assignedTo, status } = normalizedFilters;

  let tickets: LocalTicket[];

  if (assignedTo && status) {
    tickets = await db.tickets.where('[assigned_to+status]').equals([assignedTo, status]).toArray();
  } else if (assignedTo) {
    tickets = await db.tickets.where('assigned_to').equals(assignedTo).toArray();
  } else if (status) {
    tickets = await db.tickets.where('status').equals(status).toArray();
  } else {
    tickets = await db.tickets.toArray();
  }

  return sortByUpdatedAtDescending(tickets);
}

export async function queueTicketUpdate(id: string, updates: Partial<LocalTicket>): Promise<void> {
  const timestamp = nowIsoTimestamp();

  await db.tickets.update(id, {
    ...updates,
    synced: false,
    sync_status: 'pending',
    updated_at: timestamp,
  });

  await addToSyncQueue('UPDATE', 'ticket', id, updates);
}

// Time entry queue management
export async function queueTimeEntry(
  timeEntry: LocalTimeEntry,
  operation: SyncQueueOperation = 'CREATE',
): Promise<string> {
  const entryId = timeEntry.id || createId();
  const normalizedEntry = normalizeTimeEntryForQueue({
    ...scrubBillingFields(timeEntry),
    id: entryId,
  });

  await db.timeEntries.put(normalizedEntry);
  await addToSyncQueue(operation, 'time_entry', entryId, normalizedEntry);

  return entryId;
}

export async function getPendingTimeEntries(): Promise<LocalTimeEntry[]> {
  return db.timeEntries.where('sync_status').anyOf('pending', 'failed').toArray();
}

export async function getPendingTimeEntryCount(): Promise<number> {
  return db.timeEntries.where('sync_status').anyOf('pending', 'failed').count();
}

export async function markTimeEntrySynced(id: string): Promise<void> {
  await db.timeEntries.update(id, {
    synced: true,
    sync_status: 'synced',
    retry_count: 0,
    last_error: undefined,
    updated_at: nowIsoTimestamp(),
  });

  const queueItem = await getLatestSyncItemForEntity('time_entry', id);
  if (queueItem) {
    await markSyncItemSynced(queueItem.id);
  }
}

export async function markTimeEntryFailed(id: string, error: string): Promise<void> {
  const existing = await db.timeEntries.get(id);
  if (!existing) {
    return;
  }

  await db.timeEntries.update(id, {
    synced: false,
    sync_status: 'failed',
    retry_count: (existing.retry_count ?? 0) + 1,
    last_error: error,
    updated_at: nowIsoTimestamp(),
  });

  const queueItem = await getLatestSyncItemForEntity('time_entry', id);
  if (queueItem) {
    await markSyncItemFailed(queueItem.id, error);
  }
}

// Photo queue management
export async function queuePhoto(photo: Omit<LocalPhoto, 'id'>): Promise<string> {
  const id = createId();
  const normalizedPhoto = normalizePhotoForQueue({ ...photo, id });

  await db.photos.put(normalizedPhoto);
  await addToSyncQueue('CREATE', 'photo', id, {
    entity_id: normalizedPhoto.entity_id,
    type: normalizedPhoto.type,
    captured_at: normalizedPhoto.captured_at ?? null,
    checksum: normalizedPhoto.checksum,
  });

  return id;
}

export async function getPendingPhotos(): Promise<LocalPhoto[]> {
  return db.photos.where('upload_status').anyOf('pending', 'failed').toArray();
}

export async function getPendingPhotoCount(): Promise<number> {
  return db.photos.where('upload_status').anyOf('pending', 'failed').count();
}

export async function markPhotoUploaded(id: string): Promise<void> {
  await db.photos.update(id, {
    uploaded: true,
    upload_status: 'uploaded',
    retry_count: 0,
    last_error: undefined,
    updated_at: nowIsoTimestamp(),
  });

  const queueItem = await getLatestSyncItemForEntity('photo', id);
  if (queueItem) {
    await markSyncItemSynced(queueItem.id);
  }
}

export async function markPhotoUploadFailed(id: string, error = 'Upload failed'): Promise<void> {
  const existing = await db.photos.get(id);
  if (!existing) {
    return;
  }

  await db.photos.update(id, {
    uploaded: false,
    upload_status: 'failed',
    retry_count: (existing.retry_count ?? 0) + 1,
    last_error: error,
    updated_at: nowIsoTimestamp(),
  });

  const queueItem = await getLatestSyncItemForEntity('photo', id);
  if (queueItem) {
    await markSyncItemFailed(queueItem.id, error);
  }
}

// GPS tracking
export async function logGPSLocation(location: Omit<GPSLocation, 'id'>): Promise<void> {
  await db.gpsLocations.add({
    ...location,
    id: createId(),
  });
}

export async function getUnsyncedGPSLocations(): Promise<GPSLocation[]> {
  return db.gpsLocations.filter((location) => !location.synced).toArray();
}
