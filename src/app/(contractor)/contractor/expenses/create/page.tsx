'use client';

import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { ExpenseForm } from '@/components/features/expenses';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';

export default function ContractorExpenseCreatePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { contractorId } = useContractorId(profile?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Expense"
        description="Capture expense details and attach a receipt for review."
        showBackButton
        backHref="/contractor/expenses"
      />

      <div className="storm-surface rounded-xl p-4">
        <ExpenseForm
          contractorId={contractorId}
          onSaved={() => {
            router.push('/contractor/expenses');
          }}
        />
      </div>
    </div>
  );
}
