import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cacheTickets,
  createSyncConflict,
  createSyncConflictFromQueueItem,
  db,
  getCachedTickets,
  getPendingTimeEntries,
  getUnresolvedSyncConflicts,
  markPhotoUploadFailed,
  queuePhoto,
  queueTimeEntry,
  resolveSyncConflict,
  retrySyncQueueItem,
  type LocalPhoto,
  type LocalTicket,
  type LocalTimeEntry,
  type LocalSyncConflict,
  type SyncQueueItem,
} from './dexie';

function buildLocalTicket(overrides: Partial<LocalTicket> = {}): LocalTicket {
  return {
    id: 'ticket-1',
    ticket_number: 'T-0001',
    status: 'ASSIGNED',
    priority: 'A',
    address: '100 Main St',
    utility_client: 'Grid Electric',
    synced: false,
    updated_at: '2026-02-12T12:00:00.000Z',
    ...overrides,
  };
}

function buildLocalTimeEntry(overrides: Partial<LocalTimeEntry> = {}): LocalTimeEntry {
  return {
    id: 'time-1',
    contractor_id: 'sub-1',
    ticket_id: 'ticket-1',
    clock_in_at: '2026-02-12T08:00:00.000Z',
    work_type: 'STANDARD_ASSESSMENT',
    work_type_rate: 95,
    break_minutes: 0,
    status: 'PENDING',
    synced: false,
    sync_status: 'pending',
    ...overrides,
  };
}

function buildLocalPhoto(overrides: Partial<LocalPhoto> = {}): LocalPhoto {
  return {
    id: 'photo-1',
    file: new Blob(['image-data'], { type: 'image/jpeg' }),
    preview: 'data:image/jpeg;base64,thumb',
    type: 'DAMAGE',
    entity_type: 'ticket',
    entity_id: 'ticket-1',
    checksum: 'checksum-1',
    uploaded: false,
    upload_status: 'pending',
    ...overrides,
  };
}

function buildSyncQueueItem(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: 'sync-1',
    operation: 'CREATE',
    entity_type: 'photo',
    entity_id: 'photo-1',
    payload: {},
    status: 'pending',
    retry_count: 1,
    created_at: '2026-02-12T12:00:00.000Z',
    updated_at: '2026-02-12T12:00:00.000Z',
    ...overrides,
  };
}

function buildLocalSyncConflict(overrides: Partial<LocalSyncConflict> = {}): LocalSyncConflict {
  return {
    id: 'conflict-1',
    entity_type: 'ticket',
    entity_id: 'ticket-1',
    sync_queue_item_id: 'sync-1',
    local_payload: { status: 'ON_SITE' },
    server_payload: { status: 'IN_PROGRESS' },
    detected_at: '2026-02-12T12:00:00.000Z',
    resolved: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dexie ticket cache', () => {
  it('normalizes ticket sync state when caching', async () => {
    const bulkPutSpy = vi.spyOn(db.tickets, 'bulkPut').mockResolvedValue(undefined as never);

    await cacheTickets([buildLocalTicket()]);

    expect(bulkPutSpy).toHaveBeenCalledTimes(1);
    const cachedTickets = bulkPutSpy.mock.calls[0]?.[0] as LocalTicket[];
    expect(cachedTickets[0]?.synced).toBe(true);
    expect(cachedTickets[0]?.sync_status).toBe('synced');
  });

  it('filters cached tickets by assigned user', async () => {
    const toArray = vi.fn().mockResolvedValue([buildLocalTicket({ assigned_to: 'sub-1' })]);
    const equals = vi.fn().mockReturnValue({ toArray });
    const whereSpy = vi
      .spyOn(db.tickets, 'where')
      .mockReturnValue({ equals } as unknown as ReturnType<typeof db.tickets.where>);

    const results = await getCachedTickets('sub-1');

    expect(whereSpy).toHaveBeenCalledWith('assigned_to');
    expect(equals).toHaveBeenCalledWith('sub-1');
    expect(results).toHaveLength(1);
  });
});

