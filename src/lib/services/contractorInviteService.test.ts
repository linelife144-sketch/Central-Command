import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inviteContractor } from './contractorInviteService';
const remote = vi.hoisted(() => ({ lookup:vi.fn(), invite:vi.fn(), getUser:vi.fn(), update:vi.fn(), rpc:vi.fn(), audit:vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/serverPermissions', () => ({AccessError:class extends Error { constructor(message:string, public status:number) {super(message);} }}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient:() => ({
  from:(table:string) => table === 'audit_logs' ? {insert:remote.audit} : table === 'contractor_invitations' ? {upsert:remote.audit} : {select:()=>({eq:()=>({maybeSingle:remote.lookup})})},
  auth:{admin:{inviteUserByEmail:remote.invite,getUserById:remote.getUser,updateUserById:remote.update}},rpc:remote.rpc,
}) }));
const person={first_name:'Alex',last_name:'Rivera',email:'alex@example.com'};
beforeEach(()=>{vi.clearAllMocks();process.env.NEXT_PUBLIC_APP_URL='http://192.168.1.72:3000';remote.lookup.mockResolvedValue({data:null,error:null});remote.audit.mockResolvedValue({error:null});remote.invite.mockResolvedValue({data:{user:{id:'contractor',app_metadata:{}}},error:null});remote.update.mockResolvedValue({error:null});remote.rpc.mockResolvedValue({data:{profile_id:'contractor'},error:null});});
describe('server contractor invitation',()=>{
  it('invites one person, writes a trusted contractor role, and finalizes the business record',async()=>{
    await inviteContractor('actor',person);
    expect(remote.invite).toHaveBeenCalledTimes(1);
    expect(remote.invite).toHaveBeenCalledWith(person.email,expect.objectContaining({redirectTo:'http://192.168.1.72:3000/auth/confirm'}));
    expect(remote.update).toHaveBeenCalledWith('contractor',{app_metadata:{role:'CONTRACTOR'}});
    expect(remote.rpc).toHaveBeenCalledWith('finalize_contractor_invite',expect.objectContaining({p_actor_id:'actor',p_profile_id:'contractor',p_resend:false}));
  });
  it('rejects active or staff duplicates without sending another invite',async()=>{
    remote.lookup.mockResolvedValue({data:{id:'existing',role:'SUPER_ADMIN'},error:null});remote.getUser.mockResolvedValue({data:{user:{email_confirmed_at:'now'}},error:null});
    await expect(inviteContractor('actor',person)).rejects.toThrow('already has an active');
    expect(remote.invite).not.toHaveBeenCalled();expect(remote.audit).toHaveBeenCalled();
  });
  it('requires explicit resend for an unaccepted invite',async()=>{
    remote.lookup.mockResolvedValue({data:{id:'existing',role:'CONTRACTOR'},error:null});remote.getUser.mockResolvedValue({data:{user:{email_confirmed_at:null}},error:null});
    await expect(inviteContractor('actor',person)).rejects.toThrow('Resend invite');expect(remote.invite).not.toHaveBeenCalled();
    await inviteContractor('actor',{...person,resend:true});expect(remote.invite).toHaveBeenCalledTimes(1);
  });
  it('never reports success after email delivery or business-record failure',async()=>{
    remote.invite.mockResolvedValue({data:{user:null},error:{message:'SMTP failure'}});
    await expect(inviteContractor('actor',person)).rejects.toThrow('email provider');expect(remote.rpc).not.toHaveBeenCalled();
    remote.invite.mockResolvedValue({data:{user:{id:'contractor',app_metadata:{}}},error:null});remote.rpc.mockResolvedValue({error:{message:'database failure'}});
    await expect(inviteContractor('actor',person)).rejects.toThrow('record could not be completed');
  });
  it('rejects elevation and batch requests before reaching Auth',async()=>{
    await expect(inviteContractor('actor',{...person,role:'ADMIN'})).rejects.toThrow();
    await expect(inviteContractor('actor',[person])).rejects.toThrow();expect(remote.invite).not.toHaveBeenCalled();
  });
});
