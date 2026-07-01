'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { TimeEntryList } from '@/components/features/time-tracking';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AdminTimeReviewPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Entry Review"
        description="Validate field time, resolve exceptions, and push billing-ready approvals."
      />

      <section className="rounded-2xl border-2 border-[#ffc038] bg-[radial-gradient(circle_at_14%_0%,rgba(255,255,255,0.18),transparent_40%),linear-gradient(154deg,#00113d_0%,#00286c_52%,#0a4ea3_100%)] p-4 shadow-[0_18px_34px_rgba(0,18,74,0.32)] sm:p-5">
        <TimeEntryList
          mode="admin"
          reviewerId={profile?.id}
        />
      </section>
    </div>
  );
}
