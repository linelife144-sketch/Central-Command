import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

export type ReportGroupBy = 'day' | 'week' | 'month';
export type ReportExportFormat = 'CSV' | 'EXCEL' | 'PDF';

interface DashboardTicketRow {
  id: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  is_deleted: boolean | null;
}

interface DashboardTimeEntryRow {
  id: string;
  contractor_id: string;
  status: string;
  billable_amount: number | null;
  clock_in_at: string;
}

interface DashboardExpenseReportRow {
  id: string;
  contractor_id: string;
  status: string;
  total_amount: number | null;
  report_period_start: string;
  report_period_end: string;
  reviewed_at: string | null;
}

interface DashboardInvoiceRow {
  id: string;
  contractor_id: string;
  status: string | null;
  total_amount: number | null;
  created_at: string;
}

interface DashboardMetricsBuildInput {
  now: Date;
  tickets: DashboardTicketRow[];
  pendingTimeEntries: number;
  pendingExpenseReports: number;
  pendingAssessments: number;
  invoicesForTrend: DashboardInvoiceRow[];
}

interface DashboardReportBuildInput {
  now: Date;
  startDate: Date;
  endDate: Date;
  groupBy: ReportGroupBy;
  tickets: DashboardTicketRow[];
  timeEntries: DashboardTimeEntryRow[];
  expenseReports: DashboardExpenseReportRow[];
  invoices: DashboardInvoiceRow[];
  contractorNameById: Map<string, string>;
}

export interface DashboardMetricsData {
  generated_at: string;
  active_tickets: number;
  field_crews: number;
  on_site_crews: number;
  pending_reviews_total: number;
  pending_time_entries: number;
  pending_expense_reports: number;
  pending_assessments: number;
  revenue_mtd: number;
  revenue_previous_mtd: number;
  revenue_trend_percent: number;
  invoices_generated_mtd: number;
  status_breakdown: {
    in_route: number;
    on_site: number;
    pending_review: number;
    unassigned: number;
  };
}

export interface DashboardReportSeriesPoint {
  bucket_start: string;
  label: string;
  tickets_created: number;
  approved_time_amount: number;
  approved_expense_amount: number;
  invoiced_amount: number;
}

export interface DashboardReportContractorRow {
  contractor_id: string;
  contractor_name: string;
  approved_time_amount: number;
  approved_expense_amount: number;
  invoiced_amount: number;
  pending_reviews: number;
}

export interface DashboardReportData {
  generated_at: string;
  start_date: string;
  end_date: string;
  group_by: ReportGroupBy;
  totals: {
    tickets_created: number;
    approved_time_amount: number;
    approved_expense_amount: number;
    invoiced_amount: number;
    pending_reviews: number;
  };
  series: DashboardReportSeriesPoint[];
  contractors: DashboardReportContractorRow[];
}

export interface DashboardReportInput {
  startDate: string;
  endDate: string;
  groupBy: ReportGroupBy;
}

export interface ReportExportArtifact {
  fileName: string;
  mimeType: string;
  content: string | Uint8Array;
}

export interface DashboardReportingService {
  getDashboardMetrics: () => Promise<DashboardMetricsData>;
  getReport: (input: DashboardReportInput) => Promise<DashboardReportData>;
  createReportExport: (
    report: DashboardReportData,
    format: ReportExportFormat,
    generatedAt?: Date,
  ) => ReportExportArtifact;
}

const CLOSED_TICKET_STATUSES = new Set(['CLOSED', 'ARCHIVED', 'EXPIRED']);
const PENDING_EXPENSE_STATUSES = new Set(['SUBMITTED', 'UNDER_REVIEW']);

