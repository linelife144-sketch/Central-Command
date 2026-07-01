import { APP_CONFIG } from '../config/appConfig';
import { addToSyncQueue, db, type LocalExpenseItem, type LocalExpenseReport } from '../db/dexie';
import { receiptOcrService } from './receiptOcrService';
import {
  calculateMileageExpense,
  validateExpensePolicy,
  type ExpenseDuplicateCandidate,
} from '../utils/expenseProcessing';
import type { ExpenseCategory, ExpenseStatus, PolicyFlag } from '../../types';

interface RemoteExpenseReportRow {
  id: string;
  contractor_id: string;
  report_period_start: string;
  report_period_end: string;
  total_amount: number | null;
  mileage_total: number | null;
  item_count: number | null;
  status: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
  expense_items?: RemoteExpenseItemRow[] | null;
}

interface RemoteExpenseItemRow {
  id: string;
  expense_report_id: string;
  category: string;
  description: string;
  amount: number;
  currency: string | null;
  expense_date: string;
  receipt_url: string | null;
  receipt_ocr_text: string | null;
  mileage_start: number | null;
  mileage_end: number | null;
  mileage_rate: number | null;
  mileage_calculated_amount: number | null;
  from_location: string | null;
  to_location: string | null;
  policy_flags: string[] | null;
  requires_approval: boolean | null;
  approval_reason: string | null;
  ticket_id: string | null;
  billable_to_client: boolean | null;
  created_at: string;
  updated_at: string;
}

