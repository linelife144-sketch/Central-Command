import { describe, expect, it } from 'vitest';

import {
  buildDashboardMetrics,
  buildDashboardReport,
  buildReportExportArtifact,
  createDashboardReportingService,
} from './dashboardReportingService';

describe('dashboardReportingService', () => {
  it('builds dashboard metrics from ticket, review, and invoice inputs', () => {
    const metrics = buildDashboardMetrics({
      now: new Date('2026-02-15T12:00:00.000Z'),
      tickets: [
        {
          id: 'ticket-1',
          status: 'IN_ROUTE',
          assigned_to: 'sub-1',
          created_at: '2026-02-15T10:00:00.000Z',
          is_deleted: false,
        },
        {
          id: 'ticket-2',
          status: 'ON_SITE',
          assigned_to: 'sub-2',
          created_at: '2026-02-14T10:00:00.000Z',
          is_deleted: false,
        },
        {
          id: 'ticket-3',
          status: 'PENDING_REVIEW',
          assigned_to: null,
          created_at: '2026-02-13T10:00:00.000Z',
          is_deleted: false,
        },
        {
          id: 'ticket-4',
          status: 'CLOSED',
          assigned_to: 'sub-3',
          created_at: '2026-02-13T10:00:00.000Z',
          is_deleted: false,
        },
      ],
      pendingTimeEntries: 4,
      pendingExpenseReports: 3,
      pendingAssessments: 2,
      invoicesForTrend: [
        {
          id: 'inv-1',
          contractor_id: 'sub-1',
          status: 'APPROVED',
          total_amount: 1000,
          created_at: '2026-02-05T10:00:00.000Z',
        },
        {
          id: 'inv-2',
          contractor_id: 'sub-2',
          status: 'VOID',
          total_amount: 500,
          created_at: '2026-02-10T10:00:00.000Z',
        },
        {
          id: 'inv-3',
          contractor_id: 'sub-3',
          status: 'PAID',
          total_amount: 500,
          created_at: '2026-01-10T10:00:00.000Z',
        },
      ],
    });

    expect(metrics.active_tickets).toBe(3);
    expect(metrics.field_crews).toBe(2);
    expect(metrics.on_site_crews).toBe(1);
    expect(metrics.pending_reviews_total).toBe(9);
    expect(metrics.status_breakdown.in_route).toBe(1);
    expect(metrics.status_breakdown.on_site).toBe(1);
    expect(metrics.status_breakdown.pending_review).toBe(1);
    expect(metrics.status_breakdown.unassigned).toBe(1);
    expect(metrics.revenue_mtd).toBe(1000);
    expect(metrics.revenue_previous_mtd).toBe(500);
    expect(metrics.revenue_trend_percent).toBe(100);
    expect(metrics.invoices_generated_mtd).toBe(1);
  });

  it('builds grouped report data with contractor totals', () => {
    const report = buildDashboardReport({
      now: new Date('2026-02-14T12:00:00.000Z'),
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2026-02-14T23:59:59.000Z'),
      groupBy: 'week',
      tickets: [
        {
          id: 'ticket-1',
          status: 'ASSIGNED',
          assigned_to: 'sub-1',
          created_at: '2026-02-01T10:00:00.000Z',
          is_deleted: false,
        },
        {
          id: 'ticket-2',
          status: 'IN_ROUTE',
          assigned_to: 'sub-2',
          created_at: '2026-02-08T10:00:00.000Z',
          is_deleted: false,
        },
      ],
      timeEntries: [
        {
          id: 'time-1',
          contractor_id: 'sub-1',
          status: 'APPROVED',
          billable_amount: 200,
          clock_in_at: '2026-02-02T08:00:00.000Z',
        },
        {
          id: 'time-2',
          contractor_id: 'sub-1',
          status: 'PENDING',
          billable_amount: 120,
          clock_in_at: '2026-02-03T09:00:00.000Z',
        },
      ],
      expenseReports: [
        {
          id: 'expense-1',
          contractor_id: 'sub-2',
          status: 'APPROVED',
          total_amount: 50,
          report_period_start: '2026-02-01',
          report_period_end: '2026-02-04',
          reviewed_at: '2026-02-04T12:00:00.000Z',
        },
        {
          id: 'expense-2',
          contractor_id: 'sub-2',
          status: 'SUBMITTED',
          total_amount: 25,
          report_period_start: '2026-02-04',
          report_period_end: '2026-02-05',
          reviewed_at: null,
        },
      ],
      invoices: [
        {
          id: 'inv-1',
          contractor_id: 'sub-1',
          status: 'APPROVED',
          total_amount: 300,
          created_at: '2026-02-06T10:00:00.000Z',
        },
        {
          id: 'inv-2',
          contractor_id: 'sub-2',
          status: 'VOID',
          total_amount: 999,
          created_at: '2026-02-07T10:00:00.000Z',
        },
      ],
      contractorNameById: new Map([
        ['sub-1', 'John Smith'],
        ['sub-2', 'Maria Johnson'],
      ]),
    });

    expect(report.totals.tickets_created).toBe(2);
    expect(report.totals.approved_time_amount).toBe(200);
    expect(report.totals.approved_expense_amount).toBe(50);
    expect(report.totals.invoiced_amount).toBe(300);
    expect(report.totals.pending_reviews).toBe(2);
    expect(report.series.length).toBeGreaterThan(0);

    const sub1 = report.contractors.find((row) => row.contractor_id === 'sub-1');
    const sub2 = report.contractors.find((row) => row.contractor_id === 'sub-2');

    expect(sub1).toBeDefined();
    expect(sub1?.approved_time_amount).toBe(200);
    expect(sub1?.invoiced_amount).toBe(300);
    expect(sub1?.pending_reviews).toBe(1);

    expect(sub2).toBeDefined();
    expect(sub2?.approved_expense_amount).toBe(50);
    expect(sub2?.invoiced_amount).toBe(0);
    expect(sub2?.pending_reviews).toBe(1);
  });

  it('creates CSV/Excel/PDF report export artifacts', () => {
    const report = buildDashboardReport({
      now: new Date('2026-02-14T12:00:00.000Z'),
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2026-02-14T23:59:59.000Z'),
      groupBy: 'day',
      tickets: [],
      timeEntries: [],
      expenseReports: [],
      invoices: [],
      contractorNameById: new Map(),
    });

    const csv = buildReportExportArtifact(report, 'CSV', new Date('2026-02-14T12:00:00.000Z'));
    expect(csv.fileName.endsWith('.csv')).toBe(true);
    expect(csv.mimeType).toBe('text/csv');
    expect(typeof csv.content).toBe('string');
    expect(String(csv.content)).toContain('Tickets Created');

    const excel = buildReportExportArtifact(report, 'EXCEL', new Date('2026-02-14T12:00:00.000Z'));
    expect(excel.fileName.endsWith('.xls')).toBe(true);
    expect(excel.mimeType).toBe('application/vnd.ms-excel');
    expect(typeof excel.content).toBe('string');
    expect(String(excel.content)).toContain('Summary');

    const pdf = buildReportExportArtifact(report, 'PDF', new Date('2026-02-14T12:00:00.000Z'));
    expect(pdf.fileName.endsWith('.pdf')).toBe(true);
    expect(pdf.mimeType).toBe('application/pdf');
    expect(pdf.content).toBeInstanceOf(Uint8Array);

    const header = new TextDecoder().decode((pdf.content as Uint8Array).slice(0, 8));
    expect(header).toContain('%PDF-1.4');
  });

  it('rejects invalid report date ranges before fetching data', async () => {
    const service = createDashboardReportingService();

    await expect(
      service.getReport({
        startDate: '2026-02-15',
        endDate: '2026-02-01',
        groupBy: 'week',
      }),
    ).rejects.toThrow('Report end date must be on or after the start date.');
  });
});
