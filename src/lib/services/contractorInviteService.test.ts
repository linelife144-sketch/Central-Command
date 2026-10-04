import { expect, it, vi } from 'vitest';
import { inviteContractor } from './contractorInviteService';
vi.mock('server-only', () => ({}));
it('rejects the retired invitation flow', async () => {
  await expect(inviteContractor('actor', {})).rejects.toMatchObject({ status: 410 });
});
