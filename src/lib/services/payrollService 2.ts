import { getPayAgreements, savePayAgreement } from '../compensation/service';
import type { CompensationTerms } from '../compensation/validation';
// Central Command - Payroll & Utility Billing Service
//
// Reads/writes role rate defaults, utility billing rates, contractor rate
// overrides, payroll rollups, and vehicle reimbursement claims. All money
// math delegates to src/lib/utils/payroll.ts — this file is I/O only.
// Mirrors the createXService(overrides) dependency-injection pattern used
// by timeEntryManagementService.ts and dashboardReportingService.ts so it
// is fully testable without a network.

import {
  buildContractorPayrollRow,
  buildPayrollCsv,
  summarizePayroll,
  type PayrollEntryLike,
  type VehicleClaimLike,
} from '../utils/payroll';
import type {
  ContractorRole,
  PayrollSummary,
  RoleRateDefault,
  UtilityBillingRate,
  VehicleClaim,
  VehicleClaimStatus,
  VehicleType,
  WorkType,
} from '../../types';

export interface PayrollFilters {
  includeFinancial?: boolean;
  from?: string;
  to?: string;
  stormEventId?: string;
  contractorId?: string;
}

export interface ContractorRateProfile {
  contractorId: string;
  role: ContractorRole;
  workTypeRates: Partial<Record<WorkType, number>>;
  missingWorkTypes: WorkType[];
  payPolicy?: CompensationTerms['policy'];
  driverEligible?: boolean;
  vehicleAllowanceEnabled?: boolean;
  vehicleHourlyRate?: number;
}

export interface ReportExportArtifact {
  fileName: string;
  mimeType: string;
  content: string | Uint8Array;
}

export interface SubmitVehicleClaimInput {
  timeEntryId: string;
  contractorId: string;
  vehicleType: VehicleType;
  declaredHours: number;
  notes: string;
  vehiclePhotoFile: File;
  licensePlatePhotoFile: File;
}

export interface ReviewVehicleClaimInput {
  claimId: string;
  reviewerId: string;
  decision: Extract<VehicleClaimStatus, 'APPROVED' | 'REJECTED'>;
  rejectionReason?: string;
}

const WORK_TYPES_LIST: WorkType[] = [
  'Working',
  'MOB',
  'DE-MOB',
  'Stand-by',
];

interface RemoteRoleRateDefaultRow {
  role: string;
  work_type: string;
  hourly_rate: number;
  currency: string | null;
}

interface RemoteUtilityBillingRateRow {
  id: string;
  storm_event_id: string | null;
  work_type: string;
  hourly_rate: number;
  currency: string | null;
}


interface RemotePayrollTimeEntryRow {
  id: string;
  contractor_id: string;
  status: string | null;
  total_minutes: number | null;
  billable_minutes: number | null;
  payroll_amount: number | null;
  utility_bill_amount?: number | null;
  paid_minutes_exact?: number | null;
}

