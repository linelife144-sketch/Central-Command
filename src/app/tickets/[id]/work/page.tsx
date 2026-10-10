'use client';

import { isSuperAdminClassRole } from '@/lib/auth/roleGuards';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, ClipboardCheck, Clock3, MapPin, MessageSquarePlus, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/AuthProvider';
import { TicketEntergyForms } from '@/components/features/tickets/TicketEntergyForms';
import { TicketAssessments } from '@/components/features/tickets/TicketAssessments';
import { StatusUpdateFlow } from '@/components/features/tickets/StatusUpdateFlow';
import { TicketWorkNotes } from '@/components/features/tickets/TicketWorkNotes';
import { TicketWorkCompletion } from '@/components/features/tickets/TicketWorkCompletion';
import { TicketStatusBadge } from '@/components/features/tickets/TicketStatusBadge';
import { useContractorId } from '@/hooks/useContractorId';
import { supabase } from '@/lib/supabase/client';
import { ticketService } from '@/lib/services/ticketService';
import { formatAddress } from '@/lib/utils/formatters';
import { getContractorTicketStatus } from '@/lib/utils/statusUpdateFlow';
import { GRID_TICKETS_CHANGED_EVENT } from '@/lib/tickets/events';
import type { Ticket } from '@/types';

export default function TicketWorkPage() {
  const {id}=useParams<{id:string}>();
  const {profile,can}=useAuth();
  const {contractorId}=useContractorId(profile?.role==='CONTRACTOR'?profile.id:undefined);
  const [ticket,setTicket]=useState<Ticket|null>(null);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{
    try{setTicket(await ticketService.getTicketById(id));setError('');}
    catch(e){setError(e instanceof Error?e.message:'Unable to load this ticket. Reconnect and retry.');}
  },[id]);
  useEffect(()=>{void Promise.resolve().then(load);},[load]);
  useEffect(()=>{
    const refresh=()=>void load();
    window.addEventListener(GRID_TICKETS_CHANGED_EVENT,refresh);
    window.addEventListener('online',refresh);
    const channel=supabase.channel(`ticket-work-${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'tickets',filter:`id=eq.${id}`},refresh).subscribe();
    return()=>{window.removeEventListener(GRID_TICKETS_CHANGED_EVENT,refresh);window.removeEventListener('online',refresh);void supabase.removeChannel(channel);};
  },[id,load]);
  if(!profile||!ticket){return error?<div role="alert" className="cc-work-panel p-6"><p>{error}</p><Button variant="outline" className="mt-4" onClick={()=>void load()}>Retry</Button></div>:<div className="space-y-6"><Skeleton className="h-48 w-full"/><Skeleton className="h-64 w-full"/></div>;}
  if(profile.role==='CONTRACTOR'&&!contractorId)return <p role="status">Verifying your crew access…</p>;
  const worker=profile.role==='CONTRACTOR';
  const assigned=worker&&(ticket.assigned_to===contractorId||ticket.assigned_driver_id===contractorId);
  const staff=can('admin.tickets.view')&&(isSuperAdminClassRole(profile.role)||profile.role==='ADMIN'&&ticket.team_lead_id===profile.id);
  if(!assigned&&!staff)return <p role="alert">This ticket is not assigned to your team or crew.</p>;
  const open=getContractorTicketStatus(ticket.status)==='OPEN';
  const canAssess=assigned&&ticket.assigned_to===contractorId||staff&&isSuperAdminClassRole(profile.role)&&can('admin.assessments.edit');
  const fieldReady=['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status);
  const stepLabel=ticket.status==='IN_ROUTE'?'Travel to the ticket location':fieldReady?'Assess the site and record your findings':open?'Prepare for the ticket':'Field work submitted';
  return <div className="space-y-6 pb-4">
    <PageHeader title={`Ticket work · ${ticket.ticket_number}`} description={ticket.utility_client} showBackButton backHref={`/tickets/${id}`}><TicketStatusBadge status={ticket.status} audienceRole={worker?'CONTRACTOR':'STAFF'} reviewStage={ticket.review_stage} utilitySubmittedAt={ticket.utility_submitted_at}/></PageHeader>
    <section aria-labelledby="ticket-work-title" className="storm-surface overflow-hidden rounded-2xl border border-grid-navy/20 p-5 shadow-elevation-lg sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5"><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-grid-lightning">Your field workspace</p><h1 id="ticket-work-title" className="mt-3 font-heading text-3xl font-semibold text-white sm:text-4xl">{stepLabel}</h1><p className="mt-3 flex items-start gap-2 text-sm text-white/80"><MapPin className="mt-0.5 size-4 shrink-0"/>{formatAddress(ticket.address,ticket.city??null,ticket.state??null,ticket.zip_code??null)}</p>{ticket.work_description&&<p className="mt-3 whitespace-pre-wrap text-sm text-white/70">{ticket.work_description}</p>}</div><Button asChild variant="glass" className="text-white"><Link href={`/tickets/${id}`}>Ticket details<ArrowRight className="size-4"/></Link></Button></div>
      <nav aria-label="Ticket work tools" className="mt-6 grid grid-cols-2 gap-2 border-t border-white/15 pt-5 sm:grid-cols-4">{[
        {href:'#entergy-forms',title:ticket.utility_client.toUpperCase()==='ENTERGY'?'Utility forms':'Assessment',Icon:ClipboardCheck},
        {href:'#work-notes',title:'Extra notes',Icon:MessageSquarePlus},
        {href:'#work-notes',title:'Safety escalation',Icon:ShieldAlert},
        {href:'#finish-ticket',title:'Finish ticket',Icon:ArrowRight},
      ].map(({href,title,Icon})=><a key={title} href={href==='#entergy-forms'&&ticket.utility_client.toUpperCase()!=='ENTERGY'?'#field-checklist':href} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-xs font-semibold text-white transition-colors hover:bg-white/15"><Icon className="size-4 text-grid-lightning"/>{title}</a>)}</nav>
    </section>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {assigned&&open&&contractorId&&<StatusUpdateFlow ticket={ticket} userId={profile.id} contractorId={contractorId} canEditAssessment={canAssess} startLabel="Start" onStatusUpdated={load}/>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-6">
        <TicketEntergyForms ticket={ticket} workspace/>
        <section id="field-checklist" className="cc-work-panel scroll-mt-24 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-grid-blue-soft p-2.5 text-grid-blue"><ClipboardCheck className="size-5"/></span><div><h2 className="font-heading text-2xl font-semibold text-grid-navy">Field checklist & photos</h2><p className="mt-1 text-xs text-muted-foreground">Site conditions, section photos, GPS evidence, and final observations.</p></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-lg text-sm text-muted-foreground">Opening the checklist records On Site. Photo evidence still requires GPS verification.</p>{canAssess&&open&&(ticket.status==='IN_ROUTE'||fieldReady)&&<Button asChild variant="accent"><Link href={`/tickets/${id}/assessment`}>Open field checklist<ArrowRight className="size-4"/></Link></Button>}</div>{ticket.status==='ASSIGNED'&&open&&<p className="mt-3 text-xs text-muted-foreground">Start the ticket before opening its field checklist.</p>}</section>
        <TicketWorkNotes ticketId={id} canWrite={open&&(assigned||staff&&can('admin.tickets.edit'))} onChanged={load}/>
        <TicketWorkCompletion ticket={ticket} canSubmit={canAssess} onChanged={load}/>
        <details className="cc-work-panel p-5 sm:p-6"><summary className="cursor-pointer font-semibold text-grid-navy">Saved checklist & submitted assessment</summary><div className="mt-4"><TicketAssessments ticket={ticket} onChanged={load}/></div></details>
      </div>
      <aside className="space-y-5"><div className="cc-work-panel p-5"><h2 className="font-heading text-xl font-semibold text-grid-navy">Site reference</h2><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.special_instructions||'Review the ticket details for dispatcher comments, utility identifiers, and access information.'}</p>{ticket.client_contact_name&&<p className="mt-4 text-sm"><strong>{ticket.client_contact_name}</strong>{ticket.client_contact_phone&&<a className="mt-1 block text-grid-blue underline" href={`tel:${ticket.client_contact_phone}`}>{ticket.client_contact_phone}</a>}</p>}<Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link href={`/tickets/${id}`}>View location & utility details</Link></Button></div>{worker&&<Button asChild variant="outline" className="w-full"><Link href="/contractor/time"><Clock3 className="size-4"/>Time clock</Link></Button>}</aside>
    </div>
  </div>;
}
