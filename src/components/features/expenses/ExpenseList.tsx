'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Receipt, RefreshCw } from 'lucide-react';

import { DataTable, type Column } from '@/components/common/data-display/DataTable';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  expenseSubmissionService,
  type ExpenseListItem,
} from '@/lib/services/expenseSubmissionService';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { calculateExpenseSummary } from '@/lib/utils/expenses';
import type { ExpenseStatus } from '@/types';

type ExpenseStatusFilter = ExpenseStatus | 'ALL';

interface ExpenseListProps {
  contractorId?: string;
}

function parseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to load expenses.';
}

function toCategoryLabel(category: string): string {
  return category
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

export function ExpenseList({ contractorId }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ExpenseStatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadExpenses = useCallback(async () => {
    if (!contractorId) {
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await expenseSubmissionService.listExpenses({
        contractorId,
        status: statusFilter,
      });
      setExpenses(data);
    } catch (loadError) {
      setExpenses([]);
      setError(parseError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, contractorId]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return expenses;
    }

    return expenses.filter((expense) => {
      const searchable = [
        expense.description,
        expense.category,
        expense.ticket_number,
        expense.ticket_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [expenses, searchTerm]);

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

  const columns = useMemo<Column<ExpenseListItem>[]>(
    () => [
      {
        key: 'expense_date',
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
        key: 'receipt',
        header: 'Receipt',
        cell: (expense) =>
          expense.receipt_url ? (
            <span className="text-xs text-emerald-700">Attached</span>
          ) : (
            <span className="text-xs text-slate-500">None</span>
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
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Search category, description, ticket"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Select
                value={statusFilter}
                onValueChange={(nextValue) => setStatusFilter(nextValue as ExpenseStatusFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
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
                Refresh
              </Button>
              <Button asChild>
                <Link href="/contractor/expenses/create">
                  <Plus className="mr-2 h-4 w-4" />
                  New Expense
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Items</p>
                <p className="text-lg font-semibold">{summary.itemCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Total Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Current Month</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.currentMonthAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-lg font-semibold">{summary.pendingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Approved</p>
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
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-slate-500">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-slate-500">
            No expenses found for the selected filters.
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{toCategoryLabel(expense.category)}</p>
                  <StatusBadge
                    status={expense.report_status}
                    variant={toStatusVariant(expense.report_status)}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-slate-500">{formatDate(expense.expense_date)}</p>
                <p className="text-sm">{expense.description}</p>
                {expense.ticket_number ? (
                  <p className="text-xs text-slate-500">Ticket: {expense.ticket_number}</p>
                ) : null}
                <div className="flex items-center justify-between border-t pt-2">
                  <p className="text-sm font-semibold">{formatCurrency(expense.amount)}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <Receipt className="h-3.5 w-3.5" />
                    {expense.receipt_url ? 'Receipt attached' : 'No receipt'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
