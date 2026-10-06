import { assessmentSections, additionalNotesField, formatFieldAnswer, isFieldActive, type AssessmentPhotoEvidence, type FieldAssessment } from '@/lib/schemas/fieldAssessment';
import { getTicketTemplateByUtilityClient, normalizeUtilityClient } from '@/lib/tickets/templates';
import { formatAddress } from '@/lib/utils/formatters';
import type { Ticket } from '@/types';

export interface TicketReportAssessment {
  id: string; field_assessment?: FieldAssessment | null; photo_evidence?: AssessmentPhotoEvidence[];
  assessed_at?: string | null; created_at: string; reviewed_at?: string | null; review_notes?: string | null;
  team_review_notes?: string | null; review_stage?: string;
  safety_observations?: Record<string, boolean> | null; damage_cause?: string | null;
  immediate_actions?: string | null; priority?: string | null;
}
export interface TicketReportPhoto { id: string; src: string; label: string }
export interface TicketReport {
  ticket: Ticket; assessments: TicketReportAssessment[]; photos: TicketReportPhoto[];
  utilityPayload?: Record<string, unknown> | null; assigneeName?: string;
}
export function canPrintTicket(ticket: Ticket): boolean {
  return ['COMPLETE', 'PENDING_REVIEW', 'APPROVED', 'CLOSED'].includes(ticket.status) || (ticket.status === 'ARCHIVED' && Boolean(ticket.completed_at));
}
function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
function answer(label: string, value: unknown): string {
  return `<div class="answer"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value ?? 'Not recorded')}</dd></div>`;
}
function imageHtml(photo: TicketReportPhoto): string {
  // Only authenticated downloads converted to data URLs may enter the report.
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(photo.src)) throw new Error('Invalid report photo.');
  return `<figure><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.label)}" /><figcaption>${escapeHtml(photo.label)}</figcaption></figure>`;
}
export function buildTicketReportHtml(report: TicketReport): string {
  const { ticket, assessments, photos } = report;
  if (!canPrintTicket(ticket)) throw new Error('Complete the ticket before printing.');
  if (!assessments.length) throw new Error('The attached assessment is required to print the completed ticket.');
  if (assessments.some(row => row.photo_evidence?.some(photo => !photos.some(item => item.id === photo.id)))) throw new Error('Photo evidence is unavailable. Sync all photos before printing.');
  const template = getTicketTemplateByUtilityClient(normalizeUtilityClient(ticket.utility_client));
  const labels = new Map(template.fieldConfig.map(field => [field.fieldKey, field]));
  const utility = Object.entries(report.utilityPayload ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== '').map(([key, value]) => {
    const field = labels.get(key);
    return answer(field?.label ?? key.replaceAll('_', ' '), field?.enumLabels?.[String(value)] ?? (typeof value === 'boolean' ? value ? 'Yes' : 'No' : typeof value === 'object' ? JSON.stringify(value) : value));
  }).join('');
  const content = assessments.map((row, index) => {
    const evidence = row.photo_evidence ?? [];
    const fieldSheet = row.field_assessment;
    const sections = fieldSheet ? [...assessmentSections, { id: 'notes', title: 'Additional notes', fields: [additionalNotesField] }].map(section => {
      const fields = section.fields.filter(field => isFieldActive(field, fieldSheet.answers));
      return `<section><h3>${escapeHtml(section.title)}</h3>${fields.map(field => { const attached = evidence.filter(photo => photo.sectionKey === field.key); return `<dl class="field">${answer(field.label, field.kind === 'text' || field.kind === 'notes' ? fieldSheet.answers[field.key] : formatFieldAnswer(field, fieldSheet.answers[field.key]))}</dl>${attached.length ? `<div class="photos">${attached.map(photo => imageHtml(photos.find(item => item.id === photo.id)!)).join('')}</div>` : ''}`; }).join('')}</section>`;
    }).join('') : `<section><h3>Historical assessment</h3><dl>${answer('Damage cause', row.damage_cause)}${answer('Priority', row.priority)}${answer('Immediate actions', row.immediate_actions)}${Object.entries(row.safety_observations ?? {}).map(([key, value]) => answer(key.replaceAll('_', ' '), value ? 'Yes' : 'No')).join('')}</dl></section>`;
    const general = evidence.filter(photo => !photo.sectionKey).map(photo => photos.find(item => item.id === photo.id)!);
    return `<article class="assessment"><h2>Attached assessment ${index + 1}</h2><p class="meta">Assessed: ${escapeHtml(row.assessed_at ?? row.created_at)} · ${row.review_stage ? escapeHtml(row.review_stage.replaceAll('_',' ')) : row.reviewed_at ? 'Reviewed' : 'Awaiting review'}<br />Record: ${escapeHtml(row.id)}</p>${sections}${general.length ? `<section><h3>Site photo evidence</h3><div class="photos">${general.map(imageHtml).join('')}</div></section>` : ''}${row.team_review_notes ? `<section><h3>Team lead review notes</h3><p>${escapeHtml(row.team_review_notes)}</p></section>` : ''}${row.review_notes ? `<section><h3>Final review notes</h3><p>${escapeHtml(row.review_notes)}</p></section>` : ''}</article>`;
  }).join('');
  const linkedIds = new Set(assessments.flatMap(row => (row.photo_evidence ?? []).map(photo => photo.id)));
  const otherPhotos = photos.filter(photo => !linkedIds.has(photo.id));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Ticket ${escapeHtml(ticket.ticket_number)}</title><style>
  @page{size:Letter;margin:0.6in}*{box-sizing:border-box}body{font:11pt Arial,sans-serif;color:#17243a;margin:0;line-height:1.45}header{border-bottom:4px solid #2ea3f2;padding-bottom:14px;margin-bottom:20px}.brand{color:#002168;font-size:10pt;font-weight:bold;letter-spacing:2px}h1{font-size:26pt;margin:7px 0}h2{font-size:18pt;color:#002168;border-bottom:2px solid #ffc038;padding-bottom:6px;margin-top:25px;break-after:avoid}h3{font-size:13pt;color:#002168;margin:20px 0 10px;break-after:avoid}.meta,dt{font-size:9pt;color:#546276}dl{display:grid;grid-template-columns:1fr 1fr;gap:12px}dl.field{display:block;margin:0}dd{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.answer{margin-bottom:12px;break-inside:avoid}p{white-space:pre-wrap;overflow-wrap:anywhere}.photos{display:grid;grid-template-columns:1fr 1fr;gap:14px}figure{margin:6px 0 14px;break-inside:avoid}img{width:100%;height:2.5in;object-fit:contain;border:1px solid #dde3ec}figcaption{font-size:9pt;margin-top:5px;overflow-wrap:anywhere}.assessment+.assessment{break-before:page}footer{margin-top:25px;border-top:1px solid #dde3ec;padding-top:8px;font-size:8pt;color:#546276}
  </style></head><body><header><div class="brand">CENTRAL COMMAND / COMPLETED TICKET</div><h1>Ticket ${escapeHtml(ticket.ticket_number)}</h1><div>${escapeHtml(ticket.utility_client)} · ${escapeHtml(ticket.status.replaceAll('_', ' '))}</div></header><dl>${answer('Outage location', formatAddress(ticket.address, ticket.city ?? null, ticket.state ?? null, ticket.zip_code ?? null))}${answer('Assigned contractor', report.assigneeName || ticket.assigned_to)}${answer('Work order', ticket.work_order_ref)}${answer('Created', ticket.created_at)}${answer('Completed', ticket.completed_at)}${answer('Review stage', ticket.review_stage?.replaceAll('_', ' '))}${answer('Importance', ticket.is_important ? 'Important' : 'Standard')}${answer('Severity', ticket.severity)}${answer('Utility handoff',ticket.utility_submission_reference)}${answer('Utility handoff recorded',ticket.utility_submitted_at)}${answer('Contact', [ticket.client_contact_name, ticket.client_contact_phone].filter(Boolean).join(' · '))}</dl><section><h2>Work description</h2><p>${escapeHtml(ticket.work_description)}</p>${ticket.special_instructions ? `<h3>Special instructions</h3><p>${escapeHtml(ticket.special_instructions)}</p>` : ''}</section>${utility ? `<section><h2>Utility ticket details</h2><dl>${utility}</dl></section>` : ''}${content}${otherPhotos.length ? `<section><h2>Additional ticket photos</h2><div class="photos">${otherPhotos.map(imageHtml).join('')}</div></section>` : ''}<footer>Ticket and attached assessments are one record. All dates are stored timestamps (UTC). Print or choose Save as PDF in the print dialog.</footer></body></html>`;
}
async function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read photo evidence.')); reader.readAsDataURL(blob); });
}
export async function loadTicketReport(ticketId: string, assigneeName?: string): Promise<TicketReport> {
  const { supabase } = await import('@/lib/supabase/client');
  const { ticketService } = await import('@/lib/services/ticketService');
  const ticket = await ticketService.getTicketById(ticketId);
  if (!ticket || !canPrintTicket(ticket)) throw new Error('Complete the ticket before printing.');
  const [assessmentResult, mediaResult, utilityPayload] = await Promise.all([
    supabase.from('damage_assessments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    supabase.from('media_assets').select('id, storage_bucket, storage_path, original_name, mime_type').eq('entity_type', 'ticket').eq('entity_id', ticketId).eq('upload_status', 'COMPLETED').eq('file_type', 'PHOTO'),
    ticketService.getUtilityPayload(ticketId),
  ]);
  if (assessmentResult.error) throw assessmentResult.error;
  if (mediaResult.error) throw mediaResult.error;
  const assessments = (assessmentResult.data ?? []) as unknown as TicketReportAssessment[];
  const linkedPhotoIds = new Set(assessments.flatMap(row => (row.photo_evidence ?? []).map(photo => photo.id)));
  const photos: TicketReportPhoto[] = [];
  for (const media of (mediaResult.data ?? []).filter(media => linkedPhotoIds.has(media.id) || assessments.some(row => !row.field_assessment))) {
    const { data, error } = await supabase.storage.from(media.storage_bucket).download(media.storage_path);
    if (error || !data) throw new Error('Photo evidence is unavailable. Sync all photos before printing.');
    if (!/^image\/(jpeg|png|webp)$/.test(data.type)) throw new Error('Unsupported photo format.');
    photos.push({ id: media.id, src: await blobDataUrl(data), label: media.original_name ?? media.id });
  }
  for (const row of assessments) for (const evidence of row.photo_evidence ?? []) {
    const photo = photos.find(item => item.id === evidence.id);
    if (photo) photo.label = `${assessmentSections.flatMap(section => section.fields).find(field => field.key === evidence.sectionKey)?.label ?? evidence.type} · GPS ${evidence.gpsLatitude}, ${evidence.gpsLongitude}`;
  }
  return { ticket, assessments, photos, utilityPayload, assigneeName };
}

export async function printTicketReport(report: TicketReport): Promise<void> {
  const html = buildTicketReportHtml(report);
  const frame = document.createElement('iframe');
  frame.title = 'Completed ticket print document';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:850px;height:1100px;border:0';
  const loaded = new Promise<void>((resolve, reject) => { frame.onload = () => resolve(); frame.onerror = () => reject(new Error('Unable to prepare print document.')); });
  frame.srcdoc = html;
  document.body.append(frame);
  try {
    await loaded;
    const doc = frame.contentDocument, win = frame.contentWindow;
    if (!doc || !win) throw new Error('Print preview is unavailable.');
    await Promise.all(Array.from(doc.images).map(image => image.decode()));
    await doc.fonts.ready;
    win.addEventListener('afterprint', () => frame.remove(), { once: true });
    win.focus(); win.print();
    // Keep the frame alive while mobile browsers display an asynchronous print dialog.
    setTimeout(() => frame.remove(), 300000);
  } catch (error) { frame.remove(); throw error; }
}
