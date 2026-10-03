import { describe, expect, it } from 'vitest';
import { contractorInviteSchema } from './contractorInviteValidation';
describe('one-person contractor invitations', () => {
  const person = {first_name:' Alex ',last_name:'Rivera',email:'ALEX@example.com'};
  it('normalizes one email and does not accept role, password, or batches', () => {
    expect(contractorInviteSchema.parse(person)).toMatchObject({first_name:'Alex',email:'alex@example.com',resend:false});
    for(const payload of [[person], {...person, role:'SUPER_ADMIN'}, {...person,temp_password:'unsafe'}, {...person,email:['a@example.com','b@example.com']}]) expect(contractorInviteSchema.safeParse(payload).success).toBe(false);
  });
  it('requires a name and valid email', () => {
    expect(contractorInviteSchema.safeParse({...person,email:'bad'}).success).toBe(false);
    expect(contractorInviteSchema.safeParse({...person,first_name:''}).success).toBe(false);
  });
});
