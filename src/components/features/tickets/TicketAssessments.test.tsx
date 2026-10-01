import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { TicketAssessments } from './TicketAssessments';
import type { Ticket } from '@/types';
const remote=vi.hoisted(()=>({from:vi.fn(),eq:vi.fn(),order:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({supabase:{from:remote.from}}));
beforeEach(()=>{
 vi.clearAllMocks();
 const chain={select:vi.fn(),eq:remote.eq,order:remote.order};
 chain.select.mockReturnValue(chain);remote.eq.mockReturnValue(chain);remote.from.mockReturnValue(chain);
});
afterEach(cleanup);
describe('ticket assessment data',()=>{
 it('shows unreadable records as unavailable instead of falsely reporting none',async()=>{
  remote.order.mockResolvedValue({data:null,error:{message:'permission denied'}});
  render(<TicketAssessments ticket={{id:'own-ticket',status:'ASSIGNED'} as Ticket} canCreate />);
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('could not verify'));
  expect(screen.queryByText('No assessment submitted yet.')).toBeNull();
  expect(remote.eq).toHaveBeenCalledWith('ticket_id','own-ticket');
 });
 it('renders existing records and preserves the ticket context in the assessment link',async()=>{
  remote.order.mockResolvedValue({data:[{id:'assessment',reviewed_at:null,created_at:null}],error:null});
  render(<TicketAssessments ticket={{id:'own-ticket',status:'ON_SITE'} as Ticket} canCreate />);
  await waitFor(()=>expect(screen.getByText('Date unavailable')).toBeDefined());
  expect(screen.getByRole('link',{name:'Start Assessment Form'}).getAttribute('href')).toBe('/contractor/assessments/create?ticketId=own-ticket');
  expect(screen.queryByText('No assessment submitted yet.')).toBeNull();
 });
});
