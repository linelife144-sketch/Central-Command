import { supabase } from '@/lib/supabase/client';
import { createTemplateSnapshot, getTicketTemplateByUtilityClient, normalizeUtilityClient } from '@/lib/tickets/templates';
import { isAuthOrPermissionError, isMissingDatabaseObjectError } from '@/lib/utils/errorHandling';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { localTestStore } from '@/lib/testing/localTestStore';
import { CONTRACTOR_ROLES, type StormRoleRates } from '@/lib/compensation/stormRates';

const CLOSED_TICKET_STATUSES = new Set(['CLOSED', 'ARCHIVED', 'EXPIRED']);

interface RemoteStormEventRow {
  id: string;
  event_code: string;
  name: string;
  utility_client: string;
  status: string;
  region: string | null;
  contract_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  ticket_template_key?: string | null;
  config_snapshot?: Record<string, unknown> | null;
  created_at: string;
}

function normalizeUtilityClientValue(value: string | null | undefined): string {
  return normalizeUtilityClient(value);
}

interface RemoteTicketCountRow {
  storm_event_id: string | null;
  status: string;
}

export type StormEventStatus = 'MOB' | 'ACTIVE' | 'DE-MOB' | 'RELEASED' | 'BILLING' | 'CLOSED';

export interface StormEventSummary {
  id: string;
  eventCode: string;
  name: string;
  utilityClient: string;
  ticketTemplateKey: string | null;
  configSnapshot: Record<string, unknown> | null;
  status: StormEventStatus;
  region: string | null;
  contractReference: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  activeTickets: number;
}

export interface CreateStormEventInput {
  eventCode?: string;
  name: string;
  utilityClient: string;
  status?: StormEventStatus;
  region?: string | null;
  contractReference?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  roleRates: StormRoleRates;
}

function normalizeStormEventStatus(value: string | null | undefined): StormEventStatus {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'MOB') {
    return 'MOB';
  }
  if (normalized === 'ACTIVE') {
    return 'ACTIVE';
  }
  if (normalized === 'DE-MOB') {
    return 'DE-MOB';
  }
  if (normalized === 'RELEASED') {
    return 'RELEASED';
  }
  if (normalized === 'BILLING') {
    return 'BILLING';
  }
  if (normalized === 'CLOSED') {
    return 'CLOSED';
  }
  // Legacy status compatibility fallback
  if (normalized === 'PLANNED') {
    return 'MOB';
  }
  if (normalized === 'COMPLETE') {
    return 'DE-MOB';
  }
  if (normalized === 'PAUSED') {
    return 'RELEASED';
  }
  if (normalized === 'ARCHIVED') {
    return 'CLOSED';
  }
  return 'MOB';
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isActiveTicketStatus(status: string): boolean {
  return !CLOSED_TICKET_STATUSES.has(status.toUpperCase());
}

const ADMIN_OPERATIONAL_STORM_RANK: Record<StormEventStatus, number> = {
  CLOSED: 5,
  MOB: 0,
  ACTIVE: 1,
  'DE-MOB': 2,
  RELEASED: 3,
  BILLING: 4,
};

export function resolveAdminActiveStormEvent(
  events: StormEventSummary[],
): StormEventSummary | null {
  const operational = events
    .filter((event) => event.status !== 'CLOSED')
    .sort((a, b) => {
      const rankA = ADMIN_OPERATIONAL_STORM_RANK[a.status];
      const rankB = ADMIN_OPERATIONAL_STORM_RANK[b.status];
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      const startA = a.startDate ? Date.parse(a.startDate) : Number.NaN;
      const startB = b.startDate ? Date.parse(b.startDate) : Number.NaN;
      if (Number.isNaN(startA) !== Number.isNaN(startB)) {
        return Number.isNaN(startA) ? 1 : -1; // null/invalid startDate sorts after a dated event
      }
      if (Number.isNaN(startA) !== Number.isNaN(startB)) {
        return Number.isNaN(startA) ? 1 : -1; // null/invalid startDate sorts after a dated event
      }
      if (!Number.isNaN(startA) && !Number.isNaN(startB) && startA !== startB) {
        return startB - startA; // newer startDate first
      }

      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });

  return operational[0] ?? null;
}