interface RemoteVehicleClaimRow {
  id: string;
  time_entry_id: string;
  contractor_id: string;
  vehicle_type: string;
  declared_hours: number;
  notes: string;
  vehicle_photo_url: string;
  license_plate_photo_url: string;
  amount: number;
  capped: boolean;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface RemoteContractorNameRow {
  id: string;
  role: string;
  profile_id: string | null;
}

interface RemoteProfileNameRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

function toVehicleClaimStatus(status: string): VehicleClaimStatus {
  const normalized = status.toUpperCase();
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  return 'PENDING';
}

function mapRemoteVehicleClaim(row: RemoteVehicleClaimRow): VehicleClaim {
  return {
    id: row.id,
    time_entry_id: row.time_entry_id,
    contractor_id: row.contractor_id,
    vehicle_type: row.vehicle_type === 'RENTAL' ? 'RENTAL' : 'PERSONAL',
    declared_hours: row.declared_hours,
    notes: row.notes,
    vehicle_photo_url: row.vehicle_photo_url,
    license_plate_photo_url: row.license_plate_photo_url,
    amount: row.amount,
    capped: row.capped,
    status: toVehicleClaimStatus(row.status),
    is_taxable: false,
    reviewed_by: row.reviewed_by ?? undefined,
    reviewed_at: row.reviewed_at ?? undefined,
    rejection_reason: row.rejection_reason ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

interface PayrollDependencies {
  fetchRoleRateDefaults: () => Promise<RoleRateDefault[]>;
  writeRoleRateDefault: (input: {
    role: ContractorRole;
    workType: WorkType;
    hourlyRate: number;
  }) => Promise<RoleRateDefault>;
  fetchUtilityBillingRates: (stormEventId?: string) => Promise<UtilityBillingRate[]>;
  writeUtilityBillingRate: (input: {
    stormEventId: string | null;
    workType: WorkType;
    hourlyRate: number;
  }) => Promise<UtilityBillingRate>;
  fetchContractorRateProfile: (contractorId: string) => Promise<ContractorRateProfile>;
  writeContractorRole: (input: { contractorId: string; role: ContractorRole }) => Promise<void>;
  writeContractorWorkTypeRate: (input: {
    contractorId: string;
    workType: WorkType;
    hourlyRate: number;
  }) => Promise<void>;
  fetchPayrollTimeEntries: (filters: PayrollFilters) => Promise<RemotePayrollTimeEntryRow[]>;
  fetchVehicleClaimsForEntries: (timeEntryIds: string[]) => Promise<VehicleClaim[]>;
  fetchContractorNames: (contractorIds: string[]) => Promise<Map<string, { name: string; role: ContractorRole }>>;
  fetchVehicleClaims: (filters: { status?: VehicleClaimStatus }) => Promise<VehicleClaim[]>;
  uploadVehicleClaimPhoto: (input: {
    contractorId: string;
    timeEntryId: string;
    variant: 'vehicle' | 'license-plate';
    file: File;
  }) => Promise<string>;
  insertVehicleClaim: (input: {
    timeEntryId: string;
    contractorId: string;
    vehicleType: VehicleType;
    declaredHours: number;
    notes: string;
    vehiclePhotoUrl: string;
    licensePlatePhotoUrl: string;
  }) => Promise<VehicleClaim>;
  updateVehicleClaimStatus: (input: ReviewVehicleClaimInput) => Promise<VehicleClaim>;
}

export interface PayrollService {
  getRoleRateDefaults: () => Promise<RoleRateDefault[]>;
  updateRoleRateDefault: (input: {
    role: ContractorRole;
    workType: WorkType;
    hourlyRate: number;
  }) => Promise<RoleRateDefault>;
  getUtilityBillingRates: (stormEventId?: string) => Promise<UtilityBillingRate[]>;
  updateUtilityBillingRate: (input: {
    stormEventId: string | null;
    workType: WorkType;
    hourlyRate: number;
  }) => Promise<UtilityBillingRate>;
  getContractorRateProfile: (contractorId: string) => Promise<ContractorRateProfile>;
  updateContractorRole: (input: { contractorId: string; role: ContractorRole }) => Promise<void>;
  updateContractorWorkTypeRate: (input: {
    contractorId: string;
    workType: WorkType;
    hourlyRate: number;
  }) => Promise<void>;
  getPayrollSummary: (filters?: PayrollFilters) => Promise<PayrollSummary>;
  listVehicleClaims: (filters?: { status?: VehicleClaimStatus }) => Promise<VehicleClaim[]>;
  submitVehicleClaim: (input: SubmitVehicleClaimInput) => Promise<VehicleClaim>;
  reviewVehicleClaim: (input: ReviewVehicleClaimInput) => Promise<VehicleClaim>;
  createPayrollCsvExport: (summary: PayrollSummary, generatedAt?: Date) => ReportExportArtifact;
}

async function getDefaultClient() {
  const { supabase } = await import('../supabase/client');
  return supabase;
}

async function defaultFetchRoleRateDefaults(): Promise<RoleRateDefault[]> {
  const client = await getDefaultClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client.from('role_rate_defaults') as any).select(
    'role, work_type, hourly_rate, currency',
  );

  if (error) {
    throw new Error('Unable to load role rate defaults.');
  }

  return ((data ?? []) as RemoteRoleRateDefaultRow[]).map((row) => ({
    role: row.role as ContractorRole,
    workType: row.work_type as WorkType,
    hourlyRate: row.hourly_rate,
    currency: row.currency ?? 'USD',
  }));
}

async function defaultWriteRoleRateDefault(input: {
  role: ContractorRole;
  workType: WorkType;
  hourlyRate: number;
}): Promise<RoleRateDefault> {
  const client = await getDefaultClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client.from('role_rate_defaults') as any)
    .upsert(
      {
        role: input.role,
        work_type: input.workType,
        hourly_rate: input.hourlyRate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'role,work_type' },
    )
    .select('role, work_type, hourly_rate, currency')
    .single();

  if (error) {
    throw error;
  }

  const row = data as RemoteRoleRateDefaultRow;
  return {
    role: row.role as ContractorRole,
    workType: row.work_type as WorkType,
    hourlyRate: row.hourly_rate,
    currency: row.currency ?? 'USD',
  };
}

async function defaultFetchUtilityBillingRates(stormEventId?: string): Promise<UtilityBillingRate[]> {
  const client = await getDefaultClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client.from('utility_billing_rates') as any).select(
    'id, storm_event_id, work_type, hourly_rate, currency',
  );

