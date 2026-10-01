import { supabase } from '@/lib/supabase/client';
import { contractorService } from './contractorService';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { localTestStore } from '@/lib/testing/localTestStore';
export interface StormRosterMember { contractorId: string; displayName: string; }
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
  async assign(stormId: string, contractorId: string) {
    if (isSuperAdminTestingEnabled()) return localTestStore.assignContractor(stormId, contractorId);
    const { error } = await supabase.rpc('assign_contractor_to_storm' as never, { p_storm_id: stormId, p_contractor_id: contractorId } as never);
    if (error) throw error;
  },
};
