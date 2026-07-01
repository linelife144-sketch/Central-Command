'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSync } from '@/components/providers/SyncProvider';

function formatTimestamp(value?: string): string {
  if (!value) {
    return 'Never';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(parsed);
}

function formatPayloadPreview(payload: unknown): string {
  try {
    return JSON.stringify(payload).slice(0, 120);
  } catch {
    return 'Unable to preview payload';
  }
}

export function SyncStatus() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { snapshot, queueItems, conflicts, syncNow, retryItem, moveItemToConflict, resolveConflictItem } = useSync();

  const queueSummary = useMemo(() => {
    return `${snapshot.pendingCount} pending / ${snapshot.failedCount} failed`;
  }, [snapshot.failedCount, snapshot.pendingCount]);

  return (
    <Card className="fixed right-4 bottom-4 z-40 w-[320px] border-[rgba(255,192,56,0.7)] shadow-[0_12px_26px_rgba(0,24,88,0.36)] backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Sync Status</span>
          <Badge variant={snapshot.isOnline ? 'default' : 'destructive'}>
            {snapshot.isOnline ? 'Online' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="text-xs text-muted-foreground">{queueSummary}</div>
        <div className="text-xs text-muted-foreground">
          Photos queued: {snapshot.pendingPhotoCount} | Time queued: {snapshot.pendingTimeEntryCount}
        </div>
        <div className="text-xs text-muted-foreground">Conflicts: {snapshot.conflictCount}</div>
        <div className="text-xs text-muted-foreground">Last sync: {formatTimestamp(snapshot.lastSyncedAt)}</div>
        {snapshot.lastError ? <div className="text-xs text-destructive">{snapshot.lastError}</div> : null}
        <div className="flex items-center gap-2">
          <Button
            className="flex-1"
            disabled={!snapshot.isOnline || snapshot.syncState === 'syncing'}
            onClick={() => {
              void syncNow();
            }}
            size="sm"
          >
            {snapshot.syncState === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-2xl">
              <DialogHeader>
                <DialogTitle>Sync Queue & Conflict Resolution</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-grid-navy">Queue Items</h3>
                  <ScrollArea className="h-[360px] rounded-md border p-3">
                    {queueItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No pending or failed queue items.</p>
                    ) : (
                      <div className="space-y-3">
                        {queueItems.map((item) => (
                          <div className="space-y-2 rounded-md border p-2" key={item.id}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium">
                                {item.entity_type}:{item.entity_id}
                              </span>
                              <Badge variant={item.status === 'failed' ? 'destructive' : 'secondary'}>
                                {item.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Operation: {item.operation} | Retries: {item.retry_count}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Payload: {formatPayloadPreview(item.payload)}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {item.status === 'failed' ? (
                                <>
                                  <Button
                                    onClick={() => {
                                      void retryItem(item.id);
                                    }}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Retry
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      void moveItemToConflict(item.id);
                                    }}
                                    size="sm"
                                    variant="destructive"
                                  >
                                    Move to Conflict
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </section>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-grid-navy">Conflicts</h3>
                  <ScrollArea className="h-[360px] rounded-md border p-3">
                    {conflicts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No unresolved conflicts.</p>
                    ) : (
                      <div className="space-y-3">
                        {conflicts.map((conflict) => (
                          <div className="space-y-2 rounded-md border p-2" key={conflict.id}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium">
                                {conflict.entity_type}:{conflict.entity_id}
                              </span>
                              <Badge variant="destructive">Conflict</Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Local: {formatPayloadPreview(conflict.local_payload)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Server: {formatPayloadPreview(conflict.server_payload)}
                            </div>
                            <Separator />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                onClick={() => {
                                  void resolveConflictItem(conflict.id, 'LOCAL', conflict.local_payload);
                                }}
                                size="sm"
                                variant="outline"
                              >
                                Use Local
                              </Button>
                              <Button
                                onClick={() => {
                                  void resolveConflictItem(conflict.id, 'SERVER', conflict.server_payload);
                                }}
                                size="sm"
                                variant="secondary"
                              >
                                Use Server
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </section>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
