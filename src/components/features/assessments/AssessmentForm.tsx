'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ClipboardCheck, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db/dexie';
import { ticketAssessmentWorkflow } from '@/lib/services/ticketAssessmentWorkflow';
import { getMissingRequiredPhotoTypes } from '@/lib/utils/assessmentPhotos';
import {
  additionalNotesField, allAssessmentFields, emptyFieldAnswers, fieldErrors, isFieldActive,
  normalizeFieldAnswers, requiresAssessmentEscalation, assessmentSections,
  damagePhotoErrors, requiredDamagePhotoFields,
  type FieldAnswer,
} from '@/lib/schemas/fieldAssessment';
import type { CapturedAssessmentPhoto } from '@/types';
import { AssessmentAnswerControl, FieldAssessmentSheet } from './FieldAssessmentSheet';
import { PhotoCapture } from './PhotoCapture';

interface AssessmentFormProps { ticketId?: string; contractorId?: string; actorProfileId?: string; correction?: boolean; onSaved?: () => void }

export function AssessmentForm({ ticketId, contractorId, actorProfileId, correction, onSaved }: AssessmentFormProps) {
  const [answers, setAnswers] = useState(emptyFieldAnswers);
  const [photos, setPhotos] = useState<CapturedAssessmentPhoto[]>([]);
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { photosRef.current.forEach(photo => URL.revokeObjectURL(photo.previewUrl)); }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');
  const draftId = `${actorProfileId}:${contractorId}:${ticketId}`;
  const [assessmentId, setAssessmentId] = useState('');
  const [version, setVersion] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    if (!ticketId || !contractorId || !actorProfileId) return;
    let active = true;
    void (async () => {
      const saved = await ticketAssessmentWorkflow.loadDraft(ticketId, actorProfileId);
      if (saved?.submit_requested) throw new Error('This assessment is queued for submission. Return to the ticket and sync it before editing.');
      const editing = await db.assessmentDrafts.get(draftId);
      const useEditing = editing && (!saved || editing.assessment_id === saved.assessment_id && editing.version === saved.version && Date.parse(editing.updated_at) >= Date.parse(saved.saved_at));
      let restoredAnswers = useEditing ? editing.answers : saved?.field_assessment.answers;
      let restoredPhotos: CapturedAssessmentPhoto[] = [];
      if (useEditing) restoredPhotos = (editing.photos ?? []).map(photo => ({...photo,previewUrl:URL.createObjectURL(photo.file)}));
      else if (saved) restoredPhotos = await ticketAssessmentWorkflow.restorePhotos(saved);
      else if (correction && navigator.onLine) {
        const previous = (await ticketAssessmentWorkflow.loadAssessments(ticketId))[0];
        if (previous?.field_assessment) { restoredAnswers = previous.field_assessment.answers; restoredPhotos = await ticketAssessmentWorkflow.restorePhotos(previous); }
      }
      if (!active) { restoredPhotos.forEach(photo=>URL.revokeObjectURL(photo.previewUrl)); return; }
      setAssessmentId(saved?.assessment_id ?? (useEditing ? editing.assessment_id : undefined) ?? crypto.randomUUID());
      setVersion(saved?.version ?? (useEditing ? editing.version : null) ?? null);
      if (restoredAnswers) setAnswers(normalizeFieldAnswers(restoredAnswers,false));
      setPhotos(restoredPhotos); setDraftNotice(restoredAnswers ? 'Saved answers and linked evidence restored. Review every section before saving.' : 'Changes are kept on this device as you work. Save to return to the ticket for review.');
      setDraftReady(true);
    })().catch(error => {if(active) setFormError(error instanceof Error ? error.message : 'Unable to load the ticket draft. Reload to retry.');});
    return () => { active = false; };
  }, [draftId, ticketId, contractorId, actorProfileId, correction]);
  useEffect(() => {
    if (!draftReady || isSubmitting || submitted || !ticketId || !contractorId) return;
    const timer = setTimeout(() => { void db.assessmentDrafts.put({ id: draftId, ticket_id: ticketId, contractor_id: contractorId, answers, photos, assessment_id: assessmentId, version, updated_at: new Date().toISOString() }).catch(() => setDraftNotice('Unable to save this draft on your device. Keep this page open until saving.')); }, 300);
    return () => clearTimeout(timer);
  }, [answers, photos, draftReady, isSubmitting, submitted, draftId, ticketId, contractorId, assessmentId, version]);
  const errors = useMemo(() => fieldErrors(answers), [answers]);
  const activeFields = allAssessmentFields.filter(field => isFieldActive(field, answers));
  const completed = activeFields.length - Object.keys(errors).length;
  const fieldAssessment = { version: 1 as const, answers: normalizeFieldAnswers(answers) };
  const urgent = requiresAssessmentEscalation(fieldAssessment);
  const activeDamageKeys = new Set(requiredDamagePhotoFields(answers).map(field => field.key));
  const evidencePhotos = photos.filter(photo => !photo.sectionKey || activeDamageKeys.has(photo.sectionKey));
  const missingPhotos = getMissingRequiredPhotoTypes(evidencePhotos);
  const photoErrors = damagePhotoErrors(answers, evidencePhotos);
  const updatePhotos = (sectionKey: string | undefined, captured: CapturedAssessmentPhoto[]) => setPhotos(current => [...current.filter(photo => photo.sectionKey !== sectionKey), ...captured.map(photo => ({ ...photo, sectionKey }))]);
  const updateAnswer = (key: string, value: FieldAnswer) => setAnswers(current => normalizeFieldAnswers({ ...current, [key]: value }, false));

  const handleSubmit = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length) {
      setFormError('Complete every required answer before saving.');
      const first = document.getElementById(`assessment-${Object.keys(errors)[0]}`) ?? document.querySelector(`input[name="assessment-${Object.keys(errors)[0]}"]`);
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      (first as HTMLElement | null)?.focus();
      return;
    }
    if (!ticketId || !contractorId || !actorProfileId) { setFormError('An assigned ticket and signed-in contractor are required.'); return; }
    if (Object.keys(photoErrors).length) { setFormError(Object.values(photoErrors)[0]); document.getElementById(`damage-photo-${Object.keys(photoErrors)[0]}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (evidencePhotos.length < 4 || missingPhotos.length) { setFormError('Capture at least four GPS-verified photos: Overview, Equipment, Damage, and Safety.'); return; }
    setFormError(null); setIsSubmitting(true);
    try {
      const saved = await ticketAssessmentWorkflow.save({ticketId, contractorId, actor:actorProfileId, assessmentId, version, fieldAssessment, photos:evidencePhotos});
      setSubmitted(true);
      await db.assessmentDrafts.delete(draftId).catch(() => undefined);
      toast.success(saved.dirty ? 'Assessment saved on this device. Review it on the ticket and sync when connected.' : 'Assessment saved. Review it on the ticket before submitting.');
      onSaved?.();
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to save assessment.'); }
    finally { setIsSubmitting(false); }
  };

  return <div className="cc-field-assessment">
    <header className="cc-field-hero">
      <div><p className="cc-field-eyebrow">FIELD OPERATIONS / REQUIRED ASSESSMENT</p><h1 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">Read the site.<br /><span className="text-grid-blue">From the top down.</span></h1><p className="mt-3 max-w-lg text-sm text-white/70">Answer every question. Record the damage. Give dispatch a complete picture of what crews will need.</p></div>
      <div className="cc-field-progress"><ClipboardCheck className="mb-3 text-grid-lightning" size={28} /><p className="font-heading text-3xl font-semibold">{completed}<span className="text-lg text-white/50"> / {activeFields.length}</span></p><p className="mt-1 text-xs text-white/70">required answers complete</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-grid-blue transition-all" style={{ width: `${100 * completed / activeFields.length}%` }} /></div></div>
    </header>
    {draftNotice && <p role="status" className="mt-3 text-sm text-muted-foreground">{draftNotice}</p>}
    {formError && <Alert variant="destructive" className="mt-5"><AlertDescription>{formError}</AlertDescription></Alert>}
    {urgent && <Alert className="mt-5 border-destructive/30 bg-destructive/5"><AlertTriangle className="text-destructive" /><AlertDescription><strong>Critical escalation identified.</strong> Saving raises this ticket to critical priority. Offline safety reports reach dispatch after sync.</AlertDescription></Alert>}
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[170px_minmax(0,1fr)]">
      <nav aria-label="Assessment sections" className="cc-field-rail"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-grid-navy"><ArrowDown size={14} /> Site checklist</p>{assessmentSections.map((section, index) => <a key={section.id} href={`#section-${section.id}`}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a>)}</nav>
      <div className="min-w-0 space-y-5">
        <FieldAssessmentSheet answers={answers} onChange={updateAnswer} errors={showErrors ? errors : {}} disabled={isSubmitting || submitted || !draftReady} renderDamagePhotos={field => ticketId && <div id={`damage-photo-${field.key}`} className="mt-4">
          <PhotoCapture ticketId={ticketId} title="Required damage photo" requiredTypes={['DAMAGE']} availableTypes={['DAMAGE']} photos={photos.filter(photo => photo.sectionKey === field.key)} onPhotosCaptured={captured => updatePhotos(field.key, captured)} disabled={isSubmitting || submitted || !draftReady} />
          {showErrors && photoErrors[field.key] && <p role="alert" className="mt-2 text-sm text-destructive">{photoErrors[field.key]}</p>}
        </div>} />
        <section className="cc-field-section p-5 sm:p-6"><p className="cc-field-eyebrow mb-2 text-grid-blue!">09 / PHOTO EVIDENCE</p><h2 className="mb-4 font-heading text-2xl font-semibold">Four views. One clear record.</h2>{ticketId && <PhotoCapture ticketId={ticketId} photos={photos.filter(photo => !photo.sectionKey)} onPhotosCaptured={captured => updatePhotos(undefined, captured)} disabled={isSubmitting || submitted || !draftReady} />}<p className="mt-3 text-sm text-muted-foreground">{evidencePhotos.length} captured · {missingPhotos.length} required views remaining</p></section>
        <fieldset disabled={isSubmitting || submitted || !draftReady} className="cc-field-section p-5 sm:p-6"><p className="cc-field-eyebrow mb-4 text-grid-blue!">10 / FINAL NOTES</p><AssessmentAnswerControl field={additionalNotesField} answers={answers} onChange={updateAnswer} error={showErrors ? errors.additionalNotes : undefined} /></fieldset>
        <footer className="cc-field-submit"><div><p className="font-semibold text-grid-navy">{urgent ? 'Critical priority on save' : 'Save, then review on the ticket'}</p><p className="mt-1 text-xs text-muted-foreground">Saving returns you to the ticket. Submit for review after checking the saved assessment.</p></div><Button type="button" variant="accent" size="lg" disabled={isSubmitting || submitted || !draftReady || !ticketId || !contractorId} onClick={() => void handleSubmit()}>{isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} {isSubmitting ? 'Saving…' : submitted ? 'Assessment saved' : 'Save assessment'}</Button></footer>
      </div>
    </div>
  </div>;
}
