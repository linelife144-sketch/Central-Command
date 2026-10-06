'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';
import { ticketAssessmentWorkflow } from '@/lib/services/ticketAssessmentWorkflow';
import { entergyFormService } from '@/lib/services/entergyFormService';
import { ticketWorkNotesService } from '@/lib/services/ticketWorkNotesService';
import { getContractorTicketStatus } from '@/lib/utils/statusUpdateFlow';
import type { TicketDraftSnapshot } from '@/lib/db/dexie';
import type { Ticket } from '@/types';

export function TicketWorkCompletion({ticket,canSubmit,onChanged}:{ticket:Ticket;canSubmit:boolean;onChanged:()=>void|Promise<void>}) {
  const {profile}=useAuth();
  const [draft,setDraft]=useState<TicketDraftSnapshot|null>(null);
  const [pendingForms,setPendingForms]=useState(false);
  const [pendingNotes,setPendingNotes]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const closed=getContractorTicketStatus(ticket.status)==='CLOSED';
  const load=useCallback(async()=>{
    if(!profile||!canSubmit||closed){setLoading(false);return;}
    try {
      const [saved,forms,notes]=await Promise.all([
        ticketAssessmentWorkflow.loadDraft(ticket.id,profile.id),
        ticket.utility_client.toUpperCase()==='ENTERGY'?entergyFormService.list(ticket.id,profile.id):Promise.resolve([]),
        ticketWorkNotesService.list(ticket.id,profile.id),
      ]);
      setDraft(saved);
      setPendingForms(forms.some(f=>f.record.status==='DRAFT'||f.dirty||f.submit_requested));
      setPendingNotes(notes.some(n=>n.pending));setError('');
    }catch(e){setError(e instanceof Error?e.message:'Unable to check ticket completion.');}
    finally{setLoading(false);}
  },[profile,canSubmit,closed,ticket.id,ticket.utility_client]);
  useEffect(()=>{void Promise.resolve().then(load);const interval=window.setInterval(()=>void load(),15000);return()=>window.clearInterval(interval);},[load]);
  async function submit(){
    if(!profile||!draft||busy)return;
    setBusy(true);setError('');
    try {
      // Recheck attachments immediately before closing field work.
      const forms=ticket.utility_client.toUpperCase()==='ENTERGY'?await entergyFormService.list(ticket.id,profile.id):[];
      const notes=await ticketWorkNotesService.list(ticket.id,profile.id);
      if(forms.some(f=>f.record.status==='DRAFT'||f.dirty||f.submit_requested))throw new Error('Finish and submit the Entergy forms you started before sending this ticket.');
      if(notes.some(n=>n.pending))throw new Error('Sync your saved notes and escalations before sending this ticket.');
      const result=await ticketAssessmentWorkflow.submit(ticket.id,profile.id,draft.assessment_id);
      toast.success(result==='QUEUED'?'Ticket submission saved. It will send after reconnecting.':'Ticket sent to your team lead for review.');
      await load();await onChanged();
    }catch(e){setError(e instanceof Error?e.message:'Unable to submit this ticket.');}
    finally{setBusy(false);}
  }
  return <section id="finish-ticket" aria-labelledby="finish-ticket-title" className="cc-work-panel scroll-mt-24 border-t-4 border-t-grid-lightning p-5 sm:p-6">
    <div className="flex items-center gap-3"><CheckCircle2 className="size-6 text-grid-blue"/><h2 id="finish-ticket-title" className="font-heading text-2xl font-semibold text-grid-navy">{closed?'Field work complete':'Finish this ticket'}</h2></div>
    <p className="mt-3 text-sm text-muted-foreground">{closed?'Your ticket is with staff for review, approval, and utility handoff. Returned corrections will reopen it here.':'Save the field checklist and required photos, submit any Entergy forms you started, and review your notes. Then send the ticket to your team lead.'}</p>
    {!closed && <div className="mt-4 space-y-3">
      {!canSubmit?<p className="text-sm text-muted-foreground">The assigned damage assessor sends the completed ticket. Drivers can add notes and report safety issues.</p>:loading?<p role="status">Checking saved work…</p>:<>
        <ul className="space-y-2 text-sm"><li>{draft?'✓ Field checklist saved':'Field checklist and photos still needed'}</li><li>{pendingForms?'Finish and submit your Entergy drafts':'✓ No unfinished Entergy forms'}</li><li>{pendingNotes?'Sync saved notes and escalations':'✓ Notes are synced'}</li></ul>
        <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href={`/tickets/${ticket.id}/assessment`}>{draft?'Review checklist & photos':'Open field checklist'}</Link></Button><Button variant="accent" disabled={busy||!!error||!draft||draft.submit_requested||pendingForms||pendingNotes||!['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status)} onClick={()=>void submit()}>{busy?<Loader2 className="size-4 animate-spin"/>:<Send className="size-4"/>}{draft?.submit_requested?'Submission waiting to sync':'Send ticket for review'}</Button></div>
      </>}
    </div>}
    {error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}<Button variant="outline" size="sm" className="ml-2" onClick={()=>void load()}>Retry</Button></p>}
  </section>;
}
