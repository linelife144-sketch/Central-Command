import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
const remote=vi.hoisted(()=>({guard:vi.fn(),invite:vi.fn()}));
vi.mock('@/lib/auth/serverPermissions',()=>({AccessError:class extends Error {constructor(message:string,public status:number){super(message);}},requirePermission:remote.guard,assertSameOrigin:()=>{}}));
vi.mock('@/lib/services/contractorInviteService',()=>({inviteContractor:remote.invite}));
const request=()=>new Request('http://localhost:3000/api/admin/contractors/invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first_name:'Alex',last_name:'Rivera',email:'alex@example.com'})});
beforeEach(()=>vi.clearAllMocks());
describe('invite endpoint authorization',()=>{
  it('blocks a caller without user administration before reaching Auth',async()=>{const {AccessError}=await import('@/lib/auth/serverPermissions');remote.guard.mockRejectedValue(new AccessError('Forbidden',403));expect((await POST(request())).status).toBe(403);expect(remote.invite).not.toHaveBeenCalled();});
  it('binds the invitation to the verified actor',async()=>{remote.guard.mockResolvedValue({user:{id:'verified-actor'}});remote.invite.mockResolvedValue({message:'Invitation sent'});expect((await POST(request())).status).toBe(200);expect(remote.guard).toHaveBeenCalledWith('admin.users.edit');expect(remote.invite).toHaveBeenCalledWith('verified-actor',expect.objectContaining({email:'alex@example.com'}));});
});
