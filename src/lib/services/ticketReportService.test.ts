import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildTicketReportHtml, canPrintTicket, type TicketReport } from './ticketReportService';
import { allAssessmentFields, emptyFieldAnswers } from '@/lib/schemas/fieldAssessment';
import type { Ticket } from '@/types';
const answers=emptyFieldAnswers();
for(const field of allAssessmentFields) if(!field.when) answers[field.key]=field.kind==='boolean'?false:field.kind==='select'?field.options![0]:'None';
Object.assign(answers,{poleBroken:true,poleHeight:'40',poleAccessible:false,poleDamage:'Pole split at the base. Access is blocked by debris.'});
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZ8AAAAASUVORK5CYII=';
const report: TicketReport={ticket:{id:'ticket',ticket_number:'QA-REPORT-001',status:'COMPLETE',utility_client:'ENTERGY',address:'100 Utility Lane',city:'Shreveport',state:'LA',zip_code:'71101',work_description:'Inspect the assigned outage location and document damage.',is_important:true,geofence_radius_meters:500,created_by:'user',created_at:'2026-10-06T12:00:00Z',updated_at:'2026-10-06T13:00:00Z',completed_at:'2026-10-06T13:00:00Z'} as Ticket,assigneeName:'QA Damage Assessor',utilityPayload:{feeder:'QA FEEDER 7'},assessments:[{id:'assessment',created_at:'2026-10-06T12:30:00Z',field_assessment:{version:1,answers},photo_evidence:[{id:'pole',type:'DAMAGE',sectionKey:'poleDamage',gpsLatitude:30,gpsLongitude:-90}]}],photos:[{id:'pole',src:png,label:'Pole damage · GPS 30, -90'}]};
describe('completed ticket print document',()=>{
 it.each(['COMPLETE','PENDING_REVIEW','APPROVED','CLOSED'])('allows printing at %s',status=>expect(canPrintTicket({...report.ticket,status:status as Ticket['status']})).toBe(true));
 it.each(['DRAFT','ASSIGNED','ON_SITE','IN_PROGRESS','NEEDS_REWORK','ARCHIVED'])('blocks premature printing at %s',status=>expect(canPrintTicket({...report.ticket,completed_at:undefined,status:status as Ticket['status']})).toBe(false));
 it('prints ticket, utility data, full field sheet, notes and section photo together',()=>{
  const html=buildTicketReportHtml(report);expect(html).toContain('QA-REPORT-001');expect(html).toContain('QA FEEDER 7');expect(html).toContain('Pole split at the base');expect(html.indexOf('Pole damage · GPS')).toBeGreaterThan(html.indexOf('Describe pole damage'));expect(html).toContain('Additional notes');expect(html).toContain('Save as PDF');
  if(process.env.CC_REPORT_PREVIEW) writeFileSync(process.env.CC_REPORT_PREVIEW,html);
 });
 it('does not omit missing assessment or photo evidence silently',()=>{expect(()=>buildTicketReportHtml({...report,assessments:[]})).toThrow('attached assessment');expect(()=>buildTicketReportHtml({...report,photos:[]})).toThrow('unavailable');});
 it('escapes field, utility and ticket text against HTML injection',()=>{const html=buildTicketReportHtml({...report,ticket:{...report.ticket,work_description:'<script>alert(1)</script>'},utilityPayload:{feeder:'<img onerror="alert(1)">'}});expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;img');});
 it('rejects arbitrary remote URLs as report photos',()=>expect(()=>buildTicketReportHtml({...report,photos:[{...report.photos[0],src:'https://attacker.invalid/photo'}]})).toThrow('Invalid report photo'));
 it('retains assessment revisions and review notes',()=>{const html=buildTicketReportHtml({...report,assessments:[...report.assessments,{...report.assessments[0],id:'rework',review_notes:'[APPROVED] Repairs verified'}]});expect(html).toContain('Attached assessment 2');expect(html).toContain('Repairs verified');});
});
