'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, ClipboardList, MapPin, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketStatusBadge } from '@/components/features/tickets/TicketStatusBadge';
import { TicketImportanceBadge } from '@/components/features/tickets/TicketImportanceBadge';
import { ticketService } from '@/lib/services/ticketService';
import { formatAddress, formatDate } from '@/lib/utils/formatters';
import { supabase } from '@/lib/supabase/client';
import { GRID_TICKETS_CHANGED_EVENT } from '@/lib/tickets/events';
import type { Ticket } from '@/types';

type TicketScope =
  | { kind: 'crew'; id: string }
  | { kind: 'team'; id: string }
  | { kind: 'assignee'; id: string };

interface AssignedTicketsPanelProps {
  ticket: Ticket;
  userRole: 'admin' | 'contractor';
  contractorId?: string | null;
  teamLeadName?: string;
  crewName?: string;
}

function getScope(
  ticket: Ticket,
  userRole: AssignedTicketsPanelProps['userRole'],
  contractorId?: string | null,
): TicketScope | null {
  if (ticket.crew_id) return { kind: 'crew', id: ticket.crew_id };
  if (userRole === 'contractor') {
    return contractorId ? { kind: 'assignee', id: contractorId } : null;
  }
  if (ticket.team_lead_id) return { kind: 'team', id: ticket.team_lead_id };
  const assigneeId = ticket.assigned_to ?? ticket.assigned_driver_id;
  return assigneeId ? { kind: 'assignee', id: assigneeId } : null;
}

function matchesScope(ticket: Ticket, scope: TicketScope): boolean {
  if (scope.kind === 'crew') return ticket.crew_id === scope.id;
  if (scope.kind === 'team') return ticket.team_lead_id === scope.id;
  return ticket.assigned_to === scope.id || ticket.assigned_driver_id === scope.id;
}

export function AssignedTicketsPanel({
  ticket,
  userRole,
  contractorId,
  teamLeadName,
  crewName,
}: AssignedTicketsPanelProps) {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const scope = useMemo(
    () => getScope(ticket, userRole, contractorId),
    [ticket, userRole, contractorId],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    if (!scope) {
      setRows([]);
      setLoading(false);
      return () => { active = false; };
    }

    const load = async () => {
      try {
        const assigned = scope.kind === 'crew'
          ? await ticketService.getTicketsByCrew(scope.id)
          : scope.kind === 'team'
            ? await ticketService.getTicketsByTeamLead(scope.id)
            : await ticketService.getTicketsByAssignee(scope.id);
        if (!active) return;

        const matching = assigned.filter(row => matchesScope(row, scope));
        if (matchesScope(ticket, scope)) matching.push(ticket);
        const unique = new Map(matching.map(row => [row.id, row] as const));
        const ordered = [...unique.values()].sort((left, right) => {
          if (left.id === ticket.id) return -1;
          if (right.id === ticket.id) return 1;
          const leftDate = Date.parse(left.due_date ?? left.scheduled_date ?? left.created_at);
          const rightDate = Date.parse(right.due_date ?? right.scheduled_date ?? right.created_at);
          return leftDate - rightDate;
        });
        setRows(ordered);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load assigned tickets.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const refresh = () => setRetryKey(value => value + 1);
    window.addEventListener(GRID_TICKETS_CHANGED_EVENT, refresh);
    const channel = supabase.channel(`assigned-ticket-queue-${scope.kind}-${scope.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, refresh)
      .subscribe();
    return () => {
      active = false;
      window.removeEventListener(GRID_TICKETS_CHANGED_EVENT, refresh);
      void supabase.removeChannel(channel);
    };
  }, [ticket, scope, retryKey]);

  const scopeLabel = !scope
    ? 'No crew or team assignment'
    : scope.kind === 'crew'
      ? `Crew · ${crewName || 'Assigned crew'}`
      : scope.kind === 'team'
        ? `Team · ${teamLeadName || 'Assigned team'}`
        : userRole === 'contractor'
          ? 'Your assigned tickets'
          : 'Assigned contractor';

  return (
    <section id="assigned-tickets" aria-labelledby="assigned-tickets-title" className="cc-work-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-grid-shell/60 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-grid-navy text-grid-lightning shadow-elevation-sm">
            <ClipboardList className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="assigned-tickets-title" className="font-heading text-xl font-semibold text-grid-navy">Assigned tickets</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <UsersRound className="size-3.5" aria-hidden="true" />
              <span>{scopeLabel}</span>
            </p>
          </div>
        </div>
        <span className="rounded-full border border-grid-blue/15 bg-card/80 px-3 py-1 text-xs font-semibold tabular-nums text-grid-navy">
          {loading ? 'Loading' : `${rows.length} ${rows.length === 1 ? 'ticket' : 'tickets'}`}
        </span>
      </div>

      {loading ? (
        <ul aria-label="Loading assigned tickets" className="divide-y">
          {[0, 1, 2].map(item => (
            <li key={item} className="space-y-2 px-5 py-4 sm:px-6">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-2/3" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm sm:px-6">
          <span className="text-grid-danger-ink">{error}</span>
          <Button variant="outline" size="sm" onClick={() => setRetryKey(value => value + 1)}>Retry</Button>
        </div>
      ) : !scope ? (
        <div role="status" className="px-5 py-8 text-center sm:px-6">
          <p className="font-semibold text-grid-navy">This ticket has not been assigned yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">The crew or team queue will appear here after dispatch.</p>
        </div>
      ) : rows.length === 0 ? (
        <div role="status" className="px-5 py-8 text-center text-sm text-muted-foreground sm:px-6">
          No tickets are linked to this crew or team.
        </div>
      ) : (
        <ul className="max-h-[30rem] divide-y overflow-y-auto">
          {rows.map(row => {
            const isCurrent = row.id === ticket.id;
            const address = formatAddress(row.address, row.city ?? null, row.state ?? null, row.zip_code ?? null);
            const targetDate = row.due_date ?? row.scheduled_date;
            return (
              <li key={row.id}>
                <Link
                  href={`/tickets/${row.id}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`group grid min-w-0 gap-3 px-5 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-grid-blue sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 ${isCurrent ? 'border-l-[3px] border-l-grid-lightning bg-grid-blue-soft/35' : 'border-l-[3px] border-l-transparent hover:bg-grid-blue-soft/25'}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-grid-navy">{row.ticket_number}</span>
                      {isCurrent && <span className="rounded-full bg-grid-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Current</span>}
                      <TicketImportanceBadge isImportant={row.is_important} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">{row.utility_client}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{address}</span></span>
                      {targetDate && <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" /><span>{formatDate(targetDate)}</span></span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <TicketStatusBadge status={row.status} audienceRole={userRole === 'contractor' ? 'CONTRACTOR' : 'STAFF'} reviewStage={row.review_stage} utilitySubmittedAt={row.utility_submitted_at} />
                    <ArrowUpRight className="size-4 text-grid-blue transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
