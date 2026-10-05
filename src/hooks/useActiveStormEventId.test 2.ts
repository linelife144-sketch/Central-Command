import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ getTicketsByAssignee: vi.fn() }));
vi.mock('@/lib/services/ticketService', () => ({
  ticketService: { getTicketsByAssignee: mocks.getTicketsByAssignee },
}));

import { useActiveStormEventId } from './useActiveStormEventId';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useActiveStormEventId', () => {
  it('returns undefined without a contractorId and does not query', async () => {
    const { result } = renderHook(() => useActiveStormEventId(undefined));

    expect(result.current.stormEventId).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mocks.getTicketsByAssignee).not.toHaveBeenCalled();
  });

  it('picks the most recently updated open ticket storm event', async () => {
    mocks.getTicketsByAssignee.mockResolvedValue([
      { storm_event_id: 'storm-old', status: 'ASSIGNED', updated_at: '2026-01-01T00:00:00.000Z' },
      { storm_event_id: 'storm-new', status: 'IN_PROGRESS', updated_at: '2026-02-01T00:00:00.000Z' },
    ]);

    const { result } = renderHook(() => useActiveStormEventId('contractor-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stormEventId).toBe('storm-new');
  });

  it('excludes closed/archived/expired tickets from consideration', async () => {
    mocks.getTicketsByAssignee.mockResolvedValue([
      { storm_event_id: 'storm-closed', status: 'CLOSED', updated_at: '2026-03-01T00:00:00.000Z' },
      { storm_event_id: 'storm-open', status: 'ASSIGNED', updated_at: '2026-01-01T00:00:00.000Z' },
    ]);

    const { result } = renderHook(() => useActiveStormEventId('contractor-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stormEventId).toBe('storm-open');
  });

  it('returns undefined when the contractor has no open tickets', async () => {
    mocks.getTicketsByAssignee.mockResolvedValue([]);

    const { result } = renderHook(() => useActiveStormEventId('contractor-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stormEventId).toBeUndefined();
  });

  it('falls back to undefined, not a thrown error, when the fetch fails', async () => {
    mocks.getTicketsByAssignee.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useActiveStormEventId('contractor-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stormEventId).toBeUndefined();
  });
});
