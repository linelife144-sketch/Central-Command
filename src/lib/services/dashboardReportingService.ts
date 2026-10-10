import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { localTestStore } from '@/lib/testing/localTestStore';
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export type ReportGroupBy = 'day' | 'week' | 'month';
export type ReportExportFormat = 'CSV' | 'EXCEL' | 'PDF';

interface DashboardTicketRow {
  id: string;
  status: string;
  assigned_to: string | null;
  crew_id?: string | null;
  created_at: string;
  is_deleted: boolean | null;
}

interface DashboardTimeEntryRow {
  id: string;
  contractor_id: string;
  status: string;
  payroll_amount: number | null;
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

interface DashboardMetricsBuildInput {
  now: Date;
  tickets: DashboardTicketRow[];
  pendingTimeEntries: number;
  pendingExpenseReports: number;
  pendingAssessments: number;
}

interface DashboardReportBuildInput {
  now: Date;
  startDate: Date;
  endDate: Date;
  groupBy: ReportGroupBy;
  tickets: DashboardTicketRow[];
  timeEntries: DashboardTimeEntryRow[];
  expenseReports: DashboardExpenseReportRow[];
  contractorNameById: Map<string, string>;
}

export interface DashboardMetricsData {
  unavailable_metrics?: string[];
  generated_at: string;
  total_tickets: number;
  active_tickets: number;
  field_crews: number;
  on_site_crews: number;
  pending_reviews_total: number;
  pending_tickets: number;
  pending_time_entries: number;
  pending_expense_reports: number;
  pending_assessments: number;
  status_breakdown: {
    in_route: number;
    on_site: number;
    pending_review: number;
    completed: number;
    unassigned: number;
  };
}

export interface DashboardReportSeriesPoint {
  bucket_start: string;
  label: string;
  tickets_created: number;
  approved_time_amount: number;
  approved_expense_amount: number;
}

export interface DashboardReportContractorRow {
  contractor_id: string;
  contractor_name: string;
  approved_time_amount: number;
  approved_expense_amount: number;
  pending_reviews: number;
}

export interface DashboardReportData {
  storm_event_id?: string | null;
  generated_at: string;
  start_date: string;
  end_date: string;
  group_by: ReportGroupBy;
  totals: {
    tickets_created: number;
    approved_time_amount: number;
    approved_expense_amount: number;
    pending_reviews: number;
  };
  series: DashboardReportSeriesPoint[];
  contractors: DashboardReportContractorRow[];
}

export interface DashboardReportInput {
  stormEventId?: string;
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
  getDashboardMetrics: (input?: { stormEventId?: string }) => Promise<DashboardMetricsData>;
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
      .map((ticket) => ticket.crew_id)
      .filter((assignedTo): assignedTo is string => Boolean(assignedTo)),
  );

  const onSiteCrewIds = new Set(
    activeTickets
      .filter((ticket) => ticket.status.toUpperCase() === 'ON_SITE')
      .map((ticket) => ticket.crew_id)
      .filter((assignedTo): assignedTo is string => Boolean(assignedTo)),
  );

  const statusBreakdown = {
    in_route: activeTickets.filter((ticket) => ticket.status.toUpperCase() === 'IN_ROUTE').length,
    on_site: activeTickets.filter((ticket) => ticket.status.toUpperCase() === 'ON_SITE').length,
    pending_review: activeTickets.filter((ticket) => ticket.status.toUpperCase() === 'PENDING_REVIEW').length,
    completed: activeTickets.filter((ticket) => ticket.status.toUpperCase() === 'COMPLETE').length,
    unassigned: activeTickets.filter((ticket) => !ticket.assigned_to).length,
  };

  const pendingTickets = activeTickets.filter(ticket => ticket.status.toUpperCase() === 'PENDING_REVIEW').length;
  const pendingReviewsTotal =
    pendingTickets + input.pendingTimeEntries + input.pendingExpenseReports + input.pendingAssessments;

