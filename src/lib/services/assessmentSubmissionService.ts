import { addToSyncQueue, db, type LocalAssessment } from '../db/dexie';
import type {
  AssessmentPhotoType,
  DamageAssessment,
  EquipmentCondition,
  PriorityLevel,
  RepairDecision,
  SafetyObservations,
  SyncStatus,
} from '../../types';

interface RemoteDamageAssessmentRow {
  id: string;
  ticket_id: string;
  contractor_id: string;
  safety_observations: SafetyObservations | null;
  damage_cause: string | null;
  weather_conditions: string | null;
  estimated_repair_hours: number | null;
  priority: string | null;
  immediate_actions: string | null;
  repair_vs_replace: string | null;
  estimated_repair_cost: number | null;
  assessed_by: string | null;
  assessed_at: string | null;
  digital_signature: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
}

interface RemoteDamageAssessmentInsert {
  ticket_id: string;
  contractor_id: string;
  safety_observations: SafetyObservations;
  damage_cause: string | null;
  weather_conditions: string | null;
  estimated_repair_hours: number | null;
  priority: PriorityLevel | null;
  immediate_actions: string | null;
  repair_vs_replace: RepairDecision | null;
  estimated_repair_cost: number | null;
  assessed_by: string | null;
  assessed_at: string;
  digital_signature: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

interface RemoteEquipmentAssessmentInsert {
  damage_assessment_id: string;
  equipment_type_id: string | null;
  equipment_tag: string | null;
  equipment_description: string | null;
  condition: EquipmentCondition;
  damage_description: string | null;
  requires_replacement: boolean;
  photo_urls: string[] | null;
}

interface RemoteContractorRow {
  id: string;
  profile_id?: string;
}

function createId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toSyncStatus(status?: string | null): SyncStatus {
  const normalized = status?.toUpperCase();
  if (normalized === 'PENDING') {
    return 'PENDING';
  }

  if (normalized === 'FAILED') {
    return 'FAILED';
  }

  if (normalized === 'CONFLICT') {
    return 'CONFLICT';
  }

  return 'SYNCED';
}

function toRepairDecision(value?: string | null): RepairDecision | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toUpperCase();
  if (normalized === 'REPAIR') return 'REPAIR';
  if (normalized === 'REPLACE') return 'REPLACE';
  if (normalized === 'ENGINEERING_REVIEW') return 'ENGINEERING_REVIEW';
  return undefined;
}

function toPriority(value?: string | null): PriorityLevel | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toUpperCase();
  if (normalized === 'A') return 'A';
  if (normalized === 'B') return 'B';
  if (normalized === 'C') return 'C';
  if (normalized === 'X') return 'X';
  return undefined;
}

function toNumberOrNull(value?: number): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  return Number.isFinite(value) ? value : null;
}