  if (stormEventId) {
    query = query.or(`storm_event_id.eq.${stormEventId},storm_event_id.is.null`);
  } else {
    query = query.is('storm_event_id', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Unable to load utility billing rates.');
  }

  return ((data ?? []) as RemoteUtilityBillingRateRow[]).map((row) => ({
    stormEventId: row.storm_event_id,
    workType: row.work_type as WorkType,
    hourlyRate: row.hourly_rate,
    currency: row.currency ?? 'USD',
  }));
}

async function defaultWriteUtilityBillingRate(input: {
  stormEventId: string | null;
  workType: WorkType;
  hourlyRate: number;
}): Promise<UtilityBillingRate> {
  const client = await getDefaultClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingQuery = (client.from('utility_billing_rates') as any)
    .select('id')
    .eq('work_type', input.workType);

  const { data: existingRows, error: existingError } = input.stormEventId
    ? await existingQuery.eq('storm_event_id', input.stormEventId)
    : await existingQuery.is('storm_event_id', null);

  if (existingError) {
    throw existingError;
  }

  const existingId = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0].id : null;

  const payload = {
    storm_event_id: input.stormEventId,
    work_type: input.workType,
    hourly_rate: input.hourlyRate,
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = client.from('utility_billing_rates') as any;
  const { data, error } = existingId
    ? await table.update(payload).eq('id', existingId).select('id, storm_event_id, work_type, hourly_rate, currency').single()
    : await table.insert(payload).select('id, storm_event_id, work_type, hourly_rate, currency').single();

  if (error) {
    throw error;
  }

  const row = data as RemoteUtilityBillingRateRow;
  return {
    stormEventId: row.storm_event_id,
    workType: row.work_type as WorkType,
    hourlyRate: row.hourly_rate,
    currency: row.currency ?? 'USD',
  };
}

async function defaultFetchContractorRateProfile(contractorId: string): Promise<ContractorRateProfile> {
  const agreements = await getPayAgreements(contractorId);
  const current = agreements.find(agreement => Date.parse(agreement.effective_from) <= Date.now());
  if (!current) throw new Error('Save a contractor pay agreement before clocking in.');
  const role = current.terms.role;
  const workTypeRates: Partial<Record<WorkType, number>> = {};
  if (current) for (const type of WORK_TYPES_LIST) workTypeRates[type] = current.terms.work_type_rates[type] ?? current.terms.base_hourly_rate;
  return { contractorId, role: current?.terms.role ?? role, workTypeRates,
    missingWorkTypes: WORK_TYPES_LIST.filter(type => workTypeRates[type] === undefined),
    payPolicy: current?.terms.policy, driverEligible: current?.terms.driver_eligible,
    vehicleAllowanceEnabled: current?.terms.vehicle_allowance_enabled, vehicleHourlyRate: current?.terms.vehicle_hourly_rate };
}

async function defaultWriteContractorRole(input: {
  contractorId: string;
  role: ContractorRole;
}): Promise<void> {
  const agreements = await getPayAgreements(input.contractorId);
  const current = agreements.find(agreement => Date.parse(agreement.effective_from) <= Date.now());
  if (!current) throw new Error('Save a contractor pay agreement first.');
  await savePayAgreement(input.contractorId, { effective_from: new Date().toISOString(), terms: { ...current.terms, role: input.role } });
}

async function defaultWriteContractorWorkTypeRate(input: {
  contractorId: string;
  workType: WorkType;
  hourlyRate: number;
}): Promise<void> {
  const agreements = await getPayAgreements(input.contractorId);
  const current = agreements.find(agreement => Date.parse(agreement.effective_from) <= Date.now());
  if (!current) throw new Error('Save a contractor pay agreement first.');
  await savePayAgreement(input.contractorId, { effective_from: new Date().toISOString(), terms: { ...current.terms, work_type_rates: { ...current.terms.work_type_rates, [input.workType]: input.hourlyRate } } });
}

async function defaultFetchPayrollTimeEntries(filters: PayrollFilters): Promise<RemotePayrollTimeEntryRow[]> {
  const client = await getDefaultClient();
  if (filters.includeFinancial) {
    const { data, error } = await client.rpc('get_privileged_payroll_entries', { p_from: filters.from, p_to: filters.to, p_storm: filters.stormEventId, p_contractor: filters.contractorId });
    if (error) throw error;
    return data as unknown as RemotePayrollTimeEntryRow[];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client.from('time_entries') as any)
    .select('id, contractor_id, status, total_minutes, billable_minutes, payroll_amount, paid_minutes_exact, clock_in_at, storm_event_id')
    .eq('is_deleted', false)
    .not('clock_out_at', 'is', null)
    .neq('status', 'REJECTED');

  if (filters.from) {
    query = query.gte('clock_in_at', filters.from);
  }
  if (filters.to) {
    query = query.lte('clock_in_at', filters.to);
  }
  if (filters.stormEventId) {
    query = query.eq('storm_event_id', filters.stormEventId);
  }
  if (filters.contractorId) {
    query = query.eq('contractor_id', filters.contractorId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Unable to load payroll time entries.');
  }

  return (data ?? []) as RemotePayrollTimeEntryRow[];
}

async function defaultFetchVehicleClaimsForEntries(timeEntryIds: string[]): Promise<VehicleClaim[]> {
  if (timeEntryIds.length === 0) {
    return [];
  }

  const client = await getDefaultClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client.from('time_entry_vehicle_claims') as any)
    .select('*')
    .in('time_entry_id', timeEntryIds);

  if (error) {
    throw new Error('Unable to load vehicle reimbursement claims.');
  }

  return ((data ?? []) as RemoteVehicleClaimRow[]).map(mapRemoteVehicleClaim);
}

const defaultDependencies: PayrollDependencies = {
  fetchRoleRateDefaults: defaultFetchRoleRateDefaults,
  writeRoleRateDefault: defaultWriteRoleRateDefault,
  fetchUtilityBillingRates: defaultFetchUtilityBillingRates,
  writeUtilityBillingRate: defaultWriteUtilityBillingRate,
  fetchContractorRateProfile: defaultFetchContractorRateProfile,
  writeContractorRole: defaultWriteContractorRole,
  writeContractorWorkTypeRate: defaultWriteContractorWorkTypeRate,
  fetchPayrollTimeEntries: defaultFetchPayrollTimeEntries,
  fetchVehicleClaimsForEntries: defaultFetchVehicleClaimsForEntries,
  fetchContractorNames: defaultFetchContractorNames,
  fetchVehicleClaims: defaultFetchVehicleClaims,
  uploadVehicleClaimPhoto: defaultUploadVehicleClaimPhoto,
  insertVehicleClaim: defaultInsertVehicleClaim,
  updateVehicleClaimStatus: defaultUpdateVehicleClaimStatus,
};

export function createPayrollService(overrides: Partial<PayrollDependencies> = {}): PayrollService {
  const dependencies: PayrollDependencies = { ...defaultDependencies, ...overrides };

  return {
    getRoleRateDefaults(): Promise<RoleRateDefault[]> {
      return dependencies.fetchRoleRateDefaults();
    },

    updateRoleRateDefault(input): Promise<RoleRateDefault> {
      return dependencies.writeRoleRateDefault(input);
    },

    getUtilityBillingRates(stormEventId?: string): Promise<UtilityBillingRate[]> {
      return dependencies.fetchUtilityBillingRates(stormEventId);
    },

    updateUtilityBillingRate(input): Promise<UtilityBillingRate> {
      return dependencies.writeUtilityBillingRate(input);
    },

    getContractorRateProfile(contractorId: string): Promise<ContractorRateProfile> {
      return dependencies.fetchContractorRateProfile(contractorId);
    },

    updateContractorRole(input): Promise<void> {
      return dependencies.writeContractorRole(input);
    },

    updateContractorWorkTypeRate(input): Promise<void> {
      return dependencies.writeContractorWorkTypeRate(input);
    },

    async getPayrollSummary(filters: PayrollFilters = {}): Promise<PayrollSummary> {
      if (filters.from && filters.to && new Date(filters.to).getTime() < new Date(filters.from).getTime()) {
        throw new Error('Payroll period end must be on or after the period start.');
      }

      const timeEntries = await dependencies.fetchPayrollTimeEntries(filters);
      const timeEntryIds = timeEntries.map((entry) => entry.id);

      const [vehicleClaims, contractorInfoById] = await Promise.all([
        dependencies.fetchVehicleClaimsForEntries(timeEntryIds),
        dependencies.fetchContractorNames(timeEntries.map((entry) => entry.contractor_id)),
      ]);

      const contractorIds = Array.from(new Set(timeEntries.map((entry) => entry.contractor_id)));

      const payrollEntries: PayrollEntryLike[] = timeEntries.map((entry) => ({
        contractorId: entry.contractor_id,
        contractorName: contractorInfoById.get(entry.contractor_id)?.name ?? 'Unknown Contractor',
        role: contractorInfoById.get(entry.contractor_id)?.role ?? 'DAMAGE_ASSESSER',
        totalMinutes: entry.total_minutes ?? 0,
        billableMinutes: entry.paid_minutes_exact ?? entry.billable_minutes ?? 0,
        payrollAmount: entry.payroll_amount ?? 0,
        utilityBillAmount: entry.utility_bill_amount ?? null,
        status: entry.status ?? 'PENDING',
      }));

      const claimsLike: VehicleClaimLike[] = vehicleClaims.map((claim) => ({
        contractorId: claim.contractor_id,
        amount: claim.amount,
        status: claim.status,
      }));

      const rows = contractorIds.map((contractorId) =>
        buildContractorPayrollRow({
          contractorId,
          contractorName: contractorInfoById.get(contractorId)?.name ?? 'Unknown Contractor',
          role: contractorInfoById.get(contractorId)?.role ?? 'DAMAGE_ASSESSER',
          entries: payrollEntries,
          vehicleClaims: claimsLike,
        }),
      );

      const totals = summarizePayroll(rows);
      if (!filters.includeFinancial) for (const record of [...rows, totals]) { delete record.utilityBillAmount; delete record.marginAmount; delete record.marginPercent; }

      const now = new Date().toISOString();
      return {
        periodStart: filters.from ?? now,
        periodEnd: filters.to ?? now,
        stormEventId: filters.stormEventId,
        generatedAt: now,
        includeFinancial: filters.includeFinancial === true,
        rows,
        totals,
      };
    },

    listVehicleClaims(filters: { status?: VehicleClaimStatus } = {}): Promise<VehicleClaim[]> {
      return dependencies.fetchVehicleClaims(filters);
    },

    async submitVehicleClaim(input: SubmitVehicleClaimInput): Promise<VehicleClaim> {
      if (!input.vehiclePhotoFile || !input.licensePlatePhotoFile) {
        throw new Error('A vehicle photo and a license plate photo are both required.');
      }

      if (!input.notes || input.notes.trim().length < 3) {
        throw new Error('A short note describing vehicle use is required.');
      }

      if (!input.declaredHours || input.declaredHours <= 0) {
        throw new Error('Declared vehicle hours must be greater than zero.');
      }

      const [vehiclePhotoUrl, licensePlatePhotoUrl] = await Promise.all([
        dependencies.uploadVehicleClaimPhoto({
          contractorId: input.contractorId,
          timeEntryId: input.timeEntryId,
          variant: 'vehicle',
          file: input.vehiclePhotoFile,
        }),
        dependencies.uploadVehicleClaimPhoto({
          contractorId: input.contractorId,
          timeEntryId: input.timeEntryId,
          variant: 'license-plate',
          file: input.licensePlatePhotoFile,
        }),
      ]);

      return dependencies.insertVehicleClaim({
        timeEntryId: input.timeEntryId,
        contractorId: input.contractorId,
        vehicleType: input.vehicleType,
        declaredHours: input.declaredHours,
        notes: input.notes,
        vehiclePhotoUrl,
        licensePlatePhotoUrl,
      });
    },

    async reviewVehicleClaim(input: ReviewVehicleClaimInput): Promise<VehicleClaim> {
      if (input.decision === 'REJECTED' && !input.rejectionReason?.trim()) {
        throw new Error('Rejection reason is required when rejecting a vehicle reimbursement claim.');
      }

      return dependencies.updateVehicleClaimStatus(input);
    },

    createPayrollCsvExport(summary: PayrollSummary, generatedAt: Date = new Date()): ReportExportArtifact {
      const csvContent = buildPayrollCsv(summary.rows, {
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        includeFinancial: summary.includeFinancial === true,
      });

      const timestamp = generatedAt.toISOString().replace(/[:.]/g, '-');
      return {
        fileName: `payroll-${timestamp}.csv`,
        mimeType: 'text/csv',
        content: csvContent,
      };
    },
  };
}

export const payrollService = createPayrollService();

const VEHICLE_CLAIM_PHOTO_BUCKET = 'time-entry-photos';
const VEHICLE_CLAIM_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — enough for an admin review session.

// The bucket is private (license plates are PII). uploadVehicleClaimPhoto
// returns a storage PATH, not a URL — vehicle_photo_url/license_plate_photo_url
// store that path, and signVehicleClaimPhotoUrls() resolves paths to
// time-limited signed URLs only at display time, so a stale signed URL is
// never persisted.
async function defaultUploadVehicleClaimPhoto(input: {
  contractorId: string;
  timeEntryId: string;
  variant: 'vehicle' | 'license-plate';
  file: File;
}): Promise<string> {
  const client = await getDefaultClient();
  const extension = input.file.name.split('.').pop()?.toLowerCase() || 'jpg';
  // getRandomValues also works on the local HTTP pilot origin, unlike randomUUID.
  const photoId = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  const storagePath = `${input.contractorId}/time-entries/${input.timeEntryId}/${input.variant}-${photoId}.${extension}`;

  const { error } = await client.storage.from(VEHICLE_CLAIM_PHOTO_BUCKET).upload(storagePath, input.file, {
    upsert: false,
  });

  if (error) {
    throw new Error('Unable to upload vehicle reimbursement photo.');
  }

  return storagePath;
}

async function signVehicleClaimPhotoUrl(
  client: Awaited<ReturnType<typeof getDefaultClient>>,
  storagePath: string,
): Promise<string> {
  const { data, error } = await client.storage
    .from(VEHICLE_CLAIM_PHOTO_BUCKET)
    .createSignedUrl(storagePath, VEHICLE_CLAIM_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    // Fall back to the stored path rather than throwing — a broken image
    // in the review UI is recoverable; losing the claim list is not.
    return storagePath;
  }

  return data.signedUrl;
}

async function signVehicleClaimPhotoUrls(
  client: Awaited<ReturnType<typeof getDefaultClient>>,
  claim: VehicleClaim,
): Promise<VehicleClaim> {
  const [vehiclePhotoUrl, licensePlatePhotoUrl] = await Promise.all([
    signVehicleClaimPhotoUrl(client, claim.vehicle_photo_url),
    signVehicleClaimPhotoUrl(client, claim.license_plate_photo_url),
  ]);

  return { ...claim, vehicle_photo_url: vehiclePhotoUrl, license_plate_photo_url: licensePlatePhotoUrl };
}

async function defaultInsertVehicleClaim(input: {
  timeEntryId: string;
  contractorId: string;
  vehicleType: VehicleType;
  declaredHours: number;
  notes: string;
  vehiclePhotoUrl: string;
  licensePlatePhotoUrl: string;
}): Promise<VehicleClaim> {
  const client = await getDefaultClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client.from('time_entry_vehicle_claims') as any)
    .insert({
      time_entry_id: input.timeEntryId,
      contractor_id: input.contractorId,
      vehicle_type: input.vehicleType,
      declared_hours: input.declaredHours,
      notes: input.notes,
      vehicle_photo_url: input.vehiclePhotoUrl,
      license_plate_photo_url: input.licensePlatePhotoUrl,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapRemoteVehicleClaim(data as RemoteVehicleClaimRow);
}

async function defaultUpdateVehicleClaimStatus(input: ReviewVehicleClaimInput): Promise<VehicleClaim> {
  const client = await getDefaultClient();
  const nowIso = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client.from('time_entry_vehicle_claims') as any)
    .update({
      status: input.decision,
      reviewed_by: input.reviewerId,
      reviewed_at: nowIso,
      rejection_reason: input.decision === 'REJECTED' ? input.rejectionReason ?? null : null,
    })
    .eq('id', input.claimId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapRemoteVehicleClaim(data as RemoteVehicleClaimRow);
}

async function defaultFetchContractorNames(
  contractorIds: string[],
): Promise<Map<string, { name: string; role: ContractorRole }>> {
  const ids = Array.from(new Set(contractorIds.filter(Boolean)));
  if (ids.length === 0) {
    return new Map();
  }

  const client = await getDefaultClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contractors, error: contractorError } = await (client.from('contractors') as any)
    .select('id, role, profile_id')
    .in('id', ids);

  if (contractorError) {
    throw new Error('Unable to load contractor payroll context.');
  }

  const contractorRows = (contractors ?? []) as RemoteContractorNameRow[];
  const profileIds = Array.from(
    new Set(contractorRows.map((row) => row.profile_id).filter((value): value is string => Boolean(value))),
  );

  const profileNameById = new Map<string, string>();
  if (profileIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles, error: profileError } = await (client.from('profiles') as any)
      .select('id, first_name, last_name')
      .in('id', profileIds);

    if (profileError) {
      throw new Error('Unable to load contractor names.');
    }

    for (const profile of (profiles ?? []) as RemoteProfileNameRow[]) {
      const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
      profileNameById.set(profile.id, fullName.length > 0 ? fullName : profile.id);
    }
  }

  const result = new Map<string, { name: string; role: ContractorRole }>();
  for (const contractor of contractorRows) {
    const name = contractor.profile_id ? profileNameById.get(contractor.profile_id) : undefined;
    result.set(contractor.id, {
      name: name ?? 'Unknown Contractor',
      role: contractor.role as ContractorRole,
    });
  }

  return result;
}

async function defaultFetchVehicleClaims(filters: { status?: VehicleClaimStatus }): Promise<VehicleClaim[]> {
  const client = await getDefaultClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client.from('time_entry_vehicle_claims') as any).select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Unable to load vehicle reimbursement claims.');
  }

  const claims = ((data ?? []) as RemoteVehicleClaimRow[]).map(mapRemoteVehicleClaim);

  // This list feeds the admin review UI where photos are actually
  // displayed, so resolve fresh signed URLs here. getPayrollSummary's
  // fetchVehicleClaimsForEntries deliberately does NOT sign — it only
  // needs amount/status for math, not displayable images.
  return Promise.all(claims.map((claim) => signVehicleClaimPhotoUrls(client, claim)));
}
