import { isSuperAdminTestingEnabled } from '../testing/superAdminTesting';
import { APP_CONFIG } from '../config/appConfig';
import { resolveBillableMinutesForEntry, calculateBillableAmount } from '../utils/timeTracking';
import type { InvoiceStatus, ContractorInvoice } from '../../types';

interface RemoteTimeEntryRow {
  id: string;
  contractor_id: string;
  ticket_id: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
  break_minutes: number | null;
  billable_minutes: number | null;
  billable_amount: number | null;
  work_type: string;
  work_type_rate: number;
  status: string;
  invoice_id: string | null;
}

interface RemoteExpenseReportRow {
  id: string;
  contractor_id: string;
  report_period_start: string;
  report_period_end: string;
  total_amount: number | null;
  status: string;
  invoice_id: string | null;
}

interface RemoteInvoiceRow {
  storm_event_id: string;
  id: string;
  invoice_number: string;
  contractor_id: string;
  billing_period_start: string;
  billing_period_end: string;
  subtotal_time: number | null;
  subtotal_expenses: number | null;
  total_amount: number | null;
  ytd_payments: number | null;
  threshold_warning: boolean | null;
  status: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

interface RemoteInvoiceLineItemRow {
  id: string;
  invoice_id: string;
  item_type: string;
  reference_id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  rate: number | null;
  amount: number;
  created_at: string;
}

interface RemoteTaxTrackingRow {
  id: string;
  contractor_id: string;
  tax_year: number;
  total_payments: number | null;
  total_invoices: number | null;
  threshold_reached: boolean | null;
  threshold_reached_at: string | null;
  form_1099_issued: boolean | null;
  form_1099_issued_at: string | null;
  form_1099_recipient_copy_sent: boolean | null;
  form_1099_irs_filed: boolean | null;
  created_at: string;
  updated_at: string;
}

interface RemoteContractorRow {
  id: string;
  profile_id?: string;
}

interface RemoteProfileRow {
  id: string;
  first_name: string;
  last_name: string;
}

interface RemoteTicketRow {
  id: string;
  ticket_number: string;
}

type InvoiceGenerationStatus = Extract<InvoiceStatus, 'DRAFT' | 'SUBMITTED'>;

export interface InvoiceGenerationPeriod {
  stormEventId?: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

export interface InvoiceGenerationTimeEntry {
  id: string;
  ticket_id?: string;
  ticket_number?: string;
  clock_in_at: string;
  clock_out_at?: string;
  break_minutes: number;
  billable_minutes?: number;
  billable_amount?: number;
  work_type: string;
  work_type_rate: number;
}

export interface InvoiceGenerationExpenseReport {
  id: string;
  report_period_start: string;
  report_period_end: string;
  total_amount: number;
}

export interface InvoiceGenerationCandidate {
  contractor_id: string;
  contractor_name?: string;
  time_entries: InvoiceGenerationTimeEntry[];
  expense_reports: InvoiceGenerationExpenseReport[];
  time_entry_count: number;
  expense_report_count: number;
  subtotal_time: number;
  subtotal_expenses: number;
  total_amount: number;
  projected_ytd_payments: number;
  threshold_warning: boolean;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_type: string;
  reference_id: string;
  description: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  amount: number;
  created_at: string;
}

export interface InvoiceDetails {
  invoice: ContractorInvoice;
  contractor_name?: string;
  line_items: InvoiceLineItem[];
  tax_1099_tracking?: Tax1099TrackingSummary;
}

export interface InvoiceListItem extends ContractorInvoice {
  contractor_name?: string;
  line_item_count: number;
}

export interface Tax1099TrackingSummary {
  contractor_id: string;
  tax_year: number;
  total_payments: number;
  total_invoices: number;
  threshold_reached: boolean;
  threshold_reached_at?: string;
  form_1099_issued: boolean;
  form_1099_issued_at?: string;
  form_1099_recipient_copy_sent: boolean;
  form_1099_irs_filed: boolean;
  updated_at?: string;
}

export interface GenerateInvoicesInput extends InvoiceGenerationPeriod {
  contractorIds: string[];
  generatedBy?: string;
  initialStatus?: InvoiceGenerationStatus;
}

export interface GeneratedInvoiceResult {
  invoice_id: string;
  invoice_number: string;
  contractor_id: string;
  subtotal_time: number;
  subtotal_expenses: number;
  total_amount: number;
  time_entry_ids: string[];
  expense_report_ids: string[];
  ytd_payments: number;
  threshold_warning: boolean;
}

export interface GenerateInvoicesResult {
  invoices: GeneratedInvoiceResult[];
  invoice_count: number;
  subtotal_time: number;
  subtotal_expenses: number;
  total_amount: number;
}

export interface InvoiceListFilters {
  contractorId?: string;
  status?: InvoiceStatus | 'ALL';
  from?: string;
  to?: string;
}

interface InvoiceGenerationDependencies {
  isOnline: () => boolean;
  now: () => Date;
  fetchGenerationCandidates: (period: InvoiceGenerationPeriod) => Promise<InvoiceGenerationCandidate[]>;
  fetchExistingInvoiceCount: () => Promise<number>;
  insertInvoice: (input: InsertInvoiceInput) => Promise<ContractorInvoice>;
  insertInvoiceLineItems: (invoiceId: string, lineItems: CreateInvoiceLineItemInput[]) => Promise<void>;
  linkTimeEntriesToInvoice: (timeEntryIds: string[], invoiceId: string) => Promise<void>;
  linkExpenseReportsToInvoice: (expenseReportIds: string[], invoiceId: string) => Promise<void>;
  fetchTax1099Tracking: (contractorId: string, taxYear: number) => Promise<Tax1099TrackingSummary | null>;
  upsertTax1099Tracking: (input: UpsertTax1099Input) => Promise<Tax1099TrackingSummary>;
  fetchInvoices: (filters: InvoiceListFilters) => Promise<InvoiceListItem[]>;
  fetchInvoiceDetails: (invoiceId: string) => Promise<InvoiceDetails | null>;
}

export interface InvoiceGenerationService {
  listGenerationCandidates: (period: InvoiceGenerationPeriod) => Promise<InvoiceGenerationCandidate[]>;
  generateInvoices: (input: GenerateInvoicesInput) => Promise<GenerateInvoicesResult>;
  listInvoices: (filters?: InvoiceListFilters) => Promise<InvoiceListItem[]>;
  getInvoiceDetails: (invoiceId: string) => Promise<InvoiceDetails | null>;
  getTax1099Tracking: (contractorId: string, taxYear?: number) => Promise<Tax1099TrackingSummary | null>;
}

interface InsertInvoiceInput {
  stormEventId: string;
  invoiceNumber: string;
  contractorId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotalTime: number;
  subtotalExpenses: number;
  totalAmount: number;
  ytdPayments: number;
  thresholdWarning: boolean;
  status: InvoiceGenerationStatus;
  generatedBy?: string;
  timestampIso: string;
}

interface CreateInvoiceLineItemInput {
  itemType: string;
  referenceId: string;
  description: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  amount: number;
}

interface UpsertTax1099Input {
  contractorId: string;
  taxYear: number;
  totalPayments: number;
  totalInvoices: number;
  thresholdReached: boolean;
  thresholdReachedAt?: string;
  timestampIso: string;
}

function toInvoiceStatus(value?: string | null): InvoiceStatus {
  const normalized = value?.toUpperCase();
  if (normalized === 'SUBMITTED') return 'SUBMITTED';
  if (normalized === 'UNDER_REVIEW') return 'UNDER_REVIEW';
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'PAID') return 'PAID';
  if (normalized === 'VOID') return 'VOID';
  return 'DRAFT';
}

function toPaymentMethod(value?: string | null): ContractorInvoice['payment_method'] {
  const normalized = value?.toUpperCase();
  if (normalized === 'ACH') return 'ACH';
  if (normalized === 'CHECK') return 'CHECK';
  if (normalized === 'WIRE') return 'WIRE';
  if (normalized === 'OTHER') return 'OTHER';
  return undefined;
}

function normalizeNumber(value?: number | null): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function roundToCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseIsoDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return parsed;
}

