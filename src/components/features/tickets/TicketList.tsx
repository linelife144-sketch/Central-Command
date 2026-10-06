

'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Ticket } from '@/types';
import { ticketService } from '@/lib/services/ticketService';
import { DataTable, Column } from '@/components/common/data-display/DataTable';
import { TicketStatusBadge } from '@/components/features/tickets/TicketStatusBadge';
import { TicketImportanceBadge } from './TicketImportanceBadge';
import { formatAddress, formatDateTime } from '@/lib/utils/formatters';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TicketFilters, TicketFiltersState } from './TicketFilters';
import { TicketCard } from './TicketCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';
import { contractorService } from '@/lib/services/contractorService';
import { getFeederFromPayload } from '@/lib/tickets/templates';
import { getContractorTicketDisplayStatus } from '@/lib/utils/statusUpdateFlow';
import { supabase } from '@/lib/supabase/client';
import { GRID_TICKETS_CHANGED_EVENT } from '@/lib/tickets/events';

interface TicketListProps {
    userRole: 'admin' | 'contractor';
    userId?: string; // For contractor view
}

export function TicketList({ userRole, userId }: TicketListProps) {
    const { can, profile } = useAuth();
    const profileRole = profile?.role;
    const canCreate = ['CEO','SUPER_ADMIN'].includes(profile?.role??'') && can('admin.tickets.edit');
    const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [feedersByTicketId, setFeedersByTicketId] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<TicketFiltersState>({
        search: "",
        status: "ALL",
        importance: "ALL",
    });
    const router = useRouter();

    const loadTickets = useCallback(async () => {
            setIsLoading(true);
            try {
                let data: Ticket[];
                if (userRole === 'contractor' && userId) {
                    data = await ticketService.getTicketsByAssignee(userId);
                } else {
                    data = await ticketService.getTickets();
                }
                setTickets(Array.isArray(data) ? data : []);
                if (userRole === 'admin' && profileRole !== 'ADMIN') {
                    try {
                        const contractors = await contractorService.listContractors();
                        setAssigneeNames(Object.fromEntries(contractors.map(c => [c.id, c.fullName])));
                    } catch { toast.error('Unable to load contractor names'); }
                }
                try {
                    const payloads = await ticketService.getUtilityPayloadsByTicketIds(data.map(ticket => ticket.id));
                    setFeedersByTicketId(
                        Object.fromEntries(
                            Object.entries(payloads)
                                .map(([ticketId, payload]) => [ticketId, getFeederFromPayload(payload)])
                                .filter(([, feeder]) => feeder !== null) as [string, string][]
                        )
                    );
                } catch { /* Feeder number is a non-critical enhancement to the list view. */ }
            } catch (error) {
                console.error('Failed to load tickets:', error);
                setTickets([]);
                toast.error("Failed to load tickets");
            } finally {
                setIsLoading(false);
            }
    }, [userRole, userId, profileRole]);

    useEffect(() => {
        void Promise.resolve().then(loadTickets);
        const refresh = () => void loadTickets();
        window.addEventListener(GRID_TICKETS_CHANGED_EVENT, refresh);
        const channel = supabase.channel(`ticket-list-${userRole}-${userId ?? 'staff'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, refresh)
            .subscribe();
        return () => {
            window.removeEventListener(GRID_TICKETS_CHANGED_EVENT, refresh);
            void supabase.removeChannel(channel);
        };
    }, [loadTickets, userRole, userId]);

    const filteredTickets = useMemo(() => {
        const search = filters.search.trim().toLowerCase();
        return tickets.filter(ticket => {
            const matchesSearch = !search || [
                ticket.ticket_number,
                ticket.utility_client,
                ticket.work_description,
                ticket.address,
                ticket.city,
                ticket.state,
                ticket.assigned_to ? assigneeNames[ticket.assigned_to] : '',
            ].filter(Boolean).join(' ').toLowerCase().includes(search);

            const matchesStatus = filters.status === "ALL" || (userRole === 'contractor'
                ? getContractorTicketDisplayStatus(ticket.status) === filters.status
                : filters.status === 'ON_SITE'
                    ? ['ON_SITE', 'IN_PROGRESS', 'COMPLETE'].includes(ticket.status)
                    : ticket.status === filters.status);
            const matchesImportance = filters.importance === "ALL" || (filters.importance === "IMPORTANT" ? ticket.is_important : !ticket.is_important);

            return matchesSearch && matchesStatus && matchesImportance;
        });
    }, [tickets, filters, assigneeNames, userRole]);

    const columns: Column<Ticket>[] = [
        {
            key: 'ticket_number',
            header: 'Ticket #',
            cell: (ticket) => (
                <span className="font-medium">{ticket.ticket_number}</span>
            ),
        },
        {
            key: 'assigned_to',
            header: 'Assigned To',
            cell: ticket => ticket.assigned_to ? assigneeNames[ticket.assigned_to] ?? (userRole === 'contractor' ? 'You' : 'Contractor assigned') : 'Unassigned',
        },
        {
            key: 'title',
            header: 'Utility / Feeder',
            cell: (ticket) => (
                <div className="flex flex-col">
                    <span className="font-medium">{ticket.utility_client}</span>
                    {feedersByTicketId[ticket.id] ? (
                        <span className="text-xs font-semibold text-grid-blue">Feeder {feedersByTicketId[ticket.id]}</span>
                    ) : (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {ticket.work_description || 'No description'}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'importance',
            header: 'Importance',
            cell: (ticket) => <TicketImportanceBadge isImportant={ticket.is_important} />,
        },
        {
            key: 'status',
            header: 'Status',
            cell: (ticket) => <TicketStatusBadge status={ticket.status} audienceRole={userRole === 'contractor' ? 'CONTRACTOR' : 'STAFF'} reviewStage={ticket.review_stage} utilitySubmittedAt={ticket.utility_submitted_at} />,
        },
        {
            key: 'location',
            header: 'Outage Location',
            cell: (ticket) => (
                <div className="text-sm">
                    {formatAddress(ticket.address, ticket.city ?? null, ticket.state ?? null, ticket.zip_code ?? null)}
                </div>
            )
        },
        {
            key: 'created_at',
            header: 'Created',
            cell: (ticket) => formatDateTime(ticket.created_at),
        },
        {
            key: 'actions',
            header: '',
            cell: (ticket) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={userRole === 'contractor' ? `/tickets/${ticket.id}` : `/tickets/${ticket.id}#assessment`}>
                            {userRole === 'contractor' ? 'Open ticket' : 'Assessment'}
                        </Link>
                    </Button>
                    {['DRAFT', 'ASSIGNED', 'NEEDS_REWORK'].includes(ticket.status) && (
                        userRole === 'contractor' ? (
                            <Button variant="ghost" size="icon" asChild title="View team and crew">
                                <Link
                                    href={`/contractor/dashboard?dispatchTicketId=${encodeURIComponent(ticket.id)}#dispatch`}
                                    aria-label={`View team and crew for ticket ${ticket.ticket_number}`}
                                    onClick={event => event.stopPropagation()}
                                >
                                    <Users className="size-4" />
                                </Link>
                            </Button>
                        ) : can('admin.tickets.edit') ? (
                            <Button variant="ghost" size="sm" asChild title="Open ticket dispatch details">
                                <Link href={`/tickets/${ticket.id}`} onClick={event => event.stopPropagation()}>
                                    Dispatch details
                                </Link>
                            </Button>
                        ) : null
                    )}
                </div>
            ),
        },
    ];

    const handleRowClick = (ticket: Ticket) => {
        router.push(`/tickets/${ticket.id}`);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="cc-section-heading">Ticket queue</h2><p className="mt-1 text-xs text-muted-foreground">{isLoading ? 'Loading your workload…' : `${filteredTickets.length} ${filteredTickets.length === 1 ? 'ticket' : 'tickets'} in this view`}</p></div>
                {canCreate && (
                    <Button asChild>
                        <Link href="/tickets/create">
                            <Plus className="mr-2 h-4 w-4" /> Create Ticket
                        </Link>
                    </Button>
                )}
            </div>

            <TicketFilters onFilterChange={setFilters} userRole={userRole} />

            {/* Desktop View */}
            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={filteredTickets}
                    keyExtractor={(ticket) => ticket.id}
                    isLoading={isLoading}
                    onRowClick={handleRowClick}
                    emptyMessage="No tickets found matching your filters."
                />
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading tickets...</div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No tickets found matching your filters.</div>
                ) : (
                    filteredTickets.map(ticket => (
                        <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            audienceRole={userRole === 'contractor' ? 'CONTRACTOR' : 'STAFF'}
                            assigneeName={ticket.assigned_to ? assigneeNames[ticket.assigned_to] ?? (userRole === 'contractor' ? 'You' : undefined) : undefined}
                            onClick={handleRowClick}
                        />
                    ))
                )}
            </div>


        </div>
    );
}
