
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { Ticket } from '@/types';
import { ticketService } from '@/lib/services/ticketService';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { TicketStatusBadge } from '@/components/features/tickets/TicketStatusBadge';
import { TicketImportanceBadge } from '@/components/features/tickets/TicketImportanceBadge';
import { formatDate, formatAddress } from '@/lib/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/providers/AuthProvider';
import { isAdminClassRole } from '@/lib/auth/roleGuards';
import { StatusUpdateFlow } from '@/components/features/tickets/StatusUpdateFlow';
import { UtilityTicketDetails } from '@/components/features/tickets/UtilityTicketDetails';
import { StatusHistoryTimeline } from '@/components/features/tickets/StatusHistoryTimeline';
import { TicketPrintButton } from '@/components/features/tickets/TicketPrintButton';
import { TicketAssessments } from '@/components/features/tickets/TicketAssessments';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useContractorId } from '@/hooks/useContractorId';
import { ticketAssessmentWorkflow } from '@/lib/services/ticketAssessmentWorkflow';

export default function TicketDetailPage() {
    const params = useParams();
    const { profile: user,can } = useAuth();
    const {contractorId}=useContractorId(user?.role==='CONTRACTOR'?user.id:undefined);
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [assigneeName, setAssigneeName] = useState('');
    const [teamLeadName, setTeamLeadName] = useState('');
    const [crewName, setCrewName] = useState('');
    const [tab,setTab]=useState('details');
    const [refreshKey, setRefreshKey] = useState(0);

    const userRole: 'admin' | 'contractor' =
        isAdminClassRole(user?.role) || user?.role === 'TEAM_LEAD'
            ? 'admin'
            : 'contractor';

    useEffect(() => {
        let active = true;
        if (ticket) void ticketAssessmentWorkflow.options(ticket.id).then(options=>{
            if(!active) return;
            const assignedCrew = options.crews.find(c=>c.id===ticket.crew_id);
            const team = options.teamLeads.find(l=>l.id===ticket.team_lead_id);
            setAssigneeName(assignedCrew?.assessorName??'');
            setTeamLeadName(team?.name??'');
            setCrewName(assignedCrew?.name??'');
        }).catch(()=>undefined);
        return ()=>{active=false;};
    }, [ticket]);

    const loadTicket = useCallback(async () => {
        if (!params.id) return;
        try {
            const data = await ticketService.getTicketById(params.id as string);
            setTicket(data);
        } catch (error) {
            console.error('Failed to load ticket:', error);
        } finally {
            setIsLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        void Promise.resolve().then(loadTicket);
    }, [loadTicket]);

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

    if (user?.role==='CONTRACTOR' && !contractorId) return <p role="status">Verifying your crew access…</p>;
    if (user?.role==='CONTRACTOR' && ticket.assigned_to!==contractorId && ticket.assigned_driver_id!==contractorId || user?.role==='ADMIN' && ticket.team_lead_id!==user.id) return <p role="alert">This ticket is not assigned to your team or crew.</p>;

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Ticket ${ticket.ticket_number}`}
                description={ticket.utility_client}
                backHref="/tickets"
                showBackButton={true}
            >
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <Button asChild variant="accent"><Link onClick={()=>setTab('details')} href={['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status)&&(user?.role==='CONTRACTOR'&&contractorId===ticket.assigned_to||['CEO','SUPER_ADMIN'].includes(user?.role??'')&&can('admin.assessments.edit'))?`/tickets/${ticket.id}/assessment`:'#assessment'}>Assessment</Link></Button>
                    <div className="flex gap-2">
                        <TicketImportanceBadge isImportant={ticket.is_important} />
                        <TicketStatusBadge status={ticket.status} />
                    </div>
                    <TicketPrintButton ticket={ticket} assigneeName={assigneeName || (userRole === 'contractor' ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() : undefined)} />

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

                    <Tabs value={tab} onValueChange={setTab}>
                        <TabsList>
                            <TabsTrigger value="details">Ticket & assessment</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="space-y-4 mt-4">
                            <UtilityTicketDetails ticket={ticket} />
                            <TicketAssessments ticket={ticket} onChanged={handleStatusUpdated} />
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
                        <TabsContent value="history">
                            <div className="mt-4">
                                <StatusHistoryTimeline ticketId={ticket.id} refreshKey={refreshKey} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-6">
                    {user?.role==='CONTRACTOR'&&<StatusUpdateFlow ticket={ticket} userRole={user.role} userId={user.id} onStatusUpdated={handleStatusUpdated}/> }
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
                            {userRole === 'admin' && ticket.team_lead_id && (
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Team Lead</span>
                                    <p className="font-semibold">{teamLeadName || 'Assigned team lead'}</p>
                                </div>
                            )}
                            {userRole === 'admin' && ticket.crew_id && (
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Crew</span>
                                    <p className="font-semibold">{crewName || 'Assigned crew'}</p>
                                </div>
                            )}
                            <div>
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Created</span>
                                <p>{formatDate(ticket.created_at)}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Geofence</span>
                                <p>{ticket.geofence_radius_meters}m</p>
                            </div>
                            {userRole === 'admin' && can('admin.tickets.edit') && ['DRAFT', 'ASSIGNED', 'NEEDS_REWORK'].includes(ticket.status) && (
                                <div className="pt-2 border-t">
                                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold" asChild>
                                        <Link href={`/admin/dashboard?dispatchTicketId=${ticket.id}#dispatch`}>
                                            Manage dispatch on dashboard
                                        </Link>
                                    </Button>
                                </div>
                            )}
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
