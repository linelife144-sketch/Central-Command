'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { AssessmentForm } from '@/components/features/assessments';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';

function AssessmentCreateSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-64 rounded-lg bg-grid-storm-100 animate-pulse" />
      <div className="h-10 w-96 max-w-full rounded-lg bg-grid-storm-100 animate-pulse" />
      <div className="storm-surface rounded-xl p-4">
        <div className="space-y-3">
          <div className="h-10 w-full rounded-md bg-white/20 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-white/20 animate-pulse" />
          <div className="h-24 w-full rounded-md bg-white/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function AssessmentCreateInner() {
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

export default function ContractorAssessmentCreatePage() {
  return (
    <Suspense fallback={<AssessmentCreateSkeleton />}>
      <AssessmentCreateInner />
    </Suspense>
  );
}
