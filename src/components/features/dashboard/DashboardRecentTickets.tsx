'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/common/data-display/DataTable';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardTicketService, type DashboardTicketRow } from '@/lib/services/dashboardTicketService';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { supabase } from '@/lib/supabase/client';
import { GRID_TICKETS_CHANGED_EVENT, GRID_TICKETS_VERSION_KEY } from '@/lib/tickets/events';

const columns: Column<DashboardTicketRow>[] = [
  { key: 'ticket', header: 'Ticket #', cell: row => <span className="font-medium">{row.ticketNumber}</span> },
  { key: 'location', header: 'Location', cell: row => row.location || 'Location unavailable' },
  { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} size="sm" /> },
  { key: 'assignedTo', header: 'Assigned', cell: row => row.assignedTo },
  { key: 'dueAt', header: 'Due', cell: row => row.dueAt },
];

export function DashboardRecentTickets() {
  const [tickets, setTickets] = useState<DashboardTicketRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const load = useCallback(async () => {
    try { setError(''); setTickets(await dashboardTicketService.getRecentTickets()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load recent tickets.'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleLoad = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void load(); }, 200);
    };
    const onStorage = (event: StorageEvent) => { if (event.key === GRID_TICKETS_VERSION_KEY) scheduleLoad(); };
    window.addEventListener(GRID_TICKETS_CHANGED_EVENT, scheduleLoad);
    window.addEventListener('storage', onStorage);
    let channel: ReturnType<typeof supabase.channel> | undefined;
    if (!isSuperAdminTestingEnabled()) {
      channel = supabase.channel('dashboard-recent-tickets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, scheduleLoad)
        .subscribe();
    }
    const fallback = window.setInterval(scheduleLoad, 30000);
    return () => {
      window.removeEventListener(GRID_TICKETS_CHANGED_EVENT, scheduleLoad);
      window.removeEventListener('storage', onStorage);
      window.clearInterval(fallback);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load]);

  return <Card className="lg:col-span-2">
    <CardHeader className="flex flex-row items-center justify-between">
      <div><CardTitle>Recent Tickets</CardTitle><p aria-live="polite" className="mt-1 text-sm text-muted-foreground">Latest ticket data refreshes as changes come in.</p></div>
      <Button variant="ghost" size="sm" asChild><Link href="/tickets">View All</Link></Button>
    </CardHeader>
    <CardContent>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <DataTable columns={columns} data={tickets} keyExtractor={row => row.id} isLoading={isLoading} emptyMessage="No tickets have been created yet."
        onRowClick={row => router.push(`/tickets/${row.id}`)} />
    </CardContent>
  </Card>;
}