function normalizeNumber(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function parseRequiredDate(value: string, label: string): Date {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return parsed;
}

function toDateOnly(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function isInvoiceRevenueStatus(status: string | null | undefined): boolean {
  return String(status ?? '').toUpperCase() !== 'VOID';
}

function getPreviousMtdWindow(now: Date): { start: Date; end: Date } {
  const prevReference = subMonths(now, 1);
  const prevStart = startOfMonth(prevReference);
  const prevMonthLastDay = endOfMonth(prevReference).getDate();
  const day = Math.min(now.getDate(), prevMonthLastDay);

  const prevEnd = endOfDay(
    new Date(
      prevReference.getFullYear(),
      prevReference.getMonth(),
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    ),
  );

  return { start: prevStart, end: prevEnd };
}

function formatTrendPercent(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round((((current - previous) / previous) * 100 + Number.EPSILON) * 10) / 10;
}

function getBucketStart(value: Date, groupBy: ReportGroupBy): Date {
  if (groupBy === 'week') {
    return startOfWeek(value, { weekStartsOn: 1 });
  }

  if (groupBy === 'month') {
    return startOfMonth(value);
  }

  return startOfDay(value);
}

function getBucketLabel(bucketStart: Date, groupBy: ReportGroupBy): string {
  if (groupBy === 'week') {
    return `Week of ${format(bucketStart, 'MMM d')}`;
  }

  if (groupBy === 'month') {
    return format(bucketStart, 'MMM yyyy');
  }

  return format(bucketStart, 'MMM d');
}

function getBuckets(startDate: Date, endDate: Date, groupBy: ReportGroupBy): Date[] {
  if (groupBy === 'week') {
    return eachWeekOfInterval(
      { start: startOfWeek(startDate, { weekStartsOn: 1 }), end: endDate },
      { weekStartsOn: 1 },
    );
  }

  if (groupBy === 'month') {
    return eachMonthOfInterval({ start: startOfMonth(startDate), end: endDate });
  }

  return eachDayOfInterval({ start: startOfDay(startDate), end: endDate });
}

function resolveContractorName(contractorId: string, names: Map<string, string>): string {
  return names.get(contractorId) ?? `Contractor ${contractorId.slice(0, 8)}`;
}

export function buildDashboardMetrics(input: DashboardMetricsBuildInput): DashboardMetricsData {
  const activeTickets = input.tickets.filter((ticket) => {
    if (ticket.is_deleted) {
      return false;
    }

    const status = ticket.status.toUpperCase();
    return !CLOSED_TICKET_STATUSES.has(status);
  });

  const fieldCrewIds = new Set(
    activeTickets
      .map((ticket) => ticket.assigned_to)
      .filter((assignedTo): assignedTo is string => Boolean(assignedTo)),
  );

  const onSiteCrewIds = new Set(
    activeTickets
      .filter((ticket) => ticket.status.toUpperCase() === 'ON_SITE')
      .map((ticket) => ticket.assigned_to)
      .filter((assignedTo): assignedTo is string => Boolean(assignedTo)),
  );

  const statusBreakdown = {
    in_route: activeTickets.filter((ticket) => ticket.status.toUpperCase() === 'IN_ROUTE').length,
    on_site: activeTickets.filter((ticket) => ticket.status.toUpperCase() === 'ON_SITE').length,
    pending_review: activeTickets.filter((ticket) => ticket.status.toUpperCase() === 'PENDING_REVIEW').length,
    unassigned: activeTickets.filter((ticket) => !ticket.assigned_to).length,
  };

  const mtdStart = startOfMonth(input.now);
  const mtdRange = { start: mtdStart, end: input.now };
  const previousMtd = getPreviousMtdWindow(input.now);

  let revenueMtd = 0;
  let revenuePreviousMtd = 0;
  let invoicesGeneratedMtd = 0;

  for (const invoice of input.invoicesForTrend) {
    if (!isInvoiceRevenueStatus(invoice.status)) {
      continue;
    }

    const createdAt = parseDateOrNull(invoice.created_at);
    if (!createdAt) {
      continue;
    }

    const totalAmount = normalizeNumber(invoice.total_amount);

    if (isWithinInterval(createdAt, mtdRange)) {
      revenueMtd += totalAmount;
      invoicesGeneratedMtd += 1;
      continue;
    }

    if (isWithinInterval(createdAt, previousMtd)) {
      revenuePreviousMtd += totalAmount;
    }
  }

  const pendingReviewsTotal =
    input.pendingTimeEntries + input.pendingExpenseReports + input.pendingAssessments;

  return {
    generated_at: input.now.toISOString(),
    active_tickets: activeTickets.length,
    field_crews: fieldCrewIds.size,
    on_site_crews: onSiteCrewIds.size,
    pending_reviews_total: pendingReviewsTotal,
    pending_time_entries: input.pendingTimeEntries,
    pending_expense_reports: input.pendingExpenseReports,
    pending_assessments: input.pendingAssessments,
    revenue_mtd: roundCurrency(revenueMtd),
    revenue_previous_mtd: roundCurrency(revenuePreviousMtd),
    revenue_trend_percent: formatTrendPercent(revenueMtd, revenuePreviousMtd),
    invoices_generated_mtd: invoicesGeneratedMtd,
    status_breakdown: statusBreakdown,
  };
}

export function buildDashboardReport(input: DashboardReportBuildInput): DashboardReportData {
  const seriesBuckets = getBuckets(input.startDate, input.endDate, input.groupBy);

  const seriesMap = new Map<string, DashboardReportSeriesPoint>();
  for (const bucketStart of seriesBuckets) {
    const bucketKey = toDateOnly(bucketStart);
    seriesMap.set(bucketKey, {
      bucket_start: bucketKey,
      label: getBucketLabel(bucketStart, input.groupBy),
      tickets_created: 0,
      approved_time_amount: 0,
      approved_expense_amount: 0,
      invoiced_amount: 0,
    });
  }

  const contractorTotals = new Map<string, DashboardReportContractorRow>();

  const includeDateRange = {
    start: startOfDay(input.startDate),
    end: endOfDay(input.endDate),
  };

  let ticketsCreated = 0;
  let approvedTimeAmount = 0;
  let approvedExpenseAmount = 0;
  let invoicedAmount = 0;
  let pendingReviews = 0;

  const getContractorTotals = (contractorId: string): DashboardReportContractorRow => {
    const existing = contractorTotals.get(contractorId);
    if (existing) {
      return existing;
    }

    const initial: DashboardReportContractorRow = {
      contractor_id: contractorId,
      contractor_name: resolveContractorName(contractorId, input.contractorNameById),
      approved_time_amount: 0,
      approved_expense_amount: 0,
      invoiced_amount: 0,
      pending_reviews: 0,
    };

    contractorTotals.set(contractorId, initial);
    return initial;
  };

  for (const ticket of input.tickets) {
    const createdAt = parseDateOrNull(ticket.created_at);
    if (!createdAt || !isWithinInterval(createdAt, includeDateRange)) {
      continue;
    }

    ticketsCreated += 1;

    const bucketKey = toDateOnly(getBucketStart(createdAt, input.groupBy));
    const bucket = seriesMap.get(bucketKey);
    if (bucket) {
      bucket.tickets_created += 1;
    }
  }

  for (const timeEntry of input.timeEntries) {
    const eventDate = parseDateOrNull(timeEntry.clock_in_at);
    if (!eventDate || !isWithinInterval(eventDate, includeDateRange)) {
      continue;
    }

    const normalizedStatus = timeEntry.status.toUpperCase();

    if (normalizedStatus === 'PENDING') {
      pendingReviews += 1;
      getContractorTotals(timeEntry.contractor_id).pending_reviews += 1;
    }

    if (normalizedStatus !== 'APPROVED') {
      continue;
    }

    const amount = normalizeNumber(timeEntry.billable_amount);
    approvedTimeAmount += amount;

    const bucketKey = toDateOnly(getBucketStart(eventDate, input.groupBy));
    const bucket = seriesMap.get(bucketKey);
    if (bucket) {
      bucket.approved_time_amount = roundCurrency(bucket.approved_time_amount + amount);
    }

    const contractor = getContractorTotals(timeEntry.contractor_id);
    contractor.approved_time_amount = roundCurrency(contractor.approved_time_amount + amount);
  }

  for (const expenseReport of input.expenseReports) {
    const referenceDate =
      parseDateOrNull(expenseReport.reviewed_at) ?? parseDateOrNull(expenseReport.report_period_end);
    if (!referenceDate || !isWithinInterval(referenceDate, includeDateRange)) {
      continue;
    }

    const normalizedStatus = expenseReport.status.toUpperCase();

    if (PENDING_EXPENSE_STATUSES.has(normalizedStatus)) {
      pendingReviews += 1;
      getContractorTotals(expenseReport.contractor_id).pending_reviews += 1;
    }

    if (normalizedStatus !== 'APPROVED') {
      continue;
    }

    const amount = normalizeNumber(expenseReport.total_amount);
    approvedExpenseAmount += amount;

    const bucketKey = toDateOnly(getBucketStart(referenceDate, input.groupBy));
    const bucket = seriesMap.get(bucketKey);
    if (bucket) {
      bucket.approved_expense_amount = roundCurrency(bucket.approved_expense_amount + amount);
    }

    const contractor = getContractorTotals(expenseReport.contractor_id);
    contractor.approved_expense_amount = roundCurrency(contractor.approved_expense_amount + amount);
  }

  for (const invoice of input.invoices) {
    if (!isInvoiceRevenueStatus(invoice.status)) {
      continue;
    }

    const createdAt = parseDateOrNull(invoice.created_at);
    if (!createdAt || !isWithinInterval(createdAt, includeDateRange)) {
      continue;
    }

    const amount = normalizeNumber(invoice.total_amount);
    invoicedAmount += amount;

    const bucketKey = toDateOnly(getBucketStart(createdAt, input.groupBy));
    const bucket = seriesMap.get(bucketKey);
    if (bucket) {
      bucket.invoiced_amount = roundCurrency(bucket.invoiced_amount + amount);
    }

    const contractor = getContractorTotals(invoice.contractor_id);
    contractor.invoiced_amount = roundCurrency(contractor.invoiced_amount + amount);
  }

  const series = Array.from(seriesMap.values()).map((point) => ({
    ...point,
    approved_time_amount: roundCurrency(point.approved_time_amount),
    approved_expense_amount: roundCurrency(point.approved_expense_amount),
    invoiced_amount: roundCurrency(point.invoiced_amount),
  }));

  const contractors = Array.from(contractorTotals.values()).sort((a, b) => {
    if (b.invoiced_amount !== a.invoiced_amount) {
      return b.invoiced_amount - a.invoiced_amount;
    }

    if (b.approved_time_amount !== a.approved_time_amount) {
      return b.approved_time_amount - a.approved_time_amount;
    }

    return a.contractor_name.localeCompare(b.contractor_name);
  });

  return {
    generated_at: input.now.toISOString(),
    start_date: toDateOnly(input.startDate),
    end_date: toDateOnly(input.endDate),
    group_by: input.groupBy,
    totals: {
      tickets_created: ticketsCreated,
      approved_time_amount: roundCurrency(approvedTimeAmount),
      approved_expense_amount: roundCurrency(approvedExpenseAmount),
      invoiced_amount: roundCurrency(invoicedAmount),
      pending_reviews: pendingReviews,
    },
    series,
    contractors,
  };
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

function rowsToTabSeparated(rows: string[][]): string {
  return rows.map((row) => row.join('\t')).join('\n');
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]): Uint8Array {
  const contentLines = lines
    .map((line, index) => `1 0 0 1 50 ${760 - index * 16} Tm (${escapePdfText(line)}) Tj`)
    .join('\n');
  const stream = `BT\n/F1 10 Tf\n${contentLines}\nET`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const encoded = new TextEncoder().encode(pdf);
  return encoded instanceof Uint8Array ? encoded : new Uint8Array(encoded);
}

export function buildReportExportArtifact(
  report: DashboardReportData,
  format: ReportExportFormat,
  generatedAt: Date = new Date(),
): ReportExportArtifact {
  const timestamp = formatDatePart(generatedAt);

  const summaryRows: string[][] = [
    ['Grid Electric Services - Operations Report'],
    ['Generated At', report.generated_at],
    ['Range', `${report.start_date} to ${report.end_date}`],
    ['Grouping', report.group_by],
    [],
    ['Summary'],
    ['Metric', 'Value'],
    ['Tickets Created', String(report.totals.tickets_created)],
    ['Approved Time Amount', report.totals.approved_time_amount.toFixed(2)],
    ['Approved Expense Amount', report.totals.approved_expense_amount.toFixed(2)],
    ['Invoiced Amount', report.totals.invoiced_amount.toFixed(2)],
    ['Pending Reviews', String(report.totals.pending_reviews)],
    [],
    ['Trend Series'],
    ['Period', 'Tickets Created', 'Approved Time', 'Approved Expenses', 'Invoiced Amount'],
    ...report.series.map((row) => [
      row.label,
      String(row.tickets_created),
      row.approved_time_amount.toFixed(2),
      row.approved_expense_amount.toFixed(2),
      row.invoiced_amount.toFixed(2),
    ]),
    [],
    ['Contractor Breakdown'],
    ['Contractor', 'Approved Time', 'Approved Expenses', 'Invoiced Amount', 'Pending Reviews'],
    ...report.contractors.map((row) => [
      row.contractor_name,
      row.approved_time_amount.toFixed(2),
      row.approved_expense_amount.toFixed(2),
      row.invoiced_amount.toFixed(2),
      String(row.pending_reviews),
    ]),
  ];

  if (format === 'CSV') {
    return {
      fileName: `operations-report-${timestamp}.csv`,
      mimeType: 'text/csv',
      content: rowsToCsv(summaryRows),
    };
  }

  if (format === 'EXCEL') {
    return {
      fileName: `operations-report-${timestamp}.xls`,
      mimeType: 'application/vnd.ms-excel',
      content: rowsToTabSeparated(summaryRows),
    };
  }

  const pdfLines = [
    'Grid Electric Services - Operations Report',
    `Generated At: ${report.generated_at}`,
    `Range: ${report.start_date} to ${report.end_date}`,
    `Grouping: ${report.group_by}`,
    '',
    'Summary',
    `Tickets Created: ${report.totals.tickets_created}`,
    `Approved Time Amount: $${report.totals.approved_time_amount.toFixed(2)}`,
    `Approved Expense Amount: $${report.totals.approved_expense_amount.toFixed(2)}`,
    `Invoiced Amount: $${report.totals.invoiced_amount.toFixed(2)}`,
    `Pending Reviews: ${report.totals.pending_reviews}`,
    '',
    'Top Contractors (by invoiced amount)',
    ...report.contractors.slice(0, 12).map(
      (row) =>
        `${row.contractor_name}: $${row.invoiced_amount.toFixed(2)} (Time $${row.approved_time_amount.toFixed(2)}, Expense $${row.approved_expense_amount.toFixed(2)})`,
    ),
  ];

  return {
    fileName: `operations-report-${timestamp}.pdf`,
    mimeType: 'application/pdf',
    content: buildSimplePdf(pdfLines),
  };
}

function formatDatePart(date: Date): string {
  return format(date, 'yyyyMMdd-HHmmss');
}

type SupabaseClient = Awaited<ReturnType<typeof getDefaultClient>>;

interface SelectInClient<Row> {
  select: (columns: string) => {
    in: (column: string, values: readonly string[]) => Promise<{ data: Row[] | null; error: unknown }>;
  };
}

interface CountEqClient {
  select: (
    columns: string,
    options: { head: true; count: 'exact' },
  ) => {
    eq: (column: string, value: string) => Promise<{ count: number | null; error: unknown }>;
  };
}

interface CountInClient {
  select: (
    columns: string,
    options: { head: true; count: 'exact' },
  ) => {
    in: (column: string, values: readonly string[]) => Promise<{ count: number | null; error: unknown }>;
  };
}

interface CountIsNotClient {
  select: (
    columns: string,
    options: { head: true; count: 'exact' },
  ) => {
    is: (column: string, value: null) => {
      not: (column: string, operator: 'is', value: null) => Promise<{ count: number | null; error: unknown }>;
    };
  };
}

interface SelectEqClient<Row> {
  select: (columns: string) => {
    eq: (column: string, value: string | boolean) => Promise<{ data: Row[] | null; error: unknown }>;
  };
}

interface SelectEqDateRangeClient<Row> {
  select: (columns: string) => {
    eq: (column: string, value: string | boolean) => {
      gte: (column: string, value: string) => {
        lte: (column: string, value: string) => Promise<{ data: Row[] | null; error: unknown }>;
      };
    };
  };
}

interface SelectDateRangeClient<Row> {
  select: (columns: string) => {
    gte: (column: string, value: string) => {
      lte: (column: string, value: string) => Promise<{ data: Row[] | null; error: unknown }>;
    };
  };
}

interface SelectOverlapDateClient<Row> {
  select: (columns: string) => {
    lte: (column: string, value: string) => {
      gte: (column: string, value: string) => Promise<{ data: Row[] | null; error: unknown }>;
    };
  };
}

async function getDefaultClient() {
  const { supabase } = await import('../supabase/client');
  return supabase;
}

async function fetchContractorNames(
  contractorIds: string[],
  client: SupabaseClient,
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(contractorIds.filter(Boolean)));
  if (ids.length === 0) {
    return new Map();
  }

  const contractorsTable = client.from('contractors') as unknown as SelectInClient<{
    id: string;
    profile_id: string | null;
  }>;
  const { data: contractors, error: contractorError } = await contractorsTable
    .select('id, profile_id')
    .in('id', ids);

  if (contractorError) {
    throw new Error('Unable to load contractor report context.');
  }

  const profileIds = Array.from(
    new Set(
      (contractors ?? [])
        .map((row: { profile_id: string | null }) => row.profile_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const profileNameById = new Map<string, string>();
  if (profileIds.length > 0) {
    const profilesTable = client.from('profiles') as unknown as SelectInClient<{
      id: string;
      first_name: string | null;
      last_name: string | null;
    }>;
    const { data: profiles, error: profileError } = await profilesTable
      .select('id, first_name, last_name')
      .in('id', profileIds);

    if (profileError) {
      throw new Error('Unable to load profile names for report context.');
    }

    for (const profile of profiles ?? []) {
      const firstName = profile.first_name ?? '';
      const lastName = profile.last_name ?? '';
      profileNameById.set(profile.id, `${firstName} ${lastName}`.trim() || profile.id);
    }
  }

  const nameByContractorId = new Map<string, string>();
  for (const contractor of contractors ?? []) {
    const profileId = contractor.profile_id as string | undefined;
    const name = profileId ? profileNameById.get(profileId) : undefined;
    if (name) {
      nameByContractorId.set(contractor.id as string, name);
    }
  }

  return nameByContractorId;
}

async function fetchPendingTimeEntries(client: Awaited<ReturnType<typeof getDefaultClient>>): Promise<number> {
  const timeEntriesTable = client.from('time_entries') as unknown as CountEqClient;
  const { count, error } = await timeEntriesTable.select('id', { head: true, count: 'exact' }).eq('status', 'PENDING');

  if (error) {
    throw new Error('Unable to load pending time entry metrics.');
  }

  return count ?? 0;
}

async function fetchPendingExpenseReports(client: Awaited<ReturnType<typeof getDefaultClient>>): Promise<number> {
  const expenseReportsTable = client.from('expense_reports') as unknown as CountInClient;
  const { count, error } = await expenseReportsTable
    .select('id', { head: true, count: 'exact' })
    .in('status', ['SUBMITTED', 'UNDER_REVIEW']);

  if (error) {
    throw new Error('Unable to load pending expense metrics.');
  }

  return count ?? 0;
}

async function fetchPendingAssessments(client: Awaited<ReturnType<typeof getDefaultClient>>): Promise<number> {
  const assessmentsTable = client.from('damage_assessments') as unknown as CountIsNotClient;
  const { count, error } = await assessmentsTable
    .select('id', { head: true, count: 'exact' })
    .is('reviewed_at', null)
    .not('assessed_at', 'is', null);

  if (error) {
    throw new Error('Unable to load pending assessment metrics.');
  }

  return count ?? 0;
}

async function fetchAllTickets(client: SupabaseClient): Promise<DashboardTicketRow[]> {
  const ticketsTable = client.from('tickets') as unknown as SelectEqClient<DashboardTicketRow>;
  const { data, error } = await ticketsTable
    .select('id, status, assigned_to, created_at, is_deleted')
    .eq('is_deleted', false);

  if (error) {
    throw new Error('Unable to load ticket metrics.');
  }

  return (data ?? []) as DashboardTicketRow[];
}

async function fetchInvoicesByCreatedRange(
  client: SupabaseClient,
  startIso: string,
  endIso: string,
): Promise<DashboardInvoiceRow[]> {
  const invoicesTable = client.from('contractor_invoices') as unknown as SelectDateRangeClient<DashboardInvoiceRow>;
  const { data, error } = await invoicesTable
    .select('id, contractor_id, status, total_amount, created_at')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error) {
    throw new Error('Unable to load invoice metrics.');
  }

  return (data ?? []) as DashboardInvoiceRow[];
}

async function fetchReportTickets(
  client: SupabaseClient,
  startIso: string,
  endIso: string,
): Promise<DashboardTicketRow[]> {
  const ticketsTable = client.from('tickets') as unknown as SelectEqDateRangeClient<DashboardTicketRow>;
  const { data, error } = await ticketsTable
    .select('id, status, assigned_to, created_at, is_deleted')
    .eq('is_deleted', false)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error) {
    throw new Error('Unable to load report tickets.');
  }

  return (data ?? []) as DashboardTicketRow[];
}

async function fetchReportTimeEntries(
  client: SupabaseClient,
  startIso: string,
  endIso: string,
): Promise<DashboardTimeEntryRow[]> {
  const timeEntriesTable = client.from('time_entries') as unknown as SelectDateRangeClient<DashboardTimeEntryRow>;
  const { data, error } = await timeEntriesTable
    .select('id, contractor_id, status, billable_amount, clock_in_at')
    .gte('clock_in_at', startIso)
    .lte('clock_in_at', endIso);

  if (error) {
    throw new Error('Unable to load report time entries.');
  }

  return (data ?? []) as DashboardTimeEntryRow[];
}

async function fetchReportExpenseReports(
  client: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<DashboardExpenseReportRow[]> {
  const expenseReportsTable = client.from('expense_reports') as unknown as SelectOverlapDateClient<DashboardExpenseReportRow>;
  const { data, error } = await expenseReportsTable
    .select('id, contractor_id, status, total_amount, report_period_start, report_period_end, reviewed_at')
    .lte('report_period_start', endDate)
    .gte('report_period_end', startDate);

  if (error) {
    throw new Error('Unable to load report expense data.');
  }

  return (data ?? []) as DashboardExpenseReportRow[];
}

async function fetchReportInvoices(
  client: SupabaseClient,
  startIso: string,
  endIso: string,
): Promise<DashboardInvoiceRow[]> {
  const invoicesTable = client.from('contractor_invoices') as unknown as SelectDateRangeClient<DashboardInvoiceRow>;
  const { data, error } = await invoicesTable
    .select('id, contractor_id, status, total_amount, created_at')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error) {
    throw new Error('Unable to load report invoice data.');
  }

  return (data ?? []) as DashboardInvoiceRow[];
}

interface DashboardReportingDependencies {
  now: () => Date;
  fetchTickets: () => Promise<DashboardTicketRow[]>;
  fetchPendingTimeEntries: () => Promise<number>;
  fetchPendingExpenseReports: () => Promise<number>;
  fetchPendingAssessments: () => Promise<number>;
  fetchInvoicesByCreatedRange: (startIso: string, endIso: string) => Promise<DashboardInvoiceRow[]>;
  fetchReportTickets: (startIso: string, endIso: string) => Promise<DashboardTicketRow[]>;
  fetchReportTimeEntries: (startIso: string, endIso: string) => Promise<DashboardTimeEntryRow[]>;
  fetchReportExpenseReports: (startDate: string, endDate: string) => Promise<DashboardExpenseReportRow[]>;
  fetchReportInvoices: (startIso: string, endIso: string) => Promise<DashboardInvoiceRow[]>;
  fetchContractorNames: (contractorIds: string[]) => Promise<Map<string, string>>;
}

export function createDashboardReportingService(
  dependencies?: Partial<DashboardReportingDependencies>,
): DashboardReportingService {
  const resolvedDependencies: DashboardReportingDependencies = {
    now: dependencies?.now ?? (() => new Date()),
    fetchTickets:
      dependencies?.fetchTickets ??
      (async () => {
        const client = await getDefaultClient();
        return fetchAllTickets(client);
      }),
    fetchPendingTimeEntries:
      dependencies?.fetchPendingTimeEntries ??
      (async () => {
        const client = await getDefaultClient();
        return fetchPendingTimeEntries(client);
      }),
    fetchPendingExpenseReports:
      dependencies?.fetchPendingExpenseReports ??
      (async () => {
        const client = await getDefaultClient();
        return fetchPendingExpenseReports(client);
      }),
    fetchPendingAssessments:
      dependencies?.fetchPendingAssessments ??
      (async () => {
        const client = await getDefaultClient();
        return fetchPendingAssessments(client);
      }),
    fetchInvoicesByCreatedRange:
      dependencies?.fetchInvoicesByCreatedRange ??
      (async (startIso, endIso) => {
        const client = await getDefaultClient();
        return fetchInvoicesByCreatedRange(client, startIso, endIso);
      }),
    fetchReportTickets:
      dependencies?.fetchReportTickets ??
      (async (startIso, endIso) => {
        const client = await getDefaultClient();
        return fetchReportTickets(client, startIso, endIso);
      }),
    fetchReportTimeEntries:
      dependencies?.fetchReportTimeEntries ??
      (async (startIso, endIso) => {
        const client = await getDefaultClient();
        return fetchReportTimeEntries(client, startIso, endIso);
      }),
    fetchReportExpenseReports:
      dependencies?.fetchReportExpenseReports ??
      (async (startDate, endDate) => {
        const client = await getDefaultClient();
        return fetchReportExpenseReports(client, startDate, endDate);
      }),
    fetchReportInvoices:
      dependencies?.fetchReportInvoices ??
      (async (startIso, endIso) => {
        const client = await getDefaultClient();
        return fetchReportInvoices(client, startIso, endIso);
      }),
    fetchContractorNames:
      dependencies?.fetchContractorNames ??
      (async (contractorIds) => {
        const client = await getDefaultClient();
        return fetchContractorNames(contractorIds, client);
      }),
  };

  return {
    async getDashboardMetrics(): Promise<DashboardMetricsData> {
      const now = resolvedDependencies.now();
      const previousWindow = getPreviousMtdWindow(now);

      const [tickets, pendingTimeEntries, pendingExpenseReports, pendingAssessments, invoicesForTrend] =
        await Promise.all([
          resolvedDependencies.fetchTickets(),
          resolvedDependencies.fetchPendingTimeEntries(),
          resolvedDependencies.fetchPendingExpenseReports(),
          resolvedDependencies.fetchPendingAssessments(),
          resolvedDependencies.fetchInvoicesByCreatedRange(
            previousWindow.start.toISOString(),
            now.toISOString(),
          ),
        ]);

      return buildDashboardMetrics({
        now,
        tickets,
        pendingTimeEntries,
        pendingExpenseReports,
        pendingAssessments,
        invoicesForTrend,
      });
    },

    async getReport(input: DashboardReportInput): Promise<DashboardReportData> {
      const startDate = parseRequiredDate(input.startDate, 'report start date');
      const endDate = parseRequiredDate(input.endDate, 'report end date');

      if (endDate.getTime() < startDate.getTime()) {
        throw new Error('Report end date must be on or after the start date.');
      }

      const now = resolvedDependencies.now();
      const normalizedStart = startOfDay(startDate);
      const normalizedEnd = endOfDay(endDate);

      const startIso = normalizedStart.toISOString();
      const endIso = normalizedEnd.toISOString();
      const startDateOnly = toDateOnly(normalizedStart);
      const endDateOnly = toDateOnly(normalizedEnd);

      const [tickets, timeEntries, expenseReports, invoices] = await Promise.all([
        resolvedDependencies.fetchReportTickets(startIso, endIso),
        resolvedDependencies.fetchReportTimeEntries(startIso, endIso),
        resolvedDependencies.fetchReportExpenseReports(startDateOnly, endDateOnly),
        resolvedDependencies.fetchReportInvoices(startIso, endIso),
      ]);

      const contractorIds = Array.from(
        new Set([
          ...timeEntries.map((row) => row.contractor_id),
          ...expenseReports.map((row) => row.contractor_id),
          ...invoices.map((row) => row.contractor_id),
        ]),
      );

      const contractorNameById = await resolvedDependencies.fetchContractorNames(contractorIds);

      return buildDashboardReport({
        now,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        groupBy: input.groupBy,
        tickets,
        timeEntries,
        expenseReports,
        invoices,
        contractorNameById,
      });
    },

    createReportExport(
      report: DashboardReportData,
      format: ReportExportFormat,
      generatedAt: Date = new Date(),
    ): ReportExportArtifact {
      return buildReportExportArtifact(report, format, generatedAt);
    },
  };
}

export const dashboardReportingService = createDashboardReportingService();
