'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { db, type LocalAssessment } from '@/lib/db/dexie';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { FieldAssessmentReadback } from '@/components/features/assessments/FieldAssessmentSheet';
import type { FieldAssessment } from '@/lib/schemas/fieldAssessment';
import { formatDate } from '@/lib/utils/formatters';
import type { Ticket } from '@/types';

type AssessmentRow = { photo_evidence?: import('@/lib/schemas/fieldAssessment').AssessmentPhotoEvidence[]; photo_metadata?: unknown; id: string; reviewed_at?: string | null; created_at?: string | null; field_assessment?: FieldAssessment | null; pending?: boolean };
export function TicketAssessments({ ticket, canCreate }: { ticket: Ticket; canCreate: boolean }) {
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        let local: LocalAssessment[] = [];
        if (canCreate) { try { local = await db.assessments.where('ticket_id').equals(ticket.id).toArray(); } catch { /* Remote records remain available when device storage fails. */ } }
        const ownLocal = local.filter(row => row.contractor_id === ticket.assigned_to);
        if (!navigator.onLine) { if (active) setRows(ownLocal.map(row => ({ ...row, pending: !row.synced }))); return; }
        const result = await supabase.from('damage_assessments').select('id, reviewed_at, created_at, field_assessment, photo_evidence').eq('ticket_id', ticket.id).order('created_at', { ascending: false });
        if (result.error) throw result.error;
        const remote = (result.data ?? []) as unknown as AssessmentRow[];
        const pending = ownLocal.filter(row => !row.synced && !remote.some(item => item.id === row.id));
        if (active) setRows([...pending.map(row => ({ ...row, pending: true })), ...remote]);
      } catch { if (active) setError(true); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [ticket.id, ticket.assigned_to, canCreate]);
  return <div className="space-y-4 p-4">
    <p className="text-sm text-muted-foreground">The field assessment and its photo evidence are part of this ticket record.</p>
    {loading ? <p>Loading assessments…</p> : error ? <p role="alert">Assessment records are unavailable. The app could not verify whether an assessment has been submitted.</p> : rows.length ? rows.map(row => <details key={row.id} className="rounded-xl border p-4"><summary className="flex cursor-pointer flex-wrap items-center gap-3"><StatusBadge status={row.pending ? 'PENDING' : row.reviewed_at ? 'REVIEWED' : 'PENDING_REVIEW'} /><span>{row.pending ? 'Saved on this device · awaiting sync' : row.created_at ? formatDate(row.created_at) : 'Date unavailable'}</span><span className="text-sm text-primary">View assessment</span></summary><div className="mt-4">{row.field_assessment ? <FieldAssessmentReadback assessment={row.field_assessment} ticketId={ticket.id} photoEvidence={row.photo_evidence ?? row.photo_metadata as import('@/lib/schemas/fieldAssessment').AssessmentPhotoEvidence[]} /> : <p>Historical assessment. The new field checklist was not recorded for this submission.</p>}</div></details>) : <p className="rounded-xl border border-dashed p-4">Assessment required · no assessment submitted yet.</p>}
    {canCreate && ['ON_SITE', 'IN_PROGRESS', 'NEEDS_REWORK'].includes(ticket.status) && <Link className="inline-flex min-h-12 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground" href={`/contractor/assessments/create?ticketId=${ticket.id}`}>Start Assessment Form</Link>}
  </div>;
}
