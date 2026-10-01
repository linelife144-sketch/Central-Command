import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ticketService } from './ticketService';
const remote = vi.hoisted(() => ({from:vi.fn(), notify:vi.fn()}));
vi.mock('@/lib/supabase/client', () => ({supabase:{from:remote.from}}));
vi.mock('@/lib/testing/superAdminTesting', () => ({isSuperAdminTestingEnabled:()=>false}));
vi.mock('@/lib/tickets/events', () => ({notifyTicketsChanged:remote.notify}));
function query(result: unknown) {
 const chain = {select:vi.fn(),eq:vi.fn(),update:vi.fn(),single:vi.fn(),maybeSingle:vi.fn()};
 for (const method of [chain.select,chain.eq,chain.update]) method.mockReturnValue(chain);
 chain.single.mockResolvedValue(result);chain.maybeSingle.mockResolvedValue(result);
 return chain;
}
beforeEach(()=>vi.clearAllMocks());
describe('persisted status updates',()=>{
 it('rejects a zero-row update and does not publish a success event',async()=>{
  remote.from.mockReturnValueOnce(query({data:{status:'ASSIGNED'},error:null})).mockReturnValueOnce(query({data:null,error:null}));
  await expect(ticketService.updateTicketStatus('ticket','IN_ROUTE','alex','CONTRACTOR')).rejects.toThrow('not saved');
  expect(remote.notify).not.toHaveBeenCalled();
 });
 it('publishes only after a confirmed row and guards concurrent status changes',async()=>{
  const update=query({data:{id:'ticket',status:'IN_ROUTE'},error:null});
  remote.from.mockReturnValueOnce(query({data:{status:'ASSIGNED'},error:null})).mockReturnValueOnce(update);
  await expect(ticketService.updateTicketStatus('ticket','IN_ROUTE','alex','CONTRACTOR')).resolves.toBe(true);
  expect(update.eq).toHaveBeenCalledWith('status','ASSIGNED');
  expect(remote.notify).toHaveBeenCalledOnce();
 });
 it('rejects an administrative approval attempted by a contractor before writing',async()=>{
  remote.from.mockReturnValueOnce(query({data:{status:'PENDING_REVIEW'},error:null}));
  await expect(ticketService.updateTicketStatus('ticket','APPROVED','alex','CONTRACTOR')).rejects.toThrow('Invalid status transition');
  expect(remote.from).toHaveBeenCalledOnce();
  expect(remote.notify).not.toHaveBeenCalled();
 });
});
