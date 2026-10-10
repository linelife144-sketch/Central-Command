import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contractorService } from './contractorService';
const remote = vi.hoisted(() => ({ from: vi.fn(), getSession: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: remote.from, rpc: remote.rpc, auth: { getSession: remote.getSession } } }));
beforeEach(() => { vi.clearAllMocks(); remote.rpc.mockReset().mockResolvedValue({ data: { 'admin.contractors.view': true, 'admin.tickets.view': true, 'admin.assignments.view': true }, error: null }); remote.getSession.mockResolvedValue({ data: { session: {} }, error: null }); });
function query(result: { data: unknown; error: unknown }) {
  const chain = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn(), range: vi.fn(), maybeSingle: vi.fn(), then: Promise.resolve(result).then.bind(Promise.resolve(result)) };
  for (const method of [chain.select,chain.eq,chain.in,chain.gte,chain.lte,chain.order,chain.range,chain.maybeSingle]) method.mockReturnValue(chain);
  return chain;
}
describe('canonical contractor queries', () => {
  it('does not turn revoked contractor visibility into an empty company directory', async () => {
    remote.rpc.mockResolvedValue({ data: { 'admin.assignments.view': true }, error: null });
    remote.from.mockReturnValue(query({ data: [], error: null }));
    await expect(contractorService.listContractors()).rejects.toThrow(/permission/i);
    expect(remote.from).not.toHaveBeenCalled();
  });
  it('retains a permitted directory while representing hidden ticket counts as unavailable', async () => {
    remote.rpc.mockResolvedValue({ data: { 'admin.contractors.view': true, 'admin.tickets.view': false }, error: null });
    remote.from.mockImplementation(table => query({ data: table === 'contractors' ? [{ id: 'pending', profile_id: null, business_name: 'Pending person' }] : [], error: null }));
    expect((await contractorService.listContractors())[0].assignedTicketCount).toBeNull();
    expect(remote.from.mock.calls.some(call => call[0] === 'tickets')).toBe(false);
  });
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
    await expect(contractorService.listContractors()).rejects.toThrow(/sign in/i);
    expect(remote.from).not.toHaveBeenCalled();
  });
});

it('displays an added contractor without an account and excludes them from dispatch', async () => {
  remote.from.mockImplementation((table: string) => query({ data: table === 'contractors' ? [{ id: 'record', profile_id: null, first_name: 'QA', last_name: 'Added', business_name: 'QA Added', business_email: 'qa@example.test', business_phone: '(318) 555-0123', onboarding_status: 'PENDING', is_eligible_for_assignment: false }] : [], error: null }));
  expect((await contractorService.listContractors())[0]).toMatchObject({ profileId: null, fullName: 'QA Added', email: 'qa@example.test', isActive: true, onboardingCompletedAt: null });
  expect(await contractorService.listAssignableContractors()).toEqual([]);
  expect(remote.from.mock.calls.some(call => call[0] === 'profiles')).toBe(false);
});

it('assigns active linked contractors independently of historical approval values', async () => {
  remote.from.mockImplementation((table: string) => query({ data: table === 'contractors' ? [{ id: 'record', profile_id: 'profile', business_name: 'QA', onboarding_status: 'PENDING', is_eligible_for_assignment: false, onboarding_completed_at: null }] : table === 'profiles' ? [{ id: 'profile', first_name: 'QA', last_name: 'Crew', email: 'qa@example.test', is_active: true }] : [], error: null }));
  expect(await contractorService.listAssignableContractors()).toMatchObject([{ id: 'record' }]);
});
