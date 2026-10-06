import definitions from '@/lib/config/fieldAssessment.json';

export type FieldAnswer = string | number | boolean | null;
export type FieldAnswers = Record<string, FieldAnswer>;
export interface FieldAssessment { version: 1; answers: FieldAnswers }
export interface AssessmentField {
  key: string;
  label: string;
  kind: string;
  options?: string[];
  when?: { key: string; value: boolean };
  minimum?: number;
}
export const assessmentSections: Array<{ id: string; title: string; description: string; fields: AssessmentField[] }> = definitions;
export const assessmentFields: AssessmentField[] = assessmentSections.flatMap(section => section.fields);
export const additionalNotesField: AssessmentField = { key: 'additionalNotes', label: 'Additional notes', kind: 'notes' };
export const allAssessmentFields = [...assessmentFields, additionalNotesField];

export function isFieldActive(field: AssessmentField, answers: FieldAnswers): boolean {
  if (!field.when) return true;
  const parent = assessmentFields.find(candidate => candidate.key === field.when?.key);
  return Boolean(parent && isFieldActive(parent, answers) && answers[field.when.key] === field.when.value);
}
export function emptyFieldAnswers(): FieldAnswers {
  return Object.fromEntries(allAssessmentFields.map(field => [field.key, null]));
}
export function normalizeFieldAnswers(answers: FieldAnswers, trimText = true): FieldAnswers {
  return Object.fromEntries(allAssessmentFields.map(field => [field.key,
    isFieldActive(field, answers) ? (trimText && typeof answers[field.key] === 'string' ? (answers[field.key] as string).trim() : answers[field.key] ?? null) : null,
  ]));
}
export function fieldErrors(answers: FieldAnswers): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of allAssessmentFields) {
    if (!isFieldActive(field, answers)) continue;
    const value = answers[field.key];
    if (field.kind === 'boolean' && typeof value !== 'boolean') errors[field.key] = 'Select Yes or No.';
    if (field.kind === 'select' && (typeof value !== 'string' || !field.options?.includes(value))) errors[field.key] = 'Select a predefined value.';
    if (field.kind === 'count' && (typeof value !== 'number' || !Number.isInteger(value) || value < (field.minimum ?? 1) || value > 2147483647)) errors[field.key] = 'Enter a positive whole number.';
    if (['text', 'notes'].includes(field.kind) && (typeof value !== 'string' || !value.trim() || value.trim().length > (field.kind === 'notes' ? 4000 : 2000))) errors[field.key] = field.kind === 'notes' ? 'Add notes, or enter None. Maximum 4,000 characters.' : 'Describe the damage. Maximum 2,000 characters.';
  }
  return errors;
}
export function validateFieldAssessment(value: FieldAssessment): FieldAssessment {
  if (value?.version !== 1 || !value.answers || typeof value.answers !== 'object') throw new Error('Invalid field assessment version.');
  const errors = fieldErrors(value.answers);
  if (Object.keys(errors).length) {
    const key = Object.keys(errors)[0];
    throw new Error(`${allAssessmentFields.find(field => field.key === key)?.label}: ${errors[key]}`);
  }
  const allowed = new Set(allAssessmentFields.map(field => field.key));
  if (Object.keys(value.answers).some(key => !allowed.has(key))) throw new Error('Unknown assessment field.');
  return { version: 1, answers: normalizeFieldAnswers(value.answers) };
}
export function requiresAssessmentEscalation(value: FieldAssessment): boolean {
  return value.answers.publicDanger === true || value.answers.oilLeak === true;
}
export function formatFieldAnswer(field: AssessmentField, value: FieldAnswer): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return 'Not recorded';
  return String(value).replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase());
}

export interface AssessmentPhotoEvidence {
  id: string; type: string; sectionKey?: string; checksumSha256?: string;
  gpsLatitude?: number; gpsLongitude?: number;
}
export function requiredDamagePhotoFields(answers: FieldAnswers): AssessmentField[] {
  return assessmentFields.filter(field => field.kind === 'text' && isFieldActive(field, answers));
}
export function damagePhotoErrors(answers: FieldAnswers, photos: AssessmentPhotoEvidence[]): Record<string, string> {
  return Object.fromEntries(requiredDamagePhotoFields(answers)
    .filter(field => !photos.some(photo => photo.sectionKey === field.key && photo.type === 'DAMAGE'))
    .map(field => [field.key, 'Capture a GPS-verified damage photo in this section.']));
}
export function validateAssessmentPhotos(answers: FieldAnswers, photos: AssessmentPhotoEvidence[]): void {
  if (photos.length < 4 || ['OVERVIEW', 'EQUIPMENT', 'DAMAGE', 'SAFETY'].some(type => !photos.some(photo => photo.type === type))) throw new Error('Four required photo views are needed.');
  if (new Set(photos.map(photo => photo.id)).size !== photos.length || photos.some(photo => !photo.id)) throw new Error('Each photo must have a unique identifier.');
  if (photos.some(photo => !Number.isFinite(photo.gpsLatitude) || !Number.isFinite(photo.gpsLongitude) || Math.abs(photo.gpsLatitude!) > 90 || Math.abs(photo.gpsLongitude!) > 180)) throw new Error('Every photo requires valid GPS coordinates.');
  const errors = damagePhotoErrors(answers, photos);
  if (Object.keys(errors).length) throw new Error(`${assessmentFields.find(field => field.key === Object.keys(errors)[0])?.label}: ${Object.values(errors)[0]}`);
  const allowed = new Set(requiredDamagePhotoFields(answers).map(field => field.key));
  if (photos.some(photo => photo.sectionKey && (!allowed.has(photo.sectionKey) || photo.type !== 'DAMAGE'))) throw new Error('Photo section does not match reported damage.');
}
