'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {ClipboardCheck,Send,Check,RotateCcw,Loader2,ArrowRight} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {FieldAssessmentReadback} from '@/components/features/assessments/FieldAssessmentSheet';
import {useAuth} from '@/components/providers/AuthProvider';
import {useContractorId} from '@/hooks/useContractorId';
import {ticketAssessmentWorkflow,type SubmittedTicketAssessment} from '@/lib/services/ticketAssessmentWorkflow';
import type {TicketDraftSnapshot} from '@/lib/db/dexie';
import type {Ticket} from '@/types';
import {formatDate} from '@/lib/utils/formatters';

export function TicketAssessments({ticket,onChanged}:{ticket:Ticket;onChanged:()=>void}){
  const {profile,can}=useAuth();const {contractorId}=useContractorId(profile?.role==='CONTRACTOR'?profile.id:undefined);
  const [draft,setDraft]=useState<TicketDraftSnapshot|null>(null);const [rows,setRows]=useState<SubmittedTicketAssessment[]>([]);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [notes,setNotes]=useState('');const [reference,setReference]=useState('');
  const chief=profile?.role==='CEO'||profile?.role==='SUPER_ADMIN';
  const canFill=!!profile&&((chief&&can('admin.assessments.edit'))||profile.role==='CONTRACTOR'&&contractorId===ticket.assigned_to);
  const current=rows.find(row=>row.id===ticket.current_assessment_id);
  const stage=ticket.review_stage??'FIELDWORK';
  const canReview=can('admin.assessments.edit')&&ticket.status==='PENDING_REVIEW'&&(stage==='TEAM_LEAD_REVIEW'&&profile?.role==='ADMIN'&&ticket.team_lead_id===profile.id||stage==='FINAL_REVIEW'&&chief);
  const load=useCallback(async()=>{
    if(!profile)return;
    try {const [d,r]=await Promise.all([ticketAssessmentWorkflow.loadDraft(ticket.id,profile.id),ticketAssessmentWorkflow.loadAssessments(ticket.id)]);setDraft(d);setRows(r);setError('');}
    catch(e){setError(e instanceof Error?e.message:'Unable to load the assessment.');}finally{setLoading(false);}
  },[ticket.id,profile]);
  useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(active)void load();});const interval=window.setInterval(()=>void load(),15000);return()=>{active=false;window.clearInterval(interval);};},[load]);
  const action=async(operation:()=>Promise<unknown>,message:string)=>{setBusy(true);setError('');try{await operation();toast.success(message);setNotes('');await load();onChanged();}catch(e){setError(e instanceof Error?e.message:'Unable to complete this action.');}finally{setBusy(false);}};
  const stages=['Field assessment','Team lead review','Final approval','Utility handoff'];
  const step=['TEAM_LEAD_REVIEW','FINAL_REVIEW','APPROVED','UTILITY_SUBMITTED'].indexOf(stage)+1;
  return <section id="assessment" className="cc-work-panel scroll-mt-24 overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b bg-grid-shell/60 p-5 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-widest text-grid-blue">Ticket / assessment</p><h2 className="mt-2 font-heading text-2xl font-semibold text-grid-navy">One ticket. A complete field record.</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Save your findings here, check the record, then send it through both approval stages.</p></div><ClipboardCheck className="size-8 text-grid-blue"/></div>
    <ol className="grid grid-cols-2 gap-3 border-b p-5 sm:grid-cols-4">{stages.map((label,index)=><li key={label} className={`flex items-center gap-2 text-xs font-semibold ${index<=step?'text-grid-navy':'text-muted-foreground'}`}><span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${index<step?'bg-grid-blue text-white':'bg-grid-shell'}`}>{index<step?<Check size={14}/>:index+1}</span>{label}</li>)}</ol>
    <div className="space-y-5 p-5 sm:p-6">
      {loading?<p role="status">Loading assessment…</p>:error?null:<>
      {stage==='CORRECTIONS'&&<div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="font-semibold">Corrections requested</p><p className="mt-2 whitespace-pre-wrap text-sm">{current?.review_notes||current?.team_review_notes||'Open the previous revision to review correction notes.'}</p><p className="mt-2 text-xs">Save a new correction draft. Previous submissions stay in the ticket history.</p></div>}
      {draft&&<div className="rounded-xl border border-grid-blue/30"><div className="border-b bg-grid-blue/5 p-4"><p className="font-semibold text-grid-navy">{draft.submit_requested?'Submission queued for sync':draft.dirty?'Saved on this device · sync pending':'Saved draft · ready for your review'}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(draft.saved_at)} · {draft.submit_requested?'Your team lead will receive it after sync.':'The assessment has not been submitted for approval.'}</p>{draft.last_error&&<div className="mt-2 text-sm text-destructive"><p role="alert">{draft.last_error}</p>{draft.last_error.includes('another device')&&<Button className="mt-2" variant="outline" size="sm" disabled={busy} onClick={()=>void action(async()=>{await ticketAssessmentWorkflow.loadDraft(ticket.id,profile!.id,true);},'Loaded the saved server version')}>Replace device draft with saved server version</Button>}</div>}</div><div className="p-4"><FieldAssessmentReadback assessment={draft.field_assessment} ticketId={ticket.id} photoEvidence={draft.photo_evidence}/></div></div>}
      {!draft&&!rows.length&&<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Assessment required. Open the form once the crew is on site.</p>}
      {canFill&&['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status)&&!draft?.submit_requested&&<div className="flex flex-wrap items-center gap-3"><Button asChild variant={draft?'outline':'default'}><Link href={`/tickets/${ticket.id}/assessment`}><ClipboardCheck/>{draft?'Edit saved assessment':ticket.status==='NEEDS_REWORK'?'Correct assessment':'Assessment'}</Link></Button>{draft&&<Button variant="accent" disabled={busy} onClick={()=>void action(async()=>{const result=await ticketAssessmentWorkflow.submit(ticket.id,profile!.id,draft.assessment_id);if(result==='QUEUED')toast.info('Submission queued. Your team lead will be notified after sync.');},'Assessment submission saved')}><Send/>Submit for team lead review</Button>}</div>}
      {rows.map(row=><details key={row.id} open={row.id===ticket.current_assessment_id} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold text-grid-navy">{row.review_stage?.replaceAll('_',' ')} · {formatDate(row.created_at)}</summary><div className="mt-4 space-y-4">{row.team_review_notes&&<p className="whitespace-pre-wrap text-sm"><strong>Team lead:</strong> {row.team_review_notes}</p>}{row.review_notes&&<p className="whitespace-pre-wrap text-sm"><strong>Final review:</strong> {row.review_notes}</p>}<>{row.field_assessment?<FieldAssessmentReadback assessment={row.field_assessment} ticketId={ticket.id} photoEvidence={row.photo_evidence}/>:<p>Historical assessment · the current field checklist was not recorded.</p>}</></div></details>)}
      {canReview&&current&&<div className="rounded-xl border border-grid-blue/30 bg-grid-blue/5 p-4"><h3 className="font-semibold text-grid-navy">{stage==='FINAL_REVIEW'?'Final approval':'Team lead review'}</h3><Label htmlFor="assessment-review-notes" className="mt-4 mb-2">Review notes · required for corrections</Label><Textarea id="assessment-review-notes" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={4000} disabled={busy}/><div className="mt-4 flex flex-wrap gap-3"><Button variant="accent" disabled={busy} onClick={()=>void action(()=>ticketAssessmentWorkflow.review(current.id,'APPROVED',notes),stage==='FINAL_REVIEW'?'Ticket approved for utility handoff':'Assessment sent for final approval')}><Check/>{stage==='FINAL_REVIEW'?'Grant final approval':'Approve for final review'}<ArrowRight/></Button><Button variant="outline" disabled={busy||!notes.trim()} onClick={()=>void action(()=>ticketAssessmentWorkflow.review(current.id,'NEEDS_REWORK',notes),'Assessment returned for corrections')}><RotateCcw/>Return for corrections</Button></div></div>}
      {chief&&can('admin.tickets.edit')&&stage==='APPROVED'&&<div className="rounded-xl border p-4"><h3 className="font-semibold">Ready for utility handoff</h3><p className="mt-2 text-sm text-muted-foreground">Use Print / Save PDF above to export the approved ticket, assessment, and evidence. After delivering it to the utility, record the handoff here.</p><Label htmlFor="utility-handoff" className="mt-4 mb-2">Delivery reference or handoff notes</Label><Textarea id="utility-handoff" value={reference} onChange={e=>setReference(e.target.value)} maxLength={1000} placeholder="Utility recipient, delivery date, and reference…"/><Button className="mt-3" disabled={busy||!reference.trim()} onClick={()=>void action(()=>ticketAssessmentWorkflow.handoff(ticket.id,reference),'Utility handoff recorded. Ticket closed.')}><Check/>Record utility handoff</Button></div>}
      {stage==='UTILITY_SUBMITTED'&&<div className="rounded-xl bg-emerald-50 p-4 text-emerald-900"><p className="font-semibold">Utility handoff recorded</p><p className="mt-2 whitespace-pre-wrap text-sm">{ticket.utility_submission_reference}</p><p className="mt-1 text-xs">{ticket.utility_submitted_at&&formatDate(ticket.utility_submitted_at)}</p></div>}
      </>}{busy&&<p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin"/>Saving workflow action…</p>}{error&&<div role="alert" className="text-sm text-destructive">{error}<Button className="ml-3" variant="outline" size="sm" onClick={()=>void load()}>Reload</Button></div>}
    </div>
  </section>;
}
