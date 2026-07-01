'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, DollarSign, Loader2, RefreshCw, Ticket, Users } from 'lucide-react';

import { MetricCard } from '@/components/common/data-display/MetricCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  dashboardReportingService,
  type DashboardMetricsData,
} from '@/lib/services/dashboardReportingService';
import { GRID_TICKETS_CHANGED_EVENT, GRID_TICKETS_VERSION_KEY } from '@/lib/tickets/events';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';

interface DashboardMetricsProps {
  className?: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to load dashboard metrics.';
}

function formatSignedTrend(value: number): string {
  const rounded = Math.abs(value).toFixed(1);
  return `${rounded}%`;
}

export function DashboardMetrics({ className }: DashboardMetricsProps) {
  const [metrics, setMetrics] = useState<DashboardMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMetrics = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const nextMetrics = await dashboardReportingService.getDashboardMetrics();
      setMetrics(nextMetrics);
    } catch (loadError) {
      setMetrics(null);
      setError(toErrorMessage(loadError));
    } finally {
      if (mode === 'refresh') {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadMetrics('initial');
  }, [loadMetrics]);

  useEffect(() => {
    const handleTicketsChanged = () => {
      void loadMetrics('refresh');
    };

    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === GRID_TICKETS_VERSION_KEY) {
        void loadMetrics('refresh');
      }
    };

    window.addEventListener(GRID_TICKETS_CHANGED_EVENT, handleTicketsChanged);
    window.addEventListener('storage', handleStorageSync);

    return () => {
      window.removeEventListener(GRID_TICKETS_CHANGED_EVENT, handleTicketsChanged);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, [loadMetrics]);

  const revenueTrendDirection = useMemo<'up' | 'down' | 'neutral'>(() => {
    if (!metrics) {
      return 'neutral';
    }

    if (metrics.revenue_trend_percent > 0) {
      return 'up';
    }

    if (metrics.revenue_trend_percent < 0) {
      return 'down';
    }

    return 'neutral';
  }, [metrics]);

  const activeTicketsValue = metrics?.active_tickets ?? (isLoading ? '...' : 0);
  const fieldCrewsValue = metrics?.field_crews ?? (isLoading ? '...' : 0);
  const pendingReviewValue = metrics?.pending_reviews_total ?? (isLoading ? '...' : 0);
  const revenueValue = metrics ? formatCurrency(metrics.revenue_mtd) : isLoading ? '...' : formatCurrency(0);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-end">
        <Button
          variant="storm"
          size="sm"
          disabled={isRefreshing || isLoading}
          onClick={() => {
            void loadMetrics('refresh');
          }}
        >
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh Metrics
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active Tickets"
          value={activeTicketsValue}
          icon={<Ticket className="h-4 w-4 text-grid-lightning" />}
          description="Open lifecycle workload"
        />

        <MetricCard
          title="Field Crews"
          value={fieldCrewsValue}
          icon={<Users className="h-4 w-4 text-grid-lightning" />}
          description={metrics ? `${metrics.on_site_crews} currently on site` : 'Active assignments'}
          variant="accent"
        />

        <MetricCard
          title="Pending Reviews"
          value={pendingReviewValue}
          icon={<Clock className="h-4 w-4 text-grid-lightning" />}
          description={
            metrics
              ? `${metrics.pending_time_entries} time, ${metrics.pending_expense_reports} expense, ${metrics.pending_assessments} assessments`
              : 'Time, expense, and assessment approvals'
          }
          variant="warning"
        />

        <MetricCard
          title="Revenue (MTD)"
          value={revenueValue}
          icon={<DollarSign className="h-4 w-4 text-grid-lightning" />}
          trend={revenueTrendDirection}
          trendValue={metrics ? formatSignedTrend(metrics.revenue_trend_percent) : undefined}
          description="vs previous month-to-date"
          variant="accent"
        />
      </div>

      <Card className="storm-surface">
        <CardContent className="grid grid-cols-2 gap-3 pt-6 text-sm md:grid-cols-4">
          <div className="storm-mini-stat rounded-md p-3">
            <p className="text-xs font-semibold tracking-wide text-[#14213d]">In Route</p>
            <p className="text-lg font-bold text-[#0a1733]">{metrics?.status_breakdown.in_route ?? (isLoading ? '...' : 0)}</p>
          </div>
          <div className="storm-mini-stat rounded-md p-3">
            <p className="text-xs font-semibold tracking-wide text-[#14213d]">On Site</p>
            <p className="text-lg font-bold text-[#0a1733]">{metrics?.status_breakdown.on_site ?? (isLoading ? '...' : 0)}</p>
          </div>
          <div className="storm-mini-stat rounded-md p-3">
            <p className="text-xs font-semibold tracking-wide text-[#14213d]">Pending Review</p>
            <p className="text-lg font-bold text-[#0a1733]">
              {metrics?.status_breakdown.pending_review ?? (isLoading ? '...' : 0)}
            </p>
          </div>
          <div className="storm-mini-stat rounded-md p-3">
            <p className="text-xs font-semibold tracking-wide text-[#14213d]">Unassigned</p>
            <p className="text-lg font-bold text-[#0a1733]">{metrics?.status_breakdown.unassigned ?? (isLoading ? '...' : 0)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
