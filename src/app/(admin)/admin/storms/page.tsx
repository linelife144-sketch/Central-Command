'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudRain, Plus, Ticket as TicketIcon } from 'lucide-react';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        description="Create and manage storm events as the root umbrella for tickets, crews, time, expenses, and billing."
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

      <div className="grid gap-4">
        {isLoading ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-grid-muted">Loading storm events...</div>
        ) : stormEvents.length === 0 ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-grid-muted">
            No storm events found. Create a storm event to begin the operational workflow.
          </div>
        ) : (
          stormEvents.map((stormEvent) => (
            <Card key={stormEvent.id} className="storm-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-grid-navy">
                  <CloudRain className="h-5 w-5 text-grid-blue" />
                  {stormEvent.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-grid-muted">
                  <p>Utility Client: {stormEvent.utilityClient}</p>
                  <p>Status: {stormEvent.status}</p>
                  <p>Region: {stormEvent.region ?? 'Unspecified Region'}</p>
                  <p>Active Tickets: {stormEvent.activeTickets}</p>
                </div>
                {canCreateTicketEntries ? (
                  <Button asChild variant="storm" size="sm" title="Create ticket entry within this storm event">
                    <Link
                      href={`/tickets/create?storm_event_id=${encodeURIComponent(stormEvent.id)}&utility_client=${encodeURIComponent(stormEvent.utilityClient)}`}
                    >
                      <TicketIcon className="h-4 w-4 mr-2" />
                      Create Ticket Entry
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="storm"
                    size="sm"
                    disabled
                    title="Only Super Admin can create ticket entries"
                  >
                    <TicketIcon className="h-4 w-4 mr-2" />
                    Create Ticket Entry
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
