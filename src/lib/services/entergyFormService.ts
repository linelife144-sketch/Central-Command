import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db/dexie';
import { photoUploadQueue } from '@/lib/sync/photoUploadQueue';
import { ticketAssessmentWorkflow, ticketWorkflowRpc } from './ticketAssessmentWorkflow';
import { validateEntergyPayload, validateEntergyPhotos, type EntergyFormKind, type EntergyPayload } from '@/lib/schemas/entergyForms';
import type { AssessmentPhotoEvidence } from '@/lib/schemas/fieldAssessment';
import type { CapturedAssessmentPhoto } from '@/types';

export interface EntergyRecord {
  id: string; ticket_id: string; form_kind: EntergyFormKind; payload: EntergyPayload;
  photo_evidence: AssessmentPhotoEvidence[]; status: 'DRAFT' | 'SUBMITTED'; version: number;
  created_by: string; saved_by: string; created_at: string; saved_at: string; submitted_at: string | null;
}
export interface LocalEntergyRecord {
  id: string; actor_profile_id: string; record: EntergyRecord; photos?: CapturedAssessmentPhoto[];
  dirty: boolean; submit_requested: boolean; last_error?: string; expected_version: number | null;
}
export interface EntergyEditingDraft {
  id: string; record_id: string; ticket_id: string; actor_profile_id: string;
  payload: EntergyPayload; photos: CapturedAssessmentPhoto[]; version: number | null; updated_at: string;
}
const online = () => typeof navigator === 'undefined' || navigator.onLine;
export const entergyEditingKey = (actor: string, ticket: string, kind: EntergyFormKind) => `${actor}:${ticket}:${kind}`;
const cacheKey = (actor: string, id: string) => `${actor}:${id}`;
let lock = Promise.resolve();
function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = lock.then(operation); lock = result.then(() => undefined, () => undefined); return result;
}
async function requireActor(actor: string): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== actor) throw new Error('Entergy form sync account mismatch. Sign in with the account that saved the form.');
}
async function persist(local: LocalEntergyRecord): Promise<LocalEntergyRecord> {
  if (local.submit_requested) await photoUploadQueue.process();
  const row = await ticketWorkflowRpc<EntergyRecord>('save_entergy_ticket_form', {
    p_id: local.record.id, p_ticket_id: local.record.ticket_id, p_kind: local.record.form_kind,
    p_payload: local.record.payload, p_photos: local.record.photo_evidence,
    p_expected_version: local.expected_version, p_submit: local.submit_requested,
  });
  const saved: LocalEntergyRecord = { ...local, record: row, expected_version: row.version, dirty: false, submit_requested: false, last_error: undefined };
  await db.entergyForms.put(saved);
  if (row.status === 'SUBMITTED') await db.entergyEditing.delete(entergyEditingKey(local.actor_profile_id, row.ticket_id, row.form_kind));
  return saved;
}
export const entergyFormService = {
  async discardDeviceDraft(ticketId: string, actor: string, kind: EntergyFormKind): Promise<void> {
    return exclusive(async () => {
    if (!online()) throw new Error('Reconnect to load the saved server version.');
    await requireActor(actor);
    const cached = (await db.entergyForms.where('actor_profile_id').equals(actor).toArray()).filter(r=>r.record.ticket_id===ticketId && r.record.form_kind===kind && r.record.status==='DRAFT');
    if(cached.some(r=>r.submit_requested))throw new Error('Submission is queued. Sync this record before editing again.');
    for(const row of cached)await db.entergyForms.delete(row.id);
    await db.entergyEditing.delete(entergyEditingKey(actor,ticketId,kind));
    });
  },
  async list(ticketId: string, actor: string): Promise<LocalEntergyRecord[]> {
    const cached = (await db.entergyForms.where('actor_profile_id').equals(actor).toArray()).filter(r => r.record.ticket_id === ticketId);
    if (!online()) return cached.sort((a,b) => b.record.saved_at.localeCompare(a.record.saved_at));
    await requireActor(actor);
    const { data, error } = await supabase.from('ticket_entergy_forms').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as EntergyRecord[];
    const merged: LocalEntergyRecord[] = rows.map(row => {
      const old = cached.find(c => c.record.id === row.id);
      if (old?.dirty || old?.submit_requested) return old;
      return { id: cacheKey(actor, row.id), actor_profile_id: actor, record: row, photos: old && JSON.stringify(old.record.photo_evidence) === JSON.stringify(row.photo_evidence) ? old.photos : undefined, expected_version: row.version, dirty: false, submit_requested: false };
    });
    merged.push(...cached.filter(c => (c.dirty || c.submit_requested) && !rows.some(r => r.id === c.record.id)));
    for (const obsolete of cached.filter(c => !merged.some(r => r.id === c.id))) await db.entergyForms.delete(obsolete.id);
    await db.entergyForms.bulkPut(merged);
    return merged.sort((a,b) => b.record.saved_at.localeCompare(a.record.saved_at));
  },
  async restorePhotos(local: LocalEntergyRecord): Promise<CapturedAssessmentPhoto[]> {
    if (!local.record.photo_evidence.length) return [];
    return ticketAssessmentWorkflow.restorePhotos({ ticket_id: local.record.ticket_id, photo_evidence: local.record.photo_evidence, photos: local.photos });
  },
  save(input: { id: string; ticketId: string; actor: string; kind: EntergyFormKind; payload: EntergyPayload; photos: CapturedAssessmentPhoto[]; version: number | null; submit?: boolean }): Promise<LocalEntergyRecord> {
    return exclusive(async () => {
      const payload = validateEntergyPayload(input.kind, input.payload, !!input.submit);
      const allowedSections = new Set(Object.keys(payload.damageReports).map(key => `entergy:${key}`));
      const photos = input.photos.filter(p => !p.sectionKey || allowedSections.has(p.sectionKey)).map(p => ({ ...p, actorProfileId: input.actor }));
      const evidence = photos.map(p => ({ id: p.id, type: p.type, sectionKey: p.sectionKey, checksumSha256: p.checksumSha256, gpsLatitude: p.metadata.gpsLatitude ?? undefined, gpsLongitude: p.metadata.gpsLongitude ?? undefined }));
      if (input.submit) validateEntergyPhotos(evidence, payload);
      const existing = await db.entergyForms.get(cacheKey(input.actor, input.id));
      if (existing?.submit_requested || existing?.record.status === 'SUBMITTED') throw new Error('This form is submitted or queued. Start a new revision after it syncs.');
      for (const photo of photos) if (!photo.remotePersisted && !(await db.photos.get(photo.id))?.uploaded) await photoUploadQueue.add(photo);
      const now = new Date().toISOString();
      const local: LocalEntergyRecord = {
        id: cacheKey(input.actor, input.id), actor_profile_id: input.actor,
        record: { id: input.id, ticket_id: input.ticketId, form_kind: input.kind, payload, photo_evidence: evidence, status: 'DRAFT', version: input.version ?? 0, created_by: existing?.record.created_by ?? input.actor, saved_by: input.actor, created_at: existing?.record.created_at ?? now, saved_at: now, submitted_at: null },
        photos, dirty: true, submit_requested: !!input.submit, expected_version: input.version,
      };
      await db.entergyForms.put(local);
      if (!online()) return local;
      try { await requireActor(input.actor); return await persist(local); }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Form sync failed.';
        await db.entergyForms.update(local.id, { last_error: message });
        throw new Error(`Saved on this device. Sync pending: ${message}`);
      }
    });
  },
  process(actor: string): Promise<{ failed: number; pending: number; errors: string[] }> {
    return exclusive(async () => {
      const pending = (await db.entergyForms.where('actor_profile_id').equals(actor).toArray()).filter(r => r.dirty || r.submit_requested);
      if (!online() || !pending.length) return { failed: 0, pending: pending.length, errors: [] };
      await requireActor(actor);
      const errors: string[] = [];
      for (const local of pending) {
        try { await persist(local); }
        catch (error) { const message = error instanceof Error ? error.message : 'Form sync failed.'; errors.push(message); await db.entergyForms.update(local.id, { last_error: message }); }
      }
      return { failed: errors.length, pending: errors.length, errors };
    });
  },
};
