import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stormEventService } from './stormEventService';
const remote = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), getSession: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: remote.from, rpc: remote.rpc, auth: { getSession: remote.getSession, getUser: remote.getUser } } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
const context = { id: 'storm-1', event_code: 'QA-1', name: 'QA', utility_client: 'ENTERGY', status: 'MOB', region: null, contract_reference: null, notes: null, start_date: null, end_date: null, created_at: '2026-09-30', config_snapshot: { field_definitions: [{ fieldKey: 'incident_number', label: 'Incident Number' }] } };
function query(result: { data: unknown; error: unknown }, applyProjection = false) {
  let columns = '';
  let bounds = [0, 999];
  const filters: Array<[string, unknown[]]> = [];
  const projected = () => {
    const data = Array.isArray(result.data) ? result.data.filter(row => filters.every(([key, values]) => values.includes(row[key]))).slice(bounds[0], bounds[1] + 1) : result.data;
    if (!applyProjection || !data) return { ...result, data };
    const project = (row: Record<string, unknown>) => Object.fromEntries(
      columns.split(',').map(column => column.trim()).filter(column => column in row).map(column => [column, row[column]]),
    );
    return { ...result, data: Array.isArray(data) ? data.map(project) : project(data as Record<string, unknown>) };
  };
  const chain = { select: vi.fn((selected: string) => { columns = selected; return chain; }), eq: vi.fn(), in: vi.fn((key: string, values: unknown[]) => { filters.push([key, values]); return chain; }), order: vi.fn(), range: vi.fn((from: number, to: number) => { bounds = [from, to]; return chain; }), maybeSingle: vi.fn(), then: (...args: Parameters<Promise<typeof result>['then']>) => Promise.resolve(projected()).then(...args) };
  for (const fn of [chain.eq, chain.order, chain.maybeSingle]) fn.mockReturnValue(chain);
  return chain;
}
beforeEach(() => { vi.clearAllMocks(); remote.rpc.mockReset().mockResolvedValue({ data: { 'admin.storms.view': true, 'admin.tickets.view': true }, error: null }); remote.getSession.mockResolvedValue({data:{session:{}},error:null}); remote.getUser.mockResolvedValue({data:{user:{id:'admin-1'}},error:null}); remote.from.mockImplementation(table => query({data:table==='tickets'?[]:null,error:null})); });
describe('assigned storm context', () => {
  it('loads the restricted context when full storm selection is hidden by RLS', async () => {
    remote.rpc.mockResolvedValue({data:context,error:null});
    const result=await stormEventService.getStormEventById('storm-1');
    expect(remote.rpc).toHaveBeenCalledWith('get_assigned_storm_ticket_context',{p_storm_id:'storm-1'});
    expect(result).toMatchObject({eventCode:'QA-1',utilityClient:'ENTERGY',configSnapshot:context.config_snapshot,contractReference:null,notes:null});
  });
  it('preserves assigned utility context when unrelated count reads would fail', async () => {
    remote.rpc.mockResolvedValue({ data: context, error: null });
    remote.from.mockImplementation(table => query({ data: null, error: table === 'tickets' ? { code: '08006', message: 'Count unavailable' } : null }));
    expect(await stormEventService.getStormEventById('storm-1')).toMatchObject({ id: 'storm-1', activeTickets: null, utilityClient: 'ENTERGY' });
    expect(remote.from.mock.calls.some(call => call[0] === 'tickets')).toBe(false);
  });
  it('does not present a hidden full-detail ticket count as zero', async () => {
    remote.rpc.mockResolvedValue({ data: { 'admin.tickets.view': false }, error: null });
    remote.from.mockImplementation(table => query({ data: table === 'tickets' ? [] : context, error: null }));
    expect((await stormEventService.getStormEventById('storm-1'))?.activeTickets).toBeNull();
    expect(remote.from.mock.calls.some(call => call[0] === 'tickets')).toBe(false);
  });
  it('keeps full storm data for authorized administrators', async () => {
    remote.from.mockImplementation(table=>query({data:table==='tickets'?[]:{...context,notes:'Admin notes'},error:null}));
    expect((await stormEventService.getStormEventById('storm-1'))?.notes).toBe('Admin notes');
    expect(remote.rpc).not.toHaveBeenCalledWith('get_assigned_storm_ticket_context', expect.anything());
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

    await stormEventService.createStormEvent({ name: 'QA Storm', utilityClient: 'Entergy', responsibleManagerId: 'manager-1', roleRates });

    expect(remote.rpc).toHaveBeenCalledWith('create_storm_event_with_rates', {
      p_event: expect.objectContaining({ name: 'QA Storm', utility_client: 'ENTERGY', responsible_manager_id: 'manager-1' }),
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

    await expect(stormEventService.createStormEvent({ name: 'QA Storm', utilityClient: 'Entergy', responsibleManagerId: 'manager-1', roleRates }))
      .rejects.toEqual(error);
    expect(remote.from).not.toHaveBeenCalledWith('storm_events');
  });
  it('rejects missing manager selection before creating any records', async () => {
    await expect(stormEventService.createStormEvent({ name: 'QA Storm', utilityClient: 'Entergy', responsibleManagerId: '', roleRates })).rejects.toThrow('responsible Storm Manager');
    expect(remote.rpc).not.toHaveBeenCalled();
  });
});

describe('responsible manager readback and changes', () => {
  it('retains permitted storm selection with unavailable hidden ticket counts', async () => {
    remote.rpc.mockResolvedValue({ data: { 'admin.storms.view': true, 'admin.tickets.view': false }, error: null });
    remote.from.mockImplementation(table => query({ data: table === 'tickets' ? [] : [context], error: null }));
    expect((await stormEventService.listStormEvents())[0].activeTickets).toBeNull();
    expect(remote.from.mock.calls.some(call => call[0] === 'tickets')).toBe(false);
  });
  it('returns the committed manager assignment even when ticket enrichment is unavailable', async () => {
    remote.rpc.mockResolvedValue({ data: { ...context, responsible_manager_id: 'manager-2' }, error: null });
    remote.from.mockReturnValue(query({ data: null, error: { code: '08006', message: 'Counts unavailable' } }));
    await expect(stormEventService.setStormManager('storm-1', 'manager-2', 'manager-1')).resolves.toMatchObject({ responsibleManagerId: 'manager-2', activeTickets: null });
    expect(remote.from).not.toHaveBeenCalled();
  });
  it('loads storm choices beyond one page and completes required ticket counts', async () => {
    const events = Array.from({ length: 1001 }, (_, i) => ({ ...context, id: `storm-${i}` }));
    const tickets = Array.from({ length: 1001 }, (_, i) => ({ id: `ticket-${i}`, storm_event_id: 'storm-1000', status: 'ASSIGNED' }));
    remote.from.mockImplementation(table => query({ data: table === 'tickets' ? tickets : events, error: null }));
    const result = await stormEventService.listStormEvents();
    expect(result).toHaveLength(1001);
    expect(result.find(storm => storm.id === 'storm-1000')?.activeTickets).toBe(1001);
  });
  it('rejects revoked storm-view permission even when RLS would silently return an empty list', async () => {
    remote.rpc.mockResolvedValue({ data: { 'admin.storms.view': false }, error: null });
    await expect(stormEventService.listStormEvents()).rejects.toThrow(/permission/i);
    expect(remote.from).not.toHaveBeenCalled();
  });
  it('rejects a failed current permission read before accepting an empty list', async () => {
    const error = { code: '08006', message: 'Permission read failed' };
    remote.rpc.mockResolvedValue({ data: null, error });
    await expect(stormEventService.listStormEvents()).rejects.toEqual(error);
    expect(remote.from).not.toHaveBeenCalled();
  });
  it('surfaces missing management authentication instead of an empty company list', async () => {
    remote.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(stormEventService.listStormEvents()).rejects.toThrow(/sign in/i);
  });
  it.each(['42501', '08006', '42703'])('surfaces failed management storm reads (%s)', async code => {
    const error = { code, message: 'Storm read unavailable' };
    remote.from.mockImplementation(() => query({ data: null, error }));
    await expect(stormEventService.listStormEvents()).rejects.toEqual(error);
  });
  it('surfaces a required ticket-count failure rather than showing zero active work', async () => {
    const error = { code: '42501', message: 'Ticket counts unavailable' };
    remote.from.mockImplementation(table => query({ data: table === 'tickets' ? null : [context], error: table === 'tickets' ? error : null }));
    await expect(stormEventService.listStormEvents()).rejects.toEqual(error);
  });
  it.each(['list', 'detail'] as const)('retains the saved manager through the %s projection', async mode => {
    remote.from.mockImplementation(table => query({ data: table === 'tickets' ? [] : mode === 'list' ? [{ ...context, responsible_manager_id: 'manager-1' }] : { ...context, responsible_manager_id: 'manager-1' }, error: null }, true));
    const result = mode === 'list' ? (await stormEventService.listStormEvents())[0] : await stormEventService.getStormEventById('storm-1');
    expect(result?.responsibleManagerId).toBe('manager-1');
  });
  it.each(['list', 'detail'] as const)('retains the saved manager through the %s template compatibility projection', async mode => {
    let reads = 0;
    remote.from.mockImplementation(table => {
      if (table === 'tickets') return query({ data: [], error: null });
      if (reads++ === 0) return query({ data: null, error: { code: '42703', message: 'column ticket_template_key does not exist' } });
      return query({ data: mode === 'list' ? [{ ...context, responsible_manager_id: 'manager-1' }] : { ...context, responsible_manager_id: 'manager-1' }, error: null }, true);
    });
    const result = mode === 'list' ? (await stormEventService.listStormEvents())[0] : await stormEventService.getStormEventById('storm-1');
    expect(result?.responsibleManagerId).toBe('manager-1');
  });
  it('maps the saved manager relationship', async () => {
    remote.from.mockImplementation(table => query({ data: table === 'tickets' ? [] : { ...context, responsible_manager_id: 'manager-1' }, error: null }));
    expect((await stormEventService.getStormEventById('storm-1'))?.responsibleManagerId).toBe('manager-1');
  });
  it('loads verified manager options without using contractor pay roles', async () => {
    remote.rpc.mockResolvedValue({ data: [{ id: 'manager-1', display_name: 'Sam Manager', role: 'STORM_MANAGER', eligible: true }], error: null });
    expect(await stormEventService.listStormManagers('storm-1')).toEqual([{ id: 'manager-1', displayName: 'Sam Manager', role: 'STORM_MANAGER', eligible: true }]);
    expect(remote.rpc).toHaveBeenCalledWith('list_storm_manager_options', { p_storm_id: 'storm-1' });
    expect(remote.from).not.toHaveBeenCalledWith('contractors');
  });
  it('passes the observed manager for stale-write protection and returns persisted scope', async () => {
    remote.rpc.mockResolvedValue({ data: { ...context, responsible_manager_id: 'manager-2' }, error: null });
    expect((await stormEventService.setStormManager('storm-1', 'manager-2', 'manager-1')).responsibleManagerId).toBe('manager-2');
    expect(remote.rpc).toHaveBeenCalledWith('set_storm_manager', { p_storm_id: 'storm-1', p_manager_id: 'manager-2', p_expected_manager_id: 'manager-1' });
  });
  it('surfaces a concurrent manager change without reporting a save', async () => {
    const error = { code: '40001', message: 'Responsible manager changed. Reload before saving.' };
    remote.rpc.mockResolvedValue({ data: null, error });
    await expect(stormEventService.setStormManager('storm-1', 'manager-2', 'manager-1')).rejects.toEqual(error);
  });
});
