'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ClipboardCheck, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { photoUploadQueue } from '@/lib/sync/photoUploadQueue';
import { db } from '@/lib/db/dexie';
import { assessmentSubmissionService } from '@/lib/services/assessmentSubmissionService';
import { getMissingRequiredPhotoTypes } from '@/lib/utils/assessmentPhotos';
import {
  additionalNotesField, allAssessmentFields, emptyFieldAnswers, fieldErrors, isFieldActive,
  normalizeFieldAnswers, requiresAssessmentEscalation, assessmentSections,
  damagePhotoErrors, requiredDamagePhotoFields,
  type FieldAnswer,
} from '@/lib/schemas/fieldAssessment';
import type { CapturedAssessmentPhoto, DamageAssessment } from '@/types';
import { AssessmentAnswerControl, FieldAssessmentSheet } from './FieldAssessmentSheet';
import { PhotoCapture } from './PhotoCapture';

interface AssessmentFormProps { ticketId?: string; contractorId?: string; onSaved?: (assessment: DamageAssessment) => void }

export function AssessmentForm({ ticketId, contractorId, onSaved }: AssessmentFormProps) {
  const [answers, setAnswers] = useState(emptyFieldAnswers);
  const [photos, setPhotos] = useState<CapturedAssessmentPhoto[]>([]);
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { photosRef.current.forEach(photo => URL.revokeObjectURL(photo.previewUrl)); }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');
  const draftId = `${contractorId}:${ticketId}`;
  const [submitted, setSubmitted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    if (!ticketId || !contractorId) return;
    let active = true;
    void db.assessmentDrafts.get(draftId).then(draft => { if (active) { if (draft) { setAnswers(normalizeFieldAnswers(draft.answers, false)); setPhotos((draft.photos ?? []).map(photo => ({ ...photo, previewUrl: URL.createObjectURL(photo.file) }))); setDraftNotice('Saved answers and photo evidence restored.'); } setDraftReady(true); } }).catch(() => { if (active) { setDraftReady(true); setDraftNotice('Device draft storage is unavailable. Keep this page open until you submit.'); } });
    return () => { active = false; };
  }, [draftId, ticketId, contractorId]);
  useEffect(() => {
    if (!draftReady || submitted || !ticketId || !contractorId) return;
    const timer = setTimeout(() => { void db.assessmentDrafts.put({ id: draftId, ticket_id: ticketId, contractor_id: contractorId, answers, photos, updated_at: new Date().toISOString() }).catch(() => setDraftNotice('Unable to save this draft on your device. Keep this page open until submission.')); }, 300);
    return () => clearTimeout(timer);
  }, [answers, photos, draftReady, submitted, draftId, ticketId, contractorId]);
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
      setFormError('Complete every required answer before submitting.');
      const first = document.getElementById(`assessment-${Object.keys(errors)[0]}`) ?? document.querySelector(`input[name="assessment-${Object.keys(errors)[0]}"]`);
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      (first as HTMLElement | null)?.focus();
      return;
    }
    if (!ticketId || !contractorId) { setFormError('An assigned ticket and signed-in contractor are required.'); return; }
    if (Object.keys(photoErrors).length) { setFormError(Object.values(photoErrors)[0]); document.getElementById(`damage-photo-${Object.keys(photoErrors)[0]}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (evidencePhotos.length < 4 || missingPhotos.length) { setFormError('Capture at least four GPS-verified photos: Overview, Equipment, Damage, and Safety.'); return; }
    setFormError(null); setIsSubmitting(true);
    try {
      for (const photo of evidencePhotos) await photoUploadQueue.add(photo);
      const created = await assessmentSubmissionService.createAssessment({
        ticketId, contractorId, fieldAssessment,
        safetyObservations: {
          downed_conductors: answers.conductorBroken === true,
          damaged_insulators: answers.insulatorsBroken === true,
          vegetation_contact: answers.treeCrewsNeeded === true,
          structural_damage: answers.poleBroken === true,
          fire_hazard: false, public_accessible: answers.publicDanger === true,
          safe_distance_maintained: false,
        },
        damageClassification: { priority: urgent ? 'A' : 'C' }, equipmentItems: [],
        photoMetadata: evidencePhotos.map(photo => ({ id: photo.id, type: photo.type, sectionKey: photo.sectionKey, checksumSha256: photo.checksumSha256,
          gpsLatitude: photo.metadata.gpsLatitude ?? undefined, gpsLongitude: photo.metadata.gpsLongitude ?? undefined })),
      });
      setSubmitted(true);
      await db.assessmentDrafts.delete(draftId).catch(() => undefined);
      toast.success(created.sync_status === 'PENDING' ? 'Assessment saved on this device. Dispatch escalation will apply when it syncs.' : urgent ? 'Assessment submitted. Ticket escalated to critical priority.' : 'Assessment submitted for review.');
      onSaved?.(created);
      if (navigator.onLine) void photoUploadQueue.process().catch(() => toast.warning('Photo upload is pending. Use Sync to retry.'));
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to submit assessment.'); }
    finally { setIsSubmitting(false); }
  };

  return <div className="cc-field-assessment">
    <header className="cc-field-hero">
      <div><p className="cc-field-eyebrow">FIELD OPERATIONS / REQUIRED ASSESSMENT</p><h1 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">Read the site.<br /><span className="text-grid-blue">From the top down.</span></h1><p className="mt-3 max-w-lg text-sm text-white/70">Answer every question. Record the damage. Give dispatch a complete picture of what crews will need.</p></div>
      <div className="cc-field-progress"><ClipboardCheck className="mb-3 text-grid-lightning" size={28} /><p className="font-heading text-3xl font-semibold">{completed}<span className="text-lg text-white/50"> / {activeFields.length}</span></p><p className="mt-1 text-xs text-white/70">required answers complete</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-grid-blue transition-all" style={{ width: `${100 * completed / activeFields.length}%` }} /></div></div>
    </header>
    {draftNotice && <p role="status" className="mt-3 text-sm text-muted-foreground">{draftNotice}</p>}
    {formError && <Alert variant="destructive" className="mt-5"><AlertDescription>{formError}</AlertDescription></Alert>}
    {urgent && <Alert className="mt-5 border-destructive/30 bg-destructive/5"><AlertTriangle className="text-destructive" /><AlertDescription><strong>Critical escalation identified.</strong> Submission raises this ticket to critical priority. Offline reports reach dispatch after sync.</AlertDescription></Alert>}
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[170px_minmax(0,1fr)]">
      <nav aria-label="Assessment sections" className="cc-field-rail"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-grid-navy"><ArrowDown size={14} /> Site checklist</p>{assessmentSections.map((section, index) => <a key={section.id} href={`#section-${section.id}`}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a>)}</nav>
      <div className="min-w-0 space-y-5">
        <FieldAssessmentSheet answers={answers} onChange={updateAnswer} errors={showErrors ? errors : {}} disabled={isSubmitting || submitted || !draftReady} renderDamagePhotos={field => ticketId && <div id={`damage-photo-${field.key}`} className="mt-4">
          <PhotoCapture ticketId={ticketId} title="Required damage photo" requiredTypes={['DAMAGE']} availableTypes={['DAMAGE']} photos={photos.filter(photo => photo.sectionKey === field.key)} onPhotosCaptured={captured => updatePhotos(field.key, captured)} disabled={isSubmitting || submitted || !draftReady} />
          {showErrors && photoErrors[field.key] && <p role="alert" className="mt-2 text-sm text-destructive">{photoErrors[field.key]}</p>}
        </div>} />
        <section className="cc-field-section p-5 sm:p-6"><p className="cc-field-eyebrow mb-2 text-grid-blue!">09 / PHOTO EVIDENCE</p><h2 className="mb-4 font-heading text-2xl font-semibold">Four views. One clear record.</h2>{ticketId && <PhotoCapture ticketId={ticketId} photos={photos.filter(photo => !photo.sectionKey)} onPhotosCaptured={captured => updatePhotos(undefined, captured)} disabled={isSubmitting || submitted || !draftReady} />}<p className="mt-3 text-sm text-muted-foreground">{evidencePhotos.length} captured · {missingPhotos.length} required views remaining</p></section>
        <fieldset disabled={isSubmitting || submitted || !draftReady} className="cc-field-section p-5 sm:p-6"><p className="cc-field-eyebrow mb-4 text-grid-blue!">10 / FINAL NOTES</p><AssessmentAnswerControl field={additionalNotesField} answers={answers} onChange={updateAnswer} error={showErrors ? errors.additionalNotes : undefined} /></fieldset>
        <footer className="cc-field-submit"><div><p className="font-semibold text-grid-navy">{urgent ? 'Critical priority on submission' : 'Ready for dispatch review'}</p><p className="mt-1 text-xs text-muted-foreground">Every answer is validated. The assessment stays linked to this ticket.</p></div><Button type="button" variant="accent" size="lg" disabled={isSubmitting || submitted || !draftReady || !ticketId || !contractorId} onClick={() => void handleSubmit()}>{isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} {isSubmitting ? 'Submitting…' : submitted ? 'Assessment saved' : 'Submit assessment'}</Button></footer>
      </div>
    </div>
  </div>;
}
