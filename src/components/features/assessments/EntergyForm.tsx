'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCheck, ExternalLink, Leaf, Loader2, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db/dexie';
import { entergyEditingKey, entergyFormService } from '@/lib/services/entergyFormService';
import { emptyEntergyPayload, entergyErrors, entergyForms, formFields, validateEntergyPhotos, type EntergyFormKind } from '@/lib/schemas/entergyForms';
import type { CapturedAssessmentPhoto, Ticket } from '@/types';
import { EntergyFormSheet } from './EntergyFormSheet';
import { PhotoCapture } from './PhotoCapture';

export function EntergyForm({ kind, ticket, actorProfileId, onSaved }: { kind: EntergyFormKind; ticket: Ticket; actorProfileId: string; onSaved?: () => void }) {
  const definition = entergyForms[kind];
  const [payload, setPayload] = useState(() => emptyEntergyPayload(kind));
  const [photos, setPhotos] = useState<CapturedAssessmentPhoto[]>([]);
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { photosRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl)); }, []);
  const [recordId, setRecordId] = useState('');
  const [version, setVersion] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const editingKey = entergyEditingKey(actorProfileId, ticket.id, kind);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      const editing = await db.entergyEditing.get(editingKey);
      const records = await entergyFormService.list(ticket.id, actorProfileId);
      const saved = records.find(r => r.record.form_kind === kind && r.record.status === 'DRAFT');
      if (saved?.submit_requested) throw new Error('This form is queued for submission. Sync from the ticket before starting another revision.');
      const useEditing = editing && (!saved && !records.some(r=>r.record.id===editing.record_id && r.record.status==='SUBMITTED') || saved && editing.record_id === saved.record.id && (editing.version !== saved.expected_version || editing.updated_at >= saved.record.saved_at));
      const restored = useEditing ? editing.photos.map(p => ({ ...p, previewUrl: URL.createObjectURL(p.file) })) : saved ? await entergyFormService.restorePhotos(saved) : [];
      if (!active) { restored.forEach(p => URL.revokeObjectURL(p.previewUrl)); return; }
      const blank = emptyEntergyPayload(kind);
      setPayload(useEditing ? editing.payload : saved?.record.payload ?? { ...blank, answers: { ...blank.answers, ...(kind === 'cleanup' ? { address: ticket.address, cityTown: ticket.city ?? '' } : { fieldAddressComments: [ticket.address, ticket.city].filter(Boolean).join(', '), workOrderNumber: ticket.work_order_ref ?? '' }) } });
      setPhotos(restored); setRecordId(useEditing ? editing.record_id : saved?.record.id ?? crypto.randomUUID()); setVersion(useEditing ? editing.version : saved?.expected_version ?? null);
      setNotice(useEditing || saved ? 'Saved form and linked photos restored. Review the record before submitting.' : 'Changes stay on this device as you work. Save to attach your draft to the ticket.');
      setError(useEditing && saved && editing.version !== saved.expected_version ? 'The saved version changed while you had device edits. Your device edits are preserved; reload the saved draft to resolve the conflict.' : ''); setReady(true);
    })().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load this form.'); });
    return () => { active = false; };
  }, [editingKey, kind, ticket.id, ticket.address, ticket.city, ticket.work_order_ref, actorProfileId, reload]);
  useEffect(() => {
    if (!ready || busy || finished) return;
    const timer = window.setTimeout(() => { void db.entergyEditing.put({ id: editingKey, ticket_id: ticket.id, actor_profile_id: actorProfileId, record_id: recordId, payload, photos, version, updated_at: new Date().toISOString() }).catch(() => setNotice('Device draft storage failed. Keep this page open and save your form.')); }, 350);
    return () => window.clearTimeout(timer);
  }, [ready, busy, finished, editingKey, ticket.id, actorProfileId, recordId, payload, photos, version]);
  const errors = useMemo(() => entergyErrors(kind, payload), [kind, payload]);
  const required = formFields(kind).filter(f => f.required);
  const completed = required.filter(f => !errors[f.key]).length;
  const disabled = !ready || busy || finished;
  const activePhotos = photos.filter(p => !p.sectionKey || p.sectionKey.slice(8) in payload.damageReports);
  const changePhotos = (section: string | undefined, captured: CapturedAssessmentPhoto[]) => setPhotos(current => [...current.filter(p => p.sectionKey !== section), ...captured.map(p => ({ ...p, sectionKey: section }))]);
  const discardAndReload = async () => {
    setBusy(true);
    try { await entergyFormService.discardDeviceDraft(ticket.id,actorProfileId,kind);photosRef.current.forEach(p=>URL.revokeObjectURL(p.previewUrl));setPhotos([]);setReady(false);setReload(v=>v+1); }
    catch(e) { setError(e instanceof Error ? e.message : 'Unable to reload the saved form.'); }
    finally { setBusy(false); }
  };
  const save = async (submit: boolean) => {
    setError(''); setShowErrors(submit);
    if (submit && Object.keys(errors).length) {
      setError('Complete the highlighted fields before submitting.');
      const firstKey = Object.keys(errors)[0];
      const targetId = firstKey.includes('.') ? `entergy-${firstKey.replaceAll('.', '-')}` : firstKey === 'lightingMap' ? 'entergy-lighting' : `entergy-answer-${firstKey}`;
      const target = document.getElementById(targetId); target?.scrollIntoView({ behavior: 'smooth', block: 'center' }); target?.focus(); return;
    }
    if (submit) try { validateEntergyPhotos(activePhotos.map(p => ({ id: p.id, type: p.type, sectionKey: p.sectionKey, gpsLatitude: p.metadata.gpsLatitude ?? undefined, gpsLongitude: p.metadata.gpsLongitude ?? undefined })), payload); } catch (e) { setError((e as Error).message); return; }
    setBusy(true);
    try {
      const saved = await entergyFormService.save({ id: recordId, ticketId: ticket.id, actor: actorProfileId, kind, payload, photos: activePhotos, version, submit });
      setVersion(saved.expected_version);
      if (submit) setFinished(true);
      toast.success(saved.dirty ? `${submit ? 'Submission' : 'Draft'} saved on this device. Sync pending.` : `${definition.title} ${submit ? 'submitted' : 'saved'}.`);
      if (!submit) await db.entergyEditing.delete(editingKey);
      onSaved?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your Entergy form.'); }
    finally { setBusy(false); }
  };
  return <div className="entergy-form">
    <header className="entergy-hero"><div><p className="entergy-eyebrow">ENTERGY / FIELD DOCUMENT {kind === 'cleanup' ? '01' : '02'}</p><h1 className="mt-3 font-heading text-4xl font-semibold sm:text-5xl">{kind === 'cleanup' ? <>Leave the site<br /><span>ready for the next crew.</span></> : <>Record the change.<br /><span>Every detail, accounted for.</span></>}</h1><p className="mt-4 max-w-xl text-sm text-white/75">{definition.title} · Ticket {ticket.ticket_number}{kind === 'damage' && ' · Distribution Change Order'}</p><a href={definition.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-white/85 underline underline-offset-4">View official source <ExternalLink size={13}/></a></div><div className="entergy-hero-summary">{kind === 'cleanup' ? <Leaf size={30} /> : <ClipboardCheck size={30}/>}<p className="mt-5 font-heading text-4xl font-semibold">{completed}<span className="text-xl text-white/50"> / {required.length}</span></p><p className="mt-1 text-xs text-white/70">required fields complete</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-grid-lightning transition-all" style={{width:`${completed/required.length*100}%`}} /></div><p className="mt-4 text-xs text-white/70">{kind==='damage'?'Source revision 02-25-2019':'Official Entergy clean-up sheet'}</p></div></header>
    {notice && <p role="status" className="mt-4 text-sm text-muted-foreground">{notice}</p>}
    {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}{!ready ? <Button type="button" variant="outline" size="sm" className="ml-3" onClick={()=>setReload(v=>v+1)}>Retry loading</Button> : /another device|saved version changed/i.test(error) && <Button type="button" variant="outline" size="sm" className="mt-3" disabled={busy} onClick={()=>void discardAndReload()}>Discard device edits and reload saved draft</Button>}</AlertDescription></Alert>}
    {kind === 'cleanup' && <details className="entergy-source-note mt-5"><summary>Guidance printed on the source form</summary><p className="mt-3">Return to Entergy crew lead. The source lists Matthew Colvin at 318-355-6415 for emergency environmental concerns and asks that oil spills be addressed as soon as recognized.</p></details>}
    <div className="mt-6"><EntergyFormSheet kind={kind} payload={payload} onChange={setPayload} errors={showErrors ? errors : {}} disabled={disabled} renderDamagePhotos={section=><PhotoCapture ticketId={ticket.id} title="Section damage evidence · required" requiredTypes={['DAMAGE']} availableTypes={['DAMAGE']} photos={photos.filter(p=>p.sectionKey===`entergy:${section}`)} onPhotosCaptured={p=>changePhotos(`entergy:${section}`,p)} disabled={disabled}/>} /></div>
    <section id="entergy-evidence" className="entergy-section mt-5 scroll-mt-24"><header className="entergy-section-header"><span className="entergy-section-number"><ClipboardCheck size={20}/></span><div><h2 className="font-heading text-2xl font-semibold">Site evidence</h2><p className="mt-1 text-xs text-muted-foreground">Four GPS-verified views are required at submission. Section damage photos stay beside the reported damage.</p></div></header><div className="p-5 sm:p-6"><PhotoCapture ticketId={ticket.id} photos={photos.filter(p=>!p.sectionKey)} onPhotosCaptured={p=>changePhotos(undefined,p)} disabled={disabled}/></div></section>
    <footer className="entergy-footer"><div><p className="font-semibold">{definition.title} · {ticket.ticket_number}</p><p className="mt-1 max-w-xl text-xs text-muted-foreground">Save keeps the form editable. Submit attaches an immutable Entergy record to this ticket for the team’s existing review process.</p></div><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" size="lg" disabled={disabled} onClick={()=>void save(false)}>{busy?<Loader2 className="animate-spin"/>:<Save/>}Save draft</Button><Button type="button" variant="accent" size="lg" disabled={disabled} onClick={()=>void save(true)}>{busy?<Loader2 className="animate-spin"/>:<Send/>}{finished?'Submitted':'Submit form'}</Button></div></footer>
  </div>;
}
