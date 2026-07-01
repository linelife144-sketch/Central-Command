import { describe, expect, it } from 'vitest';

import { calculateExpenseSummary } from './expenses';

describe('calculateExpenseSummary', () => {
  it('aggregates totals and status buckets', () => {
    const summary = calculateExpenseSummary(
      [
        {
          amount: 24.24,
          expense_date: '2026-02-04',
          report_status: 'APPROVED',
        },
        {
          amount: 145,
          expense_date: '2026-02-02',
          report_status: 'UNDER_REVIEW',
        },
        {
          amount: 58.5,
          expense_date: '2026-01-31',
          report_status: 'REJECTED',
        },
      ],
      new Date('2026-02-12T00:00:00.000Z'),
    );

    expect(summary).toEqual({
      itemCount: 3,
      totalAmount: 227.74,
      currentMonthAmount: 169.24,
      pendingCount: 1,
      approvedCount: 1,
      rejectedCount: 1,
    });
  });

  it('handles invalid dates and negative values defensively', () => {
    const summary = calculateExpenseSummary(
      [
        {
          amount: -20,
          expense_date: 'invalid-date',
          report_status: 'DRAFT',
        },
      ],
      new Date('2026-02-12T00:00:00.000Z'),
    );

    expect(summary).toEqual({
      itemCount: 1,
      totalAmount: 0,
      currentMonthAmount: 0,
      pendingCount: 1,
      approvedCount: 0,
      rejectedCount: 0,
    });
  });
});
