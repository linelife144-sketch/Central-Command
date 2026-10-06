'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketStatusBadge } from '@/components/features/tickets/TicketStatusBadge';
import type { ContractorDispatchTicket } from '@/lib/services/contractorDashboardService';
import { formatAddress } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { getContractorTicketStatus } from '@/lib/utils/statusUpdateFlow';

type DispatchFilter = 'ALL' | 'NEEDS_LEAD' | 'NEEDS_CREW' | 'DISPATCHED';

export interface DashboardDispatchProps {
  tickets?: ContractorDispatchTicket[] | null;
  isLoading?: boolean;
  isUnavailable?: boolean;
  className?: string;
}

export function getActiveAssignedDispatchTickets(tickets: ContractorDispatchTicket[]): ContractorDispatchTicket[] {
  return tickets.filter(ticket => getContractorTicketStatus(ticket.status) === 'OPEN');
}

const filters: { value: DispatchFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'NEEDS_LEAD', label: 'Needs lead' },
  { value: 'NEEDS_CREW', label: 'Needs crew' },
  { value: 'DISPATCHED', label: 'Dispatched' },
];

export function DashboardDispatch({ tickets, isLoading = false, isUnavailable = false, className }: DashboardDispatchProps) {
  const searchParams = useSearchParams();
  const requestedTicketId = searchParams.get('dispatchTicketId');
  const [filter, setFilter] = useState<DispatchFilter>('ALL');
  const [search, setSearch] = useState('');

  const activeTickets = useMemo(() => getActiveAssignedDispatchTickets(tickets ?? []), [tickets]);
  const counts = useMemo(() => ({
    ALL: activeTickets.length,
    NEEDS_LEAD: activeTickets.filter(ticket => !ticket.team_lead_id).length,
    NEEDS_CREW: activeTickets.filter(ticket => ticket.team_lead_id && !ticket.crew_id).length,
    DISPATCHED: activeTickets.filter(ticket => ticket.team_lead_id && ticket.crew_id).length,
  }), [activeTickets]);
  const deepLinkUnavailable = Boolean(requestedTicketId && !activeTickets.some(ticket => ticket.id === requestedTicketId));
  const selectedTicketId = requestedTicketId ?? activeTickets[0]?.id ?? null;
  const visibleTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeTickets.filter(ticket => {
      if (filter === 'NEEDS_LEAD' && ticket.team_lead_id) return false;
      if (filter === 'NEEDS_CREW' && (!ticket.team_lead_id || ticket.crew_id)) return false;
      if (filter === 'DISPATCHED' && (!ticket.team_lead_id || !ticket.crew_id)) return false;
      if (!query) return true;
      return [ticket.ticket_number, ticket.utility_client, ticket.address, ticket.city, ticket.state]
        .some(value => value?.toLowerCase().includes(query));
    });
  }, [activeTickets, filter, search]);
  const selectedTicket = activeTickets.find(ticket => ticket.id === selectedTicketId) ?? null;

  return (
    <section id="dispatch" className={cn('scroll-mt-24', className)} aria-labelledby="contractor-dispatch-title">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-grid-shell/60 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="cc-eyebrow mb-2"><span aria-hidden="true" />Field operations</div>
              <CardTitle id="contractor-dispatch-title" className="flex items-center gap-2 text-grid-navy">
                <Users className="size-5 text-grid-blue" /> Team & crew dispatch
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Your assigned tickets and the team supporting your field work.</p>
            </div>
            <span className="rounded-full border border-grid-blue/15 bg-card/80 px-3 py-1 text-xs font-semibold tabular-nums text-grid-navy">
              {isLoading ? 'Loading' : `${activeTickets.length} ${activeTickets.length === 1 ? 'ticket' : 'tickets'}`}
            </span>
          </div>
        </CardHeader>

        <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0 border-b p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Search assigned tickets" placeholder="Search your tickets…" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter assigned tickets">
              {filters.map(item => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    filter === item.value ? 'bg-grid-navy text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {item.label} ({counts[item.value]})
                </button>
              ))}
            </div>

            {isLoading ? (
              <p role="status" className="py-10 text-center text-sm text-muted-foreground">Loading your dispatch queue…</p>
            ) : isUnavailable ? (
              <p role="alert" className="py-10 text-center text-sm text-muted-foreground">Your assigned tickets are unavailable. Refresh the dashboard to try again.</p>
            ) : deepLinkUnavailable ? (
              <p role="status" className="py-10 text-center text-sm text-muted-foreground">That ticket is not part of your assigned work.</p>
            ) : activeTickets.length ? (
              <ul className="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
                {visibleTickets.map(ticket => {
                  const selected = ticket.id === selectedTicketId;
                  return (
                    <li key={ticket.id}>
                      <Link
                        href={`/contractor/dashboard?dispatchTicketId=${encodeURIComponent(ticket.id)}#dispatch`}
                        aria-pressed={selected}
                        aria-current={selected ? 'true' : undefined}
                        className={cn(
                          'block w-full rounded-xl border p-3 text-left transition-colors hover:border-grid-blue/40 hover:bg-grid-blue-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grid-blue',
                          selected && 'border-grid-blue/35 bg-grid-blue-soft/35',
                        )}
                      >
                        <span className="block min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm text-grid-navy">#{ticket.ticket_number}</strong>
                            <TicketStatusBadge status={ticket.status} audienceRole="CONTRACTOR" size="sm" />
                          </span>
                          <span className="mt-1.5 block truncate text-xs font-normal text-muted-foreground">{formatAddress(ticket.address, ticket.city ?? null, ticket.state ?? null, null)}</span>
                          <span className="mt-1 block truncate text-xs font-medium text-muted-foreground">{ticket.utility_client}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border bg-surface-sunken px-5 py-8 text-center text-sm text-muted-foreground">
                {activeTickets.length ? 'No tickets match this filter.' : 'Team and crew details will appear here when a ticket is assigned to you.'}
              </p>
            )}
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            {selectedTicket && !deepLinkUnavailable ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected assignment</p>
                    <h3 className="mt-1 font-heading text-xl font-semibold text-grid-navy">Ticket #{selectedTicket.ticket_number}</h3>
                  </div>
                  <Link href={`/tickets/${selectedTicket.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-grid-blue hover:underline">
                    Open ticket <ArrowRight className="size-4" />
                  </Link>
                </div>
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-surface-sunken p-4">
                    <dt className="text-xs font-medium text-muted-foreground">Team lead</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-grid-navy">{selectedTicket.teamLeadName || (selectedTicket.team_lead_id ? 'Assigned team lead' : 'Awaiting team lead')}</dd>
                  </div>
                  <div className="rounded-xl bg-surface-sunken p-4">
                    <dt className="text-xs font-medium text-muted-foreground">Crew</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-grid-navy">{selectedTicket.crewName || (selectedTicket.crew_id ? 'Assigned crew' : 'Awaiting crew')}</dd>
                  </div>
                  <div className="rounded-xl bg-surface-sunken p-4">
                    <dt className="text-xs font-medium text-muted-foreground">Driver</dt>
                    <dd className="mt-1.5 text-sm text-grid-navy">{selectedTicket.driverName || (selectedTicket.crew_id ? 'Assigned driver' : 'Awaiting driver')}</dd>
                  </div>
                  <div className="rounded-xl bg-surface-sunken p-4">
                    <dt className="text-xs font-medium text-muted-foreground">Damage assessor</dt>
                    <dd className="mt-1.5 text-sm text-grid-navy">{selectedTicket.assessorName || (selectedTicket.crew_id ? 'Assigned damage assessor' : 'Awaiting damage assessor')}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center text-center text-muted-foreground">
                <Users className="mb-2 size-8 opacity-50" aria-hidden="true" />
                <p className="font-semibold">No ticket selected</p>
                <p className="mt-1 max-w-sm text-xs">Select one of your assigned tickets to see its team lead, crew, driver, and assessor.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
