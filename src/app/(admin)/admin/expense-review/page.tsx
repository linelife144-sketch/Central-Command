'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { ExpenseReviewList } from '@/components/features/expenses';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AdminExpenseReviewPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Review"
        description="Review submitted expenses, validate policy flags, and approve or reject reports."
      />

      <div className="cc-work-panel p-4 sm:p-5">
        <ExpenseReviewList reviewerId={profile?.id} />
      </div>
    </div>
  );
}
