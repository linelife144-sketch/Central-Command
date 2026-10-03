'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { ticketService } from '@/lib/services/ticketService';
import type { Ticket } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { AssessmentForm } from '@/components/features/assessments';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';

function AssessmentCreateSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-64 rounded-lg bg-grid-storm-100 animate-pulse" />
      <div className="h-10 w-96 max-w-full rounded-lg bg-grid-storm-100 animate-pulse" />
      <div className="cc-work-panel p-4 sm:p-5">
        <div className="space-y-3">
          <div className="h-10 w-full rounded-md bg-grid-storm-100 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-grid-storm-100 animate-pulse" />
          <div className="h-24 w-full rounded-md bg-grid-storm-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function AssignedAssessmentTickets({contractorId}:{contractorId?:string}) {
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useEffect(()=>{
    let active=true;
    if(!contractorId) return ()=>{active=false;};
    ticketService.getTicketsByAssignee(contractorId).then(rows=>{if(active)setTickets(rows);}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[contractorId]);
  return <div className="space-y-4">
    <p>Select an assigned ticket to continue its assessment workflow.</p>
    {loading ? <p>Loading assigned tickets...</p> : error ? <p role="alert">Unable to load assigned tickets.</p> : tickets.length ? <ul className="space-y-3">{tickets.map(ticket=>{
      const ready=['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status);
      return <li key={ticket.id} className="rounded-lg border p-4"><p className="font-semibold">Ticket {ticket.ticket_number}</p><p>{ticket.address}</p><p className="mb-2 text-sm">{ticket.status.replaceAll('_',' ')}</p><Link className="font-semibold text-primary" href={ready ? `/contractor/assessments/create?ticketId=${ticket.id}` : `/tickets/${ticket.id}`}>{ready ? 'Open Assessment Form' : 'Open Ticket to Continue'}</Link></li>;
    })}</ul> : <p>No assigned tickets.</p>}
  </div>;
}

function AssessmentCreateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { contractorId } = useContractorId(profile?.id);

  const ticketId = searchParams.get('ticketId') ?? undefined;
  const backHref = ticketId ? `/tickets/${ticketId}` : '/tickets';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Damage Assessment"
        description="Document safety conditions, equipment impact, and photo evidence for ticket review."
        showBackButton
        backHref={backHref}
      />

      <div className="cc-work-panel p-4 sm:p-5">
        {ticketId ? <AssessmentForm
          ticketId={ticketId}
          contractorId={contractorId}
          onSaved={() => {
            router.push(backHref);
          }}
        /> : <AssignedAssessmentTickets key={contractorId ?? 'resolving'} contractorId={contractorId} />}
      </div>
    </div>
  );
}

export default function ContractorAssessmentCreatePage() {
  return (
    <Suspense fallback={<AssessmentCreateSkeleton />}>
      <AssessmentCreateInner />
    </Suspense>
  );
}
