'use client';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { AssessmentReviewList } from '@/components/features/assessments';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AdminAssessmentReviewPage() {
  const { profile, can } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Review"
        description="Command matrix for triage, quality control, and final field assessment decisions."
      />

      <section className="min-w-0">
        <AssessmentReviewList reviewerId={profile?.id} canEdit={can('admin.assessments.edit')} />
      </section>
    </div>
  );
}
