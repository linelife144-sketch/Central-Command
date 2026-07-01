'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { AssessmentForm } from '@/components/features/assessments';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';

export default function ContractorAssessmentCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { contractorId } = useContractorId(profile?.id);

  const ticketId = searchParams.get('ticketId') ?? undefined;
  const backHref = ticketId ? `/tickets/${ticketId}` : '/tickets';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Damage Assessment"
        description="Document safety conditions, equipment impact, and photo evidence for ticket review."
        showBackButton
        backHref={backHref}
      />

      <div className="storm-surface rounded-xl p-4">
        <AssessmentForm
          ticketId={ticketId}
          contractorId={contractorId}
          onSaved={() => {
            router.push(backHref);
          }}
        />
      </div>
    </div>
  );
}