function validateBillingPeriod(period: InvoiceGenerationPeriod): void {
  if (!period.stormEventId) throw new Error('Select a storm event before billing.');
  const start = parseIsoDate(period.billingPeriodStart);
  const end = parseIsoDate(period.billingPeriodEnd);

  if (end.getTime() < start.getTime()) {
    throw new Error('Billing period end date must be on or after the start date.');
  }
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function mapRemoteInvoice(row: RemoteInvoiceRow): ContractorInvoice {
  return {
    id: row.id,
    storm_event_id: row.storm_event_id,
    invoice_number: row.invoice_number,
    contractor_id: row.contractor_id,
    billing_period_start: row.billing_period_start,
    billing_period_end: row.billing_period_end,
    subtotal_time: normalizeNumber(row.subtotal_time),
    subtotal_expenses: normalizeNumber(row.subtotal_expenses),
    total_amount: normalizeNumber(row.total_amount),
    ytd_payments: normalizeNumber(row.ytd_payments),
    threshold_warning: Boolean(row.threshold_warning),
    status: toInvoiceStatus(row.status),
    submitted_at: row.submitted_at ?? undefined,
    approved_at: row.approved_at ?? undefined,
    approved_by: row.approved_by ?? undefined,
    paid_at: row.paid_at ?? undefined,
    payment_method: toPaymentMethod(row.payment_method),
    payment_reference: row.payment_reference ?? undefined,
    pdf_url: row.pdf_url ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRemoteLineItem(row: RemoteInvoiceLineItemRow): InvoiceLineItem {
  return {
    id: row.id,
    invoice_id: row.invoice_id,
    item_type: row.item_type,
    reference_id: row.reference_id,
    description: row.description,
    quantity: row.quantity ?? undefined,
    unit: row.unit ?? undefined,
    rate: row.rate ?? undefined,
    amount: normalizeNumber(row.amount),
    created_at: row.created_at,
  };
}

function mapRemoteTaxTracking(row: RemoteTaxTrackingRow): Tax1099TrackingSummary {
  return {
    contractor_id: row.contractor_id,
    tax_year: row.tax_year,
    total_payments: normalizeNumber(row.total_payments),
    total_invoices: normalizeNumber(row.total_invoices),
    threshold_reached: Boolean(row.threshold_reached),
    threshold_reached_at: row.threshold_reached_at ?? undefined,
    form_1099_issued: Boolean(row.form_1099_issued),
    form_1099_issued_at: row.form_1099_issued_at ?? undefined,
    form_1099_recipient_copy_sent: Boolean(row.form_1099_recipient_copy_sent),
    form_1099_irs_filed: Boolean(row.form_1099_irs_filed),
    updated_at: row.updated_at,
  };
}

function createInvoiceNumber(taxYear: number, sequence: number): string {
  return `INV-${taxYear}-${String(sequence).padStart(4, '0')}`;
}

function defaultIsOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

function getTaxYearForPeriodEnd(periodEnd: string): number {
  return parseIsoDate(periodEnd).getUTCFullYear();
}

function calculateTimeEntryAmount(entry: InvoiceGenerationTimeEntry): number {
  if (typeof entry.billable_amount === 'number') {
    return roundToCurrency(Math.max(0, entry.billable_amount));
  }

  const billableMinutes = resolveBillableMinutesForEntry({
    clock_in_at: entry.clock_in_at,
    clock_out_at: entry.clock_out_at,
    break_minutes: entry.break_minutes,
    billable_minutes: entry.billable_minutes,
  });

  return roundToCurrency(calculateBillableAmount(billableMinutes, entry.work_type_rate));
}

function buildTimeEntryLineItems(candidate: InvoiceGenerationCandidate): CreateInvoiceLineItemInput[] {
  return candidate.time_entries.map((entry) => {
    const amount = calculateTimeEntryAmount(entry);
    const billableMinutes = resolveBillableMinutesForEntry({
      clock_in_at: entry.clock_in_at,
      clock_out_at: entry.clock_out_at,
      break_minutes: entry.break_minutes,
      billable_minutes: entry.billable_minutes,
    });

    const quantityHours = roundToCurrency(billableMinutes / 60);

    return {
      itemType: 'TIME_ENTRY',
      referenceId: entry.id,
      description: `${entry.work_type.replace(/_/g, ' ')}${entry.ticket_number ? ` (${entry.ticket_number})` : ''}`,
      quantity: quantityHours,
      unit: 'hours',
      rate: roundToCurrency(entry.work_type_rate),
      amount,
    };
  });
}

function buildExpenseReportLineItems(candidate: InvoiceGenerationCandidate): CreateInvoiceLineItemInput[] {
  return candidate.expense_reports.map((report) => ({
    itemType: 'EXPENSE_REPORT',
    referenceId: report.id,
    description: `Expense report ${report.report_period_start} to ${report.report_period_end}`,
    quantity: 1,
    unit: 'report',
    rate: roundToCurrency(report.total_amount),
    amount: roundToCurrency(report.total_amount),
  }));
}

async function fetchContractorNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contractorIds: string[],
): Promise<Map<string, string>> {
  if (contractorIds.length === 0) {
    return new Map();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contractors } = await (supabase.from('contractors') as any)
      .select('id, profile_id')
      .in('id', contractorIds);

    const contractorRows = (contractors ?? []) as RemoteContractorRow[];
    if (contractorRows.length === 0) {
      return new Map();
    }

    const profileIds = Array.from(
      new Set(
        contractorRows
          .map((row) => row.profile_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (profileIds.length === 0) {
      return new Map();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase.from('profiles') as any)
      .select('id, first_name, last_name')
      .in('id', profileIds);

    const profileRows = (profiles ?? []) as RemoteProfileRow[];
    const profileNameById = new Map(
      profileRows.map((row) => [row.id, `${row.first_name} ${row.last_name}`.trim()]),
    );

    return new Map(
      contractorRows.map((row) => [
        row.id,
        (row.profile_id ? profileNameById.get(row.profile_id) : undefined) ?? row.id,
      ]),
    );
  } catch {
    return new Map();
  }
}

async function fetchTicketNumbers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  ticketIds: string[],
): Promise<Map<string, string>> {
  if (ticketIds.length === 0) {
    return new Map();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('tickets') as any)
      .select('id, ticket_number')
      .in('id', ticketIds);

    const rows = (data ?? []) as RemoteTicketRow[];
    return new Map(rows.map((row) => [row.id, row.ticket_number]));
  } catch {
    return new Map();
  }
}

async function fetchTaxTrackingRowsForYear(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contractorIds: string[],
  taxYear: number,
): Promise<Map<string, Tax1099TrackingSummary>> {
  if (contractorIds.length === 0) {
    return new Map();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('tax_1099_tracking') as any)
      .select('*')
      .eq('tax_year', taxYear)
      .in('contractor_id', contractorIds);

    const rows = (data ?? []) as RemoteTaxTrackingRow[];
    return new Map(rows.map((row) => [row.contractor_id, mapRemoteTaxTracking(row)]));
  } catch {
    return new Map();
  }
}

async function fetchGenerationCandidates(period: InvoiceGenerationPeriod): Promise<InvoiceGenerationCandidate[]> {
  validateBillingPeriod(period);
  const { supabase } = await import('../supabase/client');

  const periodStart = toDateOnly(period.billingPeriodStart);
  const periodEnd = toDateOnly(period.billingPeriodEnd);
  const periodStartIso = `${periodStart}T00:00:00.000Z`;
  const periodEndIso = `${periodEnd}T23:59:59.999Z`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: timeData, error: timeError } = await (supabase.from('time_entries') as any)
    .select('id, contractor_id, ticket_id, clock_in_at, clock_out_at, break_minutes, billable_minutes, billable_amount, work_type, work_type_rate, status, invoice_id')
    .eq('storm_event_id', period.stormEventId)
    .eq('status', 'APPROVED')
    .is('invoice_id', null)
    .gte('clock_in_at', periodStartIso)
    .lte('clock_in_at', periodEndIso)
    .order('clock_in_at', { ascending: true });

  if (timeError) {
    throw timeError;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: expenseData, error: expenseError } = await (supabase.from('expense_reports') as any)
    .select('id, contractor_id, report_period_start, report_period_end, total_amount, status, invoice_id')
    .eq('storm_event_id', period.stormEventId)
    .eq('status', 'APPROVED')
    .is('invoice_id', null)
    .lte('report_period_start', periodEnd)
    .gte('report_period_end', periodStart)
    .order('report_period_start', { ascending: true });

  if (expenseError) {
    throw expenseError;
  }

  const timeRows = (timeData ?? []) as RemoteTimeEntryRow[];
  const expenseRows = (expenseData ?? []) as RemoteExpenseReportRow[];

  const contractorIds = Array.from(
    new Set([...timeRows.map((row) => row.contractor_id), ...expenseRows.map((row) => row.contractor_id)]),
  );
  const ticketIds = Array.from(
    new Set(timeRows.map((row) => row.ticket_id).filter((value): value is string => Boolean(value))),
  );

  const taxYear = getTaxYearForPeriodEnd(period.billingPeriodEnd);

  const [contractorNameById, ticketNumberById, taxTrackingByContractorId] = await Promise.all([
    fetchContractorNames(supabase, contractorIds),
    fetchTicketNumbers(supabase, ticketIds),
    fetchTaxTrackingRowsForYear(supabase, contractorIds, taxYear),
  ]);

  const candidatesByContractorId = new Map<string, InvoiceGenerationCandidate>();

  for (const row of timeRows) {
    const existing = candidatesByContractorId.get(row.contractor_id);
    const candidate =
      existing ??
      {
        contractor_id: row.contractor_id,
        contractor_name: contractorNameById.get(row.contractor_id),
        time_entries: [],
        expense_reports: [],
        time_entry_count: 0,
        expense_report_count: 0,
        subtotal_time: 0,
        subtotal_expenses: 0,
        total_amount: 0,
        projected_ytd_payments: 0,
        threshold_warning: false,
      };

    const mappedEntry: InvoiceGenerationTimeEntry = {
      id: row.id,
      ticket_id: row.ticket_id ?? undefined,
      ticket_number: row.ticket_id ? ticketNumberById.get(row.ticket_id) : undefined,
      clock_in_at: row.clock_in_at,
      clock_out_at: row.clock_out_at ?? undefined,
      break_minutes: row.break_minutes ?? 0,
      billable_minutes: row.billable_minutes ?? undefined,
      billable_amount: row.billable_amount ?? undefined,
      work_type: row.work_type,
      work_type_rate: row.work_type_rate,
    };

    candidate.time_entries.push(mappedEntry);
    candidate.time_entry_count += 1;
    candidate.subtotal_time = roundToCurrency(
      candidate.subtotal_time + calculateTimeEntryAmount(mappedEntry),
    );

    candidatesByContractorId.set(row.contractor_id, candidate);
  }

  for (const row of expenseRows) {
    const existing = candidatesByContractorId.get(row.contractor_id);
    const candidate =
      existing ??
      {
        contractor_id: row.contractor_id,
        contractor_name: contractorNameById.get(row.contractor_id),
        time_entries: [],
        expense_reports: [],
        time_entry_count: 0,
        expense_report_count: 0,
        subtotal_time: 0,
        subtotal_expenses: 0,
        total_amount: 0,
        projected_ytd_payments: 0,
        threshold_warning: false,
      };

    const reportAmount = roundToCurrency(normalizeNumber(row.total_amount));
    candidate.expense_reports.push({
      id: row.id,
      report_period_start: row.report_period_start,
      report_period_end: row.report_period_end,
      total_amount: reportAmount,
    });

    candidate.expense_report_count += 1;
    candidate.subtotal_expenses = roundToCurrency(candidate.subtotal_expenses + reportAmount);

    candidatesByContractorId.set(row.contractor_id, candidate);
  }

  const candidates = Array.from(candidatesByContractorId.values()).map((candidate) => {
    candidate.total_amount = roundToCurrency(candidate.subtotal_time + candidate.subtotal_expenses);

    const tracking = taxTrackingByContractorId.get(candidate.contractor_id);
    const ytdBase = tracking?.total_payments ?? 0;
    candidate.projected_ytd_payments = roundToCurrency(ytdBase + candidate.total_amount);
    candidate.threshold_warning = candidate.projected_ytd_payments >= APP_CONFIG.T1099_THRESHOLD;

    return candidate;
  });

  return candidates.sort((left, right) => {
    const leftName = left.contractor_name ?? left.contractor_id;
    const rightName = right.contractor_name ?? right.contractor_id;
    return leftName.localeCompare(rightName);
  });
}

