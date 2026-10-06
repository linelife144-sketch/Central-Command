import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalTicketWorkNote } from './ticketWorkNotesService';
const mocks=vi.hoisted(()=>({rows:new Map<string,LocalTicketWorkNote>(),actor:'actor',remote:[] as LocalTicketWorkNote[],rpc:vi.fn()}));
vi.mock('@/lib/db/dexie',()=>({db:{ticketWorkNotes:{
  delete:async(id:string)=>mocks.rows.delete(id),
  put:async(n:LocalTicketWorkNote)=>mocks.rows.set(n.id,n),
  bulkPut:async(ns:LocalTicketWorkNote[])=>ns.forEach(n=>mocks.rows.set(n.id,n)),
  update:async(id:string,p:Partial<LocalTicketWorkNote>)=>{const n=mocks.rows.get(id);if(n)mocks.rows.set(id,{...n,...p});},
  where:(field:keyof LocalTicketWorkNote)=>({equals:(value:string)=>({toArray:async()=>[...mocks.rows.values()].filter(n=>n[field]===value)})}),
}}}));
vi.mock('@/lib/supabase/client',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:mocks.actor}},error:null})},from:()=>{const q={select:()=>q,eq:()=>q,order:async()=>({data:mocks.remote,error:null})};return q;}}}));
vi.mock('./ticketAssessmentWorkflow',()=>({ticketWorkflowRpc:mocks.rpc}));
import {ticketWorkNotesService} from './ticketWorkNotesService';
beforeEach(()=>{mocks.rows.clear();mocks.remote=[];mocks.actor='actor';vi.clearAllMocks();Object.defineProperty(navigator,'onLine',{value:true,configurable:true});mocks.rpc.mockImplementation(async(_name,args)=>({id:args.p_id,ticket_id:args.p_ticket_id,actor_profile_id:mocks.actor,kind:args.p_kind,body:args.p_body,reported_at:args.p_reported_at,created_at:'2026-10-06T18:00:00Z'}));});
describe('ticket notes and escalation durability',()=>{
  it('saves to the same ticket and trusts verified Auth identity',async()=>{const n=await ticketWorkNotesService.save('ticket','actor','NOTE','  Site access  ');expect(n.pending).toBe(false);expect(n.body).toBe('Site access');expect(mocks.rpc.mock.calls[0][1]).toMatchObject({p_ticket_id:'ticket',p_kind:'NOTE'});expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty('actor_profile_id');});
  it('queues an offline hazard without claiming dispatch received it',async()=>{Object.defineProperty(navigator,'onLine',{value:false});const n=await ticketWorkNotesService.save('ticket','actor','PUBLIC_SAFETY','QA hazard');expect(n.pending).toBe(true);expect(mocks.rpc).not.toHaveBeenCalled();expect((await ticketWorkNotesService.list('ticket','actor'))[0].id).toBe(n.id);});
  it('keeps failed saves and retries the identical ID',async()=>{mocks.rpc.mockRejectedValueOnce(new Error('Network unavailable'));const n=await ticketWorkNotesService.save('ticket','actor','ENVIRONMENTAL','QA report');expect(n.pending).toBe(true);expect(n.last_error).toContain('Network');await ticketWorkNotesService.process('actor');expect(mocks.rpc.mock.calls.map(c=>c[1].p_id)).toEqual([n.id,n.id]);expect(mocks.rows.get(n.id)?.pending).toBe(false);});
  it('syncs only the selected actor and refuses changed sessions',async()=>{Object.defineProperty(navigator,'onLine',{value:false});await ticketWorkNotesService.save('ticket','actor','NOTE','one');await ticketWorkNotesService.save('ticket','other','NOTE','two');Object.defineProperty(navigator,'onLine',{value:true});mocks.actor='other';const failed=await ticketWorkNotesService.process('actor');expect(failed.failed).toBe(1);expect(mocks.rpc).not.toHaveBeenCalled();mocks.actor='actor';await ticketWorkNotesService.process('actor');expect(mocks.rpc).toHaveBeenCalledTimes(1);expect([...mocks.rows.values()].find(n=>n.actor_profile_id==='other')?.pending).toBe(true);});
  it('merges local pending notes with server readback without duplicate IDs',async()=>{Object.defineProperty(navigator,'onLine',{value:false});const n=await ticketWorkNotesService.save('ticket','actor','NOTE','local');mocks.remote=[{...n,pending:false}];Object.defineProperty(navigator,'onLine',{value:true});expect(await ticketWorkNotesService.list('ticket','actor')).toHaveLength(1);});
  it('rejects missing details before saving or sending',async()=>{await expect(ticketWorkNotesService.save('ticket','actor','NOTE',' ')).rejects.toThrow('Enter a note');await expect(ticketWorkNotesService.save('ticket','actor','NOTE','x'.repeat(4001))).rejects.toThrow('Enter a note');expect(mocks.rows.size).toBe(0);});
});
