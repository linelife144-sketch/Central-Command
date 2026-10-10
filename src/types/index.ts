import type { FieldAssessment } from '@/lib/schemas/fieldAssessment';
import type { TimeInterval, PaySegment } from '@/lib/compensation/validation';
// Central Command - Type Definitions

// User & Authentication Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole =
  | 'CEO'
  | 'STORM_MANAGER'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'TEAM_LEAD'
  | 'CONTRACTOR'
  | 'READ_ONLY';

// Contractor Types
export interface Contractor {
  id: string;
  profile_id: string;
  business_name: string;
  business_type?: string;
  tax_id?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  business_phone?: string;
  business_email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  onboarding_completed_at?: string;
  vehicle_registration_photo_path?: string;
  role: ContractorRole;
  created_at: string;
  updated_at: string;
}


// Payroll role model — one role per contractor, separate from profiles.role
// (the CEO/STORM_MANAGER/legacy SUPER_ADMIN/ADMIN/CONTRACTOR authorization enum).
export type ContractorRole =
  | 'STORM_MANAGER'
  | 'TEAM_LEAD'
  | 'SR_DAMAGE_ASSESSER'
  | 'DAMAGE_ASSESSER'
  | 'DRIVER';

export type VehicleType = 'PERSONAL' | 'RENTAL';

export type VehicleClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ContractorCredential {
  id: string;
  contractor_id: string;
  credential_type: string;
  credential_name: string;
  issuer?: string;
  credential_number?: string;
  issue_date?: string;
  expiration_date: string;
  document_url?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  status: CredentialStatus;
  created_at: string;
  updated_at: string;
}

export type CredentialStatus = 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' | 'REVOKED';

