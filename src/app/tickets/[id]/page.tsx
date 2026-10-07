
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { Ticket } from '@/types';
import { ticketService } from '@/lib/services/ticketService';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { TicketStatusBadge } from '@/components/features/tickets/TicketStatusBadge';
import { TicketImportanceBadge } from '@/components/features/tickets/TicketImportanceBadge';
import { formatDate } from '@/lib/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/providers/AuthProvider';
import { isAdminClassRole } from '@/lib/auth/roleGuards';
import { TicketWorkNotes } from '@/components/features/tickets/TicketWorkNotes';
import { UtilityTicketDetails } from '@/components/features/tickets/UtilityTicketDetails';
import { StatusHistoryTimeline } from '@/components/features/tickets/StatusHistoryTimeline';
import { TicketPrintButton } from '@/components/features/tickets/TicketPrintButton';
import { TicketAssessments } from '@/components/features/tickets/TicketAssessments';
import { TicketEntergyForms } from '@/components/features/tickets/TicketEntergyForms';
import { AssignedTicketsPanel } from '@/components/features/tickets/AssignedTicketsPanel';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import { useContractorId } from '@/hooks/useContractorId';
import { ticketAssessmentWorkflow } from '@/lib/services/ticketAssessmentWorkflow';
import { getErrorLogContext, getErrorMessage } from '@/lib/utils/errorHandling';
import { GRID_TICKETS_CHANGED_EVENT } from '@/lib/tickets/events';
import { supabase } from '@/lib/supabase/client';

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { profile: user, can } = useAuth();
    const {contractorId}=useContractorId(user?.role==='CONTRACTOR'?user.id:undefined);
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [ticketNotFound, setTicketNotFound] = useState(false);
    const [assigneeName, setAssigneeName] = useState('');
    const [teamLeadName, setTeamLeadName] = useState('');
    const [crewName, setCrewName] = useState('');
    const [tab,setTab]=useState('details');
    const [refreshKey, setRefreshKey] = useState(0);
    const [isChangingDisabled, setIsChangingDisabled] = useState(false);

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
        setIsLoading(true);
        setTicket(null);
        setLoadError(null);
        setTicketNotFound(false);
        try {
            const data = await ticketService.getTicketById(params.id as string);
            setTicket(data);
        } catch (error) {
            const missingTicket = typeof error === 'object'
                && error !== null
                && 'code' in error
                && error.code === 'PGRST116'
                && 'details' in error
                && typeof error.details === 'string'
                && /contains 0 rows/i.test(error.details);
            if (missingTicket) {
                setTicketNotFound(true);
            } else {
                console.error('Failed to load ticket:', getErrorLogContext(error));
                setLoadError(getErrorMessage(error, 'Unable to load this ticket. Please try again.'));
            }
        } finally {
            setIsLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        void Promise.resolve().then(loadTicket);
    }, [loadTicket, params.id]);

    useEffect(() => {
        const refresh = () => void loadTicket();
        window.addEventListener(GRID_TICKETS_CHANGED_EVENT, refresh);
        const channel = supabase.channel(`ticket-detail-${params.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${params.id}` }, refresh)
            .subscribe();
        return () => {
            window.removeEventListener(GRID_TICKETS_CHANGED_EVENT, refresh);
            void supabase.removeChannel(channel);
        };
    }, [loadTicket, params.id]);

    useEffect(() => {
        if (!['#assessment', '#entergy-forms'].includes(window.location.hash) || !ticket || isLoading) return;
        const firstFrame = window.requestAnimationFrame(() => {
            setTab(user?.role === 'CONTRACTOR' ? 'details' : 'assessment');
            window.requestAnimationFrame(() => {
                document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'start' });
            });
        });
        return () => window.cancelAnimationFrame(firstFrame);
    }, [ticket, isLoading, user?.role]);

    const handleStatusUpdated = async () => {
        await loadTicket();
        setRefreshKey(prev => prev + 1);
    };

    const handleTicketDisabledChange = async () => {
        if (!ticket || !user?.id || isChangingDisabled) return;
        const disabled = !ticket.is_deleted;
        if (disabled && !window.confirm(`Disable ticket ${ticket.ticket_number}? Its ticket and assessment history will be retained, and it can be restored later.`)) return;

        setIsChangingDisabled(true);
        try {
            const updated = await ticketService.setTicketDisabled(ticket.id, disabled);
            setTicket(current => current ? { ...current, ...updated } : current);
            toast.success(disabled ? 'Ticket disabled. Its history is retained.' : 'Ticket restored to the active queue.');
            if (disabled) router.replace('/tickets');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to update this ticket.');
        } finally {
            setIsChangingDisabled(false);
        }
    };

    if (isLoading) {
        return <TicketDetailSkeleton />;
    }

    if (!ticket && ticketNotFound) {
        return notFound();
    }

    if (!ticket && loadError) {
        return (
            <div role="alert" className="space-y-4 rounded-xl border border-grid-danger/20 bg-grid-danger-soft p-5 text-grid-danger-ink">
                <p>{loadError}</p>
                <Button variant="outline" onClick={() => void loadTicket()}>Try again</Button>
            </div>
        );
    }

    if (!ticket) return <TicketDetailSkeleton />;

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
                    {user?.role !== 'CONTRACTOR' && <Button variant="accent" onClick={() => setTab('assessment')}>Assessment record</Button>}
                    <div className="flex gap-2">
                        <TicketImportanceBadge isImportant={ticket.is_important} />
                        <TicketStatusBadge status={ticket.status} audienceRole={user?.role === 'CONTRACTOR' ? 'CONTRACTOR' : 'STAFF'} reviewStage={ticket.review_stage} utilitySubmittedAt={ticket.utility_submitted_at} />
                    </div>
                    {user?.role !== 'CONTRACTOR' && <TicketPrintButton ticket={ticket} assigneeName={assigneeName || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()} />}
                    {isAdminClassRole(user?.role) && user?.id && can('admin.tickets.edit') && (
                        <Button
                            type="button"
                            variant={ticket.is_deleted ? 'outline' : 'ghost'}
                            disabled={isChangingDisabled}
                            aria-label={ticket.is_deleted ? 'Restore ticket' : 'Disable ticket'}
                            onClick={() => void handleTicketDisabledChange()}
                        >
                            {ticket.is_deleted ? <ArchiveRestore className="mr-2 size-4" /> : <Archive className="mr-2 size-4" />}
                            {ticket.is_deleted ? 'Restore ticket' : 'Disable ticket'}
                        </Button>
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

                    <Tabs value={tab} onValueChange={setTab}>
                        {user?.role !== 'CONTRACTOR' && <TabsList>
                            <TabsTrigger value="details">Ticket details</TabsTrigger>
                            <TabsTrigger value="assessment">Assessment</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>}
                        <TabsContent value="details" className="mt-4 space-y-4">
                            <UtilityTicketDetails ticket={ticket} />
                            <AssignedTicketsPanel
                                ticket={ticket}
                                userRole={userRole}
                                contractorId={contractorId}
                                teamLeadName={teamLeadName}
                                crewName={crewName}
                            />
                        </TabsContent>
                        {user?.role !== 'CONTRACTOR' && <TabsContent value="assessment">
                            <div className="mt-4">
                                <TicketAssessments ticket={ticket} onChanged={handleStatusUpdated} />
                                <div className="mt-5"><TicketEntergyForms ticket={ticket} /></div>
                                <div className="mt-5"><TicketWorkNotes ticketId={ticket.id} /></div>
                            </div>
                        </TabsContent>}
                        {user?.role !== 'CONTRACTOR' && <TabsContent value="history">
                            <div className="mt-4">
                                <StatusHistoryTimeline ticketId={ticket.id} refreshKey={refreshKey} />
                            </div>
                        </TabsContent>}
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
                            {user?.role !== 'CONTRACTOR' && <div>
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Geofence</span>
                                <p>{ticket.geofence_radius_meters || 500}m</p>
                            </div>}
                            {user?.role === 'CONTRACTOR' && ['DRAFT', 'ASSIGNED', 'NEEDS_REWORK'].includes(ticket.status) && (
                                <div className="pt-2 border-t">
                                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold" asChild>
                                        <Link href={`/contractor/dashboard?dispatchTicketId=${encodeURIComponent(ticket.id)}#dispatch`}>
                                            View team & crew on dashboard
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