  return {
    generated_at: input.now.toISOString(),
    total_tickets: input.tickets.filter((ticket) => !ticket.is_deleted).length,
    active_tickets: activeTickets.length,
    field_crews: fieldCrewIds.size,
    on_site_crews: onSiteCrewIds.size,
    pending_reviews_total: pendingReviewsTotal,
    pending_tickets: pendingTickets,
    pending_time_entries: input.pendingTimeEntries,
    pending_expense_reports: input.pendingExpenseReports,
    pending_assessments: input.pendingAssessments,
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

    const amount = normalizeNumber(timeEntry.payroll_amount);
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

  const series = Array.from(seriesMap.values()).map((point) => ({
    ...point,
    approved_time_amount: roundCurrency(point.approved_time_amount),
    approved_expense_amount: roundCurrency(point.approved_expense_amount),
  }));

  const contractors = Array.from(contractorTotals.values()).sort((a, b) => {
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
    ['Storm Scope', report.storm_event_id ?? 'Company-wide'],
    ['Range', `${report.start_date} to ${report.end_date}`],
    ['Grouping', report.group_by],
    [],
    ['Summary'],
    ['Metric', 'Value'],
    ['Tickets Created', String(report.totals.tickets_created)],
    ['Approved Time Amount', report.totals.approved_time_amount.toFixed(2)],
    ['Approved Expense Amount', report.totals.approved_expense_amount.toFixed(2)],
    ['Pending Reviews', String(report.totals.pending_reviews)],
    [],
    ['Trend Series'],
    ['Period', 'Tickets Created', 'Approved Time', 'Approved Expenses'],
    ...report.series.map((row) => [
      row.label,
      String(row.tickets_created),
      row.approved_time_amount.toFixed(2),
      row.approved_expense_amount.toFixed(2),
    ]),
    [],
    ['Contractor Breakdown'],
    ['Contractor', 'Approved Time', 'Approved Expenses', 'Pending Reviews'],
    ...report.contractors.map((row) => [
      row.contractor_name,
      row.approved_time_amount.toFixed(2),
      row.approved_expense_amount.toFixed(2),
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
    `Storm Scope: ${report.storm_event_id ?? 'Company-wide'}`,
    `Range: ${report.start_date} to ${report.end_date}`,
    `Grouping: ${report.group_by}`,
    '',
    'Summary',
    `Tickets Created: ${report.totals.tickets_created}`,
    `Approved Time Amount: $${report.totals.approved_time_amount.toFixed(2)}`,
    `Approved Expense Amount: $${report.totals.approved_expense_amount.toFixed(2)}`,
    `Pending Reviews: ${report.totals.pending_reviews}`,
    '',
    'Top Contractors (by approved time amount)',
    ...report.contractors.slice(0, 12).map(
      (row) =>
        `${row.contractor_name}: Time $${row.approved_time_amount.toFixed(2)}, Expense $${row.approved_expense_amount.toFixed(2)}`,
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

interface DashboardReadQuery<Row> extends PromiseLike<{ data: Row[] | null; error: unknown; count?: number | null }> {
  eq: (column: string, value: string | boolean) => DashboardReadQuery<Row>;
  in: (column: string, values: readonly string[]) => DashboardReadQuery<Row>;
  is: (column: string, value: null) => DashboardReadQuery<Row>;
  not: (column: string, operator: string, value: null) => DashboardReadQuery<Row>;
  gte: (column: string, value: string) => DashboardReadQuery<Row>;
  lte: (column: string, value: string) => DashboardReadQuery<Row>;
  order: (column: string) => DashboardReadQuery<Row>;
  range: (from: number, to: number) => DashboardReadQuery<Row>;
}

function selectRows<Row>(client: SupabaseClient, table: string, columns: string, options?: { head: true; count: 'exact' }): DashboardReadQuery<Row> {
  return (client.from(table as 'tickets') as unknown as { select: (columns: string, options?: { head: true; count: 'exact' }) => DashboardReadQuery<Row> }).select(columns, options);
}

async function readAllRows<Row>(createQuery: () => DashboardReadQuery<Row>, message: string): Promise<Row[]> {
  const rows: Row[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await createQuery().order('id').range(offset, offset + pageSize - 1);
    if (error) throw new Error(message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
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

async function fetchPendingTimeEntries(client: SupabaseClient, stormEventId?: string): Promise<number> {
  let query = selectRows(client, 'time_entries', 'id', { head: true, count: 'exact' }).eq('status', 'PENDING').eq('is_deleted', false);
  if (stormEventId) query = query.eq('storm_event_id', stormEventId);
  const { count, error } = await query;
  if (error) throw new Error('Unable to load pending time entry metrics.');
  if (count == null) throw new Error('Time review count is unavailable.');
  return count;
}

async function fetchPendingExpenseReports(client: SupabaseClient, stormEventId?: string): Promise<number> {
  let query = selectRows(client, 'expense_reports', 'id', { head: true, count: 'exact' }).in('status', ['SUBMITTED', 'UNDER_REVIEW']).eq('is_deleted', false);
  if (stormEventId) query = query.eq('storm_event_id', stormEventId);
  const { count, error } = await query;
  if (error) throw new Error('Unable to load pending expense metrics.');
  if (count == null) throw new Error('Expense review count is unavailable.');
  return count;
}

async function fetchPendingAssessments(client: SupabaseClient, stormEventId?: string): Promise<number> {
  let query = selectRows(client, 'damage_assessments', stormEventId ? 'id,tickets!inner(storm_event_id,is_deleted)' : 'id', { head: true, count: 'exact' })
    .is('reviewed_at', null).not('assessed_at', 'is', null);
  if (stormEventId) query = query.eq('tickets.storm_event_id', stormEventId).eq('tickets.is_deleted', false);
  const { count, error } = await query;
  if (error) throw new Error('Unable to load pending assessment metrics.');
  if (count == null) throw new Error('Assessment review count is unavailable.');
  return count;
}

async function fetchAllTickets(client: SupabaseClient, stormEventId?: string): Promise<DashboardTicketRow[]> {
  return readAllRows(() => {
    let query = selectRows<DashboardTicketRow>(client, 'tickets', 'id,status,assigned_to,crew_id,created_at,is_deleted').eq('is_deleted', false);
    if (stormEventId) query = query.eq('storm_event_id', stormEventId);
    return query;
  }, 'Unable to load ticket metrics.');
}

async function fetchReportTickets(client: SupabaseClient, startIso: string, endIso: string, stormEventId?: string): Promise<DashboardTicketRow[]> {
  return readAllRows(() => {
    let query = selectRows<DashboardTicketRow>(client, 'tickets', 'id,status,assigned_to,crew_id,created_at,is_deleted').eq('is_deleted', false).gte('created_at', startIso).lte('created_at', endIso);
    if (stormEventId) query = query.eq('storm_event_id', stormEventId);
    return query;
  }, 'Unable to load report tickets.');
}

async function fetchReportTimeEntries(client: SupabaseClient, startIso: string, endIso: string, stormEventId?: string): Promise<DashboardTimeEntryRow[]> {
  return readAllRows(() => {
    let query = selectRows<DashboardTimeEntryRow>(client, 'time_entries', 'id,contractor_id,status,payroll_amount,clock_in_at').eq('is_deleted', false).gte('clock_in_at', startIso).lte('clock_in_at', endIso);
    if (stormEventId) query = query.eq('storm_event_id', stormEventId);
    return query;
  }, 'Unable to load report time entries.');
}

async function fetchReportExpenseReports(client: SupabaseClient, startDate: string, endDate: string, stormEventId?: string): Promise<DashboardExpenseReportRow[]> {
  return readAllRows(() => {
    let query = selectRows<DashboardExpenseReportRow>(client, 'expense_reports', 'id,contractor_id,status,total_amount,report_period_start,report_period_end,reviewed_at').eq('is_deleted', false).lte('report_period_start', endDate).gte('report_period_end', startDate);
    if (stormEventId) query = query.eq('storm_event_id', stormEventId);
    return query;
  }, 'Unable to load report expense data.');
}

interface DashboardReportingDependencies {
  getClient: () => Promise<SupabaseClient>;
  now: () => Date;
  fetchTickets: (stormEventId?: string) => Promise<DashboardTicketRow[]>;
  fetchPendingTimeEntries: (stormEventId?: string) => Promise<number>;
  fetchPendingExpenseReports: (stormEventId?: string) => Promise<number>;
  fetchPendingAssessments: (stormEventId?: string) => Promise<number>;
  fetchReportTickets: (startIso: string, endIso: string, stormEventId?: string) => Promise<DashboardTicketRow[]>;
  fetchReportTimeEntries: (startIso: string, endIso: string, stormEventId?: string) => Promise<DashboardTimeEntryRow[]>;
  fetchReportExpenseReports: (startDate: string, endDate: string, stormEventId?: string) => Promise<DashboardExpenseReportRow[]>;
  fetchContractorNames: (contractorIds: string[]) => Promise<Map<string, string>>;
}

export function createDashboardReportingService(
  dependencies?: Partial<DashboardReportingDependencies>,
): DashboardReportingService {
  const getClient = dependencies?.getClient ?? getDefaultClient;
  const resolvedDependencies: DashboardReportingDependencies = {
    getClient,
    now: dependencies?.now ?? (() => new Date()),
    fetchTickets:
      dependencies?.fetchTickets ??
      (async (stormEventId) => {
        const client = await getClient();
        return fetchAllTickets(client, stormEventId);
      }),
    fetchPendingTimeEntries:
      dependencies?.fetchPendingTimeEntries ??
      (async (stormEventId) => {
        const client = await getClient();
        return fetchPendingTimeEntries(client, stormEventId);
      }),
    fetchPendingExpenseReports:
      dependencies?.fetchPendingExpenseReports ??
      (async (stormEventId) => {
        const client = await getClient();
        return fetchPendingExpenseReports(client, stormEventId);
      }),
    fetchPendingAssessments:
      dependencies?.fetchPendingAssessments ??
      (async (stormEventId) => {
        const client = await getClient();
        return fetchPendingAssessments(client, stormEventId);
      }),
    fetchReportTickets:
      dependencies?.fetchReportTickets ??
      (async (startIso, endIso, stormEventId) => {
        const client = await getClient();
        return fetchReportTickets(client, startIso, endIso, stormEventId);
      }),
    fetchReportTimeEntries:
      dependencies?.fetchReportTimeEntries ??
      (async (startIso, endIso, stormEventId) => {
        const client = await getClient();
        return fetchReportTimeEntries(client, startIso, endIso, stormEventId);
      }),
    fetchReportExpenseReports:
      dependencies?.fetchReportExpenseReports ??
      (async (startDate, endDate, stormEventId) => {
        const client = await getClient();
        return fetchReportExpenseReports(client, startDate, endDate, stormEventId);
      }),
    fetchContractorNames:
      dependencies?.fetchContractorNames ??
      (async (contractorIds) => {
        const client = await getClient();
        return fetchContractorNames(contractorIds, client);
      }),
  };

  return {
    async getDashboardMetrics(input: { stormEventId?: string } = {}): Promise<DashboardMetricsData> {
      const now = resolvedDependencies.now();
      if (isSuperAdminTestingEnabled()) {
        const tickets = localTestStore.getTickets().filter(ticket => !input.stormEventId || ticket.storm_event_id === input.stormEventId);
        return buildDashboardMetrics({
          now,
          tickets: tickets.map(ticket => ({
            id: ticket.id,
            status: ticket.status,
            assigned_to: ticket.assigned_to ?? null,
            crew_id: ticket.crew_id ?? null,
            created_at: ticket.created_at,
            is_deleted: false,
          })),
          pendingTimeEntries: 0,
          pendingExpenseReports: 0,
          pendingAssessments: 0,
        });
      }

      const [ticketResult, timeResult, expenseResult, assessmentResult] =
        await Promise.allSettled([
          resolvedDependencies.fetchTickets(input.stormEventId),
          resolvedDependencies.fetchPendingTimeEntries(input.stormEventId),
          resolvedDependencies.fetchPendingExpenseReports(input.stormEventId),
          resolvedDependencies.fetchPendingAssessments(input.stormEventId),
        ]);

      // A denied review query must not erase valid ticket and crew counts.
      if (ticketResult.status === 'rejected') throw ticketResult.reason;
      const tickets = ticketResult.value;
      const unavailableMetrics: string[] = [];
      const countOrUnavailable = (result: PromiseSettledResult<number>, label: string) => {
        if (result.status === 'fulfilled') return result.value;
        unavailableMetrics.push(label);
        return 0;
      };
      const pendingTimeEntries = countOrUnavailable(timeResult, 'Time reviews');
      const pendingExpenseReports = countOrUnavailable(expenseResult, 'Expense reviews');
      const pendingAssessments = countOrUnavailable(assessmentResult, 'Assessment reviews');

      const metrics = buildDashboardMetrics({
        now,
        tickets,
        pendingTimeEntries,
        pendingExpenseReports,
        pendingAssessments,
      });
      return { ...metrics, unavailable_metrics: unavailableMetrics };
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

      const [tickets, timeEntries, expenseReports] = await Promise.all([
        resolvedDependencies.fetchReportTickets(startIso, endIso, input.stormEventId),
        resolvedDependencies.fetchReportTimeEntries(startIso, endIso, input.stormEventId),
        resolvedDependencies.fetchReportExpenseReports(startDateOnly, endDateOnly, input.stormEventId),
      ]);

      const contractorIds = Array.from(
        new Set([
          ...timeEntries.map((row) => row.contractor_id),
          ...expenseReports.map((row) => row.contractor_id),
        ]),
      );

      const contractorNameById = await resolvedDependencies.fetchContractorNames(contractorIds);

      return { ...buildDashboardReport({
        now,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        groupBy: input.groupBy,
        tickets,
        timeEntries,
        expenseReports,
        contractorNameById,
      }), storm_event_id: input.stormEventId ?? null };
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