function mapStormEventRow(
  row: RemoteStormEventRow,
  activeTicketCountByEventId: Map<string, number>,
): StormEventSummary {
  return {
    id: row.id,
    eventCode: row.event_code,
    name: row.name,
    utilityClient: row.utility_client,
    ticketTemplateKey: row.ticket_template_key ?? null,
    configSnapshot: row.config_snapshot ?? null,
    status: normalizeStormEventStatus(row.status),
    region: row.region,
    contractReference: row.contract_reference,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    createdAt: row.created_at,
    activeTickets: activeTicketCountByEventId.get(row.id) ?? 0,
  };
}

async function getActiveTicketCountByEventId(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tickets') as any)
    .select('storm_event_id, status')
    .in('storm_event_id', eventIds);

  if (error) {
    if (isAuthOrPermissionError(error) || isMissingDatabaseObjectError(error)) {
      return new Map();
    }
    throw error;
  }

  const rows = (data ?? []) as RemoteTicketCountRow[];
  const countByEventId = new Map<string, number>();
  for (const row of rows) {
    if (!row.storm_event_id || !isActiveTicketStatus(row.status)) {
      continue;
    }

    countByEventId.set(row.storm_event_id, (countByEventId.get(row.storm_event_id) ?? 0) + 1);
  }

  return countByEventId;
}

