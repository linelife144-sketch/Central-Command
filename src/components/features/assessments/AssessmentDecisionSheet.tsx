'use client';

import { type FormEvent, useEffect, useState } from 'react';
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

export function AssessmentDecisionSheet({
  open,
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

  useEffect(() => {
    if (!open) {
      return;
    }

    setDecision(defaultDecision);
    setReviewNotes('');
    setValidationError(null);
  }, [defaultDecision, open]);

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
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="storm-surface border-l-2 border-l-[#ffc038] p-0 text-blue-50 sm:max-w-md"
        side="right"
      >
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader className="border-b border-white/20">
            <SheetTitle className="text-blue-50">Decision Review</SheetTitle>
            <SheetDescription className="text-blue-100">
              Confirm how you want to {decisionVerb} {targetLabel}.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.12em] text-[#ffe39f] uppercase" htmlFor="assessment-decision">
                Decision
              </label>
              <Select
                value={decision}
                onValueChange={(value) => setDecision(value as AssessmentReviewDecision)}
              >
                <SelectTrigger id="assessment-decision" className="border-2 border-[#ffc038] bg-[#031a4a]/85 text-blue-50">
                  <SelectValue placeholder="Decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approve</SelectItem>
                  <SelectItem value="NEEDS_REWORK">Needs Rework</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.12em] text-[#ffe39f] uppercase" htmlFor="assessment-review-notes">
                Notes {decision === 'NEEDS_REWORK' ? '(required)' : '(optional)'}
              </label>
              <Textarea
                id="assessment-review-notes"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder={decision === 'NEEDS_REWORK' ? 'Enter rework instructions' : 'Optional approval notes'}
                className="min-h-28 border-2 border-[#ffc038] bg-[#031a4a]/85 text-blue-50 placeholder:text-blue-200"
              />
              {validationError ? <p className="text-xs text-amber-200">{validationError}</p> : null}
            </div>
          </div>

          <SheetFooter className="border-t border-white/20">
            <Button
              type="button"
              variant="outline"
              className="border-white/70 bg-transparent text-blue-50 hover:bg-white/10 hover:text-blue-50"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant={decision === 'NEEDS_REWORK' ? 'destructive' : 'storm'} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