// Ticket Types
export interface Ticket {
  id: string;
  storm_event_id?: string | null;
  ticket_number: string;
  status: TicketStatus;
  is_important: boolean;
  address: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  geofence_radius_meters: number;
  assigned_to?: string;
  team_lead_id?: string | null;
  assigned_driver_id?: string | null;
  crew_id?: string | null;
  current_assessment_id?: string | null;
  review_stage?: 'FIELDWORK' | 'TEAM_LEAD_REVIEW' | 'FINAL_REVIEW' | 'APPROVED' | 'CORRECTIONS' | 'UTILITY_SUBMITTED';
  utility_submitted_at?: string | null;
  utility_submitted_by?: string | null;
  utility_submission_reference?: string | null;
  assigned_by?: string;
  assigned_at?: string;
  created_at: string;
  scheduled_date?: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  utility_client: string;
  work_order_ref?: string;
  client_contact_name?: string;
  client_contact_phone?: string;
  work_description?: string;
  special_instructions?: string;
  damage_types?: string[];
  severity?: DamageSeverity;
  created_by: string;
  updated_at: string;
  updated_by?: string | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export type TicketStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'IN_ROUTE'
  | 'ON_SITE'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'NEEDS_REWORK'
  | 'CLOSED'
  | 'ARCHIVED'
  | 'EXPIRED';

export type PriorityLevel = 'A' | 'B' | 'C' | 'X';
export type DamageSeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';

export interface TicketStatusHistory {
  id: string;
  ticket_id: string;
  from_status?: TicketStatus;
  to_status: TicketStatus;
  changed_by?: string;
  changed_at: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy?: number;
  change_reason?: string;
}

// Time Entry Types
export interface TimeEntry {
  id: string;
  contractor_id: string;
  ticket_id?: string;
  clock_in_at: string;
  clock_in_latitude?: number;
  clock_in_longitude?: number;
  clock_in_accuracy?: number;
  clock_in_photo_url?: string;
  clock_in_photo_file?: Blob;
  clock_out_photo_file?: Blob;
  clock_out_at?: string;
  clock_out_latitude?: number;
  clock_out_longitude?: number;
  clock_out_accuracy?: number;
  clock_out_photo_url?: string;
  work_type: WorkType;
  work_type_rate: number;
  total_minutes?: number;
  break_minutes: number;
  billable_minutes?: number;
  billable_amount?: number;
  status: TimeEntryStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  invoice_id?: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  storm_event_id?: string;
  // Payroll/billing snapshot — written server-side by a database trigger at
  // clock-out, never recomputed client-side and never asserted by the client.
  contractor_role?: ContractorRole;
  pay_rate_applied?: number;
  payroll_amount?: number;
  regular_minutes?: number;
  overtime_minutes?: number;
  regular_pay_amount?: number;
  overtime_pay_amount?: number;
  overtime_rate_applied?: number;
  activity_intervals?: TimeInterval[];
  pay_segments?: PaySegment[];
  paid_minutes_exact?: number;
  vehicle_minutes?: number;
  vehicle_allowance_amount?: number;
  vehicle_hourly_rate_applied?: number;
  calculation_version?: string;
}

export type WorkType =
  | 'Working'
  | 'MOB'
  | 'DE-MOB'
  | 'Stand-by';

export type TimeEntryStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Expense Types
export interface ExpenseReport {
  id: string;
  contractor_id: string;
  report_period_start: string;
  report_period_end: string;
  total_amount: number;
  mileage_total: number;
  item_count: number;
  status: ExpenseStatus;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  invoice_id?: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export type ExpenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID';

export interface ExpenseItem {
  id: string;
  expense_report_id: string;
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
  ticket_id?: string;
  billable_to_client: boolean;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory =
  | 'MILEAGE'
  | 'FUEL'
  | 'LODGING'
  | 'MEALS'
  | 'TOLLS'
  | 'PARKING'
  | 'MATERIALS'
  | 'EQUIPMENT_RENTAL'
  | 'OTHER';

export type PolicyFlag =
  | 'RECEIPT_REQUIRED'
  | 'OVER_LIMIT'
  | 'PRE_APPROVAL_REQUIRED'
  | 'DUPLICATE_DETECTED'
  | 'INVALID_DATE';

// Assessment Types
export interface DamageAssessment {
  photo_evidence?: import('@/lib/schemas/fieldAssessment').AssessmentPhotoEvidence[];
  field_assessment?: FieldAssessment;
  id: string;
  ticket_id: string;
  contractor_id: string;
  safety_observations: SafetyObservations;
  damage_cause?: string;
  weather_conditions?: string;
  estimated_repair_hours?: number;
  priority?: PriorityLevel;
  immediate_actions?: string;
  repair_vs_replace?: RepairDecision;
  estimated_repair_cost?: number;
  assessed_by?: string;
  assessed_at?: string;
  digital_signature?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface SafetyObservations {
  downed_conductors: boolean;
  damaged_insulators: boolean;
  vegetation_contact: boolean;
  structural_damage: boolean;
  fire_hazard: boolean;
  public_accessible: boolean;
  safe_distance_maintained: boolean;
}

export type RepairDecision = 'REPAIR' | 'REPLACE' | 'ENGINEERING_REVIEW';

export interface EquipmentAssessment {
  id: string;
  damage_assessment_id: string;
  equipment_type_id?: string;
  equipment_tag?: string;
  equipment_description?: string;
  condition: EquipmentCondition;
  damage_description?: string;
  requires_replacement: boolean;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
}

export type EquipmentCondition = 'GOOD' | 'FAIR' | 'DAMAGED' | 'DESTROYED';

// Invoice Types
export interface ContractorInvoice {
  storm_event_id?: string;
  id: string;
  invoice_number: string;
  contractor_id: string;
  billing_period_start: string;
  billing_period_end: string;
  subtotal_time: number;
  subtotal_expenses: number;
  total_amount: number;
  status: InvoiceStatus;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  paid_at?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PAID'
  | 'VOID';

export type PaymentMethod = 'ACH' | 'CHECK' | 'WIRE' | 'OTHER';

// Media Types
export interface MediaAsset {
  id: string;
  uploaded_by?: string;
  contractor_id?: string;
  file_name: string;
  original_name?: string;
  file_type: MediaType;
  mime_type?: string;
  file_size_bytes?: number;
  storage_bucket: string;
  storage_path: string;
  public_url?: string;
  thumbnail_url?: string;
  exif_data?: Record<string, unknown>;
  captured_at?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy?: number;
  checksum_sha256?: string;
  entity_type?: string;
  entity_id?: string;
  upload_status: UploadStatus;
  created_at: string;
  updated_at: string;
}

export type MediaType = 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'SIGNATURE';
export type UploadStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED' | 'CONFLICT';

// Form Types
export interface CapturedPhoto {
  id: string;
  file: File;
  preview: string;
  type: PhotoType;
  exif?: ExifData;
  hash?: string;
  validated: boolean;
  errors: string[];
}

export type PhotoType = 'OVERVIEW' | 'EQUIPMENT' | 'DAMAGE' | 'SAFETY' | 'CONTEXT';

export interface ExifData {
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy?: number;
  device?: string;
}

// Sync Types
export interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  user_id: string;
  device_id?: string;
  status: SyncItemStatus;
  attempt_count: number;
  last_error?: string;
  created_at: string;
  retry_after?: string;
}

export type SyncItemStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CONFLICT';

export type InvoiceListItem = ContractorInvoice;

// Assessment photo types (from Grid2)
export type AssessmentPhotoType = 'OVERVIEW' | 'EQUIPMENT' | 'DAMAGE' | 'SAFETY' | 'CONTEXT';

export interface CapturedPhotoMetadata {
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  capturedAt: string | null;
  deviceMake: string | null;
  deviceModel: string | null;
}

export interface CapturedAssessmentPhoto {
  actorProfileId?: string;
  remotePersisted?: boolean;
  sectionKey?: string;
  id: string;
  ticketId: string;
  type: AssessmentPhotoType;
  file: File;
  previewUrl: string;
  capturedAt: string;
  metadata: CapturedPhotoMetadata;
  originalSizeBytes: number;
  sizeBytes: number;
  compressed: boolean;
  checksumSha256: string;
  isDuplicate: boolean;
  duplicateOfPhotoId?: string;
  validationWarnings?: string[];
}

// Vehicle Reimbursement Types
// Flat $5.00/declared-hour, non-taxable, doc-backed, admin-approved
// reimbursement for DRIVER-role contractors using a personal/rental vehicle.
// The amount is resolved server-side by a trigger once the time entry closes
// — never trusted from the client.
export interface VehicleClaim {
  id: string;
  time_entry_id: string;
  contractor_id: string;
  vehicle_type: VehicleType;
  declared_hours: number;
  notes: string;
  vehicle_photo_url: string;
  license_plate_photo_url: string;
  amount: number;
  capped: boolean;
  status: VehicleClaimStatus;
  is_taxable: false;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

// Payroll & Utility Billing Rollup Types

export interface ContractorPayrollRow {
  contractorId: string;
  contractorName: string;
  role: ContractorRole;
  entryCount: number;
  totalMinutes: number;
  billableMinutes: number;
  taxablePayroll: number;
  reimbursementTotal: number;
  totalPayout: number;
  utilityBillAmount?: number;
  marginAmount?: number;
  marginPercent?: number;
  submittedWages?: number;
  approvedWages?: number;
  approvedPayout?: number;
  pendingEntries: number;
  approvedEntries: number;
  pendingVehicleClaims: number;
}

export interface PayrollTotals {
  contractorCount: number;
  entryCount: number;
  totalMinutes: number;
  billableMinutes: number;
  taxablePayroll: number;
  reimbursementTotal: number;
  totalPayout: number;
  utilityBillAmount?: number;
  marginAmount?: number;
  marginPercent?: number;
  submittedWages?: number;
  approvedWages?: number;
  approvedPayout?: number;
}

export interface PayrollSummary {
  includeFinancial?: boolean;
  periodStart: string;
  periodEnd: string;
  stormEventId?: string;
  generatedAt: string;
  rows: ContractorPayrollRow[];
  totals: PayrollTotals;
}

export interface RoleRateDefault {
  role: ContractorRole;
  workType: WorkType;
  hourlyRate: number;
  currency: string;
}

export interface UtilityBillingRate {
  stormEventId: string | null;
  /** Role this rate bills. Null on preserved pre-migration work-type rows. */
  role: ContractorRole | null;
  /** Set only on preserved pre-migration rows; new rates are role-keyed. */
  workType: WorkType | null;
  hourlyRate: number;
  currency: string;
}

export interface PrivilegedTimeEntryFinancials { id: string; utility_bill_rate_applied: number | null; utility_bill_amount: number | null }

export type WagePayrollRow = Omit<ContractorPayrollRow, "utilityBillAmount" | "marginAmount" | "marginPercent">;
export interface PrivilegedPayrollRow extends WagePayrollRow { utilityBillAmount: number; marginAmount: number; marginPercent: number }
