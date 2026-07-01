'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { ExpenseList } from '@/components/features/expenses';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';

export default function ContractorExpensesPage() {
  const { profile } = useAuth();
  const { contractorId } = useContractorId(profile?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and submit reimbursable expenses with receipt attachments."
      />

      <div className="storm-surface rounded-xl p-4">
        <ExpenseList contractorId={contractorId} />
      </div>
    </div>
  );
}