describe('dexie offline queues', () => {
  it('queues time entries and creates a sync queue item', async () => {
    const putTimeEntrySpy = vi.spyOn(db.timeEntries, 'put').mockResolvedValue('time-1' as never);
    const putSyncQueueSpy = vi.spyOn(db.syncQueue, 'put').mockResolvedValue('sync-1' as never);

    const queuedId = await queueTimeEntry(buildLocalTimeEntry());

    expect(queuedId).toBe('time-1');
    expect(putTimeEntrySpy).toHaveBeenCalledTimes(1);
    expect(putSyncQueueSpy).toHaveBeenCalledTimes(1);

    const queuedEntry = putTimeEntrySpy.mock.calls[0]?.[0] as LocalTimeEntry;
    expect(queuedEntry.sync_status).toBe('pending');
    expect(queuedEntry.synced).toBe(false);
    expect(queuedEntry.retry_count).toBe(0);

    const syncItem = putSyncQueueSpy.mock.calls[0]?.[0] as SyncQueueItem;
    expect(syncItem.entity_type).toBe('time_entry');
    expect(syncItem.entity_id).toBe('time-1');
    expect(syncItem.status).toBe('pending');
  });

  it('loads pending and failed time entries from queue', async () => {
    const toArray = vi.fn().mockResolvedValue([buildLocalTimeEntry()]);
    const anyOf = vi.fn().mockReturnValue({ toArray });
    const whereSpy = vi
      .spyOn(db.timeEntries, 'where')
      .mockReturnValue({ anyOf } as unknown as ReturnType<typeof db.timeEntries.where>);

    const entries = await getPendingTimeEntries();

    expect(whereSpy).toHaveBeenCalledWith('sync_status');
    expect(anyOf).toHaveBeenCalledWith('pending', 'failed');
    expect(entries).toHaveLength(1);
  });

  it('queues photos with default upload metadata', async () => {
    const putPhotoSpy = vi.spyOn(db.photos, 'put').mockResolvedValue('photo-1' as never);
    const putSyncQueueSpy = vi.spyOn(db.syncQueue, 'put').mockResolvedValue('sync-1' as never);

    await queuePhoto({
      file: new Blob(['photo'], { type: 'image/jpeg' }),
      preview: 'data:image/jpeg;base64,preview',
      type: 'DAMAGE',
      entity_type: 'ticket',
      entity_id: 'ticket-1',
      checksum: 'checksum-1',
      uploaded: false,
      upload_status: 'pending',
    });

    expect(putPhotoSpy).toHaveBeenCalledTimes(1);
    const queuedPhoto = putPhotoSpy.mock.calls[0]?.[0] as LocalPhoto;
    expect(queuedPhoto.upload_status).toBe('pending');
    expect(queuedPhoto.retry_count).toBe(0);
    expect(queuedPhoto.updated_at).toBeDefined();

    expect(putSyncQueueSpy).toHaveBeenCalledTimes(1);
    const syncItem = putSyncQueueSpy.mock.calls[0]?.[0] as SyncQueueItem;
    expect(syncItem.entity_type).toBe('photo');
    expect(syncItem.status).toBe('pending');
  });

  it('marks failed photo uploads and increments retry counts', async () => {
    const photo = buildLocalPhoto({ retry_count: 1 });
    const syncItem = buildSyncQueueItem({ retry_count: 2 });
    const syncQueueChain = {
      equals: vi.fn().mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(syncItem),
        }),
      }),
    };

    vi.spyOn(db.photos, 'get').mockResolvedValue(photo);
    const updatePhotoSpy = vi.spyOn(db.photos, 'update').mockResolvedValue(1 as never);
    vi.spyOn(db.syncQueue, 'where').mockReturnValue(
      syncQueueChain as unknown as ReturnType<typeof db.syncQueue.where>,
    );
    vi.spyOn(db.syncQueue, 'get').mockResolvedValue(syncItem);
    const updateSyncSpy = vi.spyOn(db.syncQueue, 'update').mockResolvedValue(1 as never);

    await markPhotoUploadFailed('photo-1', 'network timeout');

    expect(updatePhotoSpy).toHaveBeenCalledWith(
      'photo-1',
      expect.objectContaining({
        upload_status: 'failed',
        retry_count: 2,
        last_error: 'network timeout',
      }),
    );

    expect(updateSyncSpy).toHaveBeenCalledWith(
      'sync-1',
      expect.objectContaining({
        status: 'failed',
        retry_count: 3,
        last_error: 'network timeout',
      }),
    );
  });

  it('retries sync queue items by resetting failure metadata', async () => {
    const updateSyncSpy = vi.spyOn(db.syncQueue, 'update').mockResolvedValue(1 as never);

    await retrySyncQueueItem('sync-1');

    expect(updateSyncSpy).toHaveBeenCalledWith(
      'sync-1',
      expect.objectContaining({
        status: 'pending',
        last_error: undefined,
      }),
    );
  });
});

