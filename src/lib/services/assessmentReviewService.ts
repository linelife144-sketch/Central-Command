import { db, type LocalAssessment } from '../db/dexie';
import type { PriorityLevel, SyncStatus } from '@/types';

interface RemoteAssessmentRow {
  id: string;
  ticket_id: string;
  contractor_id: string;
  safety_observations: Record<string, boolean> | null;
  damage_cause: string | null;
  priority: string | null;
  assessed_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
}

interface RemoteEquipmentRow {
  damage_assessment_id: string;
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

export type AssessmentReviewDecision = 'APPROVED' | 'NEEDS_REWORK';
export type AssessmentReviewState = 'PENDING' | 'REVIEWED';

export interface AssessmentReviewListItem {
  id: string;
  ticket_id: string;
  ticket_number?: string;
  contractor_id: string;
  contractor_name?: string;
  damage_cause?: string;
  priority?: PriorityLevel;
  safety_flags: string[];
  equipment_count: number;
  assessed_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  review_state: AssessmentReviewState;
  review_decision?: AssessmentReviewDecision;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface AssessmentReviewFilters {
  reviewed?: AssessmentReviewState | 'ALL';
  decision?: AssessmentReviewDecision | 'ALL';
  priority?: PriorityLevel | 'ALL';
  from?: string;
  to?: string;
  search?: string;
}

export interface ReviewAssessmentInput {
  assessmentId: string;
  reviewerId: string;
  decision: AssessmentReviewDecision;
  reviewNotes?: string;
}

export interface ReviewedAssessment {
  assessmentId: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewNotes: string;
  decision: AssessmentReviewDecision;
}

interface AssessmentReviewDependencies {
  isOnline: () => boolean;
  listRemoteAssessments: (filters: AssessmentReviewFilters) => Promise<AssessmentReviewListItem[]>;
  listLocalAssessments: (filters: AssessmentReviewFilters) => Promise<AssessmentReviewListItem[]>;
  reviewRemoteAssessment: (input: ReviewAssessmentInput) => Promise<ReviewedAssessment>;
}

export interface AssessmentReviewService {
  listAssessments: (filters?: AssessmentReviewFilters) => Promise<AssessmentReviewListItem[]>;
  reviewAssessment: (input: ReviewAssessmentInput) => Promise<ReviewedAssessment>;
}

function parseTimestamp(value?: string): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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

function toSyncStatus(value?: string | null): SyncStatus {
  const normalized = value?.toUpperCase();
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'FAILED') return 'FAILED';
  if (normalized === 'CONFLICT') return 'CONFLICT';
  return 'SYNCED';
}

function toSafetyFlags(safetyObservations: unknown): string[] {
  if (!safetyObservations || typeof safetyObservations !== 'object') {
    return [];
  }

  const entries = Object.entries(safetyObservations as Record<string, unknown>);
  return entries
    .filter(([, value]) => value === true)
    .map(([key]) => key)
    .sort();
}

function parseReviewDecision(reviewNotes?: string | null): AssessmentReviewDecision | undefined {
  if (!reviewNotes) {
    return undefined;
  }

  const normalized = reviewNotes.trim().toUpperCase();
  if (normalized.startsWith('[APPROVED]')) {
    return 'APPROVED';
  }

  if (normalized.startsWith('[NEEDS_REWORK]')) {
    return 'NEEDS_REWORK';
  }

  return undefined;
}

function toReviewState(reviewedAt?: string | null): AssessmentReviewState {
  return reviewedAt ? 'REVIEWED' : 'PENDING';
}

function matchesDateRange(
  assessedAt: string | undefined,
  createdAt: string,
  filters: AssessmentReviewFilters,
): boolean {
  const candidateDate = assessedAt ?? createdAt;
  const candidateTime = parseTimestamp(candidateDate);

  const fromTime = filters.from ? parseTimestamp(filters.from) : null;
  if (fromTime !== null && candidateTime < fromTime) {
    return false;
  }

  const toTime = filters.to ? parseTimestamp(filters.to) : null;
  if (toTime !== null && candidateTime > toTime) {
    return false;
  }

  return true;
}

function matchesSearch(item: AssessmentReviewListItem, search?: string): boolean {
  if (!search?.trim()) {
    return true;
  }

  const normalizedSearch = search.trim().toLowerCase();
  const searchableText = [
    item.id,
    item.ticket_id,
    item.ticket_number,
    item.contractor_id,
    item.contractor_name,
    item.damage_cause,
    item.priority,
    item.review_notes,
    item.review_decision,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedSearch);
}

function applyFilters(
  items: AssessmentReviewListItem[],
  filters: AssessmentReviewFilters,
): AssessmentReviewListItem[] {
  return items
    .filter((item) => (filters.reviewed && filters.reviewed !== 'ALL' ? item.review_state === filters.reviewed : true))
    .filter((item) =>
      filters.decision && filters.decision !== 'ALL' ? item.review_decision === filters.decision : true,
    )
    .filter((item) => (filters.priority && filters.priority !== 'ALL' ? item.priority === filters.priority : true))
    .filter((item) => matchesDateRange(item.assessed_at, item.created_at, filters))
    .filter((item) => matchesSearch(item, filters.search))
    .sort((left, right) => {
      const leftTime = parseTimestamp(left.assessed_at ?? left.created_at);
      const rightTime = parseTimestamp(right.assessed_at ?? right.created_at);
      return rightTime - leftTime;
    });
}

function mapRemoteAssessment(
  row: RemoteAssessmentRow,
  equipmentCountByAssessmentId: Map<string, number>,
  ticketNumberById: Map<string, string>,
  contractorNameById: Map<string, string>,
): AssessmentReviewListItem {
  const reviewDecision = parseReviewDecision(row.review_notes);

  return {
    id: row.id,
    ticket_id: row.ticket_id,
    ticket_number: ticketNumberById.get(row.ticket_id),
    contractor_id: row.contractor_id,
    contractor_name: contractorNameById.get(row.contractor_id),
    damage_cause: row.damage_cause ?? undefined,
    priority: toPriority(row.priority),
    safety_flags: toSafetyFlags(row.safety_observations),
    equipment_count: equipmentCountByAssessmentId.get(row.id) ?? 0,
    assessed_at: row.assessed_at ?? undefined,
    reviewed_by: row.reviewed_by ?? undefined,
    reviewed_at: row.reviewed_at ?? undefined,
    review_notes: row.review_notes ?? undefined,
    review_state: toReviewState(row.reviewed_at),
    review_decision: reviewDecision,
    sync_status: toSyncStatus(row.sync_status),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapLocalAssessment(row: LocalAssessment): AssessmentReviewListItem {
  const reviewDecision = parseReviewDecision(row.review_notes);
  const createdAt = row.created_at ?? new Date().toISOString();
  const updatedAt = row.updated_at ?? createdAt;

  return {
    id: row.id,
    ticket_id: row.ticket_id,
    contractor_id: row.contractor_id,
    damage_cause: row.damage_cause,
    priority: toPriority(row.priority),
    safety_flags: toSafetyFlags(row.safety_observations),
    equipment_count: Array.isArray(row.equipment_items) ? row.equipment_items.length : 0,
    assessed_at: row.assessed_at,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    review_notes: row.review_notes,
    review_state: toReviewState(row.reviewed_at),
    review_decision: reviewDecision,
    sync_status: row.sync_status === 'pending' ? 'PENDING' : row.sync_status === 'failed' ? 'FAILED' : 'SYNCED',
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

async function fetchEquipmentCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  assessmentIds: string[],
): Promise<Map<string, number>> {
  if (assessmentIds.length === 0) {
    return new Map();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('equipment_assessments') as any)
      .select('damage_assessment_id')
      .in('damage_assessment_id', assessmentIds);

    const rows = (data ?? []) as RemoteEquipmentRow[];
    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(row.damage_assessment_id, (counts.get(row.damage_assessment_id) ?? 0) + 1);
    }

    return counts;
  } catch {
    return new Map();
  }
}

async function listRemoteAssessments(filters: AssessmentReviewFilters): Promise<AssessmentReviewListItem[]> {
  const { supabase } = await import('../supabase/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('damage_assessments') as any)
    .select(
      'id, ticket_id, contractor_id, safety_observations, damage_cause, priority, assessed_at, reviewed_by, reviewed_at, review_notes, sync_status, created_at, updated_at',
    )
    .order('assessed_at', { ascending: false });

  if (filters.reviewed === 'PENDING') {
    query = query.is('reviewed_at', null);
  }

  if (filters.reviewed === 'REVIEWED') {
    query = query.not('reviewed_at', 'is', null);
  }

  if (filters.priority && filters.priority !== 'ALL') {
    query = query.eq('priority', filters.priority);
  }

  if (filters.from) {
    query = query.gte('assessed_at', filters.from);
  }

  if (filters.to) {
    query = query.lte('assessed_at', filters.to);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const assessmentRows = (data ?? []) as RemoteAssessmentRow[];
  const ticketIds = Array.from(new Set(assessmentRows.map((row) => row.ticket_id).filter(Boolean)));
  const contractorIds = Array.from(
    new Set(assessmentRows.map((row) => row.contractor_id).filter(Boolean)),
  );
  const assessmentIds = assessmentRows.map((row) => row.id);

  const [ticketNumberById, contractorNameById, equipmentCountByAssessmentId] = await Promise.all([
    fetchTicketNumbers(supabase, ticketIds),
    fetchContractorNames(supabase, contractorIds),
    fetchEquipmentCounts(supabase, assessmentIds),
  ]);

  const mapped = assessmentRows.map((row) =>
    mapRemoteAssessment(row, equipmentCountByAssessmentId, ticketNumberById, contractorNameById),
  );

  return applyFilters(mapped, filters);
}

async function listLocalAssessments(filters: AssessmentReviewFilters): Promise<AssessmentReviewListItem[]> {
  const rows = await db.assessments.toArray();
  const mapped = rows.map((row) => mapLocalAssessment(row));
  return applyFilters(mapped, filters);
}

export function composeReviewNotes(decision: AssessmentReviewDecision, reviewNotes?: string): string {
  const prefix = `[${decision}]`;
  const trimmed = reviewNotes?.trim();
  return trimmed ? `${prefix} ${trimmed}` : prefix;
}

async function reviewRemoteAssessment(input: ReviewAssessmentInput): Promise<ReviewedAssessment> {
  const { supabase } = await import('../supabase/client');
  const nowIso = new Date().toISOString();

  const composedNotes = composeReviewNotes(input.decision, input.reviewNotes);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('damage_assessments') as any)
    .update({
      reviewed_by: input.reviewerId,
      reviewed_at: nowIso,
      review_notes: composedNotes,
      updated_at: nowIso,
    })
    .eq('id', input.assessmentId)
    .select('id, reviewed_by, reviewed_at, review_notes')
    .single();

  if (error) {
    throw error;
  }

  return {
    assessmentId: (data?.id as string) ?? input.assessmentId,
    reviewedBy: (data?.reviewed_by as string) ?? input.reviewerId,
    reviewedAt: (data?.reviewed_at as string) ?? nowIso,
    reviewNotes: (data?.review_notes as string) ?? composedNotes,
    decision: input.decision,
  };
}

const defaultDependencies: AssessmentReviewDependencies = {
  isOnline: defaultIsOnline,
  listRemoteAssessments,
  listLocalAssessments,
  reviewRemoteAssessment,
};

export function createAssessmentReviewService(
  overrides: Partial<AssessmentReviewDependencies> = {},
): AssessmentReviewService {
  const dependencies: AssessmentReviewDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async listAssessments(filters: AssessmentReviewFilters = {}): Promise<AssessmentReviewListItem[]> {
      if (dependencies.isOnline()) {
        try {
          return await dependencies.listRemoteAssessments(filters);
        } catch {
          return dependencies.listLocalAssessments(filters);
        }
      }

      return dependencies.listLocalAssessments(filters);
    },

    async reviewAssessment(input: ReviewAssessmentInput): Promise<ReviewedAssessment> {
      if (!dependencies.isOnline()) {
        throw new Error('Assessment review requires an internet connection.');
      }

      if (input.decision === 'NEEDS_REWORK' && !input.reviewNotes?.trim()) {
        throw new Error('Review notes are required when requesting rework.');
      }

      return dependencies.reviewRemoteAssessment(input);
    },
  };
}

export const assessmentReviewService = createAssessmentReviewService();
