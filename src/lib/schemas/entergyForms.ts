import definitions from '@/lib/config/entergyForms.json';
import type { AssessmentPhotoEvidence } from './fieldAssessment';

export type EntergyFormKind = 'cleanup' | 'damage';
export type EntergyValue = string | boolean | string[] | null;
export type EntergyAnswers = Record<string, EntergyValue>;
export interface EntergyField { key: string; label: string; kind: string; options?: string[]; required?: boolean }
export interface EntergySection { id: string; title: string; description: string; fields: EntergyField[]; repeat?: { key: 'equipmentRows' | 'customerRows'; minimumRows: number } }
export interface MapStroke { points: [number, number][] }
export interface EntergyPayload {
  version: 1;
  answers: EntergyAnswers;
  equipmentRows: EntergyAnswers[];
  customerRows: EntergyAnswers[];
  /** Retained for compatibility with drafts saved before the map control was removed. */
  lightingMap: MapStroke[];
  damageReports: Record<string, string>;
}
export const entergyForms = definitions as Record<EntergyFormKind, { title: string; source: string; sourceUrl: string; revision: string | null; sections: EntergySection[] }>;
export const formFields = (kind: EntergyFormKind) => entergyForms[kind].sections.filter(s => !s.repeat).flatMap(s => s.fields);
export function emptyEntergyPayload(kind: EntergyFormKind): EntergyPayload {
  const blank = (fields: EntergyField[]) => Object.fromEntries(fields.map(f => [f.key, f.kind === 'multi' ? [] : null]));
  return { version: 1, answers: blank(formFields(kind)), equipmentRows: kind === 'damage' ? Array.from({ length: 6 }, (_, i) => ({ ...blank(entergyForms.damage.sections.find(s => s.id === 'equipment')!.fields), operation: i % 2 ? 'Remove' : 'Install' })) : [], customerRows: kind === 'damage' ? Array.from({ length: 3 }, () => blank(entergyForms.damage.sections.find(s => s.id === 'transfers')!.fields)) : [], lightingMap: [], damageReports: {} };
}
export function hasRowData(row: EntergyAnswers, ignoreOperation = false): boolean {
  return Object.entries(row).some(([key, v]) => (!ignoreOperation || key !== 'operation') && (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? Boolean(v.trim()) : typeof v === 'boolean'));
}
export function valueLabel(value: EntergyValue | undefined): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(' · ') || 'Not recorded';
  return value?.trim() || 'Not recorded';
}
export function entergyErrors(kind: EntergyFormKind, payload: EntergyPayload, submitting = true): Record<string, string> {
  const errors: Record<string, string> = {};
  if (payload?.version !== 1 || !payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers) || !Array.isArray(payload.equipmentRows) || !Array.isArray(payload.customerRows) || !Array.isArray(payload.lightingMap) || !payload.damageReports || typeof payload.damageReports !== 'object' || Array.isArray(payload.damageReports)) return { form: 'Invalid Entergy form structure.' };
  for (const key of Object.keys(payload)) if (!['version', 'answers', 'equipmentRows', 'customerRows', 'lightingMap', 'damageReports'].includes(key)) errors.form = 'Unknown form property.';
  const check = (fields: EntergyField[], answers: EntergyAnswers, prefix = '', require = submitting) => {
    for (const unknown of Object.keys(answers)) if (!fields.some(f => f.key === unknown)) errors[prefix + unknown] = 'Unknown form field.';
    for (const field of fields) {
      const value = answers[field.key]; const key = prefix + field.key;
      const absent = value === null || value === undefined || value === '' || Array.isArray(value) && !value.length;
      if (absent) { if (require && field.required) errors[key] = field.kind === 'boolean' ? 'Select Yes or No.' : 'Complete this field, or enter None when appropriate.'; continue; }
      if (field.kind === 'boolean') { if (typeof value !== 'boolean') errors[key] = 'Select Yes or No.'; }
      else if (field.kind === 'multi') { if (!Array.isArray(value) || new Set(value).size !== value.length || value.some(v => !field.options?.includes(v))) errors[key] = 'Select only the printed options.'; }
      else if (typeof value !== 'string' || value.length > (field.kind === 'notes' ? 4000 : 500)) errors[key] = 'Enter text within the displayed limit.';
      else if (field.kind === 'select' && !field.options?.includes(value)) errors[key] = 'Select a printed option.';
      else if (field.kind === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) errors[key] = 'Enter a valid date.';
      else if (['latitude', 'longitude'].includes(field.kind) && (!value.trim() || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > (field.kind === 'latitude' ? 90 : 180))) errors[key] = 'Enter valid GPS coordinates.';
    }
  };
  // Accept earlier saved legend data without exposing a removed control.
  const fields = formFields(kind);
  check(kind === 'damage' ? [...fields, { key: 'lightingMapNotes', label: 'Saved lighting legend', kind: 'notes' }] : fields, payload.answers);
  for (const section of entergyForms[kind].sections.filter(s => s.repeat)) {
    const key = section.repeat!.key; const rows = payload[key];
    if (rows.length < section.repeat!.minimumRows || rows.length > 60) errors[key] = `Keep ${section.repeat!.minimumRows} to 60 rows.`;
    rows.forEach((row, i) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) { errors[`${key}.${i}`] = 'Invalid row.'; return; }
      check(section.fields, row, `${key}.${i}.`, false);
      if (!submitting || !hasRowData(row, key === 'equipmentRows')) return;
      if (key === 'equipmentRows' && (!row.operation || !row.type && !row.companyEquipmentNumber)) errors[`${key}.${i}.type`] = 'Record the operation and a type or company equipment number.';
      if (key === 'customerRows') for (const required of ['customerNameAddress', 'identifierTypes', 'identifier', 'oldDlocTransformer', 'newDlocTransformer']) if (!row[required] || Array.isArray(row[required]) && !row[required].length) errors[`${key}.${i}.${required}`] = 'Complete each used transfer row.';
    });
  }
  if (kind === 'cleanup' && (payload.equipmentRows.length || payload.customerRows.length || payload.lightingMap.length)) errors.form = 'Damage fields do not belong in a clean-up form.';
  if (kind === 'damage' && submitting && !payload.answers.fromDloc && !payload.answers.toDloc) errors.fromDloc = 'Record at least one From or To DLOC.';
  if (kind === 'damage' && Boolean(payload.answers.latitude) !== Boolean(payload.answers.longitude)) errors.longitude = 'Record both GPS coordinates together.';
  if (payload.lightingMap.length > 100 || payload.lightingMap.some(s => !s || !Array.isArray(s.points) || s.points.length < 2 || s.points.length > 1000 || s.points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !Number.isFinite(n) || n < 0 || n > 1000)))) errors.lightingMap = 'Invalid map sketch. Draw within the map area.';
  for (const [section, details] of Object.entries(payload.damageReports)) {
    if (!entergyForms[kind].sections.some(s => s.id === section) || typeof details !== 'string' || details.length > 2000 || submitting && !details.trim()) errors[`damageReports.${section}`] = 'Describe the reported damage. Maximum 2,000 characters.';
  }
  return errors;
}
export function normalizeEntergyPayload(payload: EntergyPayload): EntergyPayload {
  const normalize = (answers: EntergyAnswers) => Object.fromEntries(Object.entries(answers).map(([key, v]) => [key, typeof v === 'string' ? v.trim() : v]));
  return { ...payload, answers: normalize(payload.answers), equipmentRows: payload.equipmentRows.map(normalize), customerRows: payload.customerRows.map(normalize), damageReports: Object.fromEntries(Object.entries(payload.damageReports).map(([key,v]) => [key,v.trim()])) };
}
export function validateEntergyPayload(kind: EntergyFormKind, payload: EntergyPayload, submitting = true): EntergyPayload {
  const errors = entergyErrors(kind, payload, submitting);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  return normalizeEntergyPayload(payload);
}
export function validateEntergyPhotos(photos: AssessmentPhotoEvidence[], payload?: EntergyPayload): void {
  if (photos.length < 4 || ['OVERVIEW', 'EQUIPMENT', 'DAMAGE', 'SAFETY'].some(type => !photos.some(p => p.type === type))) throw new Error('Capture four GPS-verified views: Overview, Equipment, Damage, and Safety.');
  if (new Set(photos.map(p => p.id)).size !== photos.length || photos.some(p => !p.id || !Number.isFinite(p.gpsLatitude) || !Number.isFinite(p.gpsLongitude) || Math.abs(p.gpsLatitude!) > 90 || Math.abs(p.gpsLongitude!) > 180)) throw new Error('Each evidence photo needs a unique ID and valid GPS coordinates.');
  for (const section of Object.keys(payload?.damageReports ?? {})) if (!photos.some(p => p.type === 'DAMAGE' && p.sectionKey === `entergy:${section}`)) throw new Error('Capture a damage photo inside every section with reported damage.');
  if (photos.some(p => p.sectionKey && (!p.sectionKey.startsWith('entergy:') || !(p.sectionKey.slice(8) in (payload?.damageReports ?? {})) || p.type !== 'DAMAGE'))) throw new Error('Photo section does not match reported damage.');
}
