'use client';
import {useEffect,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import {PageHeader} from '@/components/common/layout/PageHeader';
import {AssessmentForm} from '@/components/features/assessments';
import {useAuth} from '@/components/providers/AuthProvider';
import {useContractorId} from '@/hooks/useContractorId';
import {ticketService} from '@/lib/services/ticketService';
import type {Ticket} from '@/types';

export default function TicketAssessmentPage(){
  const {id}=useParams<{id:string}>();const router=useRouter();const {profile,can}=useAuth();
  const {contractorId}=useContractorId(profile?.role==='CONTRACTOR'?profile.id:undefined);
  const [ticket,setTicket]=useState<Ticket|null>(null);const [error,setError]=useState('');
  useEffect(()=>{let active=true;void ticketService.getTicketById(id).then(t=>{if(active)setTicket(t);}).catch(e=>{if(active)setError(e.message??'Unable to load this ticket.');});return()=>{active=false;};},[id]);
  const chief=profile?.role==='CEO'||profile?.role==='SUPER_ADMIN';
  const allowed=profile&&ticket?.assigned_to&&((chief&&can('admin.assessments.edit'))||profile.role==='CONTRACTOR'&&contractorId===ticket.assigned_to);
  const ready=ticket&&['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status);
  return <div className="space-y-6"><PageHeader title={ticket?`Assessment · ${ticket.ticket_number}`:'Ticket assessment'} description="Save the assessment, review it on the ticket, then submit it to your team lead." showBackButton backHref={`/tickets/${id}`}/>
    {error?<p role="alert">{error}</p>:!ticket||!profile?<p role="status">Loading your ticket…</p>:!allowed?<p role="alert">Only the assigned damage assessor or an authorized storm manager can fill out this assessment. Your crew can review it from the ticket.</p>:!ready?<p role="status">The crew must be on site before assessing this ticket. Submitted assessments remain available on the ticket for review.</p>:<AssessmentForm key={`${profile.id}:${id}`} ticketId={id} contractorId={ticket.assigned_to!} actorProfileId={profile.id} correction={ticket.status==='NEEDS_REWORK'} onSaved={()=>router.push(`/tickets/${id}#assessment`)}/>}
  </div>;
}
