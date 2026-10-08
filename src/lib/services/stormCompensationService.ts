import { supabase } from '@/lib/supabase/client';
import { CONTRACTOR_ROLES, type StormRoleRateDraft, type StormRoleRateDrafts, type StormRoleRates } from '@/lib/compensation/stormRates';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { localTestStore } from '@/lib/testing/localTestStore';

interface RemoteStormRoleRate {
  role?: string;
  pay_rate?: number | string | null;
  bill_rate?: number | string | null;
}

function formatRate(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const rate = Number(value);
  return Number.isFinite(rate) ? rate.toFixed(2) : '';
}

export const stormCompensationService = {
  async getRates(stormId: string): Promise<StormRoleRateDrafts> {
    if (isSuperAdminTestingEnabled()) return localTestStore.getStormRoleRateDrafts(stormId);

    const { data, error } = await supabase.rpc('get_storm_compensation_rates' as never, { p_storm_id: stormId } as never);
    if (error) throw error;

    const rates: StormRoleRateDrafts = Object.fromEntries(
      CONTRACTOR_ROLES.map((role) => [role, { payRate: '', billRate: '' } satisfies StormRoleRateDraft]),
    );
    if (!Array.isArray(data)) return rates;
    for (const item of data as RemoteStormRoleRate[]) {
      if (!item.role || !CONTRACTOR_ROLES.includes(item.role as (typeof CONTRACTOR_ROLES)[number])) continue;
      rates[item.role as (typeof CONTRACTOR_ROLES)[number]] = {
        payRate: formatRate(item.pay_rate),
        billRate: formatRate(item.bill_rate),
      };
    }
    return rates;
  },

  async saveRates(stormId: string, rates: StormRoleRates): Promise<void> {
    if (isSuperAdminTestingEnabled()) {
      localTestStore.saveStormRoleRates(stormId, rates);
      return;
    }

    const roleRates = CONTRACTOR_ROLES.map((role) => ({
      role,
      pay_rate: rates[role].payRate,
      bill_rate: rates[role].billRate,
    }));
    const { error } = await supabase.rpc('save_storm_compensation_rates' as never, {
      p_storm_id: stormId,
      p_role_rates: roleRates,
    } as never);
    if (error) throw error;
  },
};