describe('dexie conflict workflows', () => {
  it('creates conflict records for manual resolution', async () => {
    const putConflictSpy = vi.spyOn(db.conflicts, 'put').mockResolvedValue('conflict-1' as never);

    const conflictId = await createSyncConflict({
      entity_type: 'ticket',
      entity_id: 'ticket-1',
      sync_queue_item_id: 'sync-1',
      local_payload: { status: 'ON_SITE' },
      server_payload: { status: 'IN_PROGRESS' },
    });

    expect(conflictId).toBeDefined();
    expect(putConflictSpy).toHaveBeenCalledTimes(1);
    expect(putConflictSpy.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        entity_type: 'ticket',
        resolved: false,
      }),
    );
  });

  it('creates conflict records from queue items', async () => {
    const queueItem = buildSyncQueueItem();
    vi.spyOn(db.syncQueue, 'get').mockResolvedValue(queueItem);
    const putConflictSpy = vi.spyOn(db.conflicts, 'put').mockResolvedValue('conflict-1' as never);
    vi.spyOn(db.syncQueue, 'update').mockResolvedValue(1 as never);

    const conflictId = await createSyncConflictFromQueueItem('sync-1', { status: 'SERVER' });

    expect(conflictId).toBeTruthy();
    expect(putConflictSpy).toHaveBeenCalledTimes(1);
  });

  it('loads unresolved conflicts', async () => {
    const conflicts = [buildLocalSyncConflict()];
    const toArray = vi.fn().mockResolvedValue(conflicts);
    const filterSpy = vi
      .spyOn(db.conflicts, 'filter')
      .mockReturnValue({ toArray } as unknown as ReturnType<typeof db.conflicts.filter>);

    const result = await getUnresolvedSyncConflicts();

    expect(filterSpy).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('resolves conflicts using local payload and re-queues sync item', async () => {
    const conflict = buildLocalSyncConflict();
    vi.spyOn(db.conflicts, 'get').mockResolvedValue(conflict);
    const updateConflictSpy = vi.spyOn(db.conflicts, 'update').mockResolvedValue(1 as never);
    const updateSyncSpy = vi.spyOn(db.syncQueue, 'update').mockResolvedValue(1 as never);

    await resolveSyncConflict('conflict-1', 'LOCAL', conflict.local_payload);

    expect(updateConflictSpy).toHaveBeenCalledWith(
      'conflict-1',
      expect.objectContaining({
        resolved: true,
        resolution_strategy: 'LOCAL',
      }),
    );
    expect(updateSyncSpy).toHaveBeenCalledWith(
      'sync-1',
      expect.objectContaining({
        status: 'pending',
        payload: conflict.local_payload,
      }),
    );
  });
});
