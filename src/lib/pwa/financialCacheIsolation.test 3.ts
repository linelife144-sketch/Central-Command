// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';
it('never shares authenticated API or private Supabase responses across accounts',async()=>{
 const listeners:Record<string,(event:unknown)=>void>={};
 const open=vi.fn(()=>{throw new Error('Authenticated responses must not enter a cache');});
 const fetch=vi.fn(async(request:Request)=>new Response(JSON.stringify(request.headers.get('authorization')==='privileged'?{utility_bill_amount:100}:{code:'42501'}),{status:request.headers.get('authorization')==='privileged'?200:403}));
 runInNewContext(readFileSync('public/sw.js','utf8'),{self:{location:{hostname:'localhost',origin:'http://localhost:3102'},addEventListener:(key:string,handler:(event:unknown)=>void)=>{listeners[key]=handler;}},caches:{open},fetch,URL,Response,Request});
 for(const url of ['https://project.supabase.co/rest/v1/time_entries?select=*','https://project.supabase.co/rest/v1/rpc/get_privileged_payroll_entries','https://project.supabase.co/storage/v1/object/authenticated/photos/private.png','http://localhost:3102/api/payroll']){
  for(const account of ['privileged','contractor']){
   let response:Promise<Response>|undefined;listeners.fetch({request:new Request(url,{headers:{authorization:account}}),respondWith:(promise:Promise<Response>)=>{response=promise;}});
   expect((await response)?.status).toBe(account==='privileged'?200:403);
  }
 }
 expect(fetch).toHaveBeenCalledTimes(8);expect(open).not.toHaveBeenCalled();
});
it('activation scrubs all previous caches including previously saved API financial data',async()=>{
 const listeners:Record<string,(event:unknown)=>void>={};const deleted=vi.fn(async()=>true);
 runInNewContext(readFileSync('public/sw.js','utf8'),{self:{addEventListener:(key:string,handler:(event:unknown)=>void)=>{listeners[key]=handler;},clients:{claim:async()=>undefined}},caches:{keys:async()=>['grid-electric-api-v2','grid-electric-static-v2','grid-electric-static-v3','another-app'],delete:deleted}});
 let done:Promise<unknown>|undefined;listeners.activate({waitUntil:(promise:Promise<unknown>)=>{done=promise;}});await done;
 expect(deleted).toHaveBeenCalledWith('grid-electric-api-v2');expect(deleted).toHaveBeenCalledWith('grid-electric-static-v2');expect(deleted).not.toHaveBeenCalledWith('grid-electric-static-v3');expect(deleted).not.toHaveBeenCalledWith('another-app');
});
