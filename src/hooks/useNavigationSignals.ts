'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSync, type SyncSnapshot } from '@/components/providers/SyncProvider';
import { dashboardReportingService, type DashboardMetricsData } from '@/lib/services/dashboardReportingService';
import type { Ticket } from '@/types';

export type NavigationSignalKey = 'tickets' | 'reviews' | 'storms' | 'sync' | 'conflicts';

export interface RoleSignalCounts {
  tickets: number;
  reviews: number;
  storms: number;
}

export interface NavigationSignals {
  counts: Record<NavigationSignalKey, number>;
  notificationCount: number;
  hasAttention: boolean;
  isOnline: boolean;
}

interface UseNavigationSignalsOptions {
  userRole: 'admin' | 'contractor';
  contractorId?: string;
  pollIntervalMs?: number;
}

const ZERO_ROLE_COUNTS: RoleSignalCounts = {
  tickets: 0,
  reviews: 0,
  storms: 0,
};

function clampCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
}

export function buildAdminRoleSignalCounts(metrics: DashboardMetricsData): RoleSignalCounts {
  return {
    tickets: clampCount(metrics.active_tickets),
    reviews: clampCount(metrics.pending_reviews_total),
    storms: clampCount(metrics.status_breakdown.in_route + metrics.status_breakdown.on_site),
  };
}

export function buildContractorRoleSignalCounts(tickets: Ticket[]): RoleSignalCounts {
  const activeStatuses = new Set(['DRAFT', 'ASSIGNED', 'IN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PENDING_REVIEW', 'NEEDS_REWORK']);
  const reviewStatuses = new Set(['PENDING_REVIEW', 'NEEDS_REWORK']);

  let activeTicketCount = 0;
  let reviewCount = 0;

  for (const ticket of tickets) {
    if (activeStatuses.has(ticket.status)) {
      activeTicketCount += 1;
    }

    if (reviewStatuses.has(ticket.status)) {
      reviewCount += 1;
    }
  }

  return {
    tickets: clampCount(activeTicketCount),
    reviews: clampCount(reviewCount),
    storms: 0,
  };
}

interface LoadRoleSignalCountsOptions {
  userRole: 'admin' | 'contractor';
  contractorId?: string;
  loadAdminMetrics?: () => Promise<DashboardMetricsData>;
  loadContractorTickets?: (id: string) => Promise<Ticket[]>;
}

async function loadContractorTicketsByAssignee(id: string): Promise<Ticket[]> {
  const { ticketService } = await import('@/lib/services/ticketService');
  return ticketService.getTicketsByAssignee(id);
}

export async function loadRoleSignalCounts({
  userRole,
  contractorId,
  loadAdminMetrics = () => dashboardReportingService.getDashboardMetrics(),
  loadContractorTickets = loadContractorTicketsByAssignee,
}: LoadRoleSignalCountsOptions): Promise<RoleSignalCounts> {
  try {
    if (userRole === 'admin') {
      const metrics = await loadAdminMetrics();
      return buildAdminRoleSignalCounts(metrics);
    }

    if (!contractorId) {
      return ZERO_ROLE_COUNTS;
    }

    const tickets = await loadContractorTickets(contractorId);
    return buildContractorRoleSignalCounts(Array.isArray(tickets) ? tickets : []);
  } catch {
    return ZERO_ROLE_COUNTS;
  }
}

export function buildNavigationSignals(roleCounts: RoleSignalCounts, snapshot: SyncSnapshot): NavigationSignals {
  const syncCount = clampCount(snapshot.pendingCount + snapshot.failedCount);
  const conflictCount = clampCount(snapshot.conflictCount);
  const notificationCount = clampCount(roleCounts.reviews + snapshot.failedCount + conflictCount);

  return {
    counts: {
      tickets: roleCounts.tickets,
      reviews: roleCounts.reviews,
      storms: roleCounts.storms,
      sync: syncCount,
      conflicts: conflictCount,
    },
    notificationCount,
    hasAttention: notificationCount > 0 || syncCount > 0,
    isOnline: snapshot.isOnline,
  };
}

function readIsVisible(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.visibilityState === 'visible';
}

export function useNavigationSignals({
  userRole,
  contractorId,
  pollIntervalMs = 30000,
}: UseNavigationSignalsOptions) {
  const { snapshot } = useSync();
  const [roleCounts, setRoleCounts] = useState<RoleSignalCounts>(ZERO_ROLE_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState<boolean>(readIsVisible);

  const refresh = useCallback(async () => {
    const nextRoleCounts = await loadRoleSignalCounts({ userRole, contractorId });
    setRoleCounts(nextRoleCounts);
    setIsLoading(false);
  }, [contractorId, userRole]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      const nextIsVisible = readIsVisible();
      setIsVisible(nextIsVisible);
      if (nextIsVisible) {
        void refresh();
      }
    };

    const handleFocus = () => {
      setIsVisible(true);
      void refresh();
    };

    const handleBlur = () => {
      setIsVisible(readIsVisible());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [refresh]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isVisible, pollIntervalMs, refresh]);

  const signals = useMemo(() => buildNavigationSignals(roleCounts, snapshot), [roleCounts, snapshot]);

  return {
    signals,
    isLoading,
    refresh,
  };
}
