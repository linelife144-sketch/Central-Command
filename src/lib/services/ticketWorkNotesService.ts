import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db/dexie';
import { notifyTicketsChanged } from '@/lib/tickets/events';
import { ticketWorkflowRpc } from './ticketAssessmentWorkflow';

import { ticketWorkNoteLabels, type TicketWorkNoteKind } from '@/lib/tickets/workNotes';
export { ticketWorkNoteLabels, type TicketWorkNoteKind } from '@/lib/tickets/workNotes';
export interface TicketWorkNote {
  id: string; ticket_id: string; actor_profile_id: string; kind: TicketWorkNoteKind;
  body: string; reported_at: string; created_at: string;
}
export interface LocalTicketWorkNote extends TicketWorkNote { pending?: boolean; last_error?: string }
const online = () => typeof navigator === 'undefined' || navigator.onLine;
let lock = Promise.resolve();
function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const next = lock.then(operation); lock = next.then(() => undefined, () => undefined); return next;
}
async function persist(note: LocalTicketWorkNote, actor: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== actor || note.actor_profile_id !== actor) throw new Error('Sign in with the account that saved this note to sync it.');
  const saved = await ticketWorkflowRpc<TicketWorkNote>('record_ticket_work_note', {
    p_id: note.id, p_ticket_id: note.ticket_id, p_kind: note.kind, p_body: note.body, p_reported_at: note.reported_at,
  });
  const local: LocalTicketWorkNote = { ...saved, pending: false };
  await db.ticketWorkNotes.put(local);
  return local;
}
export const ticketWorkNotesService = {
  async list(ticketId: string, actor: string): Promise<LocalTicketWorkNote[]> {
    const local = (await db.ticketWorkNotes.where('ticket_id').equals(ticketId).toArray()).filter(n => n.actor_profile_id === actor);
    if (!online()) return local.sort((a,b) => b.reported_at.localeCompare(a.reported_at));
    const { data, error } = await supabase.from('ticket_work_notes').select('*').eq('ticket_id',ticketId).order('created_at',{ascending:false});
    if (error) throw new Error(error.message);
    const remote = (data ?? []) as TicketWorkNote[];
    const remoteIds = new Set(remote.map(n => n.id));
    for (const note of local) if (!note.pending && !remoteIds.has(note.id)) await db.ticketWorkNotes.delete(note.id);
    // Server records are already ticket-authorized. Only pending local records belong to this actor.
    await db.ticketWorkNotes.bulkPut(remote.map(n => ({ ...n, pending: false })));
    const merged = new Map(remote.map(n => [n.id,n] as const));
    for (const note of local) if (note.pending && !merged.has(note.id)) merged.set(note.id,note);
    return [...merged.values()].sort((a,b) => b.reported_at.localeCompare(a.reported_at));
  },
  save(ticketId: string, actor: string, kind: TicketWorkNoteKind, body: string): Promise<LocalTicketWorkNote> {
    return exclusive(async () => {
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 4000) throw new Error('Enter a note of 1–4,000 characters.');
      if (!Object.hasOwn(ticketWorkNoteLabels,kind)) throw new Error('Choose a valid report type.');
      const now = new Date().toISOString();
      const note: LocalTicketWorkNote = { id: crypto.randomUUID(), ticket_id: ticketId, actor_profile_id: actor, kind, body: trimmed, reported_at: now, created_at: now, pending: true };
      await db.ticketWorkNotes.put(note);
      if (!online()) { notifyTicketsChanged(); return note; }
      try { return await persist(note,actor); }
      catch (error) { const message = error instanceof Error ? error.message : 'Unable to sync this note.'; await db.ticketWorkNotes.update(note.id,{last_error:message}); return {...note,last_error:message}; }
    });
  },
  process(actor: string): Promise<{failed:number;pending:number;errors:string[]}> {
    return exclusive(async () => {
      const rows = (await db.ticketWorkNotes.where('actor_profile_id').equals(actor).toArray()).filter(n => n.pending);
      const errors: string[] = [];
      if (!online()) return {failed:0,pending:rows.length,errors};
      for (const note of rows) {
        try { await persist(note,actor); }
        catch (error) { const message = error instanceof Error ? error.message : 'Note sync failed.'; errors.push(message); await db.ticketWorkNotes.update(note.id,{last_error:message}); }
      }
      return {failed:errors.length,pending:errors.length,errors};
    });
  },
};
