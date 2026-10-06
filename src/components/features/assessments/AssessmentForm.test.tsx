import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AssessmentForm } from './AssessmentForm';
vi.mock('@/lib/db/dexie',()=>({db:{assessmentDrafts:{get:vi.fn().mockResolvedValue(undefined),put:vi.fn().mockResolvedValue(undefined),delete:vi.fn().mockResolvedValue(undefined)}}}));
vi.mock('@/lib/services/assessmentSubmissionService',()=>({assessmentSubmissionService:{createAssessment:vi.fn()}}));
vi.mock('@/lib/sync/photoUploadQueue',()=>({photoUploadQueue:{add:vi.fn(),process:vi.fn().mockResolvedValue({failed:0})}}));
vi.mock('./PhotoCapture',()=>({PhotoCapture:()=> <div>GPS photo capture</div>}));
Element.prototype.scrollIntoView = vi.fn();
afterEach(cleanup);
describe('field assessment interactions',()=>{
 it('requires explicit answers and expands/clears pole damage details',async()=>{
  render(<AssessmentForm ticketId="ticket" contractorId="contractor" />);
  const pole=screen.getByRole('group',{name:/Is the pole broken/});
  await waitFor(()=>expect(within(pole).getByRole('radio',{name:'Yes'}).hasAttribute('disabled')).toBe(false));
  expect(screen.queryByLabelText(/Pole height/)).toBeNull();
  fireEvent.click(within(pole).getByRole('radio',{name:'Yes'}));
  expect(screen.getByLabelText(/Pole height/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/Pole height/),{target:{value:'40'}});
  fireEvent.click(within(pole).getByRole('radio',{name:'No'}));
  expect(screen.queryByLabelText(/Pole height/)).toBeNull();
  fireEvent.click(within(pole).getByRole('radio',{name:'Yes'}));
  expect((screen.getByLabelText(/Pole height/) as HTMLSelectElement).value).toBe('');
 });
 it('shows independent hazard escalation and required notes',async()=>{
  render(<AssessmentForm ticketId="ticket" contractorId="contractor" />);
  const danger=screen.getByRole('group',{name:/Is the public in danger/});
  await waitFor(()=>expect(screen.getByRole('button',{name:/Submit assessment/}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(within(danger).getByRole('radio',{name:'Yes'}));
  expect(screen.getByText('Critical escalation identified.')).toBeTruthy();
  expect(screen.getByLabelText(/Describe the public danger/)).toBeTruthy();
  expect(screen.getByLabelText(/Additional notes/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/Submit assessment/}));
  expect(screen.getByText('Complete every required answer before submitting.')).toBeTruthy();
 });
});
