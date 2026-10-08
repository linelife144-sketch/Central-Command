import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));

import { stormCompensationService } from './stormCompensationService';
import { CONTRACTOR_ROLES } from '@/lib/compensation/stormRates';

beforeEach(() => vi.clearAllMocks());

describe('stormCompensationService', () => {
  it('maps a storm rate card to editable cent-precision input values', async () => {
    mocks.rpc.mockResolvedValue({
      data: CONTRACTOR_ROLES.map((role, index) => ({ role, pay_rate: index ? 21.5 : null, bill_rate: index ? 42 : null })),
      error: null,
    });

    const result = await stormCompensationService.getRates('storm-A');

    expect(mocks.rpc).toHaveBeenCalledWith('get_storm_compensation_rates', { p_storm_id: 'storm-A' });
    expect(result.STORM_MANAGER).toEqual({ payRate: '', billRate: '' });
    expect(result.TEAM_LEAD).toEqual({ payRate: '21.50', billRate: '42.00' });
  });

  it('saves all role wages and bill rates in one storm-scoped request', async () => {
    const rates = Object.fromEntries(CONTRACTOR_ROLES.map((role, index) => [role, { payRate: index + 10, billRate: index + 20 }])) as never;
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    await stormCompensationService.saveRates('storm-B', rates);

    expect(mocks.rpc).toHaveBeenCalledWith('save_storm_compensation_rates', {
      p_storm_id: 'storm-B',
      p_role_rates: CONTRACTOR_ROLES.map((role, index) => ({ role, pay_rate: index + 10, bill_rate: index + 20 })),
    });
  });

  it('surfaces database validation failures', async () => {
    const error = { code: '23514', message: 'Closed storm compensation cannot be changed' };
    mocks.rpc.mockResolvedValue({ data: null, error });

    await expect(stormCompensationService.getRates('closed')).rejects.toEqual(error);
  });
});
