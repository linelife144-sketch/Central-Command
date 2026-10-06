import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '@/types';

const mocks = vi.hoisted(() => {
  const queue = new Map<string, Record<string, unknown>>();
  const cachedTickets = new Map<string, Record<string, unknown>>();
  const state: {
    remoteTicket: Record<string, unknown>;
    rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  } = { remoteTicket: {}, rpcCalls: [] };
  const where = (field: string) => ({ equals: (value: unknown) => {
    const matching = () => [...queue.values()].filter(row => field === '[actor_profile_id+ticket_id]'
      ? row.actor_profile_id === (value as string[])[0] && row.ticket_id === (value as string[])[1]
      : row[field] === value);
    return {
      count: async () => matching().length,
      toArray: async () => matching(),
      sortBy: async (key: string) => matching().sort((a, b) => String(a[key]).localeCompare(String(b[key]))),
    };
  } });
  const db = {
    ticketFieldProgressQueue: {
      get: async (id: string) => queue.get(id),
      add: async (row: Record<string, unknown>) => { if (queue.has(String(row.id))) throw new Error('duplicate key'); queue.set(String(row.id), row); },
      delete: async (id: string) => { queue.delete(id); },
      update: async (id: string, changes: Record<string, unknown>) => { const row = queue.get(id); if (row) queue.set(id, { ...row, ...changes }); },
      where,
    },
    tickets: {
      get: async (id: string) => cachedTickets.get(id),
      put: async (ticket: Record<string, unknown>) => { cachedTickets.set(String(ticket.id), ticket); },
      update: async (id: string, changes: Record<string, unknown>) => { const row = cachedTickets.get(id); if (row) cachedTickets.set(id, { ...row, ...changes }); },
    },
    transaction: async (_mode: string, ...args: unknown[]) => (args.at(-1) as () => Promise<unknown>)(),
  };
  return { queue, cachedTickets, state, db };
});

vi.mock('@/lib/db/dexie', () => ({ db: mocks.db }));
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'profile' } }, error: null })) },
    from: vi.fn(() => ({ select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { ...mocks.state.remoteTicket }, error: null })),
        maybeSingle: vi.fn(async () => ({ data: { ...mocks.state.remoteTicket }, error: null })),
      })),
    })) })),
  },
}));
vi.mock('@/lib/services/ticketAssessmentWorkflow', () => ({
  ticketWorkflowRpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
    mocks.state.rpcCalls.push({ name, args });
    mocks.state.remoteTicket.status = args.p_action === 'START' ? 'IN_ROUTE' : 'ON_SITE';
    return mocks.state.remoteTicket;
  }),
}));
vi.mock('@/lib/tickets/events', () => ({ notifyTicketsChanged: vi.fn() }));

import { ticketFieldProgressWorkflow } from './ticketFieldProgressWorkflow';

const ticket = {
  id: 'ticket', ticket_number: 'CC-101', status: 'ASSIGNED', is_important: false, address: '1 Main St',
  utility_client: 'Grid Electric', created_at: '2026-10-06T10:00:00Z', updated_at: '2026-10-06T10:00:00Z',
  created_by: 'admin', team_lead_id: 'lead', crew_id: 'crew', assigned_to: 'assessor', assigned_driver_id: 'driver', storm_event_id: 'storm',
} as Ticket;

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

beforeEach(() => {
  mocks.queue.clear();
  mocks.cachedTickets.clear();
  mocks.cachedTickets.set(ticket.id, { ...ticket });
  mocks.state.rpcCalls = [];
  mocks.state.remoteTicket = {
    id: 'ticket', status: 'ASSIGNED', team_lead_id: 'lead', crew_id: 'crew',
    assigned_to: 'assessor', assigned_driver_id: 'driver', updated_at: '2026-10-06T10:00:00Z',
  };
});
afterEach(() => { setOnline(true); });

