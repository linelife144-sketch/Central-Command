import { normalizeUtilityClient } from '@/lib/tickets/templates';
import type { ContractorRole, Ticket, TicketStatus, TicketStatusHistory } from '@/types';
import type { StormEventSummary } from '@/lib/services/stormEventService';
import type { StormRoleRates } from '@/lib/compensation/stormRates';
import { isSuperAdminTestingEnabled, SUPER_ADMIN_TEST_PROFILE } from './superAdminTesting';

export const LOCAL_TEST_STORAGE_KEY = 'central-command-super-admin-test-data-v1';

type LocalHistoryEntry = TicketStatusHistory & {
  profiles: { first_name: string; last_name: string };
};

interface LocalTestData {
  version: 1;
  stormEvents: StormEventSummary[];
  stormRoleRates?: Record<string, StormRoleRates>;
  tickets: Ticket[];
  history: LocalHistoryEntry[];
  payloads?: Record<string, Record<string, unknown>>;
  roster?: Array<{ stormId: string; contractorId: string; displayName: string; role: ContractorRole; payRateOverride: number | null; vehicleHourlyRate: number | null }>;
  contractors?: Array<{ id: string; displayName: string; role: ContractorRole }>;
}

function requireLocalTesting(): void {
  if (!isSuperAdminTestingEnabled() || typeof window === 'undefined') {
    throw new Error('Local Super Admin testing is not enabled.');
  }
}

function readData(): LocalTestData {
  requireLocalTesting();
  const raw = window.localStorage.getItem(LOCAL_TEST_STORAGE_KEY);
  if (!raw) {
    return { version: 1, stormEvents: [], tickets: [], history: [] };
  }

  try {
    const data = JSON.parse(raw) as LocalTestData;
    if (data.version !== 1 || !Array.isArray(data.stormEvents)
      || !Array.isArray(data.tickets) || !Array.isArray(data.history)) {
      throw new Error('Invalid local test data.');
    }
    return data;
  } catch {
    throw new Error('Unable to read saved local test data.');
  }
}

