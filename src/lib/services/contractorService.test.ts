import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contractorService } from './contractorService';
const remote = vi.hoisted(() => ({ from: vi.fn(), getSession: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: remote.from, auth: { getSession: remote.getSession } } }));
beforeEach(() => { vi.clearAllMocks(); remote.getSession.mockResolvedValue({ data: { session: {} }, error: null }); });
function query(result: { data: unknown; error: unknown }) {
  const chain = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), maybeSingle: vi.fn(), then: Promise.resolve(result).then.bind(Promise.resolve(result)) };
  for (const method of [chain.select,chain.eq,chain.in,chain.gte,chain.lte,chain.maybeSingle]) method.mockReturnValue(chain);
  return chain;
}
describe('canonical contractor queries', () => {
  it('queries the canonical table for the contractor list', async () => {
    remote.from.mockReturnValue(query({data:[],error:null}));
    expect(await contractorService.listContractors()).toEqual([]);
    expect(remote.from.mock.calls.map(call => call[0])).toEqual(['contractors']);
  });
  it('surfaces an incomplete schema rather than querying old table names', async () => {
    const error = { code:'PGRST205', message:'Table unavailable' };
    remote.from.mockReturnValue(query({data:null,error}));
    await expect(contractorService.listContractors()).rejects.toEqual(error);
    expect(remote.from.mock.calls.map(call => call[0])).toEqual(['contractors']);
  });
  it('uses the profile activity flag and counts only open, non-deleted assignments', async () => {
    const contractorQuery = query({ data: [{id:'crew',profile_id:'profile',business_name:'QA',onboarding_status:'APPROVED',is_eligible_for_assignment:true}],error:null });
    const ticketQuery = query({ data: [{id:'open',assigned_to:'crew',status:'ASSIGNED'},{id:'closed',assigned_to:'crew',status:'CLOSED'}],error:null });
    remote.from.mockImplementation((table: string) => {
      if (table === 'contractors') return contractorQuery;
      if (table === 'profiles') return query({data:[{id:'profile',first_name:'QA',last_name:'Crew',email:'qa@example.com',is_active:false}],error:null});
      if (table === 'tickets') return ticketQuery;
      return query({data:[],error:null});
    });
    const rows = await contractorService.listContractors();
    expect(rows[0]).toMatchObject({fullName:'QA Crew',isActive:false,assignedTicketCount:1});
    expect(contractorQuery.eq).toHaveBeenCalledWith('is_deleted', false);
    expect(ticketQuery.eq).toHaveBeenCalledWith('is_deleted', false);
    expect(await contractorService.listAssignableContractors()).toEqual([]);
  });

  it('does not use database queries without a session', async () => {
    remote.getSession.mockResolvedValue({ data:{ session:null },error:null });
    expect(await contractorService.listContractors()).toEqual([]);
    expect(remote.from).not.toHaveBeenCalled();
  });
});

it('displays an added contractor without an account and excludes them from dispatch', async () => {
  remote.from.mockImplementation((table: string) => query({ data: table === 'contractors' ? [{ id: 'record', profile_id: null, first_name: 'QA', last_name: 'Added', business_name: 'QA Added', business_email: 'qa@example.test', business_phone: '(318) 555-0123', onboarding_status: 'PENDING', is_eligible_for_assignment: false }] : [], error: null }));
  expect((await contractorService.listContractors())[0]).toMatchObject({ profileId: null, fullName: 'QA Added', email: 'qa@example.test', isActive: false, onboardingStatus: 'PENDING' });
  expect(await contractorService.listAssignableContractors()).toEqual([]);
  expect(remote.from.mock.calls.some(call => call[0] === 'profiles')).toBe(false);
});
