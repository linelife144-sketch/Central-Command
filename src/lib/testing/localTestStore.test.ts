import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '@/types';

const remote = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: remote.from, auth: { getSession: remote.getSession, getUser: remote.getUser } },
}));

import { stormEventService } from '@/lib/services/stormEventService';
import { ticketService } from '@/lib/services/ticketService';
import { LOCAL_TEST_STORAGE_KEY, localTestStore } from './localTestStore';
import { isSuperAdminTestingEnabled, SUPER_ADMIN_TEST_PROFILE } from './superAdminTesting';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_ENABLE_SUPER_ADMIN_TESTING', 'true');
  window.localStorage.clear();
  vi.clearAllMocks();
  remote.from.mockImplementation(() => { throw new Error('Unexpected Supabase query in local testing.'); });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function createStorm() {
  return stormEventService.createStormEvent({ name: 'Local test storm', eventCode: 'LOCAL-001', utilityClient: 'Entergy' });
}

function ticketInput(stormId: string): Partial<Ticket> {
  return { storm_event_id: stormId, ticket_number: 'LOCAL-TICKET-001', address: '100 Test Street', utility_client: 'Entergy', priority: 'A' };
}

describe('local Super Admin testing boundaries', () => {
  it.each([
    ['development', 'true', true],
    ['development', 'false', false],
    ['development', '', false],
    ['production', 'true', false],
    ['production', 'false', false],
    ['test', 'true', false],
  ])('allows the flag only in development: %s, %s', (environment, setting, expected) => {
    expect(isSuperAdminTestingEnabled(environment, setting)).toBe(expected);
  });

  it('creates a storm and linked ticket without any Supabase calls', async () => {
    const storm = await createStorm();
    const ticket = await ticketService.createTicket(ticketInput(storm.id));

    expect(ticket.created_by).toBe(SUPER_ADMIN_TEST_PROFILE.id);
    expect(ticket.priority).toBe('A');
    expect(await ticketService.getTickets()).toEqual([ticket]);
    expect(await stormEventService.getStormEventById(storm.id)).toMatchObject({ id: storm.id, activeTickets: 1 });
    expect(remote.from).not.toHaveBeenCalled();
    expect(remote.getSession).not.toHaveBeenCalled();
    expect(remote.getUser).not.toHaveBeenCalled();
  });

  it('retains saved records when the service modules are loaded again', async () => {
    const storm = await createStorm();
    const ticket = await ticketService.createTicket(ticketInput(storm.id));

    vi.resetModules();
    const freshTickets = (await import('@/lib/services/ticketService')).ticketService;
    const freshStorms = (await import('@/lib/services/stormEventService')).stormEventService;

    expect(await freshTickets.getTicketById(ticket.id)).toEqual(ticket);
    expect(await freshStorms.listStormEvents()).toMatchObject([{ id: storm.id, activeTickets: 1 }]);
  });

  it('rejects tickets without an existing local storm', async () => {
    await expect(ticketService.createTicket(ticketInput('missing-storm'))).rejects.toThrow('existing local test storm');
    expect(await ticketService.getTickets()).toEqual([]);
    expect(remote.from).not.toHaveBeenCalled();
  });

  it('rejects duplicate ticket numbers without changing the original', async () => {
    const storm = await createStorm();
    const ticket = await ticketService.createTicket(ticketInput(storm.id));
    await expect(ticketService.createTicket(ticketInput(storm.id))).rejects.toThrow('already exists');
    expect(await ticketService.getTickets()).toEqual([ticket]);
  });

  it('updates local tickets and keeps their original creation identity', async () => {
    const storm = await createStorm();
    const ticket = await ticketService.createTicket(ticketInput(storm.id));
    const crew = localTestStore.createContractor('Test Crew');
    localTestStore.assignContractor(storm.id, crew.id);
    const updated = await ticketService.updateTicket(ticket.id, { work_description: 'Updated test description', assigned_to: crew.id });
    expect(updated.created_at).toBe(ticket.created_at);
    expect(await ticketService.getTicketsByAssignee(crew.id)).toEqual([updated]);
    expect((await ticketService.getStatusHistory(ticket.id))[0]).toMatchObject({ to_status: 'DRAFT', changed_by: SUPER_ADMIN_TEST_PROFILE.id });
  });

  it('recalculates active storm ticket counts when a ticket closes', async () => {
    const storm = await createStorm();
    const ticket = await ticketService.createTicket(ticketInput(storm.id));
    await ticketService.updateTicket(ticket.id, { status: 'CLOSED' });
    expect(await stormEventService.getStormEventById(storm.id)).toMatchObject({ activeTickets: 0 });
  });

  it('reports a failed storage write instead of returning a successful creation', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); });
    await expect(createStorm()).rejects.toThrow('Unable to save local test data');
    expect(window.localStorage.getItem(LOCAL_TEST_STORAGE_KEY)).toBeNull();
    expect(await stormEventService.listStormEvents()).toEqual([]);
  });

  it('uses the real service in production even when the local flag is set', async () => {
    const storm = await createStorm();
    await ticketService.createTicket(ticketInput(storm.id));
    vi.stubEnv('NODE_ENV', 'production');

    const realTicket = { id: 'remote-ticket', ticket_number: 'REAL-001' };
    remote.from.mockReturnValue({ select: () => ({ order: async () => ({ data: [realTicket], error: null }) }) });
    expect(await ticketService.getTickets()).toEqual([realTicket]);
    expect(remote.from).toHaveBeenCalledWith('tickets');
    expect(() => localTestStore.getTickets()).toThrow('not enabled');
  });
});
