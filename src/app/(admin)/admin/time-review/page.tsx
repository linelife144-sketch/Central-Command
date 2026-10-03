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

      <section className="min-w-0">
        <TimeEntryList
          mode="admin"
          reviewerId={profile?.id}
        />
      </section>
    </div>
  );
}
