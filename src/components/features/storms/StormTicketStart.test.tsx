import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ actor: 'manager-a', list: vi.fn(), replace: vi.fn() }));
const params = new URLSearchParams('storm_event_id=storm-a&important=true');
const router = { replace: mocks.replace };
vi.mock('next/navigation', () => ({ useRouter: () => router, useSearchParams: () => params }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { id: mocks.actor } }) }));
vi.mock('@/lib/services/stormEventService', () => ({ stormEventService: { listStormEvents: mocks.list } }));
import { StormTicketStart } from './StormTicketStart';
beforeEach(() => { mocks.actor = 'manager-a'; mocks.list.mockReset().mockResolvedValue([]); mocks.replace.mockReset(); });
afterEach(cleanup);
it('keeps unavailable reads distinct from first-storm creation and supports read-only retry', async () => {
  mocks.list.mockRejectedValueOnce(new Error('Unable to load storms.'));
  render(<StormTicketStart />);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/unable/i));
  expect(screen.queryByText(/Create your first storm/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  await waitFor(() => expect(screen.getByText(/Create your first storm/)).toBeTruthy());
});
it('does not redirect using a delayed former actor storm read', async () => {
  let resolve!: (rows: unknown[]) => void;
  mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const view = render(<StormTicketStart />);
  mocks.actor = 'manager-b'; view.rerender(<StormTicketStart />);
  await act(async () => resolve([{ id: 'storm-a', name: 'Alpha' }]));
  await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  expect(mocks.replace).not.toHaveBeenCalled();
});
it('preserves a verified explicit storm route and important-ticket flag', async () => {
  mocks.list.mockResolvedValue([{ id: 'storm-a', eventCode: 'A', name: 'Alpha', utilityClient: 'ENTERGY', status: 'ACTIVE' }]);
  render(<StormTicketStart />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/storms/storm-a/tickets/new?important=true'));
});
