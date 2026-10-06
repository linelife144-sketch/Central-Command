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
    },
    transaction: async (_mode: string, ...args: unknown[]) => (args.at(-1) as () => Promise<unknown>)(),
  };
  return { queue, cachedTickets, state, db };
});

vi.mock('@/lib/db/dexie', () => ({ db: mocks.db }));
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'profile' } }, error: null })) },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: { ...mocks.state.remoteTicket }, error: null })) })) })) })),
  },
}));
vi.mock('@/lib/services/ticketAssessmentWorkflow', () => ({
  ticketWorkflowRpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
    mocks.state.rpcCalls.push({ name, args });
    mocks.state.remoteTicket.status = args.p_status;
    return mocks.state.remoteTicket;
  }),
}));
vi.mock('@/lib/tickets/events', () => ({ notifyTicketsChanged: vi.fn() }));

import { ticketFieldProgressWorkflow } from './ticketFieldProgressWorkflow';

const ticket = {
  id: 'ticket', ticket_number: 'CC-101', status: 'ASSIGNED', is_important: false, address: '1 Main St',
  utility_client: 'Grid Electric', created_at: '2026-10-06T10:00:00Z', updated_at: '2026-10-06T10:00:00Z',
  created_by: 'admin', team_lead_id: 'lead', crew_id: 'crew', assigned_to: 'assessor', assigned_driver_id: 'driver',
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
    assigned_to: 'assessor', assigned_driver_id: 'driver',
  };
});
afterEach(() => { setOnline(true); });

describe('offline field progress sync', () => {
  it('stores and replays Start then GPS-confirmed arrival in order exactly once', async () => {
    setOnline(false);
    const location = { latitude: 32.5, longitude: -93.7, accuracy: 8, capturedAt: '2026-10-06T10:05:00Z' };
    await ticketFieldProgressWorkflow.recordOffline({ ticket, actorProfileId: 'profile', contractorId: 'assessor', nextStatus: 'IN_ROUTE', location });
    await ticketFieldProgressWorkflow.recordOffline({ ticket, actorProfileId: 'profile', contractorId: 'assessor', nextStatus: 'IN_ROUTE', location });
    expect(mocks.queue.size).toBe(1);
    const cachedAfterStart = mocks.cachedTickets.get('ticket');
    expect(cachedAfterStart).toMatchObject({ status: 'IN_ROUTE', field_progress_pending: true, sync_status: 'pending' });
    const startEvent = [...mocks.queue.values()][0];
    expect(startEvent).toMatchObject({ from_status: 'ASSIGNED', to_status: 'IN_ROUTE', crew_id: 'crew', team_lead_id: 'lead', captured_at: location.capturedAt });

    await ticketFieldProgressWorkflow.recordOffline({ ticket: { ...ticket, status: 'IN_ROUTE' }, actorProfileId: 'profile', contractorId: 'assessor', nextStatus: 'ON_SITE', location: { ...location, capturedAt: '2026-10-06T10:20:00Z' } });
    expect(mocks.queue.size).toBe(2);

    setOnline(true);
    const result = await ticketFieldProgressWorkflow.process('profile');
    expect(result).toEqual({ failed: 0, pending: 0, errors: [] });
    expect(mocks.state.rpcCalls.map(call => call.args.p_status)).toEqual(['IN_ROUTE', 'ON_SITE']);
    expect(mocks.queue.size).toBe(0);
    expect(mocks.cachedTickets.get('ticket')).toMatchObject({ status: 'ON_SITE', field_progress_pending: false, sync_status: 'synced' });
  });

  it('does not replay field progress after the server assignment changes', async () => {
    setOnline(false);
    await ticketFieldProgressWorkflow.recordOffline({
      ticket, actorProfileId: 'profile', contractorId: 'assessor', nextStatus: 'IN_ROUTE',
      location: { latitude: 32.5, longitude: -93.7, accuracy: 8, capturedAt: '2026-10-06T10:05:00Z' },
    });
    mocks.state.remoteTicket.team_lead_id = 'different-lead';
    setOnline(true);

    const result = await ticketFieldProgressWorkflow.process('profile');
    expect(result.failed).toBe(1);
    expect(result.pending).toBe(1);
    expect(mocks.state.rpcCalls).toHaveLength(0);
    expect(mocks.queue.get('profile:ticket:IN_ROUTE')).toMatchObject({ last_error: expect.stringContaining('assignment changed') });
    expect(mocks.cachedTickets.get('ticket')).toMatchObject({ field_progress_pending: true, sync_status: 'failed' });
  });
});
