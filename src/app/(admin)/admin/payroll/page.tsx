'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { PayrollDashboard } from '@/components/features/payroll';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AdminPayrollPage() {
  const { profile, can } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll & Profit"
        description="Contractor payroll, vehicle reimbursements, utility billing, and margin."
      />

      <PayrollDashboard reviewerId={profile?.id} canEdit={can('admin.payroll.edit')} canViewStorms={can('admin.storms.view')} />
    </div>
  );
}
