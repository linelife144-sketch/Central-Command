import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ stormEventId: 'storm-a' as string | undefined, metrics: vi.fn(), report: vi.fn(), recent: vi.fn(), payroll: vi.fn(), claims: vi.fn(), expenses: vi.fn(), roster: vi.fn(), contractors: vi.fn() }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ can: () => true }) }));
vi.mock('@/components/providers/StormContextProvider', () => ({ useStormContext: () => ({ stormEventId: mocks.stormEventId, ready: true, selectedStorm: { id: mocks.stormEventId, name: 'Alpha', eventCode: 'AL', status: 'ACTIVE', startDate: '2026-10-01', activeTickets: 2, utilityClient: 'Utility' } }) }));
vi.mock('@/lib/services/dashboardReportingService', () => ({ dashboardReportingService: { getDashboardMetrics: mocks.metrics, getReport: mocks.report } }));
vi.mock('@/lib/services/dashboardTicketService', () => ({ dashboardTicketService: { getRecentTickets: mocks.recent } }));
vi.mock('@/lib/services/payrollService', () => ({ payrollService: { getPayrollSummary: mocks.payroll, listVehicleClaims: mocks.claims } }));
vi.mock('@/lib/services/expenseProcessingService', () => ({ expenseProcessingService: { listReviewItems: mocks.expenses } }));
vi.mock('@/lib/services/stormRosterService', () => ({ stormRosterService: { list: mocks.roster } }));
vi.mock('@/lib/services/contractorService', () => ({ contractorService: { listContractors: mocks.contractors } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => true }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { DashboardMetrics } from './DashboardMetrics';
import { DashboardRecentTickets } from './DashboardRecentTickets';
import { PayrollSummaryCard } from './PayrollSummaryCard';
import { ExpensesSummaryCard } from './ExpensesSummaryCard';
import { StormEventBanner } from './StormEventBanner';
import { ReportsDashboard } from './ReportsDashboard';

beforeEach(() => {
  mocks.stormEventId = 'storm-a';
  mocks.metrics.mockResolvedValue({ active_tickets: 2, total_tickets: 2, on_site_crews: 1, pending_reviews_total: 0, status_breakdown: {} });
  mocks.recent.mockResolvedValue([]); mocks.expenses.mockResolvedValue([]); mocks.claims.mockResolvedValue([]);
  mocks.roster.mockResolvedValue([{ contractorId: 'a' }, { contractorId: 'b' }]); mocks.contractors.mockResolvedValue([]);
  mocks.payroll.mockResolvedValue({ periodStart: '2026-10-01', periodEnd: '2026-10-09', generatedAt: '2026-10-09', totals: { totalPayout: 400, contractorCount: 2, entryCount: 1 } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('primary dashboard scoped readback', () => {
  it('uses the shared storm in the Reports dashboard', async () => {
    mocks.report.mockResolvedValue({ totals: {}, series: [], contractors: [] });
    render(<ReportsDashboard />);
    await waitFor(() => expect(mocks.report).toHaveBeenCalled());
    expect(mocks.report).toHaveBeenCalledWith(expect.objectContaining({ stormEventId: 'storm-a' }));
  });
  it('uses one storm for metrics, roster, recent work, payroll, claims, and expenses', async () => {
    render(<><StormEventBanner /><DashboardMetrics /><DashboardRecentTickets /><PayrollSummaryCard /><ExpensesSummaryCard /></>);
    await waitFor(() => expect(mocks.payroll).toHaveBeenCalled());
    expect(mocks.metrics).toHaveBeenCalledWith({ stormEventId: 'storm-a' });
    expect(mocks.recent).toHaveBeenCalledWith(8, { stormEventId: 'storm-a' });
    expect(mocks.payroll).toHaveBeenCalledWith(expect.objectContaining({ stormEventId: 'storm-a' }));
    expect(mocks.claims).toHaveBeenCalledWith({ stormEventId: 'storm-a' });
    expect(mocks.expenses).toHaveBeenCalledWith({ status: 'SUBMITTED', stormEventId: 'storm-a' });
    expect(mocks.expenses).toHaveBeenCalledWith({ status: 'UNDER_REVIEW', stormEventId: 'storm-a' });
    expect(mocks.roster).toHaveBeenCalledWith('storm-a');
    expect(mocks.contractors).not.toHaveBeenCalled();
  });

  it('does not let a late previous-storm recent-ticket response restore old work', async () => {
    let finish!: (rows: { id: string; ticketNumber: string; location: string; assignedTo: string; status: string; dueAt: string }[]) => void;
    mocks.recent.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const mounted = render(<DashboardRecentTickets />);
    await waitFor(() => expect(mocks.recent).toHaveBeenCalledTimes(1));
    mocks.stormEventId = 'storm-b'; mocks.recent.mockResolvedValue([]);
    mounted.rerender(<DashboardRecentTickets />);
    await waitFor(() => expect(mocks.recent).toHaveBeenCalledTimes(2));
    await act(async () => finish([{ id: 'old', ticketNumber: 'OLD-STORM', location: '', assignedTo: '', status: 'DRAFT', dueAt: '' }]));
    expect(screen.queryByText('OLD-STORM')).toBeNull();
  });
});
