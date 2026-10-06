'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntergyReadback } from '@/components/features/assessments/EntergyFormSheet';
import { AssessmentEvidencePhotos } from '@/components/features/assessments/AssessmentEvidencePhotos';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';
import { entergyFormService, type LocalEntergyRecord } from '@/lib/services/entergyFormService';
import { entergyForms, type EntergyFormKind } from '@/lib/schemas/entergyForms';
import { formatDate } from '@/lib/utils/formatters';
import type { Ticket } from '@/types';

export function TicketEntergyForms({ ticket }: { ticket: Ticket }) {
  const { profile, can } = useAuth();
  const { contractorId } = useContractorId(profile?.role === 'CONTRACTOR' ? profile.id : undefined);
  const [records, setRecords] = useState<LocalEntergyRecord[]>([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const applicable = ticket.utility_client.toUpperCase() === 'ENTERGY';
  const readable = profile?.role === 'CONTRACTOR' || can('admin.assessments.view');
  const canFill = !!ticket.assigned_to && !!profile && ((['CEO','SUPER_ADMIN'].includes(profile.role) && can('admin.assessments.edit')) || profile.role === 'CONTRACTOR' && contractorId === ticket.assigned_to) && ['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status);
  const load = useCallback(async () => {
    if (!profile || !applicable || !readable) return;
    try { setRecords(await entergyFormService.list(ticket.id, profile.id)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load Entergy records.'); }
    finally { setLoading(false); }
  }, [profile, applicable, readable, ticket.id]);
  useEffect(() => { let active=true; void Promise.resolve().then(()=>{if(active)void load();}); const timer=window.setInterval(()=>void load(),15000); return()=>{active=false;window.clearInterval(timer);}; },[load]);
  if (!applicable || !readable) return null;
  return <section id="entergy-forms" className="entergy-section scroll-mt-24"><header className="entergy-section-header"><span className="entergy-section-number"><ClipboardList size={20}/></span><div><h2 className="font-heading text-2xl font-semibold">Entergy forms</h2><p className="mt-1 text-xs text-muted-foreground">Separate official utility forms, attached to this ticket.</p></div></header><div className="space-y-5 p-5 sm:p-6">
    <div className="grid gap-4 sm:grid-cols-2">{(['cleanup','damage'] as EntergyFormKind[]).map(kind=>{
      const draft=records.find(r=>r.record.form_kind===kind && r.record.status==='DRAFT');
      const count=records.filter(r=>r.record.form_kind===kind && r.record.status==='SUBMITTED').length;
      const Icon=kind==='cleanup'?Leaf:ClipboardList;
      return <div key={kind} className="rounded-xl border border-grid-blue/25 bg-grid-blue/5 p-4"><Icon className="text-grid-blue" size={24}/><h3 className="mt-3 font-heading text-2xl font-semibold">{entergyForms[kind].title}</h3><p className="mt-2 text-xs text-muted-foreground">{kind==='cleanup'?'Environmental and trash cleanup, location, access, and notes.':'Equipment, installation/removal, transformer, switches, poles, communication, and customer changes.'}</p><p className="mt-3 text-xs font-semibold">{draft?.submit_requested?'Submission queued':draft?'Draft saved':count?`${count} submitted record${count===1?'':'s'}`:'No form saved yet'}</p>{canFill && !draft?.submit_requested && <Button asChild variant="outline" size="sm" className="mt-4"><Link href={`/tickets/${ticket.id}/entergy/${kind}`}>{draft?'Continue form':count?'Start new revision':'Open form'}<ArrowRight size={14}/></Link></Button>}</div>;
    })}</div>
    {loading && <p role="status" className="text-sm">Loading saved forms…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}<Button variant="outline" size="sm" className="ml-3" onClick={()=>void load()}>Retry</Button></p>}
    {records.map(local=><details key={local.id} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">{entergyForms[local.record.form_kind].title} · {local.submit_requested?'Submission queued':local.dirty?'Saved on this device':local.record.status==='DRAFT'?'Draft':'Submitted'} · {formatDate(local.record.saved_at)}</summary><div className="mt-4 space-y-4">{local.last_error && <p role="alert" className="text-sm text-destructive">{local.last_error}</p>}<EntergyReadback kind={local.record.form_kind} payload={local.record.payload} renderDamagePhotos={section=><AssessmentEvidencePhotos ticketId={ticket.id} evidence={local.record.photo_evidence.filter(p=>p.sectionKey===`entergy:${section}`)}/>}/>{local.record.photo_evidence.filter(p=>!p.sectionKey).length>0 && <div><h3 className="font-heading text-xl">Site evidence</h3><AssessmentEvidencePhotos ticketId={ticket.id} evidence={local.record.photo_evidence.filter(p=>!p.sectionKey)}/></div>}</div></details>)}
    <p className="text-xs text-muted-foreground">Submitted forms are included in this ticket’s completed Print / Save PDF record. Drafts remain editable until submission.</p>
  </div></section>;
}
