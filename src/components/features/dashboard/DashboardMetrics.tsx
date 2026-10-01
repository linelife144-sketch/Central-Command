'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Loader2, RefreshCw, Ticket, Users } from 'lucide-react';

import { MetricCard } from '@/components/common/data-display/MetricCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  dashboardReportingService,
  type DashboardMetricsData,
} from '@/lib/services/dashboardReportingService';
import { GRID_TICKETS_CHANGED_EVENT, GRID_TICKETS_VERSION_KEY } from '@/lib/tickets/events';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface DashboardMetricsProps {
  className?: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to load dashboard metrics.';
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

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void loadMetrics('refresh'); }, 250);
    };
    let channel: ReturnType<typeof supabase.channel> | undefined;
    if (!isSuperAdminTestingEnabled()) {
      channel = supabase.channel('dashboard-live-metrics');
      for (const table of ['tickets', 'time_entries', 'expense_reports', 'damage_assessments', 'contractors']) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh);
      }
      channel.subscribe();
    }
    const fallback = window.setInterval(scheduleRefresh, 30000);

    return () => {
      window.clearInterval(fallback);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (channel) void supabase.removeChannel(channel);
      window.removeEventListener(GRID_TICKETS_CHANGED_EVENT, handleTicketsChanged);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, [loadMetrics]);

  const activeTicketsValue = metrics?.active_tickets ?? (isLoading ? '...' : 'Unavailable');
  const fieldCrewsValue = metrics?.field_crews ?? (isLoading ? '...' : 'Unavailable');
  const reviewsUnavailable = Boolean(metrics?.unavailable_metrics?.length);
  const pendingReviewValue = reviewsUnavailable ? 'Unavailable' : metrics?.pending_reviews_total ?? (isLoading ? '...' : 'Unavailable');

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

      {metrics?.unavailable_metrics?.length ? <Alert><AlertDescription>Some metrics could not be loaded: {metrics.unavailable_metrics.join(', ')}. Ticket and crew counts are current.</AlertDescription></Alert> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Active Tickets"
          value={activeTicketsValue}
          icon={<Ticket className="h-4 w-4 text-grid-lightning" />}
          description="Open lifecycle workload"
        />

        <MetricCard
          title="Active Contractor Crews"
          value={fieldCrewsValue}
          icon={<Users className="h-4 w-4 text-grid-lightning" />}
          description={metrics ? `${metrics.on_site_crews} on site · assigned to active tickets` : 'Active assignments'}
          variant="accent"
        />

        <MetricCard
          title="Pending Reviews"
          value={pendingReviewValue}
          icon={<Clock className="h-4 w-4 text-grid-lightning" />}
          description={
            reviewsUnavailable
              ? 'Review total unavailable until all review sources can be read'
              : metrics
              ? `${metrics.pending_tickets} tickets, ${metrics.pending_time_entries} time, ${metrics.pending_expense_reports} expense, ${metrics.pending_assessments} assessments`
              : 'Time, expense, and assessment approvals'
          }
          variant="warning"
        />


      </div>

      <Card className="storm-surface">
        <CardContent className="grid grid-cols-2 gap-3 pt-6 text-sm md:grid-cols-4">
          <div className="storm-mini-stat rounded-md p-3">
            <p className="text-xs font-semibold tracking-wide text-[#14213d]">In Route</p>
            <p className="text-lg font-bold text-[#0a1733]">{metrics?.status_breakdown.in_route ?? (isLoading ? '...' : 'Unavailable')}</p>
          </div>
          <div className="storm-mini-stat rounded-md p-3">
            <p className="text-xs font-semibold tracking-wide text-[#14213d]">On Site</p>
            <p className="text-lg font-bold text-[#0a1733]">{metrics?.status_breakdown.on_site ?? (isLoading ? '...' : 'Unavailable')}</p>
          </div>
          <div className="storm-mini-stat rounded-md p-3">
            <p className="text-xs font-semibold tracking-wide text-[#14213d]">Pending Review</p>
            <p className="text-lg font-bold text-[#0a1733]">
              {metrics?.status_breakdown.pending_review ?? (isLoading ? '...' : 'Unavailable')}
            </p>
          </div>
          <div className="storm-mini-stat rounded-md p-3">
            <p className="text-xs font-semibold tracking-wide text-[#14213d]">Unassigned</p>
            <p className="text-lg font-bold text-[#0a1733]">{metrics?.status_breakdown.unassigned ?? (isLoading ? '...' : 'Unavailable')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