interface RemoteTicketRow {
  id: string;
  ticket_number: string;
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

type ExpenseSyncStatus = 'SYNCED' | 'PENDING' | 'FAILED';
type ExpenseStatusFilter = ExpenseStatus | 'ALL';

export interface ExpenseListFilters {
  contractorId?: string;
  status?: ExpenseStatusFilter;
  from?: string;
  to?: string;
}

export interface ExpenseListItem {
  id: string;
  expense_report_id: string;
  contractor_id: string;
  contractor_name?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  receipt_url?: string;
  receipt_ocr_text?: string;
  mileage_start?: number;
  mileage_end?: number;
  mileage_rate?: number;
  mileage_calculated_amount?: number;
  from_location?: string;
  to_location?: string;
  policy_flags: PolicyFlag[];
  requires_approval: boolean;
  approval_reason?: string;
  ticket_id?: string;
  ticket_number?: string;
  billable_to_client: boolean;
  report_status: ExpenseStatus;
  report_period_start: string;
  report_period_end: string;
  sync_status: ExpenseSyncStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseItemInput {
  contractorId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  receiptFile?: File | null;
  receiptOcrText?: string;
  mileageStart?: number;
  mileageEnd?: number;
  fromLocation?: string;
  toLocation?: string;
  ticketId?: string;
  billableToClient?: boolean;
}

interface ExpenseSubmissionDependencies {
  isOnline: () => boolean;
  listRemote: (filters: ExpenseListFilters) => Promise<ExpenseListItem[]>;
  listLocal: (filters: ExpenseListFilters) => Promise<ExpenseListItem[]>;
  createRemote: (input: CreateExpenseItemInput) => Promise<ExpenseListItem>;
  createLocal: (input: CreateExpenseItemInput) => Promise<ExpenseListItem>;
}

export interface ExpenseSubmissionService {
  listExpenses: (filters?: ExpenseListFilters) => Promise<ExpenseListItem[]>;
  createExpenseItem: (input: CreateExpenseItemInput) => Promise<ExpenseListItem>;
}

function createId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseTimestamp(value?: string): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toExpenseStatus(status: string): ExpenseStatus {
  const normalized = status.toUpperCase();
  if (normalized === 'SUBMITTED') return 'SUBMITTED';
  if (normalized === 'UNDER_REVIEW') return 'UNDER_REVIEW';
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  if (normalized === 'PAID') return 'PAID';
  return 'DRAFT';
}

function toExpenseCategory(category: string): ExpenseCategory {
  const normalized = category.toUpperCase();
  if (normalized === 'MILEAGE') return 'MILEAGE';
  if (normalized === 'FUEL') return 'FUEL';
  if (normalized === 'LODGING') return 'LODGING';
  if (normalized === 'MEALS') return 'MEALS';
  if (normalized === 'TOLLS') return 'TOLLS';
  if (normalized === 'PARKING') return 'PARKING';
  if (normalized === 'MATERIALS') return 'MATERIALS';
  if (normalized === 'EQUIPMENT_RENTAL') return 'EQUIPMENT_RENTAL';
  return 'OTHER';
}

function toSyncStatus(status?: string | null): ExpenseSyncStatus {
  const normalized = status?.toUpperCase();
  if (normalized === 'FAILED') {
    return 'FAILED';
  }

  if (normalized === 'PENDING') {
    return 'PENDING';
  }

  return 'SYNCED';
}

function toPolicyFlags(flags?: string[] | null): PolicyFlag[] {
  if (!Array.isArray(flags)) {
    return [];
  }

  const allowedFlags = new Set<PolicyFlag>([
    'RECEIPT_REQUIRED',
    'OVER_LIMIT',
    'PRE_APPROVAL_REQUIRED',
    'DUPLICATE_DETECTED',
    'INVALID_DATE',
  ]);

  return flags
    .filter((flag): flag is string => typeof flag === 'string')
    .map((flag) => flag.trim().toUpperCase())
    .filter((flag): flag is PolicyFlag => allowedFlags.has(flag as PolicyFlag));
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function normalizeExpenseDate(expenseDate: string): string {
  const parsed = Date.parse(expenseDate);
  if (Number.isNaN(parsed)) {
    throw new Error('Expense date is invalid.');
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function getExpenseMonthPeriod(expenseDate: string): { start: string; end: string } {
  const normalizedDate = normalizeExpenseDate(expenseDate);
  const parsed = new Date(normalizedDate);

  const start = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
  const end = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function matchesDateRange(expenseDate: string, filters: ExpenseListFilters): boolean {
  const expenseTime = parseTimestamp(expenseDate);

  const fromTime = filters.from ? parseTimestamp(filters.from) : null;
  if (fromTime !== null && expenseTime < fromTime) {
    return false;
  }

  const toTime = filters.to ? parseTimestamp(filters.to) : null;
  if (toTime !== null && expenseTime > toTime) {
    return false;
  }

  return true;
}

function validateCreateInput(input: CreateExpenseItemInput): void {
  if (!input.contractorId.trim()) {
    throw new Error('Contractor is required.');
  }

  if (!input.description.trim()) {
    throw new Error('Expense description is required.');
  }

  const hasValidManualAmount = Number.isFinite(input.amount) && input.amount > 0;
  const mileageResult = calculateMileageExpense({
    mileageStart: input.mileageStart,
    mileageEnd: input.mileageEnd,
  });

  if (input.category === 'MILEAGE') {
    if (!hasValidManualAmount && (!mileageResult.isValid || mileageResult.calculatedAmount <= 0)) {
      throw new Error('Mileage expenses require valid odometer values or an amount greater than zero.');
    }
  } else if (!hasValidManualAmount) {
    throw new Error('Expense amount must be greater than zero.');
  }

  normalizeExpenseDate(input.expenseDate);
}

function mapRemoteItemToListItem(
  report: RemoteExpenseReportRow,
  item: RemoteExpenseItemRow,
  ticketNumberById: Map<string, string>,
  contractorNameById: Map<string, string>,
): ExpenseListItem {
  return {
    id: item.id,
    expense_report_id: item.expense_report_id,
    contractor_id: report.contractor_id,
    contractor_name: contractorNameById.get(report.contractor_id),
    category: toExpenseCategory(item.category),
    description: item.description,
    amount: Number(item.amount ?? 0),
    currency: item.currency ?? 'USD',
    expense_date: item.expense_date,
    receipt_url: item.receipt_url ?? undefined,
    receipt_ocr_text: item.receipt_ocr_text ?? undefined,
    mileage_start: item.mileage_start ?? undefined,
    mileage_end: item.mileage_end ?? undefined,
    mileage_rate: item.mileage_rate ?? undefined,
    mileage_calculated_amount: item.mileage_calculated_amount ?? undefined,
    from_location: item.from_location ?? undefined,
    to_location: item.to_location ?? undefined,
    policy_flags: toPolicyFlags(item.policy_flags),
    requires_approval: Boolean(item.requires_approval),
    approval_reason: item.approval_reason ?? undefined,
    ticket_id: item.ticket_id ?? undefined,
    ticket_number: item.ticket_id ? ticketNumberById.get(item.ticket_id) : undefined,
    billable_to_client: Boolean(item.billable_to_client),
    report_status: toExpenseStatus(report.status),
    report_period_start: report.report_period_start,
    report_period_end: report.report_period_end,
    sync_status: toSyncStatus(report.sync_status),
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function mapLocalItemToListItem(report: LocalExpenseReport, item: LocalExpenseItem): ExpenseListItem {
  const createdAt = item.created_at ?? report.created_at ?? new Date().toISOString();
  const updatedAt = item.updated_at ?? report.updated_at ?? createdAt;

  return {
    id: item.id,
    expense_report_id: item.expense_report_id,
    contractor_id: report.contractor_id,
    category: toExpenseCategory(item.category),
    description: item.description,
    amount: Number(item.amount ?? 0),
    currency: item.currency ?? 'USD',
    expense_date: item.expense_date,
    receipt_url: item.receipt_url,
    receipt_ocr_text: item.receipt_ocr_text,
    mileage_start: item.mileage_start,
    mileage_end: item.mileage_end,
    mileage_rate: item.mileage_rate,
    mileage_calculated_amount: item.mileage_calculated_amount,
    from_location: item.from_location,
    to_location: item.to_location,
    policy_flags: toPolicyFlags(item.policy_flags),
    requires_approval: Boolean(item.requires_approval),
    approval_reason: item.approval_reason,
    ticket_id: item.ticket_id,
    billable_to_client: Boolean(item.billable_to_client),
    report_status: toExpenseStatus(report.status),
    report_period_start: report.report_period_start,
    report_period_end: report.report_period_end,
    sync_status: item.synced ? 'SYNCED' : 'PENDING',
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function defaultIsOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

async function resolveContractorId(contractorOrProfileId: string): Promise<string> {
  const { supabase } = await import('../supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('contractors') as any)
    .select('id')
    .or(`id.eq.${contractorOrProfileId},profile_id.eq.${contractorOrProfileId}`)
    .limit(1);

  const rows = (data ?? []) as RemoteContractorRow[];
  return rows[0]?.id ?? contractorOrProfileId;
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
      new Set(contractorRows.map((row) => row.profile_id).filter((value): value is string => Boolean(value))),
    );

    if (profileIds.length === 0) {
      return new Map(contractorRows.map((row) => [row.id, row.id]));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase.from('profiles') as any)
      .select('id, first_name, last_name')
      .in('id', profileIds);

    const profileRows = (profiles ?? []) as RemoteProfileRow[];
    const profileNameById = new Map(
      profileRows.map((profile) => [profile.id, `${profile.first_name} ${profile.last_name}`.trim()]),
    );

    return new Map(
      contractorRows.map((row) => [row.id, row.profile_id ? profileNameById.get(row.profile_id) ?? row.id : row.id]),
    );
  } catch {
    return new Map();
  }
}

async function listRemote(filters: ExpenseListFilters): Promise<ExpenseListItem[]> {
  const { supabase } = await import('../supabase/client');

  let resolvedContractorId: string | undefined;
  if (filters.contractorId) {
    resolvedContractorId = await resolveContractorId(filters.contractorId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('expense_reports') as any)
    .select(
      [
        'id',
        'contractor_id',
        'report_period_start',
        'report_period_end',
        'total_amount',
        'mileage_total',
        'item_count',
        'status',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'sync_status',
        'created_at',
        'updated_at',
        'expense_items(*)',
      ].join(','),
    )
    .order('created_at', { ascending: false });

  if (resolvedContractorId) {
    query = query.eq('contractor_id', resolvedContractorId);
  }

  if (filters.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const reports = (data ?? []) as RemoteExpenseReportRow[];

  const ticketIds = Array.from(
    new Set(
      reports
        .flatMap((report) => report.expense_items ?? [])
        .map((item) => item.ticket_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const contractorIds = Array.from(new Set(reports.map((report) => report.contractor_id)));

  const [ticketNumberById, contractorNameById] = await Promise.all([
    fetchTicketNumbers(supabase, ticketIds),
    fetchContractorNames(supabase, contractorIds),
  ]);

  const items = reports.flatMap((report) =>
    (report.expense_items ?? []).map((item) =>
      mapRemoteItemToListItem(report, item, ticketNumberById, contractorNameById),
    ),
  );

  return items
    .filter((item) => matchesDateRange(item.expense_date, filters))
    .sort((left, right) => parseTimestamp(right.expense_date) - parseTimestamp(left.expense_date));
}

async function listLocal(filters: ExpenseListFilters): Promise<ExpenseListItem[]> {
  if (!filters.contractorId) {
    return [];
  }

  const reports = await db.expenseReports
    .where('contractor_id')
    .equals(filters.contractorId)
    .toArray();

  const filteredReports = reports.filter((report) =>
    filters.status && filters.status !== 'ALL'
      ? toExpenseStatus(report.status) === filters.status
      : true,
  );

  if (filteredReports.length === 0) {
    return [];
  }

  const reportById = new Map(filteredReports.map((report) => [report.id, report]));
  const reportIds = filteredReports.map((report) => report.id);
  const items = await db.expenseItems.where('expense_report_id').anyOf(reportIds).toArray();

  return items
    .map((item) => {
      const report = reportById.get(item.expense_report_id);
      if (!report) {
        return null;
      }

      return mapLocalItemToListItem(report, item);
    })
    .filter((item): item is ExpenseListItem => Boolean(item))
    .filter((item) => matchesDateRange(item.expense_date, filters))
    .sort((left, right) => parseTimestamp(right.expense_date) - parseTimestamp(left.expense_date));
}

async function getOrCreateDraftReport(
  contractorId: string,
  expenseDate: string,
): Promise<RemoteExpenseReportRow> {
  const { supabase } = await import('../supabase/client');
  const { start, end } = getExpenseMonthPeriod(expenseDate);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: existingError } = await (supabase.from('expense_reports') as any)
    .select('*')
    .eq('contractor_id', contractorId)
    .eq('status', 'DRAFT')
    .eq('report_period_start', start)
    .eq('report_period_end', end)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  const existingReport = (existing ?? [])[0] as RemoteExpenseReportRow | undefined;
  if (existingReport) {
    return existingReport;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error: createError } = await (supabase.from('expense_reports') as any)
    .insert([
      {
        contractor_id: contractorId,
        report_period_start: start,
        report_period_end: end,
        status: 'DRAFT',
      },
    ])
    .select('*')
    .single();

  if (createError) {
    throw createError;
  }

  return created as RemoteExpenseReportRow;
}

async function uploadReceipt(
  contractorId: string,
  expenseItemId: string,
  receiptFile: File,
): Promise<string> {
  const { supabase } = await import('../supabase/client');
  const safeName = sanitizeFileName(receiptFile.name || 'receipt.jpg');
  const path = `${contractorId}/${expenseItemId}_${Date.now()}_${safeName}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(path, receiptFile, {
      contentType: receiptFile.type || 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return data.path;
}

function toRoundedAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function toDuplicateCandidateFromRemote(item: RemoteExpenseItemRow): ExpenseDuplicateCandidate {
  return {
    category: toExpenseCategory(item.category),
    amount: Number(item.amount ?? 0),
    expenseDate: item.expense_date,
    description: item.description,
  };
}

function toDuplicateCandidateFromLocal(item: LocalExpenseItem): ExpenseDuplicateCandidate {
  return {
    category: toExpenseCategory(item.category),
    amount: Number(item.amount ?? 0),
    expenseDate: item.expense_date,
    description: item.description,
  };
}

async function resolveReceiptOcrText(input: CreateExpenseItemInput): Promise<string | undefined> {
  const providedText = input.receiptOcrText?.trim();
  if (providedText) {
    return providedText;
  }

  if (!input.receiptFile) {
    return undefined;
  }

  return receiptOcrService.extractText(input.receiptFile);
}

interface ProcessedCreateInput {
  normalizedDate: string;
  amount: number;
  mileageStart?: number;
  mileageEnd?: number;
  mileageRate?: number;
  mileageTotal: number;
  mileageCalculatedAmount?: number;
  receiptOcrText?: string;
  policyFlags: PolicyFlag[];
  requiresApproval: boolean;
  approvalReason?: string;
}

async function processCreateInput(
  input: CreateExpenseItemInput,
  existingItems: ExpenseDuplicateCandidate[],
): Promise<ProcessedCreateInput> {
  const normalizedDate = normalizeExpenseDate(input.expenseDate);
  const manualAmount = toRoundedAmount(input.amount);
  const mileageResult = calculateMileageExpense({
    mileageStart: input.mileageStart,
    mileageEnd: input.mileageEnd,
    mileageRate: APP_CONFIG.MILEAGE_RATE,
  });

  const amount =
    input.category === 'MILEAGE' && mileageResult.isValid && mileageResult.calculatedAmount > 0
      ? mileageResult.calculatedAmount
      : manualAmount;

  const receiptOcrText = await resolveReceiptOcrText(input);

  const policyResult = validateExpensePolicy({
    category: input.category,
    amount,
    expenseDate: normalizedDate,
    receiptProvided: Boolean(input.receiptFile || receiptOcrText),
    description: input.description,
    existingItems,
    ocrText: receiptOcrText,
  });

  return {
    normalizedDate,
    amount,
    mileageStart: mileageResult.isValid ? input.mileageStart : undefined,
    mileageEnd: mileageResult.isValid ? input.mileageEnd : undefined,
    mileageRate: input.category === 'MILEAGE' && mileageResult.isValid ? mileageResult.mileageRate : undefined,
    mileageTotal: input.category === 'MILEAGE' && mileageResult.isValid ? mileageResult.mileageTotal : 0,
    mileageCalculatedAmount:
      input.category === 'MILEAGE' && mileageResult.isValid
        ? mileageResult.calculatedAmount
        : undefined,
    receiptOcrText,
    policyFlags: policyResult.flags,
    requiresApproval: policyResult.requiresApproval,
    approvalReason: policyResult.approvalReason,
  };
}

async function createRemote(input: CreateExpenseItemInput): Promise<ExpenseListItem> {
  const { supabase } = await import('../supabase/client');
  const resolvedContractorId = await resolveContractorId(input.contractorId);
  const normalizedDate = normalizeExpenseDate(input.expenseDate);
  const report = await getOrCreateDraftReport(resolvedContractorId, normalizedDate);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingItemsData } = await (supabase.from('expense_items') as any)
    .select(
      [
        'id',
        'expense_report_id',
        'category',
        'description',
        'amount',
        'currency',
        'expense_date',
        'receipt_url',
        'receipt_ocr_text',
        'mileage_start',
        'mileage_end',
        'mileage_rate',
        'mileage_calculated_amount',
        'from_location',
        'to_location',
        'policy_flags',
        'requires_approval',
        'approval_reason',
        'ticket_id',
        'billable_to_client',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .eq('expense_report_id', report.id);

  const processed = await processCreateInput(
    input,
    (existingItemsData ?? []).map((item: RemoteExpenseItemRow) => toDuplicateCandidateFromRemote(item)),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: insertedItemData, error: insertItemError } = await (supabase.from('expense_items') as any)
    .insert([
      {
        expense_report_id: report.id,
        category: input.category,
        description: input.description.trim(),
        amount: processed.amount,
        currency: 'USD',
        expense_date: processed.normalizedDate,
        receipt_ocr_text: processed.receiptOcrText ?? null,
        mileage_start: processed.mileageStart ?? null,
        mileage_end: processed.mileageEnd ?? null,
        mileage_rate: processed.mileageRate ?? null,
        mileage_calculated_amount: processed.mileageCalculatedAmount ?? null,
        from_location: input.fromLocation?.trim() || null,
        to_location: input.toLocation?.trim() || null,
        policy_flags: processed.policyFlags.length > 0 ? processed.policyFlags : null,
        requires_approval: processed.requiresApproval,
        approval_reason: processed.approvalReason ?? null,
        ticket_id: input.ticketId ?? null,
        billable_to_client: Boolean(input.billableToClient),
      },
    ])
    .select('*')
    .single();

  if (insertItemError) {
    throw insertItemError;
  }

  let expenseItem = insertedItemData as RemoteExpenseItemRow;

  if (input.receiptFile) {
    try {
      const receiptPath = await uploadReceipt(resolvedContractorId, expenseItem.id, input.receiptFile);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedItemData } = await (supabase.from('expense_items') as any)
        .update({
          receipt_url: receiptPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseItem.id)
        .select('*')
        .single();

      if (updatedItemData) {
        expenseItem = updatedItemData as RemoteExpenseItemRow;
      }
    } catch {
      // Receipt upload can be retried later; keep item created.
    }
  }

  const ticketNumberById = await fetchTicketNumbers(
    supabase,
    expenseItem.ticket_id ? [expenseItem.ticket_id] : [],
  );
  const contractorNameById = await fetchContractorNames(supabase, [report.contractor_id]);

  return mapRemoteItemToListItem(report, expenseItem, ticketNumberById, contractorNameById);
}

async function createLocal(input: CreateExpenseItemInput): Promise<ExpenseListItem> {
  const nowIso = new Date().toISOString();
  const normalizedDate = normalizeExpenseDate(input.expenseDate);
  const { start, end } = getExpenseMonthPeriod(normalizedDate);

  const localReports = await db.expenseReports
    .where('contractor_id')
    .equals(input.contractorId)
    .toArray();

  let report = localReports.find(
    (candidate) =>
      candidate.status === 'DRAFT' &&
      candidate.report_period_start === start &&
      candidate.report_period_end === end,
  );

  if (!report) {
    report = {
      id: createId(),
      contractor_id: input.contractorId,
      report_period_start: start,
      report_period_end: end,
      total_amount: 0,
      mileage_total: 0,
      item_count: 0,
      status: 'DRAFT',
      synced: false,
      sync_status: 'pending',
      created_at: nowIso,
      updated_at: nowIso,
    };

    await db.expenseReports.put(report);
    await addToSyncQueue('CREATE', 'expense_report', report.id, report);
  }

  const existingLocalItems = await db.expenseItems.where('expense_report_id').equals(report.id).toArray();
  const processed = await processCreateInput(
    input,
    existingLocalItems.map(toDuplicateCandidateFromLocal),
  );

  const item: LocalExpenseItem = {
    id: createId(),
    expense_report_id: report.id,
    category: input.category,
    description: input.description.trim(),
    amount: processed.amount,
    currency: 'USD',
    expense_date: processed.normalizedDate,
    receipt_url: input.receiptFile ? `pending://receipt/${sanitizeFileName(input.receiptFile.name)}` : undefined,
    receipt_ocr_text: processed.receiptOcrText,
    mileage_start: processed.mileageStart,
    mileage_end: processed.mileageEnd,
    mileage_rate: processed.mileageRate,
    mileage_calculated_amount: processed.mileageCalculatedAmount,
    from_location: input.fromLocation?.trim(),
    to_location: input.toLocation?.trim(),
    policy_flags: processed.policyFlags,
    requires_approval: processed.requiresApproval,
    approval_reason: processed.approvalReason,
    ticket_id: input.ticketId,
    billable_to_client: Boolean(input.billableToClient),
    created_at: nowIso,
    updated_at: nowIso,
    synced: false,
  };

  await db.expenseItems.put(item);
  await addToSyncQueue('CREATE', 'expense_item', item.id, item);

  const updatedReport: LocalExpenseReport = {
    ...report,
    total_amount: Number(((report.total_amount ?? 0) + processed.amount).toFixed(2)),
    mileage_total: Number(((report.mileage_total ?? 0) + processed.mileageTotal).toFixed(2)),
    item_count: (report.item_count ?? 0) + 1,
    synced: false,
    sync_status: 'pending',
    updated_at: nowIso,
  };

  await db.expenseReports.put(updatedReport);
  await addToSyncQueue('UPDATE', 'expense_report', updatedReport.id, {
    total_amount: updatedReport.total_amount,
    mileage_total: updatedReport.mileage_total,
    item_count: updatedReport.item_count,
    updated_at: nowIso,
  });

  return mapLocalItemToListItem(updatedReport, item);
}

const defaultDependencies: ExpenseSubmissionDependencies = {
  isOnline: defaultIsOnline,
  listRemote,
  listLocal,
  createRemote,
  createLocal,
};

export function createExpenseSubmissionService(
  overrides: Partial<ExpenseSubmissionDependencies> = {},
): ExpenseSubmissionService {
  const dependencies: ExpenseSubmissionDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async listExpenses(filters: ExpenseListFilters = {}): Promise<ExpenseListItem[]> {
      if (!dependencies.isOnline()) {
        return dependencies.listLocal(filters);
      }

      try {
        return await dependencies.listRemote(filters);
      } catch (error) {
        if (!filters.contractorId) {
          throw error;
        }

        return dependencies.listLocal(filters);
      }
    },

    async createExpenseItem(input: CreateExpenseItemInput): Promise<ExpenseListItem> {
      validateCreateInput(input);

      if (!dependencies.isOnline()) {
        return dependencies.createLocal(input);
      }

      try {
        return await dependencies.createRemote(input);
      } catch {
        return dependencies.createLocal(input);
      }
    },
  };
}

export const expenseSubmissionService = createExpenseSubmissionService();
