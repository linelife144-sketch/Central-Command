// Central Command - Payroll & Utility Billing Math
//
// Pure functions only — no I/O. All money figures stored on time_entries
// and time_entry_vehicle_claims are snapshotted server-side by database
// triggers (see supabase/migrations/20261003190000_role_rates_and_payroll_costing.sql
// and 20261003190500_vehicle_reimbursement_claims.sql); these functions
// mirror that server-side math for client-side previews and for building
// the payroll rollups from already-stored values. They never recompute a
// stored figure differently than the trigger that produced it.

import type { ContractorPayrollRow, ContractorRole, PayrollTotals, WorkType } from '../../types';

export function round2(value: number): number {
  return Number(value.toFixed(2));
}

export interface ContractorRateWindow {
  workType: WorkType;
  hourlyRate: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface RoleRateDefaultLike {
  role: ContractorRole;
  workType: WorkType;
  hourlyRate: number;
}

export interface UtilityBillingRateLike {
  stormEventId: string | null;
  workType: WorkType;
  hourlyRate: number;
}

/**
 * Resolves the hourly wage for a contractor/work-type/date combination.
 * A contractor-specific effective-dated rate always wins over the role
 * default. Returns null (never a silent 0) when neither is configured, so
 * callers can surface a "no rate configured" warning instead of paying $0.
 */
export function resolveContractorHourlyRate(input: {
  roleDefaults: RoleRateDefaultLike[];
  contractorRates: ContractorRateWindow[];
  role: ContractorRole;
  workType: WorkType;
  asOf: string;
}): number | null {
  const asOfTime = new Date(input.asOf).getTime();

  const activeOverrides = input.contractorRates
    .filter((rate) => rate.workType === input.workType)
    .filter((rate) => new Date(rate.effectiveFrom).getTime() <= asOfTime)
    .filter((rate) => !rate.effectiveTo || new Date(rate.effectiveTo).getTime() >= asOfTime)
    .sort((left, right) => new Date(right.effectiveFrom).getTime() - new Date(left.effectiveFrom).getTime());

  if (activeOverrides.length > 0) {
    return activeOverrides[0].hourlyRate;
  }

  const roleDefault = input.roleDefaults.find(
    (entry) => entry.role === input.role && entry.workType === input.workType,
  );

  return roleDefault ? roleDefault.hourlyRate : null;
}

/**
 * Resolves the utility bill rate for a work type. A storm-scoped rate wins
 * over the global (stormEventId === null) fallback. Returns null when
 * neither is configured.
 */
export function resolveUtilityBillRate(input: {
  rates: UtilityBillingRateLike[];
  stormEventId: string | null;
  workType: WorkType;
}): number | null {
  const candidates = input.rates.filter((rate) => rate.workType === input.workType);

  if (input.stormEventId) {
    const stormScoped = candidates.find((rate) => rate.stormEventId === input.stormEventId);
    if (stormScoped) {
      return stormScoped.hourlyRate;
    }
  }

  const globalFallback = candidates.find((rate) => rate.stormEventId === null);
  return globalFallback ? globalFallback.hourlyRate : null;
}

/**
 * Taxable wage amount for a single time entry. Wage only — vehicle
 * reimbursement is never folded in here. This mirrors
 * private.apply_time_entry_costing()'s payroll_amount calculation exactly.
 */
export function calculateEntryPayroll(input: {
  billableMinutes: number;
  payRateApplied: number;
}): { payrollAmount: number } {
  const minutes = Math.max(0, input.billableMinutes);
  const rate = Math.max(0, input.payRateApplied);
  return { payrollAmount: round2((minutes / 60) * rate) };
}

/**
 * Utility bill amount for a single time entry.
 */
export function calculateEntryBilling(input: {
  billableMinutes: number;
  utilityBillRate: number;
}): { utilityBillAmount: number } {
  const minutes = Math.max(0, input.billableMinutes);
  const rate = Math.max(0, input.utilityBillRate);
  return { utilityBillAmount: round2((minutes / 60) * rate) };
}

/**
 * Resolves a vehicle reimbursement claim amount: flat $5.00 (default) per
 * declared hour, capped at the entry's actual billable hours. Mirrors
 * private.compute_vehicle_claim_amount() exactly so a client-side preview
 * never disagrees with the server-computed truth.
 */
export function resolveVehicleClaimAmount(input: {
  declaredHours: number;
  billableMinutes: number;
  hourlyRate?: number;
}): { amount: number; cappedHours: number; capped: boolean } {
  if (input.hourlyRate === undefined || !Number.isFinite(input.hourlyRate) || input.hourlyRate < 0) throw new Error('A configured vehicle allowance rate is required.');
  const rate = input.hourlyRate;
  const shiftHours = Math.max(0, input.billableMinutes) / 60;
  const declared = Math.max(0, input.declaredHours);

  const capped = declared > shiftHours;
  const cappedHours = capped ? shiftHours : declared;

  return {
    amount: round2(cappedHours * rate),
    cappedHours,
    capped,
  };
}

/**
 * Margin for a payout total against a utility bill total. Negative margin
 * is preserved (never clamped to zero) — a loss-making period must be
 * visible, not hidden. marginPercent is 0 (not NaN/Infinity) when there is
 * no billing to divide against.
 */
export function calculateMargin(input: {
  utilityBillAmount: number;
  totalPayout: number;
}): { marginAmount: number; marginPercent: number } {
  const marginAmount = round2(input.utilityBillAmount - input.totalPayout);
  const marginPercent =
    input.utilityBillAmount > 0 ? round2((marginAmount / input.utilityBillAmount) * 100) : 0;

  return { marginAmount, marginPercent };
}

export interface PayrollEntryLike {
  contractorId: string;
  contractorName: string;
  role: ContractorRole;
  totalMinutes: number;
  billableMinutes: number;
  payrollAmount: number;
  utilityBillAmount: number | null;
  status: string;
}

export interface VehicleClaimLike {
  contractorId: string;
  amount: number;
  status: string;
}

/**
 * Builds the per-contractor payroll rollup row from that contractor's time
 * entries and their approved vehicle reimbursement claims. All inputs are
 * already-stored, trigger-computed values — this function only aggregates
 * and computes margin, it never re-derives a wage or bill rate.
 */
export function buildContractorPayrollRow(input: {
  contractorId: string;
  contractorName: string;
  role: ContractorRole;
  entries: PayrollEntryLike[];
  vehicleClaims: VehicleClaimLike[];
}): ContractorPayrollRow {
  const entries = input.entries.filter((entry) => entry.contractorId === input.contractorId && entry.status.toUpperCase() !== 'REJECTED');
  const claims = input.vehicleClaims.filter((claim) => claim.contractorId === input.contractorId);

  const totalMinutes = entries.reduce((sum, entry) => sum + Math.max(0, entry.totalMinutes), 0);
  const billableMinutes = entries.reduce((sum, entry) => sum + Math.max(0, entry.billableMinutes), 0);
  const taxablePayroll = round2(entries.reduce((sum, entry) => sum + Math.max(0, entry.payrollAmount), 0));
  const utilityBillAmount = round2(
    entries.reduce((sum, entry) => sum + Math.max(0, entry.utilityBillAmount ?? 0), 0),
  );

  const approvedClaims = claims.filter((claim) => claim.status === 'APPROVED');
  const pendingVehicleClaims = claims.filter((claim) => claim.status === 'PENDING').length;
  const reimbursementTotal = round2(approvedClaims.reduce((sum, claim) => sum + Math.max(0, claim.amount), 0));

  const totalPayout = round2(taxablePayroll + reimbursementTotal);
  const { marginAmount, marginPercent } = calculateMargin({ utilityBillAmount, totalPayout });

  const normalizedStatuses = entries.map((entry) => entry.status.toUpperCase());

  return {
    contractorId: input.contractorId,
    contractorName: input.contractorName,
    role: input.role,
    entryCount: entries.length,
    totalMinutes,
    billableMinutes,
    taxablePayroll,
    submittedWages: round2(entries.filter(entry => entry.status.toUpperCase() === 'PENDING').reduce((sum, entry) => sum + entry.payrollAmount, 0)),
    approvedWages: round2(entries.filter(entry => entry.status.toUpperCase() === 'APPROVED').reduce((sum, entry) => sum + entry.payrollAmount, 0)),
    approvedPayout: round2(entries.filter(entry => entry.status.toUpperCase() === 'APPROVED').reduce((sum, entry) => sum + entry.payrollAmount, 0) + reimbursementTotal),
    reimbursementTotal,
    totalPayout,
    utilityBillAmount,
    marginAmount,
    marginPercent,
    pendingEntries: normalizedStatuses.filter((status) => status === 'PENDING').length,
    approvedEntries: normalizedStatuses.filter((status) => status === 'APPROVED').length,
    pendingVehicleClaims,
  };
}

/**
 * Sums per-contractor rows into report-wide totals. Each total field is the
 * literal sum of the corresponding row field, so totals always reconcile
 * with the row set that produced them.
 */
export function summarizePayroll(rows: ContractorPayrollRow[]): PayrollTotals {
  const totals = rows.reduce(
    (acc, row) => ({
      contractorCount: acc.contractorCount + 1,
      entryCount: acc.entryCount + row.entryCount,
      totalMinutes: acc.totalMinutes + row.totalMinutes,
      billableMinutes: acc.billableMinutes + row.billableMinutes,
      taxablePayroll: round2(acc.taxablePayroll + row.taxablePayroll),
      submittedWages: round2((acc.submittedWages ?? 0) + (row.submittedWages ?? 0)),
      approvedWages: round2((acc.approvedWages ?? 0) + (row.approvedWages ?? 0)),
      approvedPayout: round2((acc.approvedPayout ?? 0) + (row.approvedPayout ?? 0)),
      reimbursementTotal: round2(acc.reimbursementTotal + row.reimbursementTotal),
      totalPayout: round2(acc.totalPayout + row.totalPayout),
      utilityBillAmount: round2(acc.utilityBillAmount + (row.utilityBillAmount ?? 0)),
      marginAmount: 0,
      marginPercent: 0,
    }),
    {
      contractorCount: 0,
      entryCount: 0,
      totalMinutes: 0,
      billableMinutes: 0,
      taxablePayroll: 0,
      submittedWages: 0, approvedWages: 0, approvedPayout: 0,
      reimbursementTotal: 0,
      totalPayout: 0,
      utilityBillAmount: 0,
      marginAmount: 0,
      marginPercent: 0,
    },
  );

  const { marginAmount, marginPercent } = calculateMargin({
    utilityBillAmount: totals.utilityBillAmount,
    totalPayout: totals.totalPayout,
  });

  return { ...totals, marginAmount, marginPercent };
}

/**
 * Escapes a CSV cell against formula injection, matching the pattern
 * already used in src/app/(admin)/admin/contractors/page.tsx:52.
 */
function escapeCsvCell(value: string): string {
  return '"' + value.replace(/"/g, '""').replace(/^[=+@-]/, "'") + '"';
}

export function buildPayrollCsv(
  rows: ContractorPayrollRow[],
  meta: { periodStart: string; periodEnd: string; includeFinancial?: boolean },
): string {
  const header = [
    'Contractor',
    'Role',
    'Entries',
    'Total Hours',
    'Billable Hours',
    'Taxable Payroll',
    'Vehicle Reimbursement',
    'Total Payout',
    ...(meta.includeFinancial === false ? [] : ['Utility Bill', 'Margin', 'Margin %']),
    'Submitted Wages', 'Approved Wages', 'Approved Payout',
    'Pending Entries',
    'Pending Vehicle Claims',
  ];

  const csvRows = [
    [`Payroll Period: ${meta.periodStart} to ${meta.periodEnd}`],
    header,
    ...rows.map((row) => [
      row.contractorName,
      row.role,
      String(row.entryCount),
      (row.totalMinutes / 60).toFixed(2),
      (row.billableMinutes / 60).toFixed(2),
      row.taxablePayroll.toFixed(2),
      row.reimbursementTotal.toFixed(2),
      row.totalPayout.toFixed(2),
      ...(meta.includeFinancial === false ? [] : [(row.utilityBillAmount ?? 0).toFixed(2), (row.marginAmount ?? 0).toFixed(2), `${(row.marginPercent ?? 0).toFixed(1)}%`]),
      (row.submittedWages ?? 0).toFixed(2), (row.approvedWages ?? 0).toFixed(2), (row.approvedPayout ?? 0).toFixed(2),
      String(row.pendingEntries),
      String(row.pendingVehicleClaims),
    ]),
  ];

  return csvRows.map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(',')).join('\r\n');
}

/** Display only persisted wage/billing snapshots. Unsynced entries remain unknown. */
export function timeEntryMoney(entry: {
  clock_out_at?: string; sync_status?: string; payroll_amount?: number; billable_amount?: number;
  utility_bill_amount?: number; vehicle_reimbursement_amount?: number;
}) {
  const synced = entry.sync_status === undefined || entry.sync_status === 'SYNCED';
  const wage = entry.clock_out_at && synced ? entry.payroll_amount ?? entry.billable_amount : undefined;
  const reimbursement = entry.vehicle_reimbursement_amount;
  const payout = wage !== undefined && reimbursement !== undefined ? round2(wage + reimbursement) : undefined;
  const margin = payout !== undefined && entry.utility_bill_amount !== undefined
    ? round2(entry.utility_bill_amount - payout) : undefined;
  return { wage, reimbursement, payout, margin };
}
