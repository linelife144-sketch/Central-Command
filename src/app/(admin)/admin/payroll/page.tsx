'use client';
import { isSuperAdminClassRole } from '@/lib/auth/roleGuards';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { PayrollDashboard } from '@/components/features/payroll';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AdminPayrollPage() {
  const { profile, can } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSuperAdminClassRole(profile?.role) ? 'Payroll & Profit' : 'Payroll'}
        description={isSuperAdminClassRole(profile?.role) ? 'Contractor payroll, vehicle reimbursements, utility billing, and margin.' : 'Contractor hours, wages, vehicle allowances, and approvals.'}
      />

      <PayrollDashboard key={`${profile?.id}:${profile?.role}`} includeFinancial={isSuperAdminClassRole(profile?.role)} reviewerId={profile?.id} canEdit={can('admin.payroll.edit')} canViewStorms={can('admin.storms.view')} />
    </div>
  );
}