async function fetchExistingInvoiceCount(): Promise<number> {
  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase.from('contractor_invoices') as any).select('id', {
    head: true,
    count: 'exact',
  });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function insertInvoice(input: InsertInvoiceInput): Promise<ContractorInvoice> {
  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('contractor_invoices') as any)
    .insert([
      {
        storm_event_id: input.stormEventId,
        invoice_number: input.invoiceNumber,
        contractor_id: input.contractorId,
        billing_period_start: input.billingPeriodStart,
        billing_period_end: input.billingPeriodEnd,
        subtotal_time: input.subtotalTime,
        subtotal_expenses: input.subtotalExpenses,
        total_amount: input.totalAmount,
        ytd_payments: input.ytdPayments,
        threshold_warning: input.thresholdWarning,
        status: input.status,
        submitted_at: input.status === 'SUBMITTED' ? input.timestampIso : null,
        created_at: input.timestampIso,
        updated_at: input.timestampIso,
        created_by: input.generatedBy ?? null,
        updated_by: input.generatedBy ?? null,
      },
    ])
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapRemoteInvoice(data as RemoteInvoiceRow);
}

async function insertInvoiceLineItems(
  invoiceId: string,
  lineItems: CreateInvoiceLineItemInput[],
): Promise<void> {
  if (lineItems.length === 0) {
    return;
  }

  const { supabase } = await import('../supabase/client');
  const payload = lineItems.map((item) => ({
    invoice_id: invoiceId,
    item_type: item.itemType,
    reference_id: item.referenceId,
    description: item.description,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    rate: item.rate ?? null,
    amount: item.amount,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('invoice_line_items') as any).insert(payload);
  if (error) {
    throw error;
  }
}

async function linkTimeEntriesToInvoice(timeEntryIds: string[], invoiceId: string): Promise<void> {
  if (timeEntryIds.length === 0) {
    return;
  }

  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('time_entries') as any)
    .update({ invoice_id: invoiceId, updated_at: new Date().toISOString() })
    .in('id', timeEntryIds);

  if (error) {
    throw error;
  }
}

async function linkExpenseReportsToInvoice(expenseReportIds: string[], invoiceId: string): Promise<void> {
  if (expenseReportIds.length === 0) {
    return;
  }

  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('expense_reports') as any)
    .update({ invoice_id: invoiceId, updated_at: new Date().toISOString() })
    .in('id', expenseReportIds);

  if (error) {
    throw error;
  }
}

