import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({getUser:vi.fn(), maybeSingle:vi.fn(), getPending:vi.fn(),getLocal:vi.fn(),update:vi.fn(),processing:vi.fn(),failed:vi.fn(),synced:vi.fn(),remote:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({supabase:{auth:{getUser:mocks.getUser},from:()=>({select:()=>({eq:()=>({maybeSingle:mocks.maybeSingle})})})}}));
vi.mock('@/lib/db/dexie',()=>({db:{assessments:{get:mocks.getLocal,update:mocks.update}},getPendingSyncItems:mocks.getPending,markSyncItemProcessing:mocks.processing,markSyncItemFailed:mocks.failed,markSyncItemSynced:mocks.synced}));
vi.mock('@/lib/services/assessmentSubmissionService',()=>({createRemoteAssessment:mocks.remote}));
import { assessmentUploadQueue } from './assessmentUploadQueue';
import { allAssessmentFields, emptyFieldAnswers } from '@/lib/schemas/fieldAssessment';
const answers=emptyFieldAnswers();for(const f of allAssessmentFields)if(!f.when)answers[f.key]=f.kind==='boolean'?false:f.kind==='select'?f.options![0]:'None';
const local={id:'stable-id',ticket_id:'ticket',contractor_id:'mine',field_assessment:{version:1,answers},safety_observations:{},photo_metadata:[]};
beforeEach(()=>{vi.resetAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:'user'}}});mocks.maybeSingle.mockResolvedValue({data:{id:'mine'}});mocks.getPending.mockResolvedValue([{id:'queue',entity_type:'assessment',entity_id:'stable-id',status:'pending'}]);mocks.getLocal.mockResolvedValue(local);mocks.remote.mockResolvedValue({id:'stable-id',sync_status:'SYNCED'});});
describe('assessment reconnect queue',()=>{
 it('reuses stable assessment ID and marks both local row and queue synced',async()=>{expect(await assessmentUploadQueue.process()).toEqual({uploaded:1,failed:0});expect(mocks.remote.mock.calls[0][0].id).toBe('stable-id');expect(mocks.synced).toHaveBeenCalledWith('queue');expect(mocks.update).toHaveBeenCalledWith('stable-id',expect.objectContaining({synced:true,sync_status:'synced'}));});
 it('retains failed submissions for retry and reuses the same ID',async()=>{mocks.remote.mockRejectedValueOnce({message:'Network unavailable'});expect(await assessmentUploadQueue.process()).toEqual({uploaded:0,failed:1});expect(mocks.failed).toHaveBeenCalledWith('queue','Network unavailable');expect(await assessmentUploadQueue.process()).toEqual({uploaded:1,failed:0});expect(mocks.remote.mock.calls.map(call=>call[0].id)).toEqual(['stable-id','stable-id']);});
 it('does not sync another signed-in user device records',async()=>{mocks.getLocal.mockResolvedValue({...local,contractor_id:'another'});expect(await assessmentUploadQueue.process()).toEqual({uploaded:0,failed:0});expect(mocks.remote).not.toHaveBeenCalled();});
 it('serializes overlapping reconnect attempts',async()=>{const first=assessmentUploadQueue.process(),second=assessmentUploadQueue.process();expect(first).toBe(second);await first;expect(mocks.remote).toHaveBeenCalledTimes(1);});
});
