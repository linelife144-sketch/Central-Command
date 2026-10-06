import { beforeEach, expect, it, vi } from 'vitest';
import { testCompensation } from '@/lib/compensation/testFixtures';
import { addContractor } from './contractorAddService';
const remote = vi.hoisted(() => ({ rpc: vi.fn(), auth: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: remote.rpc, auth: { admin: { createUser: remote.auth, inviteUserByEmail: remote.auth } } }) }));
const person = { first_name: 'QA', last_name: 'Record', email: 'QA@EXAMPLE.TEST', phone: '3185550123', compensation: testCompensation };
beforeEach(() => { vi.clearAllMocks(); remote.rpc.mockResolvedValue({ data: { id: 'record' }, error: null }); });
it('adds linked contact and compensation atomically without Auth or email', async () => {
  expect(await addContractor('verified-actor', person)).toMatchObject({ contractor: { id: 'record' } });
  expect(remote.rpc).toHaveBeenCalledWith('add_contractor_record', expect.objectContaining({ p_actor_id: 'verified-actor', p_email: 'qa@example.test', p_phone: '(318) 555-0123', p_terms: testCompensation }));
  expect(remote.auth).not.toHaveBeenCalled();
});
it('rejects duplicate emails without a false success', async () => {
  remote.rpc.mockResolvedValue({ data: null, error: { code: '23505' } });
  await expect(addContractor('actor', person)).rejects.toMatchObject({ status: 409 });
});
it('rejects partial phone numbers, staff role injection, resend and removed work types before writes', async () => {
  for (const payload of [{ ...person, phone: '123' }, { ...person, role: 'ADMIN' }, { ...person, resend: true }, { ...person, compensation: { ...testCompensation, work_type_rates: { TRAINING: 65 } } }]) await expect(addContractor('actor', payload)).rejects.toThrow();
  expect(remote.rpc).not.toHaveBeenCalled();
});
it('never reports success if the transaction fails or returns no record', async () => {
  remote.rpc.mockResolvedValue({ data: null, error: { code: 'XX000' } });
  await expect(addContractor('actor', person)).rejects.toThrow('Unable to save');
  remote.rpc.mockResolvedValue({ data: null, error: null });
  await expect(addContractor('actor', person)).rejects.toThrow('not saved');
});