async function fetchTax1099Tracking(
  contractorId: string,
  taxYear: number,
): Promise<Tax1099TrackingSummary | null> {
  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tax_1099_tracking') as any)
    .select('*')
    .eq('contractor_id', contractorId)
    .eq('tax_year', taxYear)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapRemoteTaxTracking(data as RemoteTaxTrackingRow);
}

async function upsertTax1099Tracking(input: UpsertTax1099Input): Promise<Tax1099TrackingSummary> {
  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tax_1099_tracking') as any)
    .upsert(
      {
        contractor_id: input.contractorId,
        tax_year: input.taxYear,
        total_payments: input.totalPayments,
        total_invoices: input.totalInvoices,
        threshold_reached: input.thresholdReached,
        threshold_reached_at: input.thresholdReachedAt ?? null,
        updated_at: input.timestampIso,
      },
      { onConflict: 'contractor_id,tax_year' },
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapRemoteTaxTracking(data as RemoteTaxTrackingRow);
}

async function fetchLineItemCountByInvoiceId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  invoiceIds: string[],
): Promise<Map<string, number>> {
  if (invoiceIds.length === 0) {
    return new Map();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('invoice_line_items') as any)
      .select('invoice_id')
      .in('invoice_id', invoiceIds);

    const rows = (data ?? []) as Array<{ invoice_id: string }>;
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.invoice_id, (counts.get(row.invoice_id) ?? 0) + 1);
    }

    return counts;
  } catch {
    return new Map();
  }
}

