'use client';

import { useStormContext } from '@/components/providers/StormContextProvider';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CloudLightning, Loader2, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/AuthProvider';
import { stormRosterService } from '@/lib/services/stormRosterService';
import {
  type StormEventStatus,
  type StormEventSummary,
} from '@/lib/services/stormEventService';
import { formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

interface StormEventBannerProps {
  className?: string;
}

const STORM_STATUS_BADGE: Record<StormEventStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  MOB: { label: 'Mobilizing', variant: 'secondary' },
  ACTIVE: { label: 'Active', variant: 'default' },
  'DE-MOB': { label: 'Demobilizing', variant: 'secondary' },
  RELEASED: { label: 'Released', variant: 'outline' },
  BILLING: { label: 'Billing', variant: 'outline' },
  CLOSED: { label: 'Closed', variant: 'outline' },
};

interface AdminStormHeadline {
  event: StormEventSummary | null;
  contractorCount: number | null;
  loadedAt: string;
}

export function StormEventBanner({ className }: StormEventBannerProps) {
  const { can } = useAuth();
  const { stormEventId, selectedStorm } = useStormContext();
  const request = useRef(0);
  const cancelRequests = useCallback(() => { request.current++; }, []);
  const [headline, setHeadline] = useState<AdminStormHeadline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHeadline = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const version = ++request.current;
    setError(null);

    try {
      const event = selectedStorm ?? null;
      const contractors = stormEventId ? await stormRosterService.list(stormEventId).catch(() => null) : null;
      if (version !== request.current) return;

      setHeadline({
        event,
        contractorCount: contractors ? contractors.length : null,
        loadedAt: new Date().toISOString(),
      });
    } catch {
      if (version !== request.current) return;
      // A failed refresh keeps the last good headline visible; the error alert explains itself.
      setError('Unable to load the active storm event.');
    } finally {
      if (version !== request.current) return;
      if (mode === 'refresh') {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [stormEventId, selectedStorm]);

  useEffect(() => {
    if (!can('admin.storms.view')) {
      return;
    }

    let active = true;
    void (async () => {
      if (!active) return;
      await loadHeadline('initial');
    })();
    return () => {
      active = false; cancelRequests();
    };
  }, [can, loadHeadline, cancelRequests]);

  if (!can('admin.storms.view')) {
    return null;
  }

  if (!stormEventId) return <Card className={className}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-6"><div><h2 className="text-xl font-bold text-grid-navy">Company-wide operations</h2><p className="mt-1 text-sm text-muted-foreground">These dashboard totals include all storms. Choose a storm to focus this dashboard.</p></div><Button asChild variant="outline"><Link href="/admin/storms">Storm workspaces<ArrowUpRight className="ml-2 size-4" /></Link></Button></CardContent></Card>;

  const event = selectedStorm ?? null;
  const hasData = headline !== null;

  return (
    <section className={cn('space-y-2', className)} aria-busy={isLoading || isRefreshing}>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Unable to load the active storm event.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadHeadline('refresh');
              }}
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading && !hasData ? (
        <Card className="p-6">
          <span className="sr-only">Loading storm event</span>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-7 w-64" />
          <Skeleton className="mt-4 h-4 w-80" />
        </Card>
      ) : event ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="cc-eyebrow mb-1">
                  <CloudLightning className="size-3.5 text-grid-lightning" aria-hidden="true" />
                  Selected storm
                </div>
                <h2 className="text-xl font-bold leading-tight text-[#0a1733]">
                  {event.name.trim().length > 0 ? event.name : event.eventCode}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.eventCode} · {event.utilityClient}
                  {event.region ? ` · ${event.region}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STORM_STATUS_BADGE[event.status].variant}>
                  {STORM_STATUS_BADGE[event.status].label}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isRefreshing}
                  onClick={() => {
                    void loadHeadline('refresh');
                  }}
                >
                  {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="sr-only sm:not-sr-only sm:ml-2">Refresh</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Started</p>
                <p className="text-lg font-bold text-[#0a1733]">{formatDate(event.startDate) ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active tickets</p>
                <p className="text-lg font-bold text-[#0a1733]">{event.activeTickets ?? 'Unavailable'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active contractors</p>
                <p className="text-lg font-bold text-[#0a1733]">
                  {headline?.contractorCount ?? 'Unavailable'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/admin/storms/${event.id}`}>
                  Open workspace
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/storms">All storm events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="cc-eyebrow mb-1">
                  <CloudLightning className="size-3.5 text-grid-lightning" aria-hidden="true" />
                  No active storm
                </div>
                <h2 className="text-xl font-bold leading-tight text-[#0a1733]">No storm event is active</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a storm event to headline this dashboard.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isRefreshing}
                onClick={() => {
                  void loadHeadline('refresh');
                }}
              >
                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="sr-only sm:not-sr-only sm:ml-2">Refresh</span>
              </Button>
            </div>
            {can('admin.storms.edit') && (
              <div>
                <Button asChild>
                  <Link href="/admin/storms/create">
                    Create storm event
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
