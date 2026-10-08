'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, ReceiptText, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/AuthProvider';
import { expenseProcessingService } from '@/lib/services/expenseProcessingService';
import type { ExpenseListItem } from '@/lib/services/expenseSubmissionService';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

interface ExpensesSummaryCardProps {
  className?: string;
}

interface ExpenseActivity {
  id: string;
  reportId: string;
  contractorName: string;
  amount: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW';
  updatedAt: string;
}

interface ExpensesCardModel {
  pendingReportCount: number;
  pendingAmount: number;
  recent: ExpenseActivity[];
}

const ERROR_COPY = 'Unable to load expense reviews.';
const PENDING_STATUSES = new Set(['SUBMITTED', 'UNDER_REVIEW']);

function normalizeAmount(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toActivity(item: ExpenseListItem): ExpenseActivity {
  return {
    id: item.id,
    reportId: item.expense_report_id,
    contractorName:
      typeof item.contractor_name === 'string' && item.contractor_name.trim().length > 0
        ? item.contractor_name
        : 'Contractor',
    amount: normalizeAmount(item.amount),
    status: item.report_status === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : 'SUBMITTED',
    updatedAt: item.updated_at,
  };
}

function buildExpensesCard(
  submittedItems: ExpenseListItem[],
  underReviewItems: ExpenseListItem[],
): ExpensesCardModel {
  const byId = new Map<string, ExpenseListItem>();
  for (const item of [...submittedItems, ...underReviewItems]) {
    byId.set(item.id, item);
  }

  const items = Array.from(byId.values()).filter((item) =>
    PENDING_STATUSES.has(item.report_status),
  );

  const reportIds = new Set(items.map((item) => item.expense_report_id));
  const pendingAmount = roundCurrency(
    items.reduce((sum, item) => sum + normalizeAmount(item.amount), 0),
  );

  const recent = [...items]
    .sort(
      (a, b) =>
        Date.parse(b.updated_at) - Date.parse(a.updated_at),
    )
    .slice(0, 3)
    .map(toActivity);

  return {
    pendingReportCount: reportIds.size,
    pendingAmount,
    recent,
  };
}

export function ExpensesSummaryCard({ className }: ExpensesSummaryCardProps) {
  const { can } = useAuth();
  const [model, setModel] = useState<ExpensesCardModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const [submittedItems, underReviewItems] = await Promise.all([
        expenseProcessingService.listReviewItems({ status: 'SUBMITTED' }),
        expenseProcessingService.listReviewItems({ status: 'UNDER_REVIEW' }),
      ]);

      setModel(buildExpensesCard(submittedItems, underReviewItems));
    } catch {
      setError(ERROR_COPY);
      if (mode === 'initial') {
        setModel(null);
      }
    } finally {
      if (mode === 'refresh') {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!can('admin.expenses.view')) {
      setIsLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      if (!active) return;
      await load('initial');
    })();
    return () => {
      active = false;
    };
  }, [can, load]);

  if (!can('admin.expenses.view')) {
    return null;
  }

  if (isLoading && model === null) {
    return (
      <Card className={cn('p-6', className)} aria-busy="true">
        <span className="sr-only">Loading expense summary</span>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-7 w-40" />
        <Skeleton className="mt-4 h-4 w-64" />
        <Skeleton className="mt-2 h-4 w-56" />
      </Card>
    );
  }

  const empty = model !== null && model.pendingReportCount === 0;

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="size-4 text-grid-lightning" aria-hidden="true" />
          Expenses
        </CardTitle>
        <div className="flex items-center gap-1">
          {!empty && model ? <Badge variant="warning">Pending</Badge> : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isRefreshing}
            aria-label="Refresh expense summary"
            onClick={() => {
              void load('refresh');
            }}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pb-0">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{ERROR_COPY}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                onClick={() => {
                  void load('refresh');
                }}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : empty ? (
          <p className="text-sm text-muted-foreground">
            No expense reports are waiting for review.
          </p>
        ) : model ? (
          <>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Pending reports</dt>
                <dd className="font-medium text-[#0a1733]">{model.pendingReportCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Pending amount</dt>
                <dd className="font-medium text-[#0a1733]">
                  {formatCurrency(model.pendingAmount)}
                </dd>
              </div>
            </dl>
            {model.recent.length > 0 && (
              <div className="space-y-1.5 border-t pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent activity
                </p>
                <ul className="space-y-1.5 text-sm">
                  {model.recent.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5"
                    >
                      <span className="font-medium text-[#0a1733]">
                        {activity.contractorName}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(activity.amount)} ·{' '}
                        {activity.status === 'UNDER_REVIEW' ? 'Under review' : 'Submitted'} ·{' '}
                        {formatDate(activity.updatedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
      <CardFooter className="pt-4">
        <Button asChild variant="ghost" size="sm" className="px-2">
          <Link href="/admin/expense-review">
            Review expenses
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
