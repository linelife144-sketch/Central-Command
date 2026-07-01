import { describe, expect, it, vi } from 'vitest';

import {
  createExpenseProcessingService,
  type ReviewedExpenseReport,
} from './expenseProcessingService';
import type { ExpenseListItem } from './expenseSubmissionService';

function buildExpenseItem(overrides: Partial<ExpenseListItem> = {}): ExpenseListItem {
  return {
    id: 'expense-item-1',
    expense_report_id: 'report-1',
    contractor_id: 'sub-1',
    category: 'FUEL',
    description: 'Fuel purchase',
    amount: 58.5,
    currency: 'USD',
    expense_date: '2026-02-03',
    policy_flags: [],
    requires_approval: false,
    billable_to_client: true,
    report_status: 'SUBMITTED',
    report_period_start: '2026-02-01',
    report_period_end: '2026-02-28',
    sync_status: 'SYNCED',
    created_at: '2026-02-03T10:00:00.000Z',
    updated_at: '2026-02-03T10:00:00.000Z',
    ...overrides,
  };
}

function buildReviewedReport(overrides: Partial<ReviewedExpenseReport> = {}): ReviewedExpenseReport {
  return {
    expenseReportId: 'report-1',
    status: 'APPROVED',
    reviewedBy: 'admin-1',
    reviewedAt: '2026-02-12T10:00:00.000Z',
    ...overrides,
  };
}

describe('createExpenseProcessingService', () => {
  it('lists review items through submission service filters', async () => {
    const listExpenses = vi.fn().mockResolvedValue([buildExpenseItem()]);
    const service = createExpenseProcessingService({
      listExpenses,
      isOnline: () => true,
      reviewRemoteReport: vi.fn(),
    });

    const items = await service.listReviewItems({ status: 'SUBMITTED' });

    expect(listExpenses).toHaveBeenCalledWith({ status: 'SUBMITTED' });
    expect(items).toHaveLength(1);
  });

  it('requires online connection for review decisions', async () => {
    const service = createExpenseProcessingService({
      isOnline: () => false,
      listExpenses: vi.fn(),
      reviewRemoteReport: vi.fn(),
    });

    await expect(
      service.reviewReport({
        expenseReportId: 'report-1',
        reviewerId: 'admin-1',
        decision: 'APPROVED',
      }),
    ).rejects.toThrow('internet connection');
  });

  it('requires rejection reason for rejected reports', async () => {
    const service = createExpenseProcessingService({
      isOnline: () => true,
      listExpenses: vi.fn(),
      reviewRemoteReport: vi.fn(),
    });

    await expect(
      service.reviewReport({
        expenseReportId: 'report-1',
        reviewerId: 'admin-1',
        decision: 'REJECTED',
      }),
    ).rejects.toThrow('Rejection reason is required');
  });

  it('submits approve decision when validation passes', async () => {
    const reviewRemoteReport = vi.fn().mockResolvedValue(buildReviewedReport());
    const service = createExpenseProcessingService({
      isOnline: () => true,
      listExpenses: vi.fn(),
      reviewRemoteReport,
    });

    const result = await service.reviewReport({
      expenseReportId: 'report-1',
      reviewerId: 'admin-1',
      decision: 'APPROVED',
    });

    expect(reviewRemoteReport).toHaveBeenCalledWith({
      expenseReportId: 'report-1',
      reviewerId: 'admin-1',
      decision: 'APPROVED',
    });
    expect(result.status).toBe('APPROVED');
  });
});
