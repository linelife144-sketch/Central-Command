'use client';

import { type FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  assessmentDecisionSchema,
  type AssessmentDecisionFormValues,
} from '@/lib/schemas/assessmentReviewDecision';
import type { AssessmentReviewDecision } from '@/lib/services/assessmentReviewService';

export interface AssessmentDecisionSheetProps {
  open: boolean;
  mode: 'single' | 'batch';
  targetCount: number;
  defaultDecision: AssessmentReviewDecision;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: AssessmentDecisionFormValues) => Promise<void>;
}

export function AssessmentDecisionSheet(props: AssessmentDecisionSheetProps) {
  return (
    <Sheet onOpenChange={props.onOpenChange} open={props.open}>
      <SheetContent
        className="w-full border-l border-border bg-surface-raised p-0 text-grid-navy sm:max-w-md"
        side="right"
      >
        <AssessmentDecisionForm key={`${props.open}:${props.defaultDecision}`} {...props} />
      </SheetContent>
    </Sheet>
  );
}

function AssessmentDecisionForm({
  mode,
  targetCount,
  defaultDecision,
  busy = false,
  onOpenChange,
  onConfirm,
}: AssessmentDecisionSheetProps) {
  const [decision, setDecision] = useState<AssessmentReviewDecision>(defaultDecision);
  const [reviewNotes, setReviewNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = assessmentDecisionSchema.safeParse({
      decision,
      reviewNotes,
    });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Please review the decision details.');
      return;
    }

    setValidationError(null);
    await onConfirm(parsed.data);
  };

  const isBatch = mode === 'batch';
  const decisionVerb = decision === 'APPROVED' ? 'approve' : 'request rework for';
  const targetLabel = isBatch ? `${targetCount} selected assessments` : 'this assessment';

  return (
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader className="border-b border-border bg-surface-sunken px-6 py-7">
            <SheetTitle className="font-heading text-3xl text-grid-navy">Decision Review</SheetTitle>
            <SheetDescription className="pr-4 text-muted-foreground">
              Confirm how you want to {decisionVerb} {targetLabel}.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-grid-navy" htmlFor="assessment-decision">
                Decision
              </label>
              <Select
                value={decision}
                onValueChange={(value) => setDecision(value as AssessmentReviewDecision)}
              >
                <SelectTrigger id="assessment-decision" className="w-full">
                  <SelectValue placeholder="Decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approve</SelectItem>
                  <SelectItem value="NEEDS_REWORK">Needs Rework</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-grid-navy" htmlFor="assessment-review-notes">
                Notes {decision === 'NEEDS_REWORK' ? '(required)' : '(optional)'}
              </label>
              <Textarea
                id="assessment-review-notes"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder={decision === 'NEEDS_REWORK' ? 'Enter rework instructions' : 'Optional approval notes'}
                className="min-h-36"
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? 'assessment-review-error' : undefined}
              />
              {validationError ? <p id="assessment-review-error" role="alert" className="text-sm text-grid-danger-ink">{validationError}</p> : null}
            </div>
          </div>

          <SheetFooter className="border-t border-border px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant={decision === 'NEEDS_REWORK' ? 'destructive' : 'default'} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </SheetFooter>
        </form>
  );
}
