import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAdminActiveStormEvent: vi.fn(),
  getStormEventById: vi.fn(),
  getTicketsByAssignee: vi.fn(),
}));

vi.mock('@/lib/services/stormEventService', () => ({
  stormEventService: {
    getAdminActiveStormEvent: mocks.getAdminActiveStormEvent,
    getStormEventById: mocks.getStormEventById,
  },
  resolveAdminActiveStormEvent: (events: Array<{ status: string; name: string }>) =>
    events.find(event => event.status !== 'CLOSED') ?? null,
}));

vi.mock('@/lib/services/ticketService', () => ({
  ticketService: { getTicketsByAssignee: mocks.getTicketsByAssignee },
}));

import { loadCurrentStormName } from './currentStormName';

describe('loadCurrentStormName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the admin operational storm name', async () => {
    mocks.getAdminActiveStormEvent.mockResolvedValue({ name: 'Helene' });

    await expect(loadCurrentStormName('admin')).resolves.toBe('Helene');
  });

  it('uses the contractor open-ticket storm and ignores closed work', async () => {
    mocks.getTicketsByAssignee.mockResolvedValue([
      { storm_event_id: 'closed-storm', status: 'CLOSED', updated_at: '2026-10-09T00:00:00Z' },
      { storm_event_id: 'open-storm', status: 'ASSIGNED', updated_at: '2026-10-01T00:00:00Z' },
    ]);
    mocks.getStormEventById.mockImplementation(async (id: string) => (
      id === 'open-storm'
        ? { id, name: 'Francine', status: 'ACTIVE' }
        : { id, name: 'Old storm', status: 'CLOSED' }
    ));

    await expect(loadCurrentStormName('contractor', 'contractor-1')).resolves.toBe('Francine');
    expect(mocks.getStormEventById).toHaveBeenCalledTimes(1);
  });

  it('returns null when a contractor has no identity', async () => {
    await expect(loadCurrentStormName('contractor')).resolves.toBeNull();
    expect(mocks.getTicketsByAssignee).not.toHaveBeenCalled();
  });
});
