'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  createSyncConflictFromQueueItem,
  getPendingPhotoCount,
  getPendingSyncItems,
  getPendingTimeEntryCount,
  getUnresolvedSyncConflicts,
  resolveSyncConflict,
  retrySyncQueueItem,
  type ConflictResolutionStrategy,
  type LocalSyncConflict,
  type SyncQueueItem,
} from '@/lib/db/dexie';
import { ticketAssessmentWorkflow } from '@/lib/services/ticketAssessmentWorkflow';
import { db } from '@/lib/db/dexie';
import { assessmentUploadQueue } from '@/lib/sync/assessmentUploadQueue';
import { photoUploadQueue } from '@/lib/sync/photoUploadQueue';
import { timeEntryUploadQueue } from '@/lib/sync/timeEntryUploadQueue';
import { useAuth } from '@/components/providers/AuthProvider';

type SyncState = 'idle' | 'syncing';

export interface SyncSnapshot {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  failedCount: number;
  pendingPhotoCount: number;
  pendingTimeEntryCount: number;
  conflictCount: number;
  lastSyncedAt?: string;
  lastError?: string;
}

interface SyncContextValue {
  snapshot: SyncSnapshot;
  queueItems: SyncQueueItem[];
  conflicts: LocalSyncConflict[];
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  moveItemToConflict: (id: string) => Promise<void>;
  resolveConflictItem: (
    id: string,
    strategy: ConflictResolutionStrategy,
    resolvedPayload?: unknown,
  ) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

function readOnlineStatus(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true;
  }

  return navigator.onLine;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(readOnlineStatus);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<LocalSyncConflict[]>([]);
  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);
  const [pendingTimeEntryCount, setPendingTimeEntryCount] = useState(0);
  const [pendingTicketDrafts,setPendingTicketDrafts]=useState(0);
  const [failedTicketDrafts,setFailedTicketDrafts]=useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const [pendingItems, unresolvedConflicts, pendingPhotos, pendingTimeEntries] = await Promise.all([
      getPendingSyncItems(),
      getUnresolvedSyncConflicts(),
      getPendingPhotoCount(),
      getPendingTimeEntryCount(),
    ]);

    const drafts=profile?.id?await db.ticketDraftQueue.where('actor_profile_id').equals(profile.id).toArray():[];
    setPendingTicketDrafts(drafts.filter(d=>d.dirty||d.submit_requested).length);
    setFailedTicketDrafts(drafts.filter(d=>d.last_error).length);
    setQueueItems(pendingItems);
    setConflicts(unresolvedConflicts);
    setPendingPhotoCount(pendingPhotos);
    setPendingTimeEntryCount(pendingTimeEntries);
  }, [profile]);

  const syncNow = useCallback(async () => {
    if (!readOnlineStatus()) {
      setLastError('Cannot sync while offline.');
      return;
    }

    setSyncState('syncing');
    setLastError(undefined);

    try {
      const result = await photoUploadQueue.process();
      const timeResult = await timeEntryUploadQueue.process();
      const assessmentResult = await assessmentUploadQueue.process();

      const draftResult = profile?.id ? await ticketAssessmentWorkflow.process(profile.id) : {failed:0,errors:[]};
      if (draftResult.failed) setLastError(draftResult.errors[0]);
      if (draftResult.failed > 0 || result.failed > 0 || timeResult.failed > 0 || assessmentResult.failed > 0) {
        setLastError(`${result.failed} photo upload(s) and ${timeResult.failed} time entry sync(s) and ${assessmentResult.failed + draftResult.failed} assessment sync(s) failed. Review queue items for retry.`);
      } else {
        setLastSyncedAt(new Date().toISOString());
      }

      await refresh();
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Sync failed.');
    } finally {
      setSyncState('idle');
    }
  }, [refresh,profile]);

  useEffect(() => {
    if (isOnline && profile?.id) void Promise.resolve().then(syncNow);
  }, [isOnline, profile?.id, syncNow]);

  const retryItem = useCallback(
    async (id: string) => {
      await retrySyncQueueItem(id);
      await refresh();

      if (readOnlineStatus()) {
        await syncNow();
      }
    },
    [refresh, syncNow],
  );

  const moveItemToConflict = useCallback(
    async (id: string) => {
      await createSyncConflictFromQueueItem(id);
      await refresh();
    },
    [refresh],
  );

  const resolveConflictItem = useCallback(
    async (id: string, strategy: ConflictResolutionStrategy, resolvedPayload?: unknown) => {
      await resolveSyncConflict(id, strategy, resolvedPayload);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void Promise.resolve().then(refresh);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent<{ type?: string }>) => {
      if (!event.data?.type?.startsWith('SYNC_')) {
        return;
      }

      void Promise.resolve().then(refresh);
      if (readOnlineStatus()) {
        void syncNow();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [refresh, syncNow]);

  const pendingCount = queueItems.filter((item) => item.status === 'pending').length + pendingTicketDrafts;
  const failedCount = queueItems.filter((item) => item.status === 'failed').length + failedTicketDrafts;

  const snapshot = useMemo<SyncSnapshot>(
    () => ({
      isOnline,
      syncState,
      pendingCount,
      failedCount,
      pendingPhotoCount,
      pendingTimeEntryCount,
      conflictCount: conflicts.length,
      lastSyncedAt,
      lastError,
    }),
    [
      conflicts.length,
      failedCount,
      isOnline,
      lastError,
      lastSyncedAt,
      pendingCount,
      pendingPhotoCount,
      pendingTimeEntryCount,
      syncState,
    ],
  );

  const value = useMemo<SyncContextValue>(
    () => ({
      snapshot,
      queueItems,
      conflicts,
      refresh,
      syncNow,
      retryItem,
      moveItemToConflict,
      resolveConflictItem,
    }),
    [conflicts, moveItemToConflict, queueItems, refresh, resolveConflictItem, retryItem, snapshot, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }

  return context;
}
