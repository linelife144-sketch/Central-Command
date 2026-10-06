import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {TicketAssessments} from './TicketAssessments';
import type {Ticket} from '@/types';
const mocks=vi.hoisted(()=>({draft:vi.fn(),rows:vi.fn(),submit:vi.fn(),review:vi.fn(),role:'CONTRACTOR'}));
vi.mock('@/components/providers/AuthProvider',()=>({useAuth:()=>({profile:{id:'actor',role:mocks.role},can:()=>mocks.role!=='CONTRACTOR'})}));
vi.mock('@/hooks/useContractorId',()=>({useContractorId:()=>({contractorId:'assessor'})}));
vi.mock('@/lib/services/ticketAssessmentWorkflow',()=>({ticketAssessmentWorkflow:{loadDraft:mocks.draft,loadAssessments:mocks.rows,submit:mocks.submit,review:mocks.review}}));
vi.mock('@/components/features/assessments/FieldAssessmentSheet',()=>({FieldAssessmentReadback:()=> <p>Saved checklist readback</p>}));
const ticket={id:'ticket',ticket_number:'CC-100',status:'IN_PROGRESS',assigned_to:'assessor',team_lead_id:'lead',review_stage:'FIELDWORK'} as Ticket;
beforeEach(()=>{vi.clearAllMocks();mocks.role='CONTRACTOR';mocks.draft.mockResolvedValue(null);mocks.rows.mockResolvedValue([]);});afterEach(cleanup);
describe('ticket-owned assessment workflow',()=>{
 it('opens the form in its parent ticket route',async()=>{render(<TicketAssessments ticket={ticket} onChanged={()=>{}}/>);await waitFor(()=>expect(screen.getByRole('link',{name:'Assessment'}).getAttribute('href')).toBe('/tickets/ticket/assessment'));});
 it('does not claim no assessment when persistence cannot be read',async()=>{mocks.rows.mockRejectedValue(new Error('Assessment access unavailable'));render(<TicketAssessments ticket={ticket} onChanged={()=>{}}/>);await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Assessment access unavailable'));expect(screen.queryByText(/Assessment required\./)).toBeNull();});
 it('shows saved answers before explicit submission and never auto-submits',async()=>{mocks.draft.mockResolvedValue({assessment_id:'revision',field_assessment:{},photo_evidence:[],saved_at:'2026-10-06T12:00:00Z',dirty:false});mocks.submit.mockResolvedValue('SUBMITTED');render(<TicketAssessments ticket={ticket} onChanged={()=>{}}/>);await waitFor(()=>expect(screen.getByText('Saved checklist readback')).toBeDefined());expect(mocks.submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Submit for team lead review'}));await waitFor(()=>expect(mocks.submit).toHaveBeenCalledWith('ticket','actor','revision'));});
 it('team lead cannot see final approval controls',async()=>{mocks.role='ADMIN';mocks.rows.mockResolvedValue([{id:'revision',created_at:'2026-10-06',review_stage:'FINAL_REVIEW'}]);render(<TicketAssessments ticket={{...ticket,status:'PENDING_REVIEW',review_stage:'FINAL_REVIEW',team_lead_id:'actor',current_assessment_id:'revision'}} onChanged={()=>{}}/>);await waitFor(()=>expect(screen.getByText(/FINAL REVIEW/)).toBeDefined());expect(screen.queryByRole('button',{name:'Grant final approval'})).toBeNull();});
});