async function fetchInvoices(filters: InvoiceListFilters): Promise<InvoiceListItem[]> {
  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('contractor_invoices') as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.contractorId) {
    query = query.eq('contractor_id', filters.contractorId);
  }

  if (filters.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status);
  }

  if (filters.from) {
    query = query.gte('billing_period_start', filters.from);
  }

  if (filters.to) {
    query = query.lte('billing_period_end', filters.to);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const invoiceRows = (data ?? []) as RemoteInvoiceRow[];
  const invoiceIds = invoiceRows.map((row) => row.id);
  const contractorIds = Array.from(new Set(invoiceRows.map((row) => row.contractor_id)));

  const [lineItemCountByInvoiceId, contractorNameById] = await Promise.all([
    fetchLineItemCountByInvoiceId(supabase, invoiceIds),
    fetchContractorNames(supabase, contractorIds),
  ]);

  return invoiceRows.map((row) => ({
    ...mapRemoteInvoice(row),
    contractor_name: contractorNameById.get(row.contractor_id),
    line_item_count: lineItemCountByInvoiceId.get(row.id) ?? 0,
  }));
}

async function fetchInvoiceDetails(invoiceId: string): Promise<InvoiceDetails | null> {
  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoiceData, error: invoiceError } = await (supabase.from('contractor_invoices') as any)
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();

  if (invoiceError) {
    throw invoiceError;
  }

  if (!invoiceData) {
    return null;
  }

  const invoice = mapRemoteInvoice(invoiceData as RemoteInvoiceRow);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lineItemData, error: lineItemError } = await (supabase.from('invoice_line_items') as any)
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('created_at', { ascending: true });

  if (lineItemError) {
    throw lineItemError;
  }

  const lineItems = ((lineItemData ?? []) as RemoteInvoiceLineItemRow[]).map(mapRemoteLineItem);

  const taxYear = getTaxYearForPeriodEnd(invoice.billing_period_end);
  const [contractorNameById, tracking] = await Promise.all([
    fetchContractorNames(supabase, [invoice.contractor_id]),
    fetchTax1099Tracking(invoice.contractor_id, taxYear),
  ]);

  return {
    invoice,
    contractor_name: contractorNameById.get(invoice.contractor_id),
    line_items: lineItems,
    tax_1099_tracking: tracking ?? undefined,
  };
}

