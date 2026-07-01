'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, RefreshCw, ShieldAlert, Wrench, Check } from 'lucide-react';
import { toast } from 'sonner';

import { AssessmentDecisionSheet } from '@/components/features/assessments/AssessmentDecisionSheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  assessmentReviewService,
  type AssessmentReviewDecision,
  type AssessmentReviewListItem,
} from '@/lib/services/assessmentReviewService';
import { type AssessmentDecisionFormValues } from '@/lib/schemas/assessmentReviewDecision';
import { formatDate } from '@/lib/utils/formatters';
import type { PriorityLevel } from '@/types';

type ReviewedFilterValue = 'ALL' | 'PENDING' | 'REVIEWED';
type PriorityFilterValue = PriorityLevel | 'ALL';
type DecisionFilterValue = AssessmentReviewDecision | 'ALL';

type DecisionSheetState = {
  mode: 'single' | 'batch';
  targets: AssessmentReviewListItem[];
  defaultDecision: AssessmentReviewDecision;
};

export const ASSESSMENT_REVIEW_LAYOUT_MODE = 'command-matrix';
export const ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS =
  'assessment-command-control border-2 border-[#ffc038] bg-[#031a4a]/85 text-blue-50 placeholder:text-blue-200';

function toStartOfDayIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function toEndOfDayIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function parseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to load assessments.';
}

function toPriorityLabel(priority?: PriorityLevel): string {
  if (!priority) {
    return '-';
  }

  if (priority === 'A') return 'A - Critical';
  if (priority === 'B') return 'B - Urgent';
  if (priority === 'C') return 'C - Standard';
  return 'X - Hold';
}

function toReviewStateBadgeVariant(
  item: Pick<AssessmentReviewListItem, 'review_state' | 'review_decision'>,
): 'default' | 'destructive' | 'outline' | 'secondary' {
  if (item.review_decision === 'APPROVED') {
    return 'secondary';
  }

  if (item.review_decision === 'NEEDS_REWORK') {
    return 'destructive';
  }

  if (item.review_state === 'REVIEWED') {
    return 'outline';
  }

  return 'default';
}

function toReviewStateLabel(item: Pick<AssessmentReviewListItem, 'review_state' | 'review_decision'>): string {
  if (item.review_decision === 'APPROVED') {
    return 'Approved';
  }

  if (item.review_decision === 'NEEDS_REWORK') {
    return 'Needs Rework';
  }

  if (item.review_state === 'REVIEWED') {
    return 'Reviewed';
  }

  return 'Pending Review';
}