function saveData(data: LocalTestData): void {
  requireLocalTesting();
  try {
    window.localStorage.setItem(LOCAL_TEST_STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new Error('Unable to save local test data. Check browser storage availability.');
  }
}

function newestFirst<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function findTicket(data: LocalTestData, id: string): Ticket {
  const ticket = data.tickets.find((item) => item.id === id);
  if (!ticket) throw new Error('Local test ticket not found.');
  return ticket;
}

function validateTicket(data: LocalTestData, ticket: Partial<Ticket>, existingId?: string): void {
  if (!ticket.storm_event_id || !data.stormEvents.some((event) => event.id === ticket.storm_event_id)) {
    throw new Error('Select an existing local test storm event.');
  }
  if (!ticket.ticket_number?.trim()) throw new Error('Ticket number is required.');
  if (data.tickets.some((item) => item.id !== existingId && item.storm_event_id === ticket.storm_event_id && item.ticket_number === ticket.ticket_number?.trim())) {
    throw new Error('A local test ticket with this number already exists.');
  }
  const storm = data.stormEvents.find(event => event.id === ticket.storm_event_id)!;
  if (ticket.utility_client && normalizeUtilityClient(ticket.utility_client) !== normalizeUtilityClient(storm.utilityClient)) throw new Error('Ticket utility must match its storm event.');
  if (ticket.assigned_to && !(data.roster ?? []).some(member => member.stormId === ticket.storm_event_id && member.contractorId === ticket.assigned_to)) throw new Error('Assign the contractor to this storm roster first.');
  if (!ticket.address?.trim()) throw new Error('Ticket address is required.');
}

function historyEntry(
  ticketId: string,
  fromStatus: TicketStatus | null,
  toStatus: TicketStatus,
  changedBy: string,
  changeReason?: string,
  location?: { latitude: number; longitude: number; accuracy: number },
): LocalHistoryEntry {
  return {
    id: crypto.randomUUID(),
    ticket_id: ticketId,
    ...(fromStatus ? { from_status: fromStatus } : {}),
    to_status: toStatus,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    change_reason: changeReason,
    gps_latitude: location?.latitude,
    gps_longitude: location?.longitude,
    gps_accuracy: location?.accuracy,
    profiles: {
      first_name: SUPER_ADMIN_TEST_PROFILE.first_name,
      last_name: SUPER_ADMIN_TEST_PROFILE.last_name,
    },
  };
}

export const localTestStore = {
  getPayload(ticketId: string): Record<string, unknown> | null { return readData().payloads?.[ticketId] ?? null; },
  listContractors() { return readData().contractors ?? []; },
  createContractor(displayName: string, role: ContractorRole = 'DAMAGE_ASSESSER') {
    if (!displayName.trim()) throw new Error('Contractor name is required.');
    const data = readData(); const contractor = { id: crypto.randomUUID(), displayName: displayName.trim(), role };
    data.contractors = [...(data.contractors ?? []), contractor]; saveData(data); return contractor;
  },
  listRoster(stormId: string) { return (readData().roster ?? []).filter(item => item.stormId === stormId); },
  assignContractor(stormId: string, contractorId: string, compensation: { payRateOverride: number | null; vehicleHourlyRate: number | null } = { payRateOverride: null, vehicleHourlyRate: null }) {
    const data = readData();
    if (!data.stormEvents.some(item => item.id === stormId)) throw new Error('Create a storm first.');
    const contractor = data.contractors?.find(item => item.id === contractorId);
    if (!contractor) throw new Error('Select an existing contractor.');
    if (contractor.role === 'DRIVER' && compensation.vehicleHourlyRate === null) throw new Error('Every Driver requires a storm hourly vehicle allowance.');
    if (contractor.role !== 'DRIVER' && compensation.vehicleHourlyRate !== null) throw new Error('Only Drivers can receive a vehicle allowance.');
    if (compensation.payRateOverride !== null && (!Number.isFinite(compensation.payRateOverride) || compensation.payRateOverride < 0 || Math.round(compensation.payRateOverride * 100) !== compensation.payRateOverride * 100)) throw new Error('Pay override must be nonnegative with cent precision.');
    if (compensation.vehicleHourlyRate !== null && (!Number.isFinite(compensation.vehicleHourlyRate) || compensation.vehicleHourlyRate < 0 || Math.round(compensation.vehicleHourlyRate * 100) !== compensation.vehicleHourlyRate * 100)) throw new Error('Vehicle allowance must be nonnegative with cent precision.');
    const member = { stormId, contractorId, displayName: contractor.displayName, role: contractor.role, ...compensation };
    data.roster = [...(data.roster ?? []).filter(item => item.stormId !== stormId || item.contractorId !== contractorId), member]; saveData(data);
  },
  listStormEvents(): StormEventSummary[] {
    const data = readData();
    return [...data.stormEvents]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((event) => ({
        ...event,
        activeTickets: data.tickets.filter((ticket) => ticket.storm_event_id === event.id
          && !['CLOSED', 'ARCHIVED', 'EXPIRED'].includes(ticket.status)).length,
      }));
  },

  getStormEventById(id: string): StormEventSummary | null {
    return this.listStormEvents().find((event) => event.id === id) ?? null;
  },

  setStormManager(stormId: string, managerId: string, expectedManagerId: string | null): StormEventSummary {
    const data = readData();
    const event = data.stormEvents.find(item => item.id === stormId);
    if (!event) throw new Error('Storm not found.');
    if (event.status === 'CLOSED') throw new Error('Closed storm manager history is fixed.');
    if ((event.responsibleManagerId ?? null) !== expectedManagerId) throw new Error('Responsible manager changed. Reload before saving.');
    event.responsibleManagerId = managerId;
    saveData(data);
    return this.getStormEventById(stormId)!;
  },

  createStormEvent(input: Omit<StormEventSummary, 'id' | 'createdAt' | 'activeTickets'> & { roleRates: StormRoleRates }): StormEventSummary {
    const data = readData();
    if (!input.name.trim()) throw new Error('Storm event name is required.');
    if (!input.utilityClient.trim()) throw new Error('Utility client is required.');
    if (data.stormEvents.some((event) => event.eventCode === input.eventCode)) {
      throw new Error('A local test storm event with this code already exists.');
    }
    const event: StormEventSummary = {
      ...input,
      name: input.name.trim(),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      activeTickets: 0,
    };
    data.stormEvents.push(event);
    data.stormRoleRates = { ...(data.stormRoleRates ?? {}), [event.id]: input.roleRates };
    saveData(data);
    return event;
  },

  getStormRoleRateDrafts(stormId: string) {
    return Object.fromEntries(Object.entries(readData().stormRoleRates?.[stormId] ?? {}).map(([role, rates]) => [role, {
      payRate: rates.payRate.toFixed(2),
      billRate: rates.billRate.toFixed(2),
    }]));
  },

  saveStormRoleRates(stormId: string, rates: StormRoleRates) {
    const data = readData();
    const storm = data.stormEvents.find((event) => event.id === stormId);
    if (!storm) throw new Error('Storm event not found.');
    if (storm.status === 'CLOSED') throw new Error('Closed storm compensation cannot be changed.');
    data.stormRoleRates = { ...(data.stormRoleRates ?? {}), [stormId]: rates };
    saveData(data);
  },

  getTickets(): Ticket[] {
    return newestFirst(readData().tickets);
  },

  getTicketById(id: string): Ticket {
    return findTicket(readData(), id);
  },

  createTicket(input: Partial<Ticket>, payload?: Record<string, unknown>): Ticket {
    const data = readData();
    validateTicket(data, input);
    const now = new Date().toISOString();
    const ticket: Ticket = {
      ...input,
      id: crypto.randomUUID(),
      ticket_number: input.ticket_number!.trim(),
      address: input.address!.trim(),
      utility_client: data.stormEvents.find((event) => event.id === input.storm_event_id)!.utilityClient,
      status: input.status ?? 'DRAFT',
      is_important: input.is_important ?? false,
      geofence_radius_meters: input.geofence_radius_meters ?? 500,
      created_by: SUPER_ADMIN_TEST_PROFILE.id,
      created_at: now,
      updated_at: now,
    };
    data.tickets.push(ticket);
    if (payload) data.payloads = { ...data.payloads, [ticket.id]: payload };
    data.history.push(historyEntry(ticket.id, null, ticket.status, ticket.created_by, 'Ticket created in local testing.'));
    saveData(data);
    return ticket;
  },

  updateTicket(id: string, updates: Partial<Ticket>): Ticket {
    const data = readData();
    const original = findTicket(data, id);
    if (updates.storm_event_id && updates.storm_event_id !== original.storm_event_id) throw new Error('A ticket cannot be moved to a different storm.');
    const ticket = { ...original, ...updates, id, created_at: original.created_at, updated_at: new Date().toISOString() };
    validateTicket(data, ticket, id);
    data.tickets = data.tickets.map((item) => item.id === id ? ticket : item);
    saveData(data);
    return ticket;
  },

  assignTicket(id: string, contractorId: string): Ticket {
    if (!contractorId) throw new Error('Select a contractor.');
    const data = readData();
    const original = findTicket(data, id);
    const ticket: Ticket = { ...original, assigned_to: contractorId,
      status: original.status === 'DRAFT' ? 'ASSIGNED' : original.status,
      updated_at: new Date().toISOString() };
    validateTicket(data, ticket, id);
    data.tickets = data.tickets.map(item => item.id === id ? ticket : item);
    if (ticket.status !== original.status) data.history.push(historyEntry(id, original.status, ticket.status, SUPER_ADMIN_TEST_PROFILE.id, 'Contractor assigned.'));
    saveData(data);
    return ticket;
  },

  updateTicketStatus(
    id: string,
    status: TicketStatus,
    changedBy: string,
    reason?: string,
    location?: { latitude: number; longitude: number; accuracy: number },
  ): void {
    const data = readData();
    const original = findTicket(data, id);
    data.tickets = data.tickets.map((ticket) => ticket.id === id
      ? { ...ticket, status, updated_at: new Date().toISOString() }
      : ticket);
    data.history.push(historyEntry(id, original.status, status, changedBy, reason, location));
    saveData(data);
  },

  logStatusChange(
    ticketId: string,
    fromStatus: TicketStatus | null,
    toStatus: TicketStatus,
    changedBy: string,
    reason?: string,
    location?: { latitude: number; longitude: number; accuracy: number },
  ): void {
    const data = readData();
    findTicket(data, ticketId);
    data.history.push(historyEntry(ticketId, fromStatus, toStatus, changedBy, reason, location));
    saveData(data);
  },

  getStatusHistory(ticketId: string): LocalHistoryEntry[] {
    return readData().history.filter((item) => item.ticket_id === ticketId)
      .sort((left, right) => right.changed_at.localeCompare(left.changed_at));
  },
};
