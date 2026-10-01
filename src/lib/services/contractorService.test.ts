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
  it('does not use database queries without a session', async () => {
    remote.getSession.mockResolvedValue({ data:{ session:null },error:null });
    expect(await contractorService.listContractors()).toEqual([]);
    expect(remote.from).not.toHaveBeenCalled();
  });
});
