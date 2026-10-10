import { describe, expect, it, vi } from 'vitest';
import { buildDashboardMetrics, buildReportExportArtifact, createDashboardReportingService } from './dashboardReportingService';

describe('dashboard storm boundaries', () => {
  it('passes the same explicit storm to ticket and every review source', async () => {
    const fetchTickets = vi.fn().mockResolvedValue([]);
    const fetchPendingTimeEntries = vi.fn().mockResolvedValue(1);
    const fetchPendingExpenseReports = vi.fn().mockResolvedValue(2);
    const fetchPendingAssessments = vi.fn().mockResolvedValue(3);
    const service = createDashboardReportingService({ fetchTickets, fetchPendingTimeEntries, fetchPendingExpenseReports, fetchPendingAssessments });
    const result = await service.getDashboardMetrics({ stormEventId: 'storm-a' });
    for (const source of [fetchTickets, fetchPendingTimeEntries, fetchPendingExpenseReports, fetchPendingAssessments]) expect(source).toHaveBeenCalledWith('storm-a');
    expect(result.pending_reviews_total).toBe(6);
  });

  it('counts crews by stable crew identity, excluding legacy individual assignments', () => {
    const ticket = { status: 'ON_SITE', created_at: '2026-10-09T12:00:00Z', is_deleted: false };
    const result = buildDashboardMetrics({ now: new Date(), pendingTimeEntries: 0, pendingExpenseReports: 0, pendingAssessments: 0,
      tickets: [{ ...ticket, id: '1', crew_id: 'crew-a', assigned_to: 'person-1' }, { ...ticket, id: '2', crew_id: 'crew-a', assigned_to: 'person-2' }, { ...ticket, id: '3', crew_id: null, assigned_to: 'legacy-person' }] });
    expect(result.field_crews).toBe(1);
    expect(result.on_site_crews).toBe(1);
  });

  it('carries the selected storm through report sources and CSV export', async () => {
    const fetchReportTickets = vi.fn().mockResolvedValue([]);
    const fetchReportTimeEntries = vi.fn().mockResolvedValue([]);
    const fetchReportExpenseReports = vi.fn().mockResolvedValue([]);
    const service = createDashboardReportingService({ fetchReportTickets, fetchReportTimeEntries, fetchReportExpenseReports, fetchContractorNames: async () => new Map() });
    const report = await service.getReport({ startDate: '2026-10-01', endDate: '2026-10-09', groupBy: 'day', stormEventId: 'storm-b' });
    for (const source of [fetchReportTickets, fetchReportTimeEntries, fetchReportExpenseReports]) expect(source.mock.calls[0][2]).toBe('storm-b');
    expect(report.storm_event_id).toBe('storm-b');
    expect(buildReportExportArtifact(report, 'CSV').content).toContain('storm-b');
  });
});