describe('click-driven field progress', () => {
  it('queues Start then checklist opening in order without storing GPS', async () => {
    setOnline(false);
    await ticketFieldProgressWorkflow.recordOffline({ ticket, actorProfileId: 'profile', contractorId: 'assessor', action: 'START' });
    await ticketFieldProgressWorkflow.recordOffline({ ticket: { ...ticket, status: 'IN_ROUTE' }, actorProfileId: 'profile', contractorId: 'assessor', action: 'OPEN_CHECKLIST' });

    expect(mocks.queue.size).toBe(2);
    const [startEvent, checklistEvent] = [...mocks.queue.values()].sort((a, b) => String(a.captured_at).localeCompare(String(b.captured_at)));
    expect(startEvent).toMatchObject({ action: 'START', from_status: 'ASSIGNED', to_status: 'IN_ROUTE', crew_id: 'crew', team_lead_id: 'lead' });
    expect(checklistEvent).toMatchObject({ action: 'OPEN_CHECKLIST', from_status: 'IN_ROUTE', to_status: 'ON_SITE' });
    expect(startEvent).not.toHaveProperty('latitude');
    expect(checklistEvent).not.toHaveProperty('longitude');
    expect(mocks.cachedTickets.get('ticket')).toMatchObject({ status: 'ON_SITE', field_progress_pending: true, sync_status: 'pending' });

    setOnline(true);
    const result = await ticketFieldProgressWorkflow.process('profile');
    expect(result).toEqual({ failed: 0, pending: 0, errors: [] });
    expect(mocks.state.rpcCalls.map(call => call.args.p_action)).toEqual(['START', 'OPEN_CHECKLIST']);
    expect(mocks.state.rpcCalls.every(call => call.name === 'record_ticket_field_action')).toBe(true);
    expect(mocks.state.rpcCalls[0].args).not.toHaveProperty('p_latitude');
    expect(mocks.state.rpcCalls[1].args).not.toHaveProperty('p_accuracy');
    expect(mocks.queue.size).toBe(0);
    expect(mocks.cachedTickets.get('ticket')).toMatchObject({ status: 'ON_SITE', field_progress_pending: false, sync_status: 'synced' });
  });

  it('allows a dispatched driver to start but requires the assigned assessor to open the checklist', async () => {
    setOnline(false);
    await expect(ticketFieldProgressWorkflow.recordOffline({ ticket, actorProfileId: 'profile', contractorId: 'driver', action: 'START' })).resolves.toBeUndefined();
    await expect(ticketFieldProgressWorkflow.recordOffline({ ticket: { ...ticket, status: 'IN_ROUTE' }, actorProfileId: 'profile', contractorId: 'driver', action: 'OPEN_CHECKLIST' })).rejects.toThrow('Only the assigned assessor');
  });

  it('records online actions without coordinates and returns the server ticket', async () => {
    setOnline(true);
    const result = await ticketFieldProgressWorkflow.recordAction({
      ticket: { ...ticket, status: 'IN_ROUTE', latitude: undefined, longitude: undefined },
      actorProfileId: 'profile', contractorId: 'assessor', action: 'OPEN_CHECKLIST',
    });
    expect(result.offline).toBe(false);
    expect(result.ticket.status).toBe('ON_SITE');
    expect(mocks.state.rpcCalls).toEqual([{ name: 'record_ticket_field_action', args: { p_ticket_id: 'ticket', p_action: 'OPEN_CHECKLIST' } }]);
  });

  it('replays an existing GPS-based queue row through the click RPC without sending its GPS values', async () => {
    mocks.queue.set('profile:ticket:IN_ROUTE', {
      id: 'profile:ticket:IN_ROUTE', actor_profile_id: 'profile', contractor_id: 'assessor', ticket_id: 'ticket',
      from_status: 'ASSIGNED', to_status: 'IN_ROUTE', team_lead_id: 'lead', crew_id: 'crew', assigned_to: 'assessor',
      assigned_driver_id: 'driver', latitude: 32.5, longitude: -93.7, accuracy: 8, captured_at: '2026-10-06T10:05:00Z',
    });
    setOnline(true);
    const result = await ticketFieldProgressWorkflow.process('profile');
    expect(result.failed).toBe(0);
    expect(mocks.state.rpcCalls).toEqual([{ name: 'record_ticket_field_action', args: { p_ticket_id: 'ticket', p_action: 'START' } }]);
  });

  it('keeps a reassigned action and blocks later queued actions for that ticket', async () => {
    setOnline(false);
    await ticketFieldProgressWorkflow.recordOffline({ ticket, actorProfileId: 'profile', contractorId: 'assessor', action: 'START' });
    await ticketFieldProgressWorkflow.recordOffline({ ticket: { ...ticket, status: 'IN_ROUTE' }, actorProfileId: 'profile', contractorId: 'assessor', action: 'OPEN_CHECKLIST' });
    mocks.state.remoteTicket.team_lead_id = 'different-lead';
    setOnline(true);

    const result = await ticketFieldProgressWorkflow.process('profile');
    expect(result).toMatchObject({ failed: 1, pending: 2 });
    expect(mocks.state.rpcCalls).toHaveLength(0);
    expect(mocks.queue.get('profile:ticket:IN_ROUTE')).toMatchObject({ last_error: expect.stringContaining('assignment changed') });
    expect(mocks.queue.get('profile:ticket:ON_SITE')).toBeDefined();
    expect(mocks.cachedTickets.get('ticket')).toMatchObject({ status: 'ASSIGNED', field_progress_pending: true, sync_status: 'failed' });
  });
});
