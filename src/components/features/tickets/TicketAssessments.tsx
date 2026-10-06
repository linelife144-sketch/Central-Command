'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FieldAssessmentReadback } from '@/components/features/assessments/FieldAssessmentSheet';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';
import { ticketAssessmentWorkflow, type SubmittedTicketAssessment } from '@/lib/services/ticketAssessmentWorkflow';
import type { TicketDraftSnapshot } from '@/lib/db/dexie';
import type { Ticket } from '@/types';
import { formatDate } from '@/lib/utils/formatters';

function correctionNote(row?: SubmittedTicketAssessment): string {
  return (row?.team_review_notes || row?.review_notes || '').replace(/^\[NEEDS_REWORK\]\s*/i, '');
}

function staffStageLabel(stage: string): string {
  switch (stage) {
    case 'TEAM_LEAD_REVIEW': return 'Review · team lead';
    case 'FINAL_REVIEW': return 'Final review · CEO / Super Admin';
    case 'CORRECTIONS': return 'Corrections';
    case 'APPROVED': return 'Approved';
    case 'UTILITY_SUBMITTED': return 'Submitted to utility';
    default: return 'Assessment';
  }
}

export function TicketAssessments({ ticket, onChanged }: { ticket: Ticket; onChanged: () => void | Promise<void> }) {
  const { profile, can } = useAuth();
  const { contractorId } = useContractorId(profile?.role === 'CONTRACTOR' ? profile.id : undefined);
  const [draft, setDraft] = useState<TicketDraftSnapshot | null>(null);
  const [rows, setRows] = useState<SubmittedTicketAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const chief = profile?.role === 'CEO' || profile?.role === 'SUPER_ADMIN';
  const contractor = profile?.role === 'CONTRACTOR';
  const canFill = !!profile && ((chief && can('admin.assessments.edit')) || (contractor && contractorId === ticket.assigned_to));
  const current = rows.find(row => row.id === ticket.current_assessment_id);
  const stage = ticket.review_stage ?? 'FIELDWORK';
  const canReview = can('admin.assessments.edit') && ticket.status === 'PENDING_REVIEW'
    && ((stage === 'TEAM_LEAD_REVIEW' && profile?.role === 'ADMIN' && ticket.team_lead_id === profile.id)
      || (stage === 'FINAL_REVIEW' && chief));
  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [savedDraft, submittedRows] = await Promise.all([
        ticketAssessmentWorkflow.loadDraft(ticket.id, profile.id),
        ticketAssessmentWorkflow.loadAssessments(ticket.id),
      ]);
      setDraft(savedDraft);
      setRows(submittedRows);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the assessment.');
    } finally {
      setLoading(false);
    }
  }, [ticket.id, profile]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    const interval = window.setInterval(() => void load(), 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [load]);

  const action = async (operation: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError('');
    try {
      await operation();
      toast.success(message);
      setNotes('');
      await load();
      await onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to complete this action.');
    } finally {
      setBusy(false);
    }
  };

  if (contractor && !loading && !error && !draft && !current && ticket.status !== 'NEEDS_REWORK') return null;

  return (
    <section id="assessment" className="cc-work-panel scroll-mt-24 overflow-hidden">
      <div className="space-y-5 p-5 sm:p-6">
        {contractor ? <>
          {ticket.status === 'NEEDS_REWORK' && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <p className="font-semibold">Corrections requested</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{correctionNote(current) || 'Review the note from your team lead before correcting the assessment.'}</p>
          </div>}
          {loading && !draft && !current && <p role="status" className="text-sm text-muted-foreground">Loading assessment…</p>}
          {draft && <div className="rounded-xl border border-grid-blue/30">
            <div className="border-b bg-grid-blue/5 p-4">
              <p className="font-semibold text-grid-navy">{draft.submit_requested ? 'Submission waiting to sync' : draft.dirty ? 'Draft waiting to sync' : 'Saved assessment draft'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Saved {formatDate(draft.saved_at)}</p>
              {draft.last_error && <p role="alert" className="mt-2 text-sm text-destructive">{draft.last_error}</p>}
            </div>
            <div className="p-4"><FieldAssessmentReadback assessment={draft.field_assessment} ticketId={ticket.id} photoEvidence={draft.photo_evidence} /></div>
          </div>}
          {current?.field_assessment && <div className="rounded-xl border p-4">
            <h3 className="font-semibold text-grid-navy">Submitted assessment</h3>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(current.created_at)}</p>
            <div className="mt-4"><FieldAssessmentReadback assessment={current.field_assessment} ticketId={ticket.id} photoEvidence={current.photo_evidence} /></div>
          </div>}
          {error && <div role="alert" className="text-sm text-destructive">{error}<Button className="ml-3" variant="outline" size="sm" onClick={() => void load()}>Reload</Button></div>}
        </> : <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <h2 className="font-heading text-2xl font-semibold text-grid-navy">Assessment record</h2>
            <span className="rounded-full border border-grid-blue/20 bg-grid-blue-soft/40 px-3 py-1 text-xs font-semibold text-grid-navy">{staffStageLabel(stage)}</span>
          </div>
          {loading ? <p role="status">Loading assessment…</p> : error ? null : <>
            {stage === 'CORRECTIONS' && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="font-semibold">Corrections requested</p><p className="mt-2 whitespace-pre-wrap text-sm">{correctionNote(current) || 'Open the previous revision to review correction notes.'}</p></div>}
            {draft && <div className="rounded-xl border border-grid-blue/30">
              <div className="border-b bg-grid-blue/5 p-4"><p className="font-semibold text-grid-navy">{draft.submit_requested ? 'Submission queued for sync' : draft.dirty ? 'Saved on this device · sync pending' : 'Saved draft'}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(draft.saved_at)}</p>{draft.last_error && <p role="alert" className="mt-2 text-sm text-destructive">{draft.last_error}</p>}</div>
              <div className="p-4"><FieldAssessmentReadback assessment={draft.field_assessment} ticketId={ticket.id} photoEvidence={draft.photo_evidence} /></div>
              {canFill && ['ON_SITE', 'IN_PROGRESS', 'NEEDS_REWORK'].includes(ticket.status) && !draft.submit_requested && <div className="border-t p-4"><Button asChild variant="outline"><Link href={`/tickets/${ticket.id}/assessment`}>Edit saved draft</Link></Button></div>}
            </div>}
            {!draft && !rows.length && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No assessment has been submitted.</p>}
            {rows.map(row => <details key={row.id} open={row.id === ticket.current_assessment_id} className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold text-grid-navy">{staffStageLabel(row.review_stage)} · {formatDate(row.created_at)}</summary>
              <div className="mt-4 space-y-4">{row.team_review_notes && <p className="whitespace-pre-wrap text-sm"><strong>Team lead:</strong> {correctionNote(row)}</p>}{row.review_notes && <p className="whitespace-pre-wrap text-sm"><strong>Final review:</strong> {row.review_notes.replace(/^\[APPROVED\]\s*/i, '')}</p>}{row.field_assessment ? <FieldAssessmentReadback assessment={row.field_assessment} ticketId={ticket.id} photoEvidence={row.photo_evidence} /> : <p>Historical assessment · the current field checklist was not recorded.</p>}</div>
            </details>)}
            {canReview && current && <div className="rounded-xl border border-grid-blue/30 bg-grid-blue/5 p-4">
              <h3 className="font-semibold text-grid-navy">{stage === 'FINAL_REVIEW' ? 'Final review' : 'Team lead review'}</h3>
              <Label htmlFor="assessment-review-notes" className="mt-4 mb-2">Review notes · required for corrections</Label>
              <Textarea id="assessment-review-notes" value={notes} onChange={event => setNotes(event.target.value)} maxLength={4000} disabled={busy} />
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="accent" disabled={busy} onClick={() => void action(() => ticketAssessmentWorkflow.review(current.id, 'APPROVED', notes), stage === 'FINAL_REVIEW' ? 'Ticket approved for utility handoff' : 'Assessment sent for final approval')}><Check />{stage === 'FINAL_REVIEW' ? 'Approve for utility handoff' : 'Approve for final review'}<ArrowRight /></Button>
                <Button variant="outline" disabled={busy || !notes.trim()} onClick={() => void action(() => ticketAssessmentWorkflow.review(current.id, 'NEEDS_REWORK', notes), 'Assessment returned for corrections')}><RotateCcw />Return for corrections</Button>
              </div>
            </div>}
            {chief && can('admin.tickets.edit') && stage === 'APPROVED' && <div className="rounded-xl border p-4">
              <h3 className="font-semibold">Ready for utility handoff</h3>
              <p className="mt-2 text-sm text-muted-foreground">After delivering the approved ticket, record the utility handoff here.</p>
              <Label htmlFor="utility-handoff" className="mt-4 mb-2">Delivery reference or handoff notes</Label>
              <Textarea id="utility-handoff" value={reference} onChange={event => setReference(event.target.value)} maxLength={1000} placeholder="Utility recipient, delivery date, and reference…" />
              <Button className="mt-3" disabled={busy || !reference.trim()} onClick={() => void action(() => ticketAssessmentWorkflow.handoff(ticket.id, reference), 'Utility handoff recorded. Ticket closed.')}><Check />Record utility handoff</Button>
            </div>}
            {stage === 'UTILITY_SUBMITTED' && <div className="rounded-xl bg-emerald-50 p-4 text-emerald-900"><p className="font-semibold">Utility handoff recorded</p><p className="mt-2 whitespace-pre-wrap text-sm">{ticket.utility_submission_reference}</p><p className="mt-1 text-xs">{ticket.utility_submitted_at && formatDate(ticket.utility_submitted_at)}</p></div>}
          </>}
          {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />Saving workflow action…</p>}
          {error && <div role="alert" className="text-sm text-destructive">{error}<Button className="ml-3" variant="outline" size="sm" onClick={() => void load()}>Reload</Button></div>}
        </>}
      </div>
    </section>
  );
}
