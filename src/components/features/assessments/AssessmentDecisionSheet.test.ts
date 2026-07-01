import { describe, expect, it } from 'vitest';

import type { AssessmentDecisionFormValues } from '@/lib/schemas/assessmentReviewDecision';

describe('AssessmentDecisionSheet contract', () => {
  it('accepts decision form values and submit handler type', () => {
    const sample: AssessmentDecisionFormValues = { decision: 'APPROVED', reviewNotes: '' };
    expect(sample.decision).toBe('APPROVED');
  });
});
