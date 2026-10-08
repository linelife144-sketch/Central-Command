import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stormEventService } from './stormEventService';
const remote = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), getSession: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: remote.from, rpc: remote.rpc, auth: { getSession: remote.getSession, getUser: remote.getUser } } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
const context = { id: 'storm-1', event_code: 'QA-1', name: 'QA', utility_client: 'ENTERGY', status: 'MOB', region: null, contract_reference: null, notes: null, start_date: null, end_date: null, created_at: '2026-09-30', config_snapshot: { field_definitions: [{ fieldKey: 'incident_number', label: 'Incident Number' }] } };
function query(result: { data: unknown; error: unknown }) {
  const promise=Promise.resolve(result);
  const chain = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), maybeSingle: vi.fn(), then: promise.then.bind(promise) };
  for (const fn of [chain.select, chain.eq, chain.in, chain.maybeSingle]) fn.mockReturnValue(chain);
  return chain;
}
beforeEach(() => { vi.clearAllMocks(); remote.getSession.mockResolvedValue({data:{session:{}},error:null}); remote.getUser.mockResolvedValue({data:{user:{id:'admin-1'}},error:null}); remote.from.mockImplementation(table => query({data:table==='tickets'?[]:null,error:null})); });
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

describe('storm compensation creation', () => {
  const roleRates = {
    STORM_MANAGER: { payRate: 110, billRate: 210 },
    TEAM_LEAD: { payRate: 100, billRate: 190 },
    SR_DAMAGE_ASSESSER: { payRate: 90, billRate: 175 },
    DAMAGE_ASSESSER: { payRate: 80, billRate: 160 },
    DRIVER: { payRate: 60, billRate: 130 },
  };

  it('creates the storm and its role rates through one atomic RPC', async () => {
    remote.rpc.mockResolvedValue({ data: context, error: null });

    await stormEventService.createStormEvent({ name: 'QA Storm', utilityClient: 'Entergy', roleRates });

    expect(remote.rpc).toHaveBeenCalledWith('create_storm_event_with_rates', {
      p_event: expect.objectContaining({ name: 'QA Storm', utility_client: 'ENTERGY' }),
      p_role_rates: Object.entries(roleRates).map(([role, rates]) => ({
        role,
        pay_rate: rates.payRate,
        bill_rate: rates.billRate,
      })),
    });
    expect(remote.from).not.toHaveBeenCalledWith('storm_events');
  });

  it('surfaces the atomic create failure without falling back to storm-only insertion', async () => {
    const error = { code: '23514', message: 'All five roles require rates' };
    remote.rpc.mockResolvedValue({ data: null, error });

    await expect(stormEventService.createStormEvent({ name: 'QA Storm', utilityClient: 'Entergy', roleRates }))
      .rejects.toEqual(error);
    expect(remote.from).not.toHaveBeenCalledWith('storm_events');
  });
});
