'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { InvoiceList } from '@/components/features/invoices';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';

export default function ContractorInvoicesPage() {
  const { profile } = useAuth();
  const { contractorId } = useContractorId(profile?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Review generated invoices, payment status, and 1099 tracking."
      />

      <div className="storm-surface rounded-xl p-4">
        <InvoiceList contractorId={contractorId} />
      </div>
    </div>
  );
}