const defaultDependencies: InvoiceGenerationDependencies = {
  isOnline: defaultIsOnline,
  now: () => new Date(),
  fetchGenerationCandidates,
  fetchExistingInvoiceCount,
  insertInvoice,
  insertInvoiceLineItems,
  linkTimeEntriesToInvoice,
  linkExpenseReportsToInvoice,
  fetchTax1099Tracking,
  upsertTax1099Tracking,
  fetchInvoices,
  fetchInvoiceDetails,
};

export function createInvoiceGenerationService(
  overrides: Partial<InvoiceGenerationDependencies> = {},
): InvoiceGenerationService {
  const dependencies: InvoiceGenerationDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async listGenerationCandidates(period: InvoiceGenerationPeriod): Promise<InvoiceGenerationCandidate[]> {
      validateBillingPeriod(period);
      if (isSuperAdminTestingEnabled()) return [];
      return dependencies.fetchGenerationCandidates(period);
    },

    async generateInvoices(input: GenerateInvoicesInput): Promise<GenerateInvoicesResult> {
      validateBillingPeriod(input);

      if (isSuperAdminTestingEnabled()) throw new Error('No approved local time or expense entries are available to bill.');
      if (!dependencies.isOnline()) {
        throw new Error('Invoice generation requires an internet connection.');
      }

      const selectedIds = Array.from(new Set(input.contractorIds.filter(Boolean)));
      if (selectedIds.length === 0) {
        throw new Error('Select at least one contractor before generating invoices.');
      }

      const allCandidates = await dependencies.fetchGenerationCandidates({
        stormEventId: input.stormEventId,
        billingPeriodStart: input.billingPeriodStart,
        billingPeriodEnd: input.billingPeriodEnd,
      });

      const selectedCandidates = selectedIds
        .map((id) => allCandidates.find((candidate) => candidate.contractor_id === id))
        .filter((candidate): candidate is InvoiceGenerationCandidate => Boolean(candidate))
        .filter((candidate) => candidate.total_amount > 0);

      if (selectedCandidates.length === 0) {
        throw new Error('No approved billable entries found for selected contractors in the billing period.');
      }

      const now = dependencies.now();
      const nowIso = now.toISOString();
      const taxYear = getTaxYearForPeriodEnd(input.billingPeriodEnd);
      const thresholdAmount = APP_CONFIG.T1099_THRESHOLD;
      const initialStatus = input.initialStatus ?? 'SUBMITTED';

      let nextSequence = (await dependencies.fetchExistingInvoiceCount()) + 1;

      const generatedInvoices: GeneratedInvoiceResult[] = [];

      for (const candidate of selectedCandidates) {
        const invoiceNumber = createInvoiceNumber(taxYear, nextSequence);
        nextSequence += 1;

        const existingTracking = await dependencies.fetchTax1099Tracking(candidate.contractor_id, taxYear);
        const previousPayments = existingTracking?.total_payments ?? 0;
        const previousInvoices = existingTracking?.total_invoices ?? 0;

        const nextYtdPayments = roundToCurrency(previousPayments + candidate.total_amount);
        const thresholdWarning = nextYtdPayments >= thresholdAmount;
        const thresholdReachedAt = existingTracking?.threshold_reached_at ?? (thresholdWarning ? nowIso : undefined);

        const createdInvoice = await dependencies.insertInvoice({
          stormEventId: input.stormEventId!,
          invoiceNumber,
          contractorId: candidate.contractor_id,
          billingPeriodStart: input.billingPeriodStart,
          billingPeriodEnd: input.billingPeriodEnd,
          subtotalTime: candidate.subtotal_time,
          subtotalExpenses: candidate.subtotal_expenses,
          totalAmount: candidate.total_amount,
          ytdPayments: nextYtdPayments,
          thresholdWarning,
          status: initialStatus,
          generatedBy: input.generatedBy,
          timestampIso: nowIso,
        });

        const lineItems = [...buildTimeEntryLineItems(candidate), ...buildExpenseReportLineItems(candidate)];

        await dependencies.insertInvoiceLineItems(createdInvoice.id, lineItems);

        const timeEntryIds = candidate.time_entries.map((entry) => entry.id);
        const expenseReportIds = candidate.expense_reports.map((report) => report.id);

        await Promise.all([
          dependencies.linkTimeEntriesToInvoice(timeEntryIds, createdInvoice.id),
          dependencies.linkExpenseReportsToInvoice(expenseReportIds, createdInvoice.id),
        ]);

        const tracking = await dependencies.upsertTax1099Tracking({
          contractorId: candidate.contractor_id,
          taxYear,
          totalPayments: nextYtdPayments,
          totalInvoices: previousInvoices + 1,
          thresholdReached: thresholdWarning,
          thresholdReachedAt,
          timestampIso: nowIso,
        });

        generatedInvoices.push({
          invoice_id: createdInvoice.id,
          invoice_number: createdInvoice.invoice_number,
          contractor_id: candidate.contractor_id,
          subtotal_time: candidate.subtotal_time,
          subtotal_expenses: candidate.subtotal_expenses,
          total_amount: candidate.total_amount,
          time_entry_ids: timeEntryIds,
          expense_report_ids: expenseReportIds,
          ytd_payments: tracking.total_payments,
          threshold_warning: tracking.threshold_reached,
        });
      }

      return {
        invoices: generatedInvoices,
        invoice_count: generatedInvoices.length,
        subtotal_time: roundToCurrency(generatedInvoices.reduce((sum, row) => sum + row.subtotal_time, 0)),
        subtotal_expenses: roundToCurrency(generatedInvoices.reduce((sum, row) => sum + row.subtotal_expenses, 0)),
        total_amount: roundToCurrency(generatedInvoices.reduce((sum, row) => sum + row.total_amount, 0)),
      };
    },

    async listInvoices(filters: InvoiceListFilters = {}): Promise<InvoiceListItem[]> {
      if (isSuperAdminTestingEnabled()) throw new Error('No approved local time or expense entries are available to bill.');
      if (!dependencies.isOnline()) {
        return [];
      }

      return dependencies.fetchInvoices(filters);
    },

    async getInvoiceDetails(invoiceId: string): Promise<InvoiceDetails | null> {
      if (!invoiceId) {
        return null;
      }

      if (isSuperAdminTestingEnabled()) throw new Error('No approved local time or expense entries are available to bill.');
      if (!dependencies.isOnline()) {
        return null;
      }

      return dependencies.fetchInvoiceDetails(invoiceId);
    },

    async getTax1099Tracking(
      contractorId: string,
      taxYear: number = new Date().getUTCFullYear(),
    ): Promise<Tax1099TrackingSummary | null> {
      if (!contractorId) {
        return null;
      }

      if (isSuperAdminTestingEnabled()) throw new Error('No approved local time or expense entries are available to bill.');
      if (!dependencies.isOnline()) {
        return null;
      }

      return dependencies.fetchTax1099Tracking(contractorId, taxYear);
    },
  };
}

export const invoiceGenerationService = createInvoiceGenerationService();
