
'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { Ticket } from '@/types';
import { ticketService } from '@/lib/services/ticketService';
import { stormRosterService } from '@/lib/services/stormRosterService';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { TicketImportanceBadge } from '@/components/features/tickets/TicketImportanceBadge';
import { formatDate, formatAddress } from '@/lib/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/providers/AuthProvider';
import { isAdminClassRole } from '@/lib/auth/roleGuards';
import { StatusUpdater } from '@/components/features/tickets/StatusUpdater';
import { UtilityTicketDetails } from '@/components/features/tickets/UtilityTicketDetails';
import { StatusHistoryTimeline } from '@/components/features/tickets/StatusHistoryTimeline';
import { TicketAssessments } from '@/components/features/tickets/TicketAssessments';

export default function TicketDetailPage() {
    const params = useParams();
    const { profile: user } = useAuth();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [assigneeName, setAssigneeName] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const userRole: 'admin' | 'contractor' =
        isAdminClassRole(user?.role) || user?.role === 'TEAM_LEAD'
            ? 'admin'
            : 'contractor';

    useEffect(() => {
        let cancelled = false;
        setAssigneeName('');
        if (userRole === 'admin' && ticket?.assigned_to && ticket.storm_event_id) {
            stormRosterService.list(ticket.storm_event_id).then(members => {
                if (!cancelled) setAssigneeName(members.find(member => member.contractorId === ticket.assigned_to)?.displayName ?? '');
            }).catch(error => console.error('Failed to load assigned contractor:', error));
        }
        return () => { cancelled = true; };
    }, [ticket?.assigned_to, ticket?.storm_event_id, userRole]);

    const loadTicket = async () => {
        if (!params.id) return;
        try {
            const data = await ticketService.getTicketById(params.id as string);
            setTicket(data);
        } catch (error) {
            console.error('Failed to load ticket:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTicket();
    }, [params.id]);

    const handleStatusUpdated = () => {
        loadTicket();
        setRefreshKey(prev => prev + 1);
    };

    if (isLoading) {
        return <TicketDetailSkeleton />;
    }

    if (!ticket) {
        return notFound();
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Ticket ${ticket.ticket_number}`}
                description={ticket.utility_client}
                backHref="/tickets"
                showBackButton={true}
            >
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className="flex gap-2">
                        <TicketImportanceBadge isImportant={ticket.is_important} />
                        <StatusBadge status={ticket.status} />
                    </div>
                    {user && (
                        <StatusUpdater
                            ticket={ticket}
                            userRole={user.role}
                            userId={user.id}
                            onStatusUpdated={handleStatusUpdated}
                        />
                    )}
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Work Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">{ticket.work_description}</p>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="details">
                        <TabsList>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="assessments">Assessments</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="space-y-4 mt-4">
                            <UtilityTicketDetails ticket={ticket} />
                            <Card>
                                <CardHeader>
                                    <CardTitle>Location & Contact</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground">Address</h4>
                                        <p className="text-lg">{formatAddress(ticket.address, ticket.city ?? null, ticket.state ?? null, ticket.zip_code ?? null)}</p>
                                    </div>
                                    {ticket.client_contact_name && (
                                        <div>
                                            <h4 className="font-semibold text-sm text-muted-foreground">Client Contact</h4>
                                            <p>{ticket.client_contact_name} {ticket.client_contact_phone && `• ${ticket.client_contact_phone}`}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="assessments">
                            <TicketAssessments ticket={ticket} canCreate={userRole === 'contractor'} />
                        </TabsContent>
                        <TabsContent value="history">
                            <div className="mt-4">
                                <StatusHistoryTimeline ticketId={ticket.id} refreshKey={refreshKey} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{userRole === 'contractor' ? 'Metadata' : 'Info'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assigned To</span>
                                <p className="font-semibold">
                                    {userRole === 'contractor'
                                        ? 'You'
                                        : (ticket.assigned_to ? (assigneeName || 'Contractor Assigned') : 'Unassigned')}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Created</span>
                                <p>{formatDate(ticket.created_at)}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Geofence</span>
                                <p>{ticket.geofence_radius_meters}m</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
}

function TicketDetailSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-64 md:col-span-2" />
                <Skeleton className="h-64" />
            </div>
        </div>
    )
}
