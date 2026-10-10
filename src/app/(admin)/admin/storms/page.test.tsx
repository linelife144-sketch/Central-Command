import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ actor: 'manager-a', list: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { id: mocks.actor, role: 'CEO' }, permissions: {} }) }));
vi.mock('@/lib/services/stormEventService', () => ({ stormEventService: { listStormEvents: mocks.list } }));
import StormEventsPage from './page';
beforeEach(() => { mocks.actor = 'manager-a'; mocks.list.mockReset().mockResolvedValue([]); });
afterEach(cleanup);
it('shows a denied read as unavailable and retries before presenting a genuine empty result', async () => {
  mocks.list.mockRejectedValueOnce({ code: '42501', message: 'Storm access unavailable' });
  render(<StormEventsPage />);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/unavailable/i));
  expect(screen.queryByText(/No storm events found/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  await waitFor(() => expect(screen.getByText(/No storm events found/)).toBeTruthy());
  expect(mocks.list).toHaveBeenCalledTimes(2);
});
it('does not show a delayed previous actor storm after account switching', async () => {
  let resolve!: (rows: unknown[]) => void;
  mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const view = render(<StormEventsPage />);
  mocks.actor = 'manager-b'; view.rerender(<StormEventsPage />);
  await act(async () => resolve([{ id: 'a', eventCode: 'A', name: 'Previous actor storm', status: 'ACTIVE', activeTickets: 0 }]));
  await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('Previous actor storm')).toBeNull();
});
