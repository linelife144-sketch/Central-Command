'use client';

import { AssessmentEvidencePhotos } from './AssessmentEvidencePhotos';
import type { ReactNode } from 'react';
import { AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  assessmentSections, isFieldActive, formatFieldAnswer,
  type AssessmentField, type FieldAnswers, type FieldAssessment,
} from '@/lib/schemas/fieldAssessment';

export function AssessmentAnswerControl({ field, answers, onChange, error }: {
  field: AssessmentField; answers: FieldAnswers; onChange: (key: string, value: string | number | boolean | null) => void; error?: string;
}) {
  const value = answers[field.key];
  const id = `assessment-${field.key}`;
  return <div className={`cc-field-question ${field.when ? 'cc-field-followup' : ''}`}>
    {field.kind === 'boolean' ? <fieldset aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-3 text-sm font-semibold">{field.label} <span className="text-grid-blue" aria-label="required">*</span></legend>
      <div className="flex gap-3">
        {[true, false].map(option => <label key={String(option)} className={`cc-field-choice ${value === option ? 'is-selected' : ''}`}>
          <input type="radio" name={id} value={String(option)} checked={value === option} onChange={() => onChange(field.key, option)} className="sr-only" />
          <span className="cc-choice-dot">{value === option && <Check size={13} />}</span>{option ? 'Yes' : 'No'}
        </label>)}
      </div>
    </fieldset> : <>
      <Label htmlFor={id} className="mb-3 block">{field.label} <span className="text-grid-blue" aria-label="required">*</span></Label>
      {field.kind === 'select' ? <div className="relative">
        <select id={id} value={typeof value === 'string' ? value : ''} onChange={event => onChange(field.key, event.target.value || null)} className="cc-field-select" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
          <option value="">Select an answer</option>
          {field.options?.map(option => <option key={option} value={option}>{formatFieldAnswer(field, option)}</option>)}
        </select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-4 text-grid-blue" />
      </div> : field.kind === 'count' ? <Input id={id} type="number" min={field.minimum ?? 1} max={2147483647} step={1} inputMode="numeric" value={typeof value === 'number' ? value : ''} onChange={event => onChange(field.key, event.target.value === '' ? null : Number(event.target.value))} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="min-h-12" /> :
        <Textarea id={id} value={typeof value === 'string' ? value : ''} onChange={event => onChange(field.key, event.target.value)} maxLength={field.kind === 'notes' ? 4000 : 2000} rows={3} placeholder={field.kind === 'notes' ? 'Add anything else dispatch should know. Enter None if there are no additional notes.' : 'Describe what is damaged and what crews need to know.'} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />}
    </>}
    {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}

export function FieldAssessmentSheet({ answers, onChange, errors, disabled, renderDamagePhotos }: {
  answers: FieldAnswers; onChange: (key: string, value: string | number | boolean | null) => void; errors: Record<string, string>; disabled: boolean; renderDamagePhotos?: (field: AssessmentField) => ReactNode;
}) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-5">
    {assessmentSections.map((section, index) => <section key={section.id} id={`section-${section.id}`} className="cc-field-section scroll-mt-24">
      <header className="cc-field-section-heading">
        <span className="cc-field-number">{String(index + 1).padStart(2, '0')}</span>
        <div><h2 className="font-heading text-2xl font-semibold">{section.title}</h2><p className="mt-1 text-sm text-muted-foreground">{section.description}</p></div>
        {section.id === 'escalation' && <AlertTriangle className="ml-auto shrink-0 text-grid-lightning" size={24} />}
      </header>
      <div className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
        {section.fields.filter(field => isFieldActive(field, answers)).map(field => <div key={field.key} className={field.kind === 'text' ? 'sm:col-span-2' : ''}>
          <AssessmentAnswerControl field={field} answers={answers} onChange={onChange} error={errors[field.key]} />
          {field.kind === 'text' && renderDamagePhotos?.(field)}
        </div>)}
      </div>
    </section>)}
  </fieldset>;
}

export function FieldAssessmentReadback({ assessment, ticketId, photoEvidence = [] }: { assessment: FieldAssessment; ticketId?: string; photoEvidence?: import('@/lib/schemas/fieldAssessment').AssessmentPhotoEvidence[] }) {
  return <div className="space-y-4">
    {assessmentSections.map(section => <section key={section.id} className="rounded-xl border border-border bg-surface-raised p-4">
      <h3 className="mb-3 font-heading text-lg font-semibold text-grid-navy">{section.title}</h3>
      <dl className="grid gap-3 sm:grid-cols-2">{section.fields.filter(field => isFieldActive(field, assessment.answers)).map(field => <div key={field.key} className={field.kind === 'text' ? 'sm:col-span-2' : ''}>
        <dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{field.kind === 'text' ? String(assessment.answers[field.key] ?? '') : formatFieldAnswer(field, assessment.answers[field.key])}</dd>
        {ticketId && photoEvidence.some(photo => photo.sectionKey === field.key) && <AssessmentEvidencePhotos ticketId={ticketId} evidence={photoEvidence.filter(photo => photo.sectionKey === field.key)} />}
      </div>)}</dl>
    </section>)}
    {ticketId && photoEvidence.some(photo => !photo.sectionKey) && <section className="rounded-xl border p-4"><h3 className="font-heading text-lg font-semibold">Site photo evidence</h3><AssessmentEvidencePhotos ticketId={ticketId} evidence={photoEvidence.filter(photo => !photo.sectionKey)} /></section>}
    <section className="rounded-xl border border-border p-4"><h3 className="font-heading text-lg font-semibold">Additional notes</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{String(assessment.answers.additionalNotes ?? '')}</p></section>
  </div>;
}