export const stormEventService = {
  async getAdminActiveStormEvent(): Promise<StormEventSummary | null> {
    return resolveAdminActiveStormEvent(await stormEventService.listStormEvents());
  },

  async listStormEvents(): Promise<StormEventSummary[]> {
    if (isSuperAdminTestingEnabled()) return localTestStore.listStormEvents();

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('storm_events') as any)
      .select(
        'id, event_code, name, utility_client, ticket_template_key, config_snapshot, status, region, contract_reference, start_date, end_date, notes, created_at',
      )
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingDatabaseObjectError(error)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const legacyResult = await (supabase.from('storm_events') as any)
          .select(
            'id, event_code, name, utility_client, status, region, contract_reference, start_date, end_date, notes, created_at',
          )
          .eq('is_deleted', false)
          .order('created_at', { ascending: false });

        if (legacyResult.error) {
          if (isAuthOrPermissionError(legacyResult.error) || isMissingDatabaseObjectError(legacyResult.error)) {
            return [];
          }
          throw legacyResult.error;
        }

        const legacyRows = (legacyResult.data ?? []) as RemoteStormEventRow[];
        const eventIds = legacyRows.map((row) => row.id);
        const activeTicketCountByEventId = await getActiveTicketCountByEventId(eventIds);
        return legacyRows.map((row) => mapStormEventRow(row, activeTicketCountByEventId));
      }
      if (isAuthOrPermissionError(error) || isMissingDatabaseObjectError(error)) {
        return [];
      }
      throw error;
    }

    const rows = (data ?? []) as RemoteStormEventRow[];
    const eventIds = rows.map((row) => row.id);
    const activeTicketCountByEventId = await getActiveTicketCountByEventId(eventIds);
    return rows.map((row) => mapStormEventRow(row, activeTicketCountByEventId));
  },

  async getStormEventById(id: string): Promise<StormEventSummary | null> {
    if (!id) {
      return null;
    }

    if (isSuperAdminTestingEnabled()) return localTestStore.getStormEventById(id);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('storm_events') as any)
      .select(
        'id, event_code, name, utility_client, ticket_template_key, config_snapshot, status, region, contract_reference, start_date, end_date, notes, created_at',
      )
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      if (isMissingDatabaseObjectError(error)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const legacyResult = await (supabase.from('storm_events') as any)
          .select(
            'id, event_code, name, utility_client, status, region, contract_reference, start_date, end_date, notes, created_at',
          )
          .eq('id', id)
          .eq('is_deleted', false)
          .maybeSingle();

        if (legacyResult.error) {
          if (isAuthOrPermissionError(legacyResult.error) || isMissingDatabaseObjectError(legacyResult.error)) {
            return null;
          }
          throw legacyResult.error;
        }

        if (!legacyResult.data) {
          return null;
        }

        const activeTicketCountByEventId = await getActiveTicketCountByEventId([id]);
        return mapStormEventRow(legacyResult.data as RemoteStormEventRow, activeTicketCountByEventId);
      }
      if (isAuthOrPermissionError(error) || isMissingDatabaseObjectError(error)) {
        return null;
      }
      throw error;
    }

    if (!data) {
      // Contractors get only the context for their assigned tickets through RLS.
      const { data: context, error: contextError } = await supabase.rpc(
        'get_assigned_storm_ticket_context', { p_storm_id: id },
      );
      if (contextError) {
        if (isAuthOrPermissionError(contextError)) return null;
        throw contextError;
      }
      if (!context || typeof context !== 'object' || Array.isArray(context)) return null;
      const activeTicketCountByEventId = await getActiveTicketCountByEventId([id]);
      return mapStormEventRow(context as unknown as RemoteStormEventRow, activeTicketCountByEventId);
    }

    const activeTicketCountByEventId = await getActiveTicketCountByEventId([id]);
    return mapStormEventRow(data as RemoteStormEventRow, activeTicketCountByEventId);
  },

  async createStormEvent(input: CreateStormEventInput): Promise<StormEventSummary> {
    if (isSuperAdminTestingEnabled()) {
      const utilityClient = normalizeUtilityClientValue(input.utilityClient);
      return localTestStore.createStormEvent({
        eventCode: normalizeOptional(input.eventCode)?.toUpperCase() ?? `${utilityClient}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        name: input.name,
        utilityClient,
        status: normalizeStormEventStatus(input.status ?? 'MOB'),
        region: normalizeOptional(input.region),
        contractReference: normalizeOptional(input.contractReference),
        startDate: normalizeOptional(input.startDate),
        endDate: normalizeOptional(input.endDate),
        notes: normalizeOptional(input.notes),
        ticketTemplateKey: getTicketTemplateByUtilityClient(normalizeUtilityClient(utilityClient)).templateKey,
        configSnapshot: createTemplateSnapshot(normalizeUtilityClient(utilityClient)),
        roleRates: input.roleRates,
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const normalizedUtilityClient = normalizeUtilityClientValue(input.utilityClient);
    const eventCode = normalizeOptional(input.eventCode)?.toUpperCase() ?? `${normalizedUtilityClient}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const pEvent = {
      event_code: eventCode,
      name: input.name.trim(),
      utility_client: normalizedUtilityClient,
      status: normalizeStormEventStatus(input.status ?? 'MOB'),
      region: normalizeOptional(input.region),
      contract_reference: normalizeOptional(input.contractReference),
      start_date: normalizeOptional(input.startDate),
      end_date: normalizeOptional(input.endDate),
      notes: normalizeOptional(input.notes),
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    };
    const pRoleRates = CONTRACTOR_ROLES.map((role) => ({
      role,
      pay_rate: input.roleRates[role].payRate,
      bill_rate: input.roleRates[role].billRate,
    }));

    const { data, error } = await supabase.rpc('create_storm_event_with_rates' as never, {
      p_event: pEvent,
      p_role_rates: pRoleRates,
    } as never);

    if (error) {
      throw error;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Storm creation returned an invalid response.');
    }
    return mapStormEventRow(data as unknown as RemoteStormEventRow, new Map());
  },
};
