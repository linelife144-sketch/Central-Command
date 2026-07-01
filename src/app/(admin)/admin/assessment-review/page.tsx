'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { AssessmentReviewList } from '@/components/features/assessments';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AdminAssessmentReviewPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Review"
        description="Command matrix for triage, quality control, and final field assessment decisions."
      />

      <section className="rounded-2xl border-2 border-[#ffc038] bg-[radial-gradient(circle_at_16%_12%,rgba(255,255,255,0.16),transparent_42%),linear-gradient(136deg,#00113d_0%,#00286c_52%,#0a4ea3_100%)] p-4 shadow-[0_18px_34px_rgba(0,18,74,0.32)] sm:p-5">
        <AssessmentReviewList reviewerId={profile?.id} />
      </section>
    </div>
  );
}
