'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, MessageSquarePlus, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/AuthProvider';
import { ticketWorkNotesService, ticketWorkNoteLabels, type LocalTicketWorkNote, type TicketWorkNoteKind } from '@/lib/services/ticketWorkNotesService';
import { formatDateTime } from '@/lib/utils/formatters';
import { GRID_TICKETS_CHANGED_EVENT } from '@/lib/tickets/events';

export function TicketWorkNotes({ ticketId, canWrite = false, onChanged }: { ticketId: string; canWrite?: boolean; onChanged?: () => void | Promise<void> }) {
  const { profile } = useAuth();
  const [rows,setRows] = useState<LocalTicketWorkNote[]>([]);
  const [kind,setKind] = useState<TicketWorkNoteKind>('NOTE');
  const [body,setBody] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!profile) return;
    try { setRows(await ticketWorkNotesService.list(ticketId,profile.id)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load ticket notes.'); }
    finally { setLoading(false); }
  },[profile,ticketId]);
  useEffect(() => {
    let active = true;
    const refresh = () => { if(active) void load(); };
    void Promise.resolve().then(refresh);
    const interval = window.setInterval(refresh,15000);
    window.addEventListener('online',refresh);
    window.addEventListener(GRID_TICKETS_CHANGED_EVENT,refresh);
    return () => { active=false; window.clearInterval(interval); window.removeEventListener('online',refresh); window.removeEventListener(GRID_TICKETS_CHANGED_EVENT,refresh); };
  },[load]);
  async function save() {
    if (!profile || busy) return;
    setBusy(true); setError('');
    try {
      const note = await ticketWorkNotesService.save(ticketId,profile.id,kind,body);
      setBody('');
      if (note.pending) toast.message(kind==='NOTE' ? 'Note saved on this device. Waiting to sync.' : 'Escalation saved on this device. Dispatch receives it after sync.');
      else toast.success(kind==='NOTE' ? 'Note added to this ticket.' : 'Ticket escalated. Dispatch notified.');
      await load(); await onChanged?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your note.'); }
    finally { setBusy(false); }
  }
  async function retry() {
    if (!profile) return;
    setBusy(true);
    try { const result=await ticketWorkNotesService.process(profile.id); await load(); if(result.errors.length)setError(result.errors[0]); await onChanged?.(); }
    catch(e){setError(e instanceof Error?e.message:'Unable to sync notes.');}
    finally{setBusy(false);}
  }
  return <section id="work-notes" aria-labelledby="work-notes-title" className="cc-work-panel scroll-mt-24 overflow-hidden">
    <header className="flex items-center gap-3 border-b bg-grid-shell/50 p-5 sm:px-6"><span className="rounded-xl bg-grid-navy p-2.5 text-grid-lightning"><MessageSquarePlus className="size-5"/></span><div><h2 id="work-notes-title" className="font-heading text-2xl font-semibold text-grid-navy">Notes & safety escalation</h2><p className="mt-1 text-xs text-muted-foreground">A permanent record attached to this ticket.</p></div></header>
    <div className="space-y-5 p-5 sm:p-6">
      {canWrite && <form onSubmit={e=>{e.preventDefault();void save();}} className="space-y-4">
        <fieldset disabled={busy}><legend className="mb-2 text-sm font-semibold">Report type</legend><div className="grid gap-2 sm:grid-cols-3">{(Object.keys(ticketWorkNoteLabels) as TicketWorkNoteKind[]).map(value=><label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${kind===value?'border-grid-blue bg-grid-blue-soft text-grid-navy':'hover:bg-grid-shell'}`}><input type="radio" name="report-kind" value={value} checked={kind===value} onChange={()=>setKind(value)} className="accent-grid-blue"/>{value==='NOTE'?'Extra note':value==='ENVIRONMENTAL'?'Environmental issue':'Public safety issue'}</label>)}</div></fieldset>
        {kind!=='NOTE' && <div role="status" className="flex gap-3 rounded-xl border border-grid-danger/25 bg-grid-danger-soft p-4 text-sm text-grid-danger-ink"><AlertTriangle className="size-5 shrink-0"/><p>Describe the hazard, exact location, people or environment at risk, and action taken. Sending raises this ticket to critical priority and notifies dispatch. If offline, dispatch receives it after sync.</p></div>}
        <div><Label htmlFor="ticket-work-note">{kind==='NOTE'?'Extra notes':`${ticketWorkNoteLabels[kind]} details`}</Label><Textarea id="ticket-work-note" value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} rows={4} disabled={busy} placeholder={kind==='NOTE'?'Access details, observations, crew updates…':'What happened, where it is, and what needs attention…'} className="mt-2"/><p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{body.length.toLocaleString()} / 4,000</p></div>
        <Button type="submit" variant={kind==='NOTE'?'accent':'destructive'} disabled={busy||!body.trim()}>{busy?<Loader2 className="size-4 animate-spin"/>:kind==='NOTE'?<Save className="size-4"/>:<AlertTriangle className="size-4"/>}{kind==='NOTE'?'Save note':'Send escalation'}</Button>
      </form>}
      {error && <p role="alert" className="text-sm text-destructive">{error}<Button className="ml-2" variant="outline" size="sm" onClick={()=>void load()}>Reload</Button></p>}
      {loading?<p role="status" className="text-sm text-muted-foreground">Loading saved notes…</p>:!rows.length?<p className="text-sm text-muted-foreground">No extra notes or escalations recorded.</p>:<ol className="space-y-3">{rows.map(note=><li key={note.id} className={`rounded-xl border p-4 ${note.kind==='NOTE'?'bg-grid-shell/40':'border-grid-danger/20 bg-grid-danger-soft/40'}`}><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{ticketWorkNoteLabels[note.kind]}</strong><span className="text-xs text-muted-foreground">{formatDateTime(note.reported_at)}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm">{note.body}</p><p className="mt-3 text-xs font-semibold text-grid-navy">{note.pending?'Saved on this device · waiting to sync':note.kind==='NOTE'?'Saved to ticket':'Escalated · dispatch notified'}</p>{note.last_error && <p role="alert" className="mt-2 text-xs text-destructive">{note.last_error}</p>}</li>)}</ol>}
      {rows.some(n=>n.pending) && <Button variant="outline" disabled={busy} onClick={()=>void retry()}><RefreshCw className="size-4"/>Sync saved notes</Button>}
    </div>
  </section>;
}
