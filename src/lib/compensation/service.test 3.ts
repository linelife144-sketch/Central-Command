import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testCompensation } from './testFixtures';
const mocks = vi.hoisted(() => ({ viewer:'worker-one', owner:'worker-one', cache:[] as Array<Record<string,unknown>>, online:true }));
vi.mock('@/lib/db/dexie',()=>({ db:{payAgreements:{
 bulkPut:async(rows:Array<Record<string,unknown>>)=>{mocks.cache=rows;},
 where:()=>({equals:([viewer,worker]:string[])=>({toArray:async()=>mocks.cache.filter(row=>row.viewer_profile_id===viewer&&row.contractor_id===worker)})})
}}}));
vi.mock('@/lib/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:mocks.viewer}}}})},from:(table:string)=>({select:()=>({eq:()=>table==='contractors'?{single:async()=>({data:{profile_id:mocks.owner},error:null})}:{order:async()=>({data:[{id:'agreement',contractor_id:'contractor-one',effective_from:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',created_by:null,terms:testCompensation}],error:null})}})})}}));
import { getPayAgreements } from './service';
beforeEach(()=>{mocks.viewer='worker-one';mocks.owner='worker-one';mocks.cache=[];mocks.online=true;Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>mocks.online});});
describe('offline compensation recovery',()=>{
 it('recovers downloaded own agreements while offline',async()=>{await getPayAgreements('contractor-one');mocks.online=false;expect((await getPayAgreements('contractor-one'))[0].terms.base_hourly_rate).toBe(testCompensation.base_hourly_rate);});
 it('cannot reuse another signed-in account cache',async()=>{await getPayAgreements('contractor-one');mocks.viewer='worker-two';mocks.online=false;await expect(getPayAgreements('contractor-one')).rejects.toThrow('Connect once');});
 it('does not store staff reads of another contractor compensation',async()=>{mocks.viewer='staff';await getPayAgreements('contractor-one');expect(mocks.cache).toEqual([]);mocks.online=false;await expect(getPayAgreements('contractor-one')).rejects.toThrow('Connect once');});
});
