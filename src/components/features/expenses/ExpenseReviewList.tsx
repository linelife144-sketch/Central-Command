'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable, type Column } from '@/components/common/data-display/DataTable';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  expenseProcessingService,
  type ExpenseReviewFilters,
} from '@/lib/services/expenseProcessingService';
import type { ExpenseListItem } from '@/lib/services/expenseSubmissionService';
import { calculateExpenseSummary } from '@/lib/utils/expenses';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { ExpenseStatus, PolicyFlag } from '@/types';

type StatusFilterValue = ExpenseStatus | 'ALL';
type ReviewDecision = Extract<ExpenseStatus, 'APPROVED' | 'REJECTED'>;

const REVIEWABLE_STATUSES = new Set<ExpenseStatus>(['SUBMITTED', 'UNDER_REVIEW']);

function toStartOfDayIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function toEndOfDayIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function parseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to process expense report.';
}

function toCategoryLabel(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toFlagLabel(flag: PolicyFlag): string {
  return flag
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toStatusVariant(status: ExpenseStatus): 'pending' | 'approved' | 'rejected' | 'info' {
  if (status === 'APPROVED' || status === 'PAID') {
    return 'approved';
  }

  if (status === 'REJECTED') {
    return 'rejected';
  }

  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
    return 'info';
  }

  return 'pending';
}

interface ExpenseReviewListProps {
  reviewerId?: string;
}

export const EXPENSE_REVIEW_FILTER_CONTROL_CLASS =
  'border-[#ffc038] shadow-none focus-visible:border-[#ffc038] focus-visible:ring-[2px] focus-visible:ring-[#ffc038]';

export function getExpenseReviewLayoutMode() {
  return 'ledger';
}

export function ExpenseReviewList({ reviewerId }: ExpenseReviewListProps) {
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('SUBMITTED');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: ExpenseReviewFilters = {
        status: statusFilter,
        from: toStartOfDayIso(fromDate),
        to: toEndOfDayIso(toDate),
      };

      const data = await expenseProcessingService.listReviewItems(filters);
      setExpenses(data);
    } catch (loadError) {
      setExpenses([]);
      setError(parseError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, statusFilter, toDate]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    setSelectedExpenseIds((current) => current.filter((id) => expenses.some((expense) => expense.id === id)));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return expenses;
    }

    return expenses.filter((expense) => {
      const searchable = [
        expense.contractor_name,
        expense.contractor_id,
        expense.description,
        expense.category,
        expense.ticket_number,
        expense.ticket_id,
        expense.expense_report_id,
        expense.policy_flags.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [expenses, searchTerm]);

  const reviewableSelectedExpenses = useMemo(
    () =>
      filteredExpenses.filter(
        (expense) =>
          selectedExpenseIds.includes(expense.id) && REVIEWABLE_STATUSES.has(expense.report_status),
      ),
    [filteredExpenses, selectedExpenseIds],
  );

  const summary = useMemo(
    () =>
      calculateExpenseSummary(
        filteredExpenses.map((expense) => ({
          amount: expense.amount,
          expense_date: expense.expense_date,
          report_status: expense.report_status,
        })),
      ),
    [filteredExpenses],
  );

  const pendingReviewCount = useMemo(
    () => filteredExpenses.filter((expense) => REVIEWABLE_STATUSES.has(expense.report_status)).length,
    [filteredExpenses],
  );

  const requiresApprovalCount = useMemo(
    () => filteredExpenses.filter((expense) => expense.requires_approval).length,
    [filteredExpenses],
  );

  const updateSelected = useCallback((expenseId: string, checked: boolean) => {
    setSelectedExpenseIds((current) => {
      if (checked) {
        return current.includes(expenseId) ? current : [...current, expenseId];
      }

      return current.filter((id) => id !== expenseId);
    });
  }, []);

  const applyDecisionToState = useCallback(
    (expenseReportId: string, decision: ReviewDecision, rejectionReason?: string) => {
      setExpenses((current) =>
        current.map((expense) =>
          expense.expense_report_id === expenseReportId
            ? {
                ...expense,
                report_status: decision,
                approval_reason: decision === 'REJECTED' ? rejectionReason : undefined,
              }
            : expense,
        ),
      );
      setSelectedExpenseIds([]);
    },
    [],
  );

  const processReviewDecision = useCallback(
    async (
      expenseReportId: string,
      decision: ReviewDecision,
      rejectionReason?: string,
    ): Promise<void> => {
      if (!reviewerId) {
        throw new Error('You must be signed in as an admin to review expense reports.');
      }

      await expenseProcessingService.reviewReport({
        expenseReportId,
        reviewerId,
        decision,
        rejectionReason,
      });
      applyDecisionToState(expenseReportId, decision, rejectionReason);
    },
    [applyDecisionToState, reviewerId],
  );

  const handleSingleDecision = useCallback(
    async (expense: ExpenseListItem, decision: ReviewDecision) => {
      if (!REVIEWABLE_STATUSES.has(expense.report_status)) {
        return;
      }

      let rejectionReason: string | undefined;
      if (decision === 'REJECTED') {
        const reason = window.prompt('Rejection reason (required):', expense.approval_reason ?? '');
        if (reason === null) {
          return;
        }

        rejectionReason = reason.trim();
      }

      setIsSubmitting(true);
      try {
        await processReviewDecision(expense.expense_report_id, decision, rejectionReason);
        toast.success(decision === 'APPROVED' ? 'Expense report approved.' : 'Expense report rejected.');
      } catch (decisionError) {
        toast.error(parseError(decisionError));
      } finally {
        setIsSubmitting(false);
      }
    },
    [processReviewDecision],
  );

  const handleBatchDecision = useCallback(
    async (decision: ReviewDecision) => {
      if (reviewableSelectedExpenses.length === 0) {
        toast.error('Select at least one submitted or under-review expense.');
        return;
      }

      let rejectionReason: string | undefined;
      if (decision === 'REJECTED') {
        const reason = window.prompt('Rejection reason for selected expense reports (required):', '');
        if (reason === null) {
          return;
        }

        rejectionReason = reason.trim();
      }

      const reportIds = Array.from(
        new Set(reviewableSelectedExpenses.map((expense) => expense.expense_report_id)),
      );

      setIsSubmitting(true);
      let successCount = 0;
      let failureCount = 0;

      for (const reportId of reportIds) {
        try {
          await processReviewDecision(reportId, decision, rejectionReason);
          successCount += 1;
        } catch {
          failureCount += 1;
        }
      }

      setIsSubmitting(false);

      if (successCount > 0) {
        toast.success(
          `${decision === 'APPROVED' ? 'Approved' : 'Rejected'} ${successCount} expense report${successCount === 1 ? '' : 's'}.`,
        );
      }
      if (failureCount > 0) {
        toast.error(`${failureCount} expense report${failureCount === 1 ? '' : 's'} failed to update.`);
      }
    },
    [processReviewDecision, reviewableSelectedExpenses],
  );

  const columns = useMemo<Column<ExpenseListItem>[]>(
    () => [
      {
        key: 'select',
        header: '',
        width: '48px',
        cell: (expense) =>
          REVIEWABLE_STATUSES.has(expense.report_status) ? (
            <Checkbox
              checked={selectedExpenseIds.includes(expense.id)}
              disabled={isSubmitting}
              onCheckedChange={(checked) => updateSelected(expense.id, checked === true)}
            />
          ) : null,
      },
      {
        key: 'contractor',
        header: 'Contractor',
        cell: (expense) => expense.contractor_name ?? expense.contractor_id,
      },
      {
        key: 'date',
        header: 'Date',
        cell: (expense) => formatDate(expense.expense_date),
      },
      {
        key: 'category',
        header: 'Category',
        cell: (expense) => toCategoryLabel(expense.category),
      },
      {
        key: 'description',
        header: 'Description',
        cell: (expense) => expense.description,
      },
      {
        key: 'ticket',
        header: 'Ticket',
        cell: (expense) => expense.ticket_number ?? '-',
      },
      {
        key: 'amount',
        header: 'Amount',
        cell: (expense) => formatCurrency(expense.amount),
      },
      {
        key: 'flags',
        header: 'Policy Flags',
        cell: (expense) =>
          expense.policy_flags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {expense.policy_flags.map((flag) => (
                <Badge key={`${expense.id}-${flag}`} variant="outline">
                  {toFlagLabel(flag)}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-blue-100">None</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (expense) => (
          <StatusBadge
            status={expense.report_status}
            variant={toStatusVariant(expense.report_status)}
            size="sm"
          />
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cell: (expense) =>
          REVIEWABLE_STATUSES.has(expense.report_status) ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="storm"
                disabled={isSubmitting}
                onClick={() => {
                  void handleSingleDecision(expense, 'APPROVED');
                }}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => {
                  void handleSingleDecision(expense, 'REJECTED');
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          ) : (
            <span className="text-xs text-blue-100">Reviewed</span>
          ),
      },
    ],
    [handleSingleDecision, isSubmitting, selectedExpenseIds, updateSelected],
  );

  return (
    <div className="space-y-4 expense-ledger-layout">
      <Card className="border-[#ffc038]">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <section className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-3 rounded-[1.35rem] border border-[#ffc038] bg-[linear-gradient(140deg,rgba(255,192,56,0.22)_0%,rgba(255,192,56,0.08)_100%)] p-4 shadow-[0_12px_24px_rgba(0,18,72,0.2)]">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ffe39f] uppercase">Search Deck</p>
                <Input
                  className={EXPENSE_REVIEW_FILTER_CONTROL_CLASS}
                  placeholder="Search contractor, ticket, description"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-white/25 bg-[#0f1e3f]/60 px-3 py-2">
                    <p className="text-xs text-blue-100">Visible Items</p>
                    <p className="text-lg font-semibold text-blue-50">{filteredExpenses.length}</p>
                  </div>
                  <div className="rounded-md border border-white/25 bg-[#0f1e3f]/60 px-3 py-2">
                    <p className="text-xs text-blue-100">Review Queue</p>
                    <p className="text-lg font-semibold text-blue-50">{reviewableSelectedExpenses.length}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-tr-[2rem] rounded-bl-[1rem] rounded-tl-[0.9rem] rounded-br-[0.9rem] border border-[#ffc038] bg-white/8 p-3">
                  <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-blue-100 uppercase">Status Filter</p>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}
                  >
                    <SelectTrigger className={EXPENSE_REVIEW_FILTER_CONTROL_CLASS}>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 rounded-tl-[2rem] rounded-br-[1rem] rounded-tr-[0.9rem] rounded-bl-[0.9rem] border border-[#ffc038] bg-white/8 p-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-blue-100 uppercase">From</p>
                    <Input
                      className={EXPENSE_REVIEW_FILTER_CONTROL_CLASS}
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-blue-100 uppercase">To</p>
                    <Input
                      className={EXPENSE_REVIEW_FILTER_CONTROL_CLASS}
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-3 rounded-[1.25rem] border border-[#ffc038] bg-[linear-gradient(145deg,#001445_0%,#00286a_58%,#0b4ea1_100%)] p-4 shadow-[0_14px_26px_rgba(0,20,80,0.34)]">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ffe39f] uppercase">Action Bay</p>
              <Button
                variant="storm"
                className="w-full justify-start"
                disabled={isLoading}
                onClick={() => {
                  void loadExpenses();
                }}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Queue
              </Button>
              <Button
                variant="storm"
                className="w-full justify-start"
                disabled={isSubmitting || reviewableSelectedExpenses.length === 0}
                onClick={() => {
                  void handleBatchDecision('APPROVED');
                }}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Approve Selected
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
                disabled={isSubmitting || reviewableSelectedExpenses.length === 0}
                onClick={() => {
                  void handleBatchDecision('REJECTED');
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Reject Selected
              </Button>
              <div className="rounded-lg border border-white/25 bg-white/10 px-3 py-2">
                <p className="text-xs text-blue-100">Requires Approval</p>
                <p className="text-lg font-semibold text-blue-50">{requiresApprovalCount}</p>
              </div>
            </aside>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Card className="border-[#ffc038] rounded-[1rem] sm:col-span-2 xl:col-span-2">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Ledger Items</p>
                <p className="text-lg font-semibold">{summary.itemCount}</p>
              </CardContent>
            </Card>
            <Card className="border-[#ffc038] rounded-[1rem]">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Total Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card className="border-[#ffc038] rounded-[1rem]">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Pending Review</p>
                <p className="text-lg font-semibold">{pendingReviewCount}</p>
              </CardContent>
            </Card>
            <Card className="border-[#ffc038] rounded-[1rem]">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Requires Approval</p>
                <p className="text-lg font-semibold">{requiresApprovalCount}</p>
              </CardContent>
            </Card>
            <Card className="border-[#ffc038] rounded-[1rem]">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Approved</p>
                <p className="text-lg font-semibold">{summary.approvedCount}</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={filteredExpenses}
          keyExtractor={(expense) => expense.id}
          isLoading={isLoading}
          emptyMessage="No expenses found for the selected filters."
        />
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-blue-100">
            Loading expense reports...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-blue-100">
            No expenses found for the selected filters.
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{expense.contractor_name ?? expense.contractor_id}</p>
                    <p className="text-xs text-blue-100">{formatDate(expense.expense_date)}</p>
                  </div>
                  <StatusBadge
                    status={expense.report_status}
                    variant={toStatusVariant(expense.report_status)}
                    size="sm"
                  />
                </div>

                <p className="text-sm">{expense.description}</p>
                <p className="text-xs text-blue-100">
                  {toCategoryLabel(expense.category)}
                  {expense.ticket_number ? ` • ${expense.ticket_number}` : ''}
                </p>

                {expense.policy_flags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {expense.policy_flags.map((flag) => (
                      <Badge key={`${expense.id}-mobile-${flag}`} variant="outline">
                        {toFlagLabel(flag)}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t pt-2">
                  <p className="text-sm font-semibold">{formatCurrency(expense.amount)}</p>
                  {REVIEWABLE_STATUSES.has(expense.report_status) ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="storm"
                        disabled={isSubmitting}
                        onClick={() => {
                          void handleSingleDecision(expense, 'APPROVED');
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isSubmitting}
                        onClick={() => {
                          void handleSingleDecision(expense, 'REJECTED');
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-blue-100">Reviewed</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
