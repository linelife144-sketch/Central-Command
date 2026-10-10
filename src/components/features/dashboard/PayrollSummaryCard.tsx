'use client';

import { useStormContext } from '@/components/providers/StormContextProvider';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, RefreshCw, Wallet } from 'lucide-react';

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
import { payrollService } from '@/lib/services/payrollService';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

interface PayrollSummaryCardProps {
  className?: string;
}

interface PayrollCardModel {
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  totalPayout: number;
  approvedPayout: number | null;
  contractorCount: number;
  entryCount: number;
  pendingClaims: number;
  claimsFailed: boolean;
}

const ERROR_COPY = 'Unable to load payroll summary.';

export function PayrollSummaryCard({ className }: PayrollSummaryCardProps) {
  const { can } = useAuth();
  const { stormEventId, selectedStorm } = useStormContext();
  const startDate = selectedStorm?.startDate;
  const request = useRef(0);
  const cancelRequests = useCallback(() => { request.current++; }, []);
  const [model, setModel] = useState<PayrollCardModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const version = ++request.current;
    setError(null);

    try {
      const [summary, claimsResult] = await Promise.all([
        payrollService.getPayrollSummary({ includeFinancial: false, stormEventId, from: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined, to: new Date().toISOString() }),
        payrollService.listVehicleClaims({ stormEventId }).then(
          (claims) => {
            // VehicleClaimStatus is PENDING | APPROVED | REJECTED; the waiting
            // claim count is PENDING (the spec's SUBMITTED/UNDER_REVIEW statuses
            // do not exist on vehicle claims).
            const pendingClaims = claims.filter(
              (claim) => claim.status === 'PENDING',
            ).length;
            return { pendingClaims, failed: false as const };
          },
          () => ({ pendingClaims: null, failed: true as const }),
        ),
      ]);

      if (version !== request.current) return;
      setModel({
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        generatedAt: summary.generatedAt,
        totalPayout: summary.totals.totalPayout,
        approvedPayout: summary.totals.approvedPayout ?? null,
        contractorCount: summary.totals.contractorCount,
        entryCount: summary.totals.entryCount,
        pendingClaims: claimsResult.pendingClaims ?? 0,
        claimsFailed: claimsResult.failed,
      });
    } catch {
      if (version !== request.current) return;
      setError(ERROR_COPY);
      if (mode === 'initial') {
        setModel(null);
      }
    } finally {
      if (version !== request.current) return;
      if (mode === 'refresh') {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [stormEventId, startDate]);

  useEffect(() => {
    if (!can('admin.payroll.view')) {
      return;
    }

    let active = true;
    void (async () => {
      if (!active) return;
      await load('initial');
    })();
    return () => {
      active = false; cancelRequests();
    };
  }, [can, load, cancelRequests]);

  if (!can('admin.payroll.view')) {
    return null;
  }

  if (isLoading && model === null) {
    return (
      <Card className={cn('p-6', className)} aria-busy="true">
        <span className="sr-only">Loading payroll summary</span>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-7 w-40" />
        <Skeleton className="mt-4 h-4 w-64" />
        <Skeleton className="mt-2 h-4 w-56" />
        <Skeleton className="mt-2 h-4 w-48" />
      </Card>
    );
  }

  const empty =
    model !== null && !model.claimsFailed && model.entryCount === 0 && model.pendingClaims === 0;

  const statusBadge = model
    ? empty
      ? { label: 'No entries', variant: 'outline' as const }
      : model.pendingClaims > 0
        ? { label: 'Claims waiting', variant: 'secondary' as const }
        : { label: 'Current period', variant: 'default' as const }
    : null;

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4 text-grid-lightning" aria-hidden="true" />
          Payroll
        </CardTitle>
        <div className="flex items-center gap-1">
          {statusBadge ? (
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isRefreshing}
            aria-label="Refresh payroll summary"
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
            No payroll entries in the current period.
          </p>
        ) : model ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Period</dt>
              <dd className="font-medium text-[#0a1733]">
                {formatDate(model.periodStart)} – {formatDate(model.periodEnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Total payout</dt>
              <dd className="font-medium text-[#0a1733]">
                {formatCurrency(model.totalPayout)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Approved payout</dt>
              <dd className="font-medium text-[#0a1733]">
                {model.approvedPayout === null ? '—' : formatCurrency(model.approvedPayout)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Contractors</dt>
              <dd className="font-medium text-[#0a1733]">{model.contractorCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Time entries</dt>
              <dd className="font-medium text-[#0a1733]">{model.entryCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Vehicle claims waiting</dt>
              <dd className="font-medium text-[#0a1733]">
                {model.claimsFailed ? 'Unavailable' : model.pendingClaims}
              </dd>
            </div>
          </dl>
        ) : null}
      </CardContent>
      <CardFooter className="pt-4">
        <Button asChild variant="ghost" size="sm" className="px-2">
          <Link href="/admin/payroll">
            Open payroll
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
