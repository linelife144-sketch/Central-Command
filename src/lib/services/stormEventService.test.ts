import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stormEventService } from './stormEventService';
const remote = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), getSession: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: remote.from, rpc: remote.rpc, auth: { getSession: remote.getSession } } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
const context = { id: 'storm-1', event_code: 'QA-1', name: 'QA', utility_client: 'ENTERGY', status: 'MOB', region: null, contract_reference: null, notes: null, start_date: null, end_date: null, created_at: '2026-09-30', config_snapshot: { field_definitions: [{ fieldKey: 'incident_number', label: 'Incident Number' }] } };
function query(result: { data: unknown; error: unknown }) {
  const promise=Promise.resolve(result);
  const chain = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), maybeSingle: vi.fn(), then: promise.then.bind(promise) };
  for (const fn of [chain.select, chain.eq, chain.in, chain.maybeSingle]) fn.mockReturnValue(chain);
  return chain;
}
beforeEach(() => { vi.clearAllMocks(); remote.getSession.mockResolvedValue({data:{session:{}},error:null}); remote.from.mockImplementation(table => query({data:table==='tickets'?[]:null,error:null})); });
describe('assigned storm context', () => {
  it('loads the restricted context when full storm selection is hidden by RLS', async () => {
    remote.rpc.mockResolvedValue({data:context,error:null});
    const result=await stormEventService.getStormEventById('storm-1');
    expect(remote.rpc).toHaveBeenCalledWith('get_assigned_storm_ticket_context',{p_storm_id:'storm-1'});
    expect(result).toMatchObject({eventCode:'QA-1',utilityClient:'ENTERGY',configSnapshot:context.config_snapshot,contractReference:null,notes:null});
  });
  it('keeps full storm data for authorized administrators', async () => {
    remote.from.mockImplementation(table=>query({data:table==='tickets'?[]:{...context,notes:'Admin notes'},error:null}));
    expect((await stormEventService.getStormEventById('storm-1'))?.notes).toBe('Admin notes');
    expect(remote.rpc).not.toHaveBeenCalled();
  });
  it('returns no context when the contractor has no assigned ticket', async () => {
    remote.rpc.mockResolvedValue({data:null,error:null});
    expect(await stormEventService.getStormEventById('storm-1')).toBeNull();
  });
  it('surfaces a failed context request instead of inventing utility rules', async () => {
    const error={code:'08006',message:'Connection failed'};remote.rpc.mockResolvedValue({data:null,error});
    await expect(stormEventService.getStormEventById('storm-1')).rejects.toEqual(error);
  });
  it('does not query without an authenticated session', async () => {
    remote.getSession.mockResolvedValue({data:{session:null},error:null});
    expect(await stormEventService.getStormEventById('storm-1')).toBeNull();
    expect(remote.from).not.toHaveBeenCalled();expect(remote.rpc).not.toHaveBeenCalled();
  });
});