function toSafetyFlagLabel(flag: string): string {
  return flag
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface AssessmentReviewListProps {
  reviewerId?: string;
}

export function AssessmentReviewList({ reviewerId }: AssessmentReviewListProps) {
  const [assessments, setAssessments] = useState<AssessmentReviewListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [reviewedFilter, setReviewedFilter] = useState<ReviewedFilterValue>('PENDING');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterValue>('ALL');
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilterValue>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [decisionSheetState, setDecisionSheetState] = useState<DecisionSheetState | null>(null);

  const loadAssessments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rows = await assessmentReviewService.listAssessments({
        reviewed: reviewedFilter,
        priority: priorityFilter,
        decision: decisionFilter,
        from: toStartOfDayIso(fromDate),
        to: toEndOfDayIso(toDate),
        search: searchTerm.trim() || undefined,
      });

      setAssessments(rows);
    } catch (loadError) {
      setAssessments([]);
      setError(parseError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [decisionFilter, fromDate, priorityFilter, reviewedFilter, searchTerm, toDate]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  useEffect(() => {
    setSelectedAssessmentIds((current) =>
      current.filter((id) => assessments.some((assessment) => assessment.id === id)),
    );
  }, [assessments]);

  const selectedPendingAssessments = useMemo(
    () =>
      assessments.filter(
        (assessment) =>
          selectedAssessmentIds.includes(assessment.id) && assessment.review_state === 'PENDING',
      ),
    [assessments, selectedAssessmentIds],
  );

  const summary = useMemo(() => {
    const pendingCount = assessments.filter((item) => item.review_state === 'PENDING').length;
    const reviewedCount = assessments.filter((item) => item.review_state === 'REVIEWED').length;
    const approvedCount = assessments.filter((item) => item.review_decision === 'APPROVED').length;
    const needsReworkCount = assessments.filter((item) => item.review_decision === 'NEEDS_REWORK').length;

    return {
      total: assessments.length,
      pendingCount,
      reviewedCount,
      approvedCount,
      needsReworkCount,
    };
  }, [assessments]);

  const focusedAssessment = useMemo(() => {
    if (selectedAssessmentIds.length > 0) {
      const selected = assessments.find((item) => item.id === selectedAssessmentIds[0]);
      if (selected) {
        return selected;
      }
    }

    return assessments.find((item) => item.review_state === 'PENDING') ?? assessments[0];
  }, [assessments, selectedAssessmentIds]);

  const updateSelected = useCallback((assessmentId: string, checked: boolean) => {
    setSelectedAssessmentIds((current) => {
      if (checked) {
        return current.includes(assessmentId) ? current : [...current, assessmentId];
      }

      return current.filter((id) => id !== assessmentId);
    });
  }, []);

  const applyReviewResult = useCallback(
    (assessmentId: string, decision: AssessmentReviewDecision, reviewNotes: string, reviewedAt: string) => {
      setAssessments((current) =>
        current.map((assessment) =>
          assessment.id === assessmentId
            ? {
                ...assessment,
                review_state: 'REVIEWED',
                review_decision: decision,
                review_notes: reviewNotes,
                reviewed_by: reviewerId,
                reviewed_at: reviewedAt,
              }
            : assessment,
        ),
      );
      setSelectedAssessmentIds((current) => current.filter((id) => id !== assessmentId));
    },
    [reviewerId],
  );

  const processDecision = useCallback(
    async (
      assessment: AssessmentReviewListItem,
      decision: AssessmentReviewDecision,
      reviewNotes?: string,
    ) => {
      if (!reviewerId) {
        throw new Error('You must be signed in as an admin to review assessments.');
      }

      const reviewed = await assessmentReviewService.reviewAssessment({
        assessmentId: assessment.id,
        reviewerId,
        decision,
        reviewNotes,
      });

      applyReviewResult(assessment.id, reviewed.decision, reviewed.reviewNotes, reviewed.reviewedAt);
    },
    [applyReviewResult, reviewerId],
  );

  const openDecisionSheet = useCallback(
    (
      targets: AssessmentReviewListItem[],
      defaultDecision: AssessmentReviewDecision,
      mode: 'single' | 'batch',
    ) => {
      const pendingTargets = targets.filter((target) => target.review_state === 'PENDING');
      if (pendingTargets.length === 0) {
        toast.error('Select at least one pending assessment.');
        return;
      }

      setDecisionSheetState({
        mode,
        targets: pendingTargets,
        defaultDecision,
      });
    },
    [],
  );

  const handleDecisionSubmit = useCallback(
    async (values: AssessmentDecisionFormValues) => {
      if (!decisionSheetState) {
        return;
      }

      setIsSubmitting(true);
      let successCount = 0;
      let failureCount = 0;

      for (const assessment of decisionSheetState.targets) {
        try {
          await processDecision(assessment, values.decision, values.reviewNotes);
          successCount += 1;
        } catch {
          failureCount += 1;
        }
      }

      setIsSubmitting(false);
      setDecisionSheetState(null);

      if (successCount > 0) {
        toast.success(
          values.decision === 'APPROVED'
            ? `Approved ${successCount} assessment${successCount === 1 ? '' : 's'}.`
            : `Requested rework for ${successCount} assessment${successCount === 1 ? '' : 's'}.`,
        );
      }

      if (failureCount > 0) {
        toast.error(`${failureCount} assessment${failureCount === 1 ? '' : 's'} failed to update.`);
      }
    },
    [decisionSheetState, processDecision],
  );

  return (
    <div className="space-y-4 assessment-command-shell">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="storm-card rounded-xl border-2 border-[#ffc038]">
          <CardContent className="p-3">
            <p className="text-xs text-blue-100">Assessments</p>
            <p className="text-lg font-semibold text-blue-50">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="storm-card rounded-xl border-2 border-[#ffc038]">
          <CardContent className="p-3">
            <p className="text-xs text-blue-100">Pending</p>
            <p className="text-lg font-semibold text-blue-50">{summary.pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="storm-card rounded-xl border-2 border-[#ffc038]">
          <CardContent className="p-3">
            <p className="text-xs text-blue-100">Reviewed</p>
            <p className="text-lg font-semibold text-blue-50">{summary.reviewedCount}</p>
          </CardContent>
        </Card>
        <Card className="storm-card rounded-xl border-2 border-[#ffc038]">
          <CardContent className="p-3">
            <p className="text-xs text-blue-100">Approved</p>
            <p className="text-lg font-semibold text-blue-50">{summary.approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="storm-card rounded-xl border-2 border-[#ffc038]">
          <CardContent className="p-3">
            <p className="text-xs text-blue-100">Needs Rework</p>
            <p className="text-lg font-semibold text-blue-50">{summary.needsReworkCount}</p>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[280px_1fr_320px]">
        <aside className="space-y-3 self-start xl:sticky xl:top-24">
          <Card className="storm-card rounded-xl border-2 border-[#ffc038]">
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-[#ffe39f] uppercase">Filter Rail</p>
              <Input
                className={ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS}
                placeholder="Search ticket, contractor, cause"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Select
                value={reviewedFilter}
                onValueChange={(value) => setReviewedFilter(value as ReviewedFilterValue)}
              >
                <SelectTrigger className={ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="Review state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All review states</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REVIEWED">Reviewed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value as PriorityFilterValue)}
              >
                <SelectTrigger className={ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  <SelectItem value="A">A - Critical</SelectItem>
                  <SelectItem value="B">B - Urgent</SelectItem>
                  <SelectItem value="C">C - Standard</SelectItem>
                  <SelectItem value="X">X - Hold</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={decisionFilter}
                onValueChange={(value) => setDecisionFilter(value as DecisionFilterValue)}
              >
                <SelectTrigger className={ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="Decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All decisions</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="NEEDS_REWORK">Needs Rework</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Input
                  className={ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS}
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
                <Input
                  className={ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS}
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>
              <Button
                variant="storm"
                disabled={isLoading}
                onClick={() => {
                  void loadAssessments();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Queue
              </Button>
              <Button
                variant="storm"
                disabled={isSubmitting || selectedPendingAssessments.length === 0}
                onClick={() => {
                  openDecisionSheet(selectedPendingAssessments, 'APPROVED', 'batch');
                }}
              >
                <CheckCheck className="h-4 w-4" />
                Approve Selected ({selectedPendingAssessments.length})
              </Button>
              <Button
                variant="destructive"
                disabled={isSubmitting || selectedPendingAssessments.length === 0}
                onClick={() => {
                  openDecisionSheet(selectedPendingAssessments, 'NEEDS_REWORK', 'batch');
                }}
              >
                <Wrench className="h-4 w-4" />
                Rework Selected ({selectedPendingAssessments.length})
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-3">
          <Card className="storm-card rounded-xl border-2 border-[#ffc038]">
            <CardContent className="p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-[#ffe39f] uppercase">Queue Lane</p>
                  <p className="text-sm text-blue-100">{assessments.length} assessments in scope</p>
                </div>
                <Badge variant="outline" className="border-[#ffc038] text-blue-50">
                  {selectedAssessmentIds.length} selected
                </Badge>
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  <div className="rounded-xl border-2 border-[#ffc038] bg-[#041b4a]/70 px-4 py-6 text-sm text-blue-100">
                    Loading assessments...
                  </div>
                ) : assessments.length === 0 ? (
                  <div className="rounded-xl border-2 border-[#ffc038] bg-[#041b4a]/70 px-4 py-6 text-sm text-blue-100">
                    No assessments found for the selected filters.
                  </div>
                ) : (
                  assessments.map((assessment) => (
                    <article
                      key={assessment.id}
                      className="assessment-command-card rounded-xl border-2 border-[#ffc038] bg-[#052153]/78 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(0,18,74,0.34)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {assessment.review_state === 'PENDING' ? (
                            <Checkbox
                              checked={selectedAssessmentIds.includes(assessment.id)}
                              disabled={isSubmitting}
                              onCheckedChange={(checked) => updateSelected(assessment.id, checked === true)}
                            />
                          ) : (
                            <span className="mt-1 inline-flex h-4 w-4 rounded-full bg-white/30" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-blue-50">
                              {assessment.contractor_name ?? assessment.contractor_id}
                            </p>
                            <p className="text-xs text-blue-100">
                              {assessment.ticket_number ?? assessment.ticket_id}
                            </p>
                          </div>
                        </div>
                        <Badge variant={toReviewStateBadgeVariant(assessment)}>
                          {toReviewStateLabel(assessment)}
                        </Badge>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-blue-100 sm:grid-cols-2">
                        <p>Priority: {toPriorityLabel(assessment.priority)}</p>
                        <p>Assessed: {assessment.assessed_at ? formatDate(assessment.assessed_at) : '-'}</p>
                        <p className="sm:col-span-2">Cause: {assessment.damage_cause ?? 'Not specified'}</p>
                      </div>

                      {assessment.safety_flags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {assessment.safety_flags.slice(0, 4).map((flag) => (
                            <Badge key={`${assessment.id}-${flag}`} variant="outline" className="border-[#ffc038] text-blue-50">
                              {toSafetyFlagLabel(flag)}
                            </Badge>
                          ))}
                          {assessment.safety_flags.length > 4 ? (
                            <Badge variant="outline" className="border-[#ffc038] text-blue-50">
                              +{assessment.safety_flags.length - 4}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/20 pt-3">
                        <Button
                          size="sm"
                          variant="storm"
                          disabled={isSubmitting || assessment.review_state !== 'PENDING'}
                          onClick={() => openDecisionSheet([assessment], 'APPROVED', 'single')}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isSubmitting || assessment.review_state !== 'PENDING'}
                          onClick={() => openDecisionSheet([assessment], 'NEEDS_REWORK', 'single')}
                        >
                          <Wrench className="h-3.5 w-3.5" />
                          Rework
                        </Button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="self-start xl:sticky xl:top-24">
          <Card className="storm-card rounded-xl border-2 border-[#ffc038]">
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-[#ffe39f] uppercase">Context Dock</p>
              {focusedAssessment ? (
                <>
                  <div className="space-y-1 rounded-lg border border-[#ffc038] bg-[#031a4a]/70 p-3">
                    <p className="text-sm font-semibold text-blue-50">
                      {focusedAssessment.contractor_name ?? focusedAssessment.contractor_id}
                    </p>
                    <p className="text-xs text-blue-100">{focusedAssessment.ticket_number ?? focusedAssessment.ticket_id}</p>
                    <Badge variant={toReviewStateBadgeVariant(focusedAssessment)}>
                      {toReviewStateLabel(focusedAssessment)}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-blue-100">
                    <p>Priority: {toPriorityLabel(focusedAssessment.priority)}</p>
                    <p>Equipment: {focusedAssessment.equipment_count}</p>
                    <p>Cause: {focusedAssessment.damage_cause ?? 'Not specified'}</p>
                    <p>Reviewed At: {focusedAssessment.reviewed_at ? formatDate(focusedAssessment.reviewed_at) : '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#ffe39f] uppercase">Safety Flags</p>
                    {focusedAssessment.safety_flags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {focusedAssessment.safety_flags.map((flag) => (
                          <Badge key={`${focusedAssessment.id}-${flag}`} variant="outline" className="border-[#ffc038] text-blue-50">
                            {toSafetyFlagLabel(flag)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-blue-100">No safety flags.</p>
                    )}
                  </div>

                  {focusedAssessment.review_state === 'PENDING' ? (
                    <div className="space-y-2 border-t border-white/20 pt-3">
                      <Button
                        variant="storm"
                        className="w-full justify-start"
                        disabled={isSubmitting}
                        onClick={() => openDecisionSheet([focusedAssessment], 'APPROVED', 'single')}
                      >
                        <Check className="h-4 w-4" />
                        Approve Focused
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        disabled={isSubmitting}
                        onClick={() => openDecisionSheet([focusedAssessment], 'NEEDS_REWORK', 'single')}
                      >
                        <Wrench className="h-4 w-4" />
                        Rework Focused
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-lg border border-[#ffc038] bg-[#031a4a]/70 p-3 text-sm text-blue-100">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-[#ffe39f]" />
                    <p>Select or load an assessment to view context details.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <AssessmentDecisionSheet
        open={Boolean(decisionSheetState)}
        mode={decisionSheetState?.mode ?? 'single'}
        targetCount={decisionSheetState?.targets.length ?? 0}
        defaultDecision={decisionSheetState?.defaultDecision ?? 'APPROVED'}
        busy={isSubmitting}
        onOpenChange={(open) => {
          if (!open) {
            setDecisionSheetState(null);
          }
        }}
        onConfirm={handleDecisionSubmit}
      />
    </div>
  );
}
