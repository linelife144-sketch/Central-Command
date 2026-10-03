import { describe, expect, it } from 'vitest';

import {
  getTimeReviewLayoutMode,
  TIME_REVIEW_FILTER_CONTROL_CLASS,
} from '@/components/features/time-tracking/TimeEntryList';

describe('TimeEntryList layout helpers', () => {
  it('uses operations-grid layout mode', () => {
    expect(getTimeReviewLayoutMode()).toBe('operations-grid');
  });

  it('uses the shared filter border token', () => {
    expect(TIME_REVIEW_FILTER_CONTROL_CLASS).toContain('border-border');
  });
});
