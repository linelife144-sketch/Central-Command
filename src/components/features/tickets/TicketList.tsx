

'use client';

import { useEffect, useState, useMemo } from 'react';
import { Ticket } from '@/types';
import { ticketService } from '@/lib/services/ticketService';
import { DataTable, Column } from '@/components/common/data-display/DataTable';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { formatDate } from '@/lib/utils/formatters';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TicketFilters, TicketFiltersState } from './TicketFilters';
import { TicketCard } from './TicketCard';
import { TicketAssign } from './TicketAssign';
import { toast } from 'sonner';

interface TicketListProps {
    userRole: 'admin' | 'subcontractor';
    userId?: string; // For subcontractor view
}

export function TicketList({ userRole, userId }: TicketListProps) {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<TicketFiltersState>({
        search: "",
        status: "ALL",
        priority: "ALL",
    });
    const [assignRequest, setAssignRequest] = useState<{ ticketId: string, ticketNumber: string, currentAssigneeId?: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function loadTickets() {
            setIsLoading(true);
            try {
                let data: Ticket[];
                if (userRole === 'subcontractor' && userId) {
                    data = await ticketService.getTicketsByAssignee(userId);
                } else {
                    data = await ticketService.getTickets();
                }
                setTickets(Array.isArray(data) ? data : []);
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

    const loadTickets = async () => {
        // Re-implement or expose if needed for manual reload. 
        // But wait, I used loadTickets() in handleAssignTicket.
        // So I should keep it outside, but wrap in useCallback.
    };


    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const matchesSearch = filters.search === "" ||
                ticket.ticket_number.toLowerCase().includes(filters.search.toLowerCase()) ||
                ticket.utility_client.toLowerCase().includes(filters.search.toLowerCase()) ||
                (ticket.work_description && ticket.work_description.toLowerCase().includes(filters.search.toLowerCase()));

            const matchesStatus = filters.status === "ALL" || ticket.status === filters.status;
            const matchesPriority = filters.priority === "ALL" || ticket.priority === filters.priority;

            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [tickets, filters]);

    const handleAssignTicket = async (subcontractorId: string) => {
        if (!assignRequest) return;
        try {
            await ticketService.updateTicket(assignRequest.ticketId, {
                assigned_to: subcontractorId,
                status: 'ASSIGNED', // Automatically update status to ASSIGNED? Or keep existing? Usually logic implies assignment = assigned status.
                // But check existing status... if it was DRAFT, now ASSIGNED.
            });
            toast.success(`Ticket ${assignRequest.ticketNumber} assigned successfully`);
            loadTickets(); // Reload to update list
        } catch (error) {
            console.error("Failed to assign ticket", error);
            toast.error("Failed to assign ticket");
        }
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
            key: 'title',
            header: 'Client / Description',
            cell: (ticket) => (
                <div className="flex flex-col">
                    <span className="font-medium">{ticket.utility_client}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {ticket.work_description || 'No description'}
                    </span>
                </div>
            ),
        },
        {
            key: 'priority',
            header: 'Priority',
            cell: (ticket) => <TicketPriorityBadge priority={ticket.priority} />,
        },
        {
            key: 'status',
            header: 'Status',
            cell: (ticket) => <StatusBadge status={ticket.status} />,
        },
        {
            key: 'location',
            header: 'Location',
            cell: (ticket) => (
                <div className="text-sm">
                    {ticket.city}, {ticket.state}
                </div>
            )
        },
        {
            key: 'created_at',
            header: 'Created',
            cell: (ticket) => formatDate(ticket.created_at),
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
                    {userRole === 'admin' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Assign Ticket"
                            onClick={(e) => {
                                e.stopPropagation();
                                setAssignRequest({
                                    ticketId: ticket.id,
                                    ticketNumber: ticket.ticket_number,
                                    currentAssigneeId: ticket.assigned_to
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
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
                {userRole === 'admin' && (
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
                ticketNumber={assignRequest?.ticketNumber || ''}
            />
        </div>
    );
}

