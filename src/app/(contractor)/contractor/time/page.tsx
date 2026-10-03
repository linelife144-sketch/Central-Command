'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { TimeClock, TimeEntryList } from '@/components/features/time-tracking';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';

export default function ContractorTimePage() {
  const { profile } = useAuth();
  const { contractorId } = useContractorId(profile?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Tracking"
        description="Clock in and clock out with GPS verification for compliant field time entries."
      />
      <div className="cc-work-panel p-4 sm:p-5">
        <TimeClock />
      </div>
      <div className="cc-work-panel p-4 sm:p-5">
        <TimeEntryList
          mode="contractor"
          contractorId={contractorId}
        />
      </div>
    </div>
  );
}
