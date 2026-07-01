import { describe, expect, it } from 'vitest';

import { assessmentDecisionSchema } from '@/lib/schemas/assessmentReviewDecision';

describe('assessmentDecisionSchema', () => {
  it('requires notes for NEEDS_REWORK', () => {
    const parsed = assessmentDecisionSchema.safeParse({ decision: 'NEEDS_REWORK', reviewNotes: '' });
    expect(parsed.success).toBe(false);
  });

  it('allows APPROVED without notes', () => {
    const parsed = assessmentDecisionSchema.safeParse({ decision: 'APPROVED', reviewNotes: '' });
    expect(parsed.success).toBe(true);
  });
});
