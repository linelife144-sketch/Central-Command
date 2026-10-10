import { describe, expect, it, vi } from 'vitest';

// This suite exercises the pure resolver; importing its service must not
// require credentials or a network connection.
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));

import {
  resolveAdminActiveStormEvent,
  type StormEventSummary,
} from './stormEventService';

function event(overrides: Partial<StormEventSummary> & { id: string }): StormEventSummary {
  return {
    eventCode: 'SE-TEST',
    name: 'Test storm',
    utilityClient: 'ENTERGY',
    ticketTemplateKey: null,
    configSnapshot: null,
    status: 'ACTIVE',
    region: null,
    contractReference: null,
    startDate: null,
    endDate: null,
    notes: null,
    createdAt: '2026-09-30T12:00:00.000Z',
    activeTickets: 0,
    ...overrides,
  };
}

describe('resolveAdminActiveStormEvent', () => {
  it('ranks MOB above ACTIVE when both exist', () => {
    const resolved = resolveAdminActiveStormEvent([
      event({ id: 'a', status: 'ACTIVE', startDate: '2026-10-01' }),
      event({ id: 'b', status: 'MOB', startDate: '2026-09-01' }),
    ]);
    expect(resolved?.id).toBe('b');
  });

  it('ranks ACTIVE above DE-MOB, RELEASED, and BILLING', () => {
    const resolved = resolveAdminActiveStormEvent([
      event({ id: 'billing', status: 'BILLING' }),
      event({ id: 'demob', status: 'DE-MOB' }),
      event({ id: 'active', status: 'ACTIVE' }),
      event({ id: 'released', status: 'RELEASED' }),
    ]);
    expect(resolved?.id).toBe('active');
  });

  it('ignores CLOSED events', () => {
    const resolved = resolveAdminActiveStormEvent([
      event({ id: 'closed', status: 'CLOSED' }),
    ]);
    expect(resolved).toBeNull();
  });

  it('sorts a dated event above a null startDate of the same rank', () => {
    const resolved = resolveAdminActiveStormEvent([
      event({ id: 'no-date', status: 'ACTIVE', startDate: null }),
      event({ id: 'dated', status: 'ACTIVE', startDate: '2026-10-01' }),
    ]);
    expect(resolved?.id).toBe('dated');
  });

  it('breaks rank and date ties by createdAt descending', () => {
    const resolved = resolveAdminActiveStormEvent([
      event({ id: 'older', status: 'ACTIVE', createdAt: '2026-09-01T00:00:00.000Z' }),
      event({ id: 'newer', status: 'ACTIVE', createdAt: '2026-09-15T00:00:00.000Z' }),
    ]);
    expect(resolved?.id).toBe('newer');
  });

  it('returns null for an empty list', () => {
    expect(resolveAdminActiveStormEvent([])).toBeNull();
  });
});
