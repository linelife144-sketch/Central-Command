import { describe, expect, it } from 'vitest';

import type { DashboardMetricsData } from '@/lib/services/dashboardReportingService';
import type { Ticket } from '@/types';

import {
  buildAdminRoleSignalCounts,
  buildContractorRoleSignalCounts,
  buildNavigationSignals,
  loadRoleSignalCounts,
} from './useNavigationSignals';

describe('useNavigationSignals helpers', () => {
  it('builds admin signal counts from dashboard metrics', () => {
    const counts = buildAdminRoleSignalCounts({
      generated_at: new Date().toISOString(),
      active_tickets: 12,
      field_crews: 4,
      on_site_crews: 2,
      pending_reviews_total: 5,
      pending_time_entries: 2,
      pending_expense_reports: 1,
      pending_assessments: 2,
      revenue_mtd: 0,
      revenue_previous_mtd: 0,
      revenue_trend_percent: 0,
      invoices_generated_mtd: 0,
      status_breakdown: {
        in_route: 3,
        on_site: 2,
        pending_review: 4,
        unassigned: 1,
      },
    } satisfies DashboardMetricsData);

    expect(counts).toEqual({
      tickets: 12,
      reviews: 5,
      storms: 5,
    });
  });

  it('builds contractor counts from ticket statuses', () => {
    const counts = buildContractorRoleSignalCounts([
      { status: 'ASSIGNED' },
      { status: 'PENDING_REVIEW' },
      { status: 'NEEDS_REWORK' },
      { status: 'CLOSED' },
    ] as unknown as Ticket[]);

    expect(counts).toEqual({
      tickets: 3,
      reviews: 2,
      storms: 0,
    });
  });

  it('loads contractor counts with graceful fallback on service failure', async () => {
    const counts = await loadRoleSignalCounts({
      userRole: 'contractor',
      contractorId: 'contractor-1',
      loadContractorTickets: async () => {
        throw new Error('network');
      },
    });

    expect(counts).toEqual({
      tickets: 0,
      reviews: 0,
      storms: 0,
    });
  });

  it('merges sync snapshot and role counts into navigation signals', () => {
    const signals = buildNavigationSignals(
      { tickets: 7, reviews: 2, storms: 1 },
      {
        isOnline: false,
        syncState: 'idle',
        pendingCount: 3,
        failedCount: 1,
        pendingPhotoCount: 0,
        pendingTimeEntryCount: 0,
        conflictCount: 2,
      }
    );

    expect(signals).toEqual({
      counts: {
        tickets: 7,
        reviews: 2,
        storms: 1,
        sync: 4,
        conflicts: 2,
      },
      notificationCount: 5,
      hasAttention: true,
      isOnline: false,
    });
  });
});
