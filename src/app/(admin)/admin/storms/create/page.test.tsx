import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CONTRACTOR_ROLES } from '@/lib/compensation/stormRates';
const mocks = vi.hoisted(() => ({ actor: 'actor', create: vi.fn(), list: vi.fn(), push: vi.fn(), error: vi.fn(), refreshContext: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { id: mocks.actor, role: 'STORM_MANAGER' }, isLoading: false, permissions: { 'admin.storms.view': true, 'admin.storms.edit': true, 'admin.payroll.edit': true } }) }));
vi.mock('@/lib/services/stormEventService', () => ({ stormEventService: { createStormEvent: mocks.create, listStormManagers: mocks.list } }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
vi.mock('@/components/providers/StormContextProvider', () => ({ useStormContext: () => ({ refresh: mocks.refreshContext }) }));
import CreateStormEventPage from './page';
beforeEach(() => { vi.clearAllMocks(); mocks.actor = 'actor'; mocks.list.mockResolvedValue([{ id: 'manager-1', displayName: 'Sam Manager', role: 'STORM_MANAGER', eligible: true }]); mocks.create.mockResolvedValue({ id: 'new-storm' }); mocks.refreshContext.mockResolvedValue(true); });
afterEach(cleanup);
async function fillStorm() {
  await screen.findByRole('option', { name: 'Sam Manager' });
  const submit = screen.getByRole('button', { name: 'Create Storm Event' }) as HTMLButtonElement;
  expect(submit.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Storm Event Name *'), { target: { value: 'Response storm' } });
  for (const role of CONTRACTOR_ROLES) {
    fireEvent.change(screen.getByLabelText(`${role} contractor pay rate`), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText(`${role} utility bill rate`), { target: { value: '75' } });
  }
  fireEvent.change(screen.getByLabelText('Responsible Storm Manager'), { target: { value: 'manager-1' } });
  await waitFor(() => expect(submit.disabled).toBe(false));
  return submit;
}
it('requires explicit manager and saves it with all five role rates', async () => {
  render(<CreateStormEventPage />);
  const submit = await fillStorm();
  fireEvent.click(submit);
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Response storm', responsibleManagerId: 'manager-1', roleRates: Object.fromEntries(CONTRACTOR_ROLES.map(role => [role, { payRate: 25, billRate: 75 }])) })));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/admin/storms/new-storm'));
  expect(mocks.refreshContext).toHaveBeenCalledWith({ selectStormId: 'new-storm' });
});
it('keeps a committed storm saved when context verification fails and retries only the read', async () => {
  mocks.refreshContext.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<CreateStormEventPage />);
  fireEvent.click(await fillStorm());
  await screen.findByRole('button', { name: 'Retry dashboard context' });
  expect(screen.getByRole('alert').textContent).toMatch(/storm.*saved/i);
  expect(screen.queryByRole('button', { name: 'Create Storm Event' })).toBeNull();
  expect(mocks.push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard context' }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/admin/storms/new-storm'));
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.error).not.toHaveBeenCalledWith(expect.stringMatching(/failed to create/i));
});
it('keeps the saved state even when context refresh unexpectedly rejects', async () => {
  mocks.refreshContext.mockRejectedValueOnce(new Error('Context disconnected'));
  render(<CreateStormEventPage />);
  fireEvent.click(await fillStorm());
  await waitFor(() => expect((screen.getByRole('button', { name: 'Retry dashboard context' }) as HTMLButtonElement).disabled).toBe(false));
  expect(screen.getByRole('alert').textContent).toMatch(/saved/i);
  expect(mocks.error).not.toHaveBeenCalled();
});
it('ignores a former actor creation response after account switch', async () => {
  let resolve!: (storm: { id: string }) => void;
  mocks.create.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const mounted = render(<CreateStormEventPage />);
  fireEvent.click(await fillStorm());
  await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
  mocks.actor = 'different-actor'; mounted.rerender(<CreateStormEventPage />);
  await act(async () => resolve({ id: 'former-actor-storm' }));
  expect(mocks.refreshContext).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  expect((screen.getByLabelText('Storm Event Name *') as HTMLInputElement).value).toBe('');
});
