'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { AssessmentForm } from '@/components/features/assessments';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';
import { ticketService } from '@/lib/services/ticketService';
import { ticketFieldProgressWorkflow } from '@/lib/services/ticketFieldProgressWorkflow';
import type { Ticket } from '@/types';

type AssessmentPageTicket = Ticket & { field_progress_pending?: boolean; field_progress_error?: string };

export default function TicketAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, can } = useAuth();
  const { contractorId } = useContractorId(profile?.role === 'CONTRACTOR' ? profile.id : undefined);
  const [ticket, setTicket] = useState<AssessmentPageTicket | null>(null);
  const [error, setError] = useState('');
  const [openingChecklist, setOpeningChecklist] = useState(false);
  const mounted = useRef(false);
  const startedAction = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void ticketService.getTicketById(id).then(t => {
      if (active) setTicket(t);
    }).catch(e => {
      if (active) setError(e.message ?? 'Unable to load this ticket.');
    });
    return () => { active = false; };
  }, [id]);

  const chief = profile?.role === 'CEO' || profile?.role === 'SUPER_ADMIN';
  const allowed = Boolean(profile && ticket?.assigned_to && (
    chief && can('admin.assessments.edit')
    || profile.role === 'CONTRACTOR' && contractorId === ticket.assigned_to
  ));

  useEffect(() => {
    if (!profile || !ticket || !allowed || profile.role !== 'CONTRACTOR' || !contractorId || ticket.status !== 'IN_ROUTE') return;
    const actionKey = `${profile.id}:${ticket.id}:OPEN_CHECKLIST`;
    if (startedAction.current === actionKey) return;
    startedAction.current = actionKey;
    setOpeningChecklist(true);
    setError('');
    void ticketFieldProgressWorkflow.recordAction({
      ticket,
      actorProfileId: profile.id,
      contractorId,
      action: 'OPEN_CHECKLIST',
    }).then(result => {
      if (!mounted.current) return;
      setTicket(result.ticket);
    }).catch(cause => {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Unable to record checklist arrival.');
    }).finally(() => {
      if (mounted.current) setOpeningChecklist(false);
    });
  }, [allowed, contractorId, profile, ticket]);

  const ready = ticket && ['ON_SITE', 'IN_PROGRESS', 'NEEDS_REWORK'].includes(ticket.status);
  const mustStart = ticket?.status === 'ASSIGNED';
  const assessorMustOpen = ticket?.status === 'IN_ROUTE' && profile?.role !== 'CONTRACTOR';
  const contractorArrivalPending = ticket?.status === 'IN_ROUTE' && profile?.role === 'CONTRACTOR';

  return (
    <div className="space-y-6">
      <PageHeader
        title={ticket ? `Assessment · ${ticket.ticket_number}` : 'Ticket assessment'}
        description="Opening the field checklist records arrival. Photo evidence still requires GPS verification."
        showBackButton
        backHref={`/tickets/${id}/work`}
      />
      {error ? <p role="alert">{error}</p>
        : !ticket || !profile ? <p role="status">Loading your ticket…</p>
          : !allowed ? <p role="alert">Only the assigned damage assessor or an authorized storm manager can fill out this assessment.</p>
            : openingChecklist || contractorArrivalPending ? <p role="status">Recording arrival before opening the checklist…</p>
              : ticket.field_progress_pending ? <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Saved on this device · waiting to sync</p>
                : mustStart ? <div role="status" className="cc-work-panel space-y-3 p-5"><p>Start the ticket before opening its field checklist.</p><Link className="font-semibold text-grid-blue underline" href={`/tickets/${id}/work`}>Go to Ticket work</Link></div>
                  : assessorMustOpen ? <p role="status">The assigned assessor must open the checklist to record arrival.</p>
                    : ready ? <AssessmentForm key={`${profile.id}:${id}`} ticketId={id} contractorId={ticket.assigned_to!} actorProfileId={profile.id} correction={ticket.status === 'NEEDS_REWORK'} onSaved={() => router.push(`/tickets/${id}/work#field-checklist`)} />
                      : <p role="status">This ticket is not ready for assessment.</p>}
    </div>
  );
}