function mapRemoteAssessment(row: RemoteDamageAssessmentRow): DamageAssessment {
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    contractor_id: row.contractor_id,
    safety_observations: row.safety_observations ?? {
      downed_conductors: false,
      damaged_insulators: false,
      vegetation_contact: false,
      structural_damage: false,
      fire_hazard: false,
      public_accessible: false,
      safe_distance_maintained: false,
    },
    damage_cause: row.damage_cause ?? undefined,
    weather_conditions: row.weather_conditions ?? undefined,
    estimated_repair_hours: row.estimated_repair_hours ?? undefined,
    priority: toPriority(row.priority),
    immediate_actions: row.immediate_actions ?? undefined,
    repair_vs_replace: toRepairDecision(row.repair_vs_replace),
    estimated_repair_cost: row.estimated_repair_cost ?? undefined,
    assessed_by: row.assessed_by ?? undefined,
    assessed_at: row.assessed_at ?? undefined,
    digital_signature: row.digital_signature ?? undefined,
    reviewed_by: row.reviewed_by ?? undefined,
    reviewed_at: row.reviewed_at ?? undefined,
    review_notes: row.review_notes ?? undefined,
    sync_status: toSyncStatus(row.sync_status),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapLocalAssessment(row: LocalAssessment): DamageAssessment {
  const createdAt = row.created_at ?? new Date().toISOString();
  const updatedAt = row.updated_at ?? createdAt;

  return {
    id: row.id,
    ticket_id: row.ticket_id,
    contractor_id: row.contractor_id,
    safety_observations: row.safety_observations as SafetyObservations,
    damage_cause: row.damage_cause,
    weather_conditions: row.weather_conditions,
    estimated_repair_hours: row.estimated_repair_hours,
    priority: toPriority(row.priority),
    immediate_actions: row.immediate_actions,
    repair_vs_replace: toRepairDecision(row.repair_vs_replace),
    estimated_repair_cost: row.estimated_repair_cost,
    assessed_by: row.assessed_by,
    assessed_at: row.assessed_at,
    digital_signature: row.digital_signature,
    sync_status: row.sync_status === 'failed' ? 'FAILED' : row.sync_status === 'pending' ? 'PENDING' : 'SYNCED',
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function composeEquipmentDescription(item: AssessmentEquipmentInput): string | null {
  const parts = [
    normalizeOptionalText(item.equipmentType),
    normalizeOptionalText(item.equipmentDescription),
    item.wireSizeCode ? `Wire Size: ${item.wireSizeCode}` : null,
  ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' - ').slice(0, 255);
}

function assertRequiredFields(input: CreateAssessmentInput): void {
  if (!input.ticketId.trim()) {
    throw new Error('Ticket is required to submit an assessment.');
  }

  if (!input.contractorId.trim()) {
    throw new Error('Contractor is required to submit an assessment.');
  }

  if (input.equipmentItems.length === 0) {
    throw new Error('At least one equipment assessment is required.');
  }

  const missingEquipmentType = input.equipmentItems.some(
    (item) => !item.equipmentTypeId?.trim() && !item.equipmentType?.trim(),
  );

  if (missingEquipmentType) {
    throw new Error('Each equipment assessment must include an equipment type.');
  }
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

export interface AssessmentPhotoMetadataInput {
  id: string;
  type: AssessmentPhotoType;
  previewUrl?: string;
  checksumSha256?: string;
}

export interface AssessmentDamageClassificationInput {
  damageCause?: string;
  weatherConditions?: string;
  estimatedRepairHours?: number;
  priority?: PriorityLevel;
  immediateActions?: string;
  repairVsReplace?: RepairDecision;
  estimatedRepairCost?: number;
}

export interface AssessmentEquipmentInput {
  equipmentType?: string;
  equipmentTypeId?: string;
  wireSizeCode?: string;
  equipmentTag?: string;
  equipmentDescription?: string;
  condition: EquipmentCondition;
  damageDescription?: string;
  requiresReplacement?: boolean;
  photoUrls?: string[];
}

export interface CreateAssessmentInput {
  ticketId: string;
  contractorId: string;
  assessedBy?: string;
  digitalSignature?: string;
  safetyObservations: SafetyObservations;
  damageClassification: AssessmentDamageClassificationInput;
  equipmentItems: AssessmentEquipmentInput[];
  photoMetadata?: AssessmentPhotoMetadataInput[];
}

interface AssessmentSubmissionDependencies {
  isOnline: () => boolean;
  createRemoteAssessment: (input: CreateAssessmentInput) => Promise<DamageAssessment>;
  createLocalAssessment: (input: CreateAssessmentInput, errorMessage?: string) => Promise<DamageAssessment>;
}

export interface AssessmentSubmissionService {
  createAssessment: (input: CreateAssessmentInput) => Promise<DamageAssessment>;
}

async function createRemoteAssessment(input: CreateAssessmentInput): Promise<DamageAssessment> {
  const { supabase } = await import('../supabase/client');
  const contractorId = await resolveContractorId(input.contractorId);
  const nowIso = new Date().toISOString();

  const assessmentInsert: RemoteDamageAssessmentInsert = {
    ticket_id: input.ticketId,
    contractor_id: contractorId,
    safety_observations: input.safetyObservations,
    damage_cause: normalizeOptionalText(input.damageClassification.damageCause),
    weather_conditions: normalizeOptionalText(input.damageClassification.weatherConditions),
    estimated_repair_hours: toNumberOrNull(input.damageClassification.estimatedRepairHours),
    priority: input.damageClassification.priority ?? null,
    immediate_actions: normalizeOptionalText(input.damageClassification.immediateActions),
    repair_vs_replace: input.damageClassification.repairVsReplace ?? null,
    estimated_repair_cost: toNumberOrNull(input.damageClassification.estimatedRepairCost),
    assessed_by: normalizeOptionalText(input.assessedBy ?? input.contractorId),
    assessed_at: nowIso,
    digital_signature: normalizeOptionalText(input.digitalSignature),
    sync_status: 'SYNCED',
    created_at: nowIso,
    updated_at: nowIso,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('damage_assessments') as any)
    .insert([assessmentInsert])
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const assessment = mapRemoteAssessment(data as RemoteDamageAssessmentRow);

  if (input.equipmentItems.length > 0) {
    const equipmentInserts: RemoteEquipmentAssessmentInsert[] = input.equipmentItems.map((item) => ({
      damage_assessment_id: assessment.id,
      equipment_type_id: normalizeOptionalText(item.equipmentTypeId),
      equipment_tag: normalizeOptionalText(item.equipmentTag),
      equipment_description: composeEquipmentDescription(item),
      condition: item.condition,
      damage_description: normalizeOptionalText(item.damageDescription),
      requires_replacement: Boolean(item.requiresReplacement),
      photo_urls: item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : null,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: equipmentError } = await (supabase.from('equipment_assessments') as any)
      .insert(equipmentInserts);

    if (equipmentError) {
      throw equipmentError;
    }
  }

  return assessment;
}

async function createLocalAssessment(
  input: CreateAssessmentInput,
  errorMessage?: string,
): Promise<DamageAssessment> {
  const nowIso = new Date().toISOString();
  const assessmentId = createId();

  const localAssessment: LocalAssessment = {
    id: assessmentId,
    ticket_id: input.ticketId,
    contractor_id: input.contractorId,
    safety_observations: input.safetyObservations,
    damage_cause: normalizeOptionalText(input.damageClassification.damageCause) ?? undefined,
    weather_conditions: normalizeOptionalText(input.damageClassification.weatherConditions) ?? undefined,
    estimated_repair_hours: input.damageClassification.estimatedRepairHours,
    priority: input.damageClassification.priority,
    immediate_actions: normalizeOptionalText(input.damageClassification.immediateActions) ?? undefined,
    repair_vs_replace: input.damageClassification.repairVsReplace,
    estimated_repair_cost: input.damageClassification.estimatedRepairCost,
    assessed_by: normalizeOptionalText(input.assessedBy ?? input.contractorId) ?? undefined,
    assessed_at: nowIso,
    digital_signature: normalizeOptionalText(input.digitalSignature) ?? undefined,
    synced: false,
    sync_status: 'pending',
    last_error: errorMessage,
    equipment_items: input.equipmentItems,
    photo_metadata: input.photoMetadata,
    created_at: nowIso,
    updated_at: nowIso,
  };

  await db.assessments.put(localAssessment);
  await addToSyncQueue('CREATE', 'assessment', assessmentId, {
    assessment: localAssessment,
    equipment_items: input.equipmentItems,
    photo_metadata: input.photoMetadata,
  });

  return mapLocalAssessment(localAssessment);
}

const defaultDependencies: AssessmentSubmissionDependencies = {
  isOnline: defaultIsOnline,
  createRemoteAssessment,
  createLocalAssessment,
};

export function createAssessmentSubmissionService(
  overrides: Partial<AssessmentSubmissionDependencies> = {},
): AssessmentSubmissionService {
  const dependencies: AssessmentSubmissionDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async createAssessment(input: CreateAssessmentInput): Promise<DamageAssessment> {
      assertRequiredFields(input);

      if (dependencies.isOnline()) {
        try {
          return await dependencies.createRemoteAssessment(input);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Remote assessment creation failed.';
          return dependencies.createLocalAssessment(input, message);
        }
      }

      return dependencies.createLocalAssessment(input);
    },
  };
}

export const assessmentSubmissionService = createAssessmentSubmissionService();
