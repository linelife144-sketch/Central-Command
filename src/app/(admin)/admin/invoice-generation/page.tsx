'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { InvoiceGenerator } from '@/components/features/invoices';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AdminInvoiceGenerationPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Generation"
        description="Generate contractor invoices from approved time entries and expense reports."
      />

      <div className="storm-surface rounded-xl p-4">
        <InvoiceGenerator generatedBy={profile?.id} />
      </div>
    </div>
  );
}
