import { describe, expect, it } from 'vitest';

import {
  ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS,
  ASSESSMENT_REVIEW_LAYOUT_MODE,
} from '@/components/features/assessments/AssessmentReviewList';

describe('AssessmentReviewList layout helpers', () => {
  it('uses command matrix layout mode', () => {
    expect(ASSESSMENT_REVIEW_LAYOUT_MODE).toBe('command-matrix');
  });

  it('uses the shared filter border token', () => {
    expect(ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS).toContain('border-border');
  });
});
