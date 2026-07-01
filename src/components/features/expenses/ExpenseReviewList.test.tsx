import { describe, expect, it } from 'vitest';

import {
  EXPENSE_REVIEW_FILTER_CONTROL_CLASS,
  getExpenseReviewLayoutMode,
} from '@/components/features/expenses/ExpenseReviewList';

describe('ExpenseReviewList layout helpers', () => {
  it('returns ledger mode', () => {
    expect(getExpenseReviewLayoutMode()).toBe('ledger');
  });

  it('keeps solid gold filter border classes', () => {
    expect(EXPENSE_REVIEW_FILTER_CONTROL_CLASS).toContain('border-[#ffc038]');
  });
});
