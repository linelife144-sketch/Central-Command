import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
const remote=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn()}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({auth:{getUser:remote.getUser},from:remote.from})}));
vi.mock('@/lib/supabase/server',()=>({createClient:vi.fn()}));
const request=()=>new Request('http://localhost/api/auth/profile',{headers:{authorization:'Bearer test-token'}});
beforeEach(()=>{
  vi.clearAllMocks();remote.from.mockReturnValue({select:remote.select});remote.select.mockReturnValue({eq:remote.eq});remote.eq.mockReturnValue({maybeSingle:remote.maybeSingle});
});
describe('verified profile auth',()=>{
  it('rejects a token that Supabase does not verify',async()=>{
    remote.getUser.mockResolvedValue({data:{user:null},error:{message:'Invalid token'}});
    expect((await GET(request())).status).toBe(401);expect(remote.from).not.toHaveBeenCalled();
  });
  it('uses the real stored role even for the former hardcoded admin ID',async()=>{
    const id='eb7fa895-aabf-4048-b806-0224bd01fa84';
    remote.getUser.mockResolvedValue({data:{user:{id}},error:null});remote.maybeSingle.mockResolvedValue({data:{id,role:'CONTRACTOR'},error:null});
    const response=await GET(request());expect(response.status).toBe(200);expect((await response.json()).profile.role).toBe('CONTRACTOR');expect(remote.eq).toHaveBeenCalledWith('id',id);
  });
  it('returns the real Super Admin profile for the verified account',async()=>{
    remote.getUser.mockResolvedValue({data:{user:{id:'verified-admin'}},error:null});remote.maybeSingle.mockResolvedValue({data:{id:'verified-admin',role:'SUPER_ADMIN',is_active:true},error:null});
    expect((await (await GET(request())).json()).profile).toMatchObject({id:'verified-admin',role:'SUPER_ADMIN',is_active:true});
  });
  it('does not synthesize a profile when the stored profile is missing',async()=>{
    remote.getUser.mockResolvedValue({data:{user:{id:'missing'}},error:null});remote.maybeSingle.mockResolvedValue({data:null,error:null});expect((await GET(request())).status).toBe(404);
  });
});
