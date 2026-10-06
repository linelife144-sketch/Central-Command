// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const remote = vi.hoisted(() => ({ context: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/auth/serverContractor', () => ({ requireOnboardingContractor: remote.context }));
import { GET, POST } from './route';
import { AccessError } from '@/lib/auth/serverPermissions';
const details = { first_name: 'QA', last_name: 'Updated', address_line1: '123 Main Street', address_line2: 'Unit 4', city: 'Shreveport', state: 'la', zip_code: '71101', vehicle_registration_photo_path: null };
const request = (input: unknown, origin = 'http://localhost') => new Request('http://localhost/api/contractor/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(input) });
beforeEach(() => { vi.resetAllMocks(); remote.context.mockResolvedValue({ admin: { rpc: remote.rpc }, user: { id: 'verified-user' }, profile: { first_name: 'QA', last_name: 'Added' }, contractor: { id: 'record', first_name: 'Original', onboarding_completed_at: null }, driverRequired: false }); remote.rpc.mockResolvedValue({ error: null }); });
describe('onboarding API ownership and input', () => {
  it('returns prefilled names and contractor details', async () => {
    expect(await (await GET()).json()).toMatchObject({ contractor: { first_name: 'QA', last_name: 'Added' }, driverRequired: false });
  });
  it('saves structured fields for the verified user, ignoring client identity attempts', async () => {
    const response = await POST(request(details)); expect(response.status).toBe(200);
    expect(remote.rpc).toHaveBeenCalledWith('complete_contractor_onboarding', { p_profile_id: 'verified-user', p_details: { ...details, state: 'LA' } });
    expect((await POST(request({ ...details, profile_id: 'someone-else' }))).status).toBe(400);
  });
  it('requires a full address and rejects cross-origin submissions', async () => {
    expect((await POST(request({ ...details, address_line1: '' }))).status).toBe(400);
    expect((await POST(request(details, 'https://untrusted.example'))).status).toBe(403); expect(remote.rpc).not.toHaveBeenCalled();
  });
  it('preserves database validation failures on completion', async () => {
    remote.rpc.mockResolvedValue({ error: { code: '23514', message: 'Names and full starting address required' } });
    expect(await (await POST(request(details))).json()).toMatchObject({ error: 'Names and full starting address required' });
  });
  it('unauthenticated, inactive or unlinked users cannot complete onboarding', async () => {
    remote.context.mockRejectedValue(new AccessError('Please sign in.', 401));
    expect((await GET()).status).toBe(401); expect((await POST(request(details))).status).toBe(401); expect(remote.rpc).not.toHaveBeenCalled();
  });
});
