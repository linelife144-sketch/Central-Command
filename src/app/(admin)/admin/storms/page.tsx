'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CloudLightning, Plus, Ticket as TicketIcon } from 'lucide-react';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/AuthProvider';
import { canPerformManagementAction } from '@/lib/auth/authorization';
import { stormEventService, type StormEventSummary } from '@/lib/services/stormEventService';
import { getErrorMessage, isAuthOrPermissionError } from '@/lib/utils/errorHandling';
import { toast } from 'sonner';

export default function StormEventsPage() {
  const { profile } = useAuth();
  const [stormEvents, setStormEvents] = useState<StormEventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const canManageStormEvents = canPerformManagementAction(profile?.role, 'storm_event_write');
  const canCreateTicketEntries = canPerformManagementAction(profile?.role, 'ticket_entry_write');

  useEffect(() => {
    let active = true;

    const loadStormEvents = async () => {
      setIsLoading(true);
      try {
        const data = await stormEventService.listStormEvents();
        if (active) {
          setStormEvents(data);
        }
      } catch (error) {
        if (!isAuthOrPermissionError(error)) {
          toast.error(getErrorMessage(error, 'Failed to load storm events'));
        }
        if (active) {
          setStormEvents([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadStormEvents();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storm Events"
        description="Coordinate each response with connected tickets, contractor crews, and field assessments."
      >
        {canManageStormEvents ? (
          <Button asChild title="Create a new storm event umbrella" variant="storm">
            <Link href="/admin/storms/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Storm Event
            </Link>
          </Button>
        ) : (
          <Button disabled title="Only Super Admin can create storm events" variant="storm">
            <Plus className="h-4 w-4 mr-2" />
            Create Storm Event
          </Button>
        )}
      </PageHeader>

      {!canManageStormEvents && (
        <div className="rounded-xl border border-grid-warning bg-grid-warning-soft p-3 text-sm text-grid-navy">
          Admin users can view storm events, but create/edit actions are restricted to Super Admin.
        </div>
      )}

      <div className="stagger-children grid gap-5 2xl:grid-cols-2">
        {isLoading ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-grid-muted">Loading storm events...</div>
        ) : stormEvents.length === 0 ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-grid-muted">
            No storm events found. Create a storm event to begin the operational workflow.
          </div>
        ) : (
          stormEvents.map((stormEvent) => (
            <Card key={stormEvent.id} className="cc-storm-event">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between gap-3"><span className="cc-eyebrow">{stormEvent.eventCode}</span><Badge variant="brand">{stormEvent.status.replaceAll('_', ' ')}</Badge></div>
                <CardTitle className="flex items-center gap-3 text-2xl text-grid-navy">
                  <span className="cc-action-icon"><CloudLightning className="size-5" /></span>
                  {stormEvent.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <dl className="cc-storm-meta"><div><dt>Utility client</dt><dd>{stormEvent.utilityClient}</dd></div><div><dt>Region</dt><dd>{stormEvent.region ?? 'Unspecified'}</dd></div><div><dt>Active tickets</dt><dd>{stormEvent.activeTickets}</dd></div></dl>
                <div className="flex flex-wrap items-center justify-between gap-3">
                <Link className="inline-flex items-center gap-2 text-xs font-bold text-grid-navy underline-offset-4 hover:underline" href={`/admin/storms/${stormEvent.id}`}>Open workspace<ArrowUpRight className="size-4" /></Link>
                {canCreateTicketEntries ? (
                  <Button asChild variant="outline" size="sm" title="Create ticket entry within this storm event">
                    <Link
                      href={`/storms/${stormEvent.id}/tickets/new`}
                    >
                      <TicketIcon className="h-4 w-4 mr-2" />
                      Create Ticket Entry
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="Only Super Admin can create ticket entries"
                  >
                    <TicketIcon className="h-4 w-4 mr-2" />
                    Create Ticket Entry
                  </Button>
                )}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
