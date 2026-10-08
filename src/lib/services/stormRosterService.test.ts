import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
vi.mock('./contractorService', () => ({ contractorService: { listAssignableContractors: vi.fn() } }));

import { stormRosterService } from './stormRosterService';

beforeEach(() => vi.clearAllMocks());

describe('stormRosterService compensation assignment', () => {
  it('sends per-storm wage exceptions and vehicle allowances to the guarded assignment RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    await stormRosterService.assign('storm-1', 'driver-1', { payRateOverride: 32.5, vehicleHourlyRate: 8.75 });

    expect(mocks.rpc).toHaveBeenCalledWith('assign_contractor_to_storm_with_compensation', {
      p_storm_id: 'storm-1',
      p_contractor_id: 'driver-1',
      p_pay_rate_override: 32.5,
      p_vehicle_hourly_rate: 8.75,
    });
  });

  it('does not hide server-side role, permission, or closed-storm validation errors', async () => {
    const error = { code: '23514', message: 'Every Driver requires a storm hourly vehicle allowance' };
    mocks.rpc.mockResolvedValue({ data: null, error });

    await expect(stormRosterService.assign('storm-1', 'driver-1', { payRateOverride: null, vehicleHourlyRate: null }))
      .rejects.toEqual(error);
  });
});
