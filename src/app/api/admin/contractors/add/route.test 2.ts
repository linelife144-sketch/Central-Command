import { beforeEach, expect, it, vi } from 'vitest';
import { AccessError } from '@/lib/auth/serverPermissions';
import { POST } from './route';
const remote = vi.hoisted(() => ({ guard: vi.fn(), add: vi.fn(), origin: vi.fn() }));
vi.mock('@/lib/auth/serverPermissions', () => ({ AccessError: class extends Error { constructor(message: string, public status: number) { super(message); } }, requirePermission: remote.guard, assertSameOrigin: remote.origin }));
vi.mock('@/lib/services/contractorAddService', () => ({ addContractor: remote.add }));
const request = () => new Request('http://localhost:3000/api/admin/contractors/add', { method: 'POST', body: JSON.stringify({ email: 'qa@example.test' }) });
beforeEach(() => { vi.clearAllMocks(); remote.guard.mockResolvedValue({ user: { id: 'verified' } }); remote.add.mockResolvedValue({ contractor: { id: 'added' } }); });
it('requires contact and payroll permissions and binds the server identity', async () => {
  expect((await POST(request())).status).toBe(201);
  expect(remote.guard.mock.calls).toEqual([['admin.contractors.edit'], ['admin.payroll.edit']]);
  expect(remote.add).toHaveBeenCalledWith('verified', { email: 'qa@example.test' });
});
it('blocks missing payroll access and cross-origin requests before writes', async () => {
  remote.guard.mockResolvedValueOnce({ user: { id: 'verified' } }).mockRejectedValueOnce(new AccessError('Forbidden', 403));
  expect((await POST(request())).status).toBe(403); expect(remote.add).not.toHaveBeenCalled();
  remote.origin.mockImplementationOnce(() => { throw new AccessError('Cross-origin request rejected.', 403); });
  expect((await POST(request())).status).toBe(403); expect(remote.add).not.toHaveBeenCalled();
});
