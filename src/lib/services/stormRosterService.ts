import { supabase } from '@/lib/supabase/client';
import { contractorService } from './contractorService';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { localTestStore } from '@/lib/testing/localTestStore';
import type { ContractorRole } from '@/types';

export interface StormRosterMember {
  contractorId: string;
  displayName: string;
  role: ContractorRole;
  payRateOverride: number | null;
  vehicleHourlyRate: number | null;
}

export interface StormRosterOption {
  contractorId: string;
  displayName: string;
}

export interface StormContractorCompensationInput {
  payRateOverride: number | null;
  vehicleHourlyRate: number | null;
}

export const stormRosterService = {
  async listOptions() {
    return isSuperAdminTestingEnabled() ? localTestStore.listContractors() : contractorService.listAssignableContractors();
  },
  async list(stormId: string): Promise<StormRosterMember[]> {
    if (isSuperAdminTestingEnabled()) return localTestStore.listRoster(stormId);
    const { data, error } = await supabase.rpc('list_storm_contractors' as never, { p_storm_id: stormId } as never);
    if (error) throw error;
    return (data ?? []) as StormRosterMember[];
  },
  async listAssignable(stormId: string): Promise<StormRosterOption[]> {
    if (isSuperAdminTestingEnabled()) return localTestStore.listRoster(stormId);
    const { data, error } = await supabase.rpc('list_assignable_storm_contractors' as never, { p_storm_id: stormId } as never);
    if (error) throw error;
    return (data ?? []) as StormRosterMember[];
  },
  async assign(stormId: string, contractorId: string, compensation: StormContractorCompensationInput) {
    if (isSuperAdminTestingEnabled()) return localTestStore.assignContractor(stormId, contractorId, compensation);
    const { error } = await supabase.rpc('assign_contractor_to_storm_with_compensation' as never, {
      p_storm_id: stormId,
      p_contractor_id: contractorId,
      p_pay_rate_override: compensation.payRateOverride,
      p_vehicle_hourly_rate: compensation.vehicleHourlyRate,
    } as never);
    if (error) throw error;
  },
};
