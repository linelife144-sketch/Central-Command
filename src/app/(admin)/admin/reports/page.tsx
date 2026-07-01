'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { ReportsDashboard } from '@/components/features/dashboard';

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports Dashboard"
        description="Analyze operational throughput and export billing/compliance reports."
      />

      <div className="storm-surface rounded-xl p-4">
        <ReportsDashboard />
      </div>
    </div>
  );
}
