import type { ExpenseStatus } from '../../types';
import {
  expenseSubmissionService,
  type ExpenseListFilters,
  type ExpenseListItem,
} from './expenseSubmissionService';

type ExpenseReviewDecision = Extract<ExpenseStatus, 'APPROVED' | 'REJECTED'>;

interface RemoteExpenseReportReviewRow {
  id: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export type ExpenseReviewFilters = ExpenseListFilters;

export interface ReviewExpenseReportInput {
  expenseReportId: string;
  reviewerId: string;
  decision: ExpenseReviewDecision;
  rejectionReason?: string;
}

export interface ReviewedExpenseReport {
  expenseReportId: string;
  status: ExpenseStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface ExpenseProcessingDependencies {
  isOnline: () => boolean;
  listExpenses: (filters: ExpenseReviewFilters) => Promise<ExpenseListItem[]>;
  reviewRemoteReport: (input: ReviewExpenseReportInput) => Promise<ReviewedExpenseReport>;
}

export interface ExpenseProcessingService {
  listReviewItems: (filters?: ExpenseReviewFilters) => Promise<ExpenseListItem[]>;
  reviewReport: (input: ReviewExpenseReportInput) => Promise<ReviewedExpenseReport>;
}

function defaultIsOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

function toExpenseStatus(status: string): ExpenseStatus {
  const normalized = status.toUpperCase();
  if (normalized === 'SUBMITTED') return 'SUBMITTED';
  if (normalized === 'UNDER_REVIEW') return 'UNDER_REVIEW';
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  if (normalized === 'PAID') return 'PAID';
  return 'DRAFT';
}

function mapReviewedReport(row: RemoteExpenseReportReviewRow): ReviewedExpenseReport {
  return {
    expenseReportId: row.id,
    status: toExpenseStatus(row.status),
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
  };
}

async function reviewRemoteReport(input: ReviewExpenseReportInput): Promise<ReviewedExpenseReport> {
  const { supabase } = await import('../supabase/client');
  const nowIso = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('expense_reports') as any)
    .update({
      status: input.decision,
      reviewed_by: input.reviewerId,
      reviewed_at: nowIso,
      rejection_reason: input.decision === 'REJECTED' ? input.rejectionReason ?? null : null,
      updated_at: nowIso,
    })
    .eq('id', input.expenseReportId)
    .select('id, status, reviewed_by, reviewed_at, rejection_reason')
    .single();

  if (error) {
    throw error;
  }

  return mapReviewedReport(data as RemoteExpenseReportReviewRow);
}

const defaultDependencies: ExpenseProcessingDependencies = {
  isOnline: defaultIsOnline,
  listExpenses: (filters) => expenseSubmissionService.listExpenses(filters),
  reviewRemoteReport,
};

export function createExpenseProcessingService(
  overrides: Partial<ExpenseProcessingDependencies> = {},
): ExpenseProcessingService {
  const dependencies: ExpenseProcessingDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async listReviewItems(filters: ExpenseReviewFilters = {}): Promise<ExpenseListItem[]> {
      return dependencies.listExpenses(filters);
    },

    async reviewReport(input: ReviewExpenseReportInput): Promise<ReviewedExpenseReport> {
      if (!dependencies.isOnline()) {
        throw new Error('Expense review requires an internet connection.');
      }

      if (input.decision === 'REJECTED' && !input.rejectionReason?.trim()) {
        throw new Error('Rejection reason is required when rejecting an expense report.');
      }

      return dependencies.reviewRemoteReport(input);
    },
  };
}

export const expenseProcessingService = createExpenseProcessingService();
