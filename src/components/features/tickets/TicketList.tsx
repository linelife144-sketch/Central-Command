

'use client';

import { useEffect, useState, useMemo } from 'react';
import { Ticket } from '@/types';
import { ticketService } from '@/lib/services/ticketService';
import { DataTable, Column } from '@/components/common/data-display/DataTable';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { TicketImportanceBadge } from './TicketImportanceBadge';
import { formatAddress, formatDateTime } from '@/lib/utils/formatters';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TicketFilters, TicketFiltersState } from './TicketFilters';
import { TicketCard } from './TicketCard';
import { TicketAssign } from './TicketAssign';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';
import { contractorService } from '@/lib/services/contractorService';
import { getFeederFromPayload } from '@/lib/tickets/templates';

interface TicketListProps {
    userRole: 'admin' | 'contractor';
    userId?: string; // For contractor view
}

export function TicketList({ userRole, userId }: TicketListProps) {
    const { can } = useAuth();
    const canEdit = userRole === 'admin' && can('admin.tickets.edit');
    const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [feedersByTicketId, setFeedersByTicketId] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<TicketFiltersState>({
        search: "",
        status: "ALL",
        importance: "ALL",
    });
    const [assignRequest, setAssignRequest] = useState<{ ticketId: string, ticketNumber: string, currentAssigneeId?: string, stormEventId?: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function loadTickets() {
            setIsLoading(true);
            try {
                let data: Ticket[];
                if (userRole === 'contractor' && userId) {
                    data = await ticketService.getTicketsByAssignee(userId);
                } else {
                    data = await ticketService.getTickets();
                }
                setTickets(Array.isArray(data) ? data : []);
                if (userRole === 'admin') {
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
        }
        loadTickets();
    }, [userRole, userId]);

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

            const matchesStatus = filters.status === "ALL" || ticket.status === filters.status;
            const matchesImportance = filters.importance === "ALL" || (filters.importance === "IMPORTANT" ? ticket.is_important : !ticket.is_important);

            return matchesSearch && matchesStatus && matchesImportance;
        });
    }, [tickets, filters, assigneeNames]);

    const handleAssignTicket = async (contractorId: string) => {
        if (!assignRequest) return;
        const updated = await ticketService.assignTicket(assignRequest.ticketId, contractorId);
        setTickets(previous => previous.map(ticket => ticket.id === updated.id ? updated : ticket));
        toast.success(`Ticket ${assignRequest.ticketNumber} assigned successfully`);
    };

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
            cell: (ticket) => <StatusBadge status={ticket.status} />,
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
                        <Link href={`/tickets/${ticket.id}`}>
                            View
                        </Link>
                    </Button>
                    {canEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Assign Ticket"
                            onClick={(e) => {
                                e.stopPropagation();
                                setAssignRequest({
                                    ticketId: ticket.id,
                                    ticketNumber: ticket.ticket_number,
                                    currentAssigneeId: ticket.assigned_to,
                                    stormEventId: ticket.storm_event_id ?? undefined
                                });
                            }}
                        >
                            <UserPlus className="h-4 w-4" />
                        </Button>
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
                {canEdit && (
                    <Button asChild>
                        <Link href="/tickets/create">
                            <Plus className="mr-2 h-4 w-4" /> Create Ticket
                        </Link>
                    </Button>
                )}
            </div>

            <TicketFilters onFilterChange={setFilters} />

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
                            assigneeName={ticket.assigned_to ? assigneeNames[ticket.assigned_to] ?? (userRole === 'contractor' ? 'You' : undefined) : undefined}
                            onClick={handleRowClick}
                        />
                    ))
                )}
            </div>

            <TicketAssign
                isOpen={!!assignRequest}
                onClose={() => setAssignRequest(null)}
                onAssign={handleAssignTicket}
                currentAssigneeId={assignRequest?.currentAssigneeId}
                stormEventId={assignRequest?.stormEventId}
                ticketNumber={assignRequest?.ticketNumber || ''}
            />
        </div>
    );
}
