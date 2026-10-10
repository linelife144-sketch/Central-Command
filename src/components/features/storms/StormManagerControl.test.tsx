import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/services/stormEventService', () => ({ stormEventService: { listStormManagers: mocks.list, setStormManager: mocks.save } }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'actor', role: 'STORM_MANAGER' } }) }));
import { StormManagerField, StormManagerEditor } from './StormManagerControl';
const options = [{ id: 'manager-1', displayName: 'Sam Manager', role: 'STORM_MANAGER', eligible: true }, { id: 'manager-2', displayName: 'Alex Manager', role: 'SUPER_ADMIN', eligible: true }];
beforeEach(() => { vi.clearAllMocks(); mocks.list.mockResolvedValue(options); });
afterEach(cleanup);
describe('responsible Storm Manager controls', () => {
  it('requires explicit selection from verified manager options', async () => {
    const onChange = vi.fn(), ready = vi.fn();
    const view = render(<StormManagerField value="" onChange={onChange} onReadyChange={ready} />);
    await screen.findByRole('option', { name: 'Sam Manager' });
    expect(ready).toHaveBeenLastCalledWith(false);
    fireEvent.change(screen.getByLabelText('Responsible Storm Manager'), { target: { value: 'manager-1' } });
    expect(onChange).toHaveBeenCalledWith('manager-1');
    view.rerender(<StormManagerField value="manager-1" onChange={onChange} onReadyChange={ready} />);
    await waitFor(() => expect(ready).toHaveBeenLastCalledWith(true));
  });
  it('shows unavailable reads and supports retry without inventing a manager', async () => {
    mocks.list.mockRejectedValueOnce(new Error('Connection failed'));
    const ready = vi.fn();
    render(<StormManagerField value="manager-1" onChange={() => undefined} onReadyChange={ready} />);
    await screen.findByRole('alert');
    expect(ready).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Retry manager options' }));
    await screen.findByRole('option', { name: 'Sam Manager' });
    await waitFor(() => expect(ready).toHaveBeenLastCalledWith(true));
  });
  it('changes the observed manager and reads back only after successful persistence', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    mocks.save.mockResolvedValue({ responsibleManagerId: 'manager-2' });
    render(<StormManagerEditor stormId="storm-1" managerId="manager-1" canEdit onSaved={onSaved} />);
    await screen.findByRole('option', { name: 'Alex Manager' });
    fireEvent.change(screen.getByLabelText('Responsible Storm Manager'), { target: { value: 'manager-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save manager' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith('storm-1', 'manager-2', 'manager-1');
  });
  it('keeps a committed save distinct from failed readback and retries only the read', async () => {
    const onSaved = vi.fn().mockRejectedValueOnce(new Error('Readback unavailable')).mockResolvedValue(undefined);
    mocks.save.mockResolvedValue({ responsibleManagerId: 'manager-2' });
    render(<StormManagerEditor stormId="storm-1" managerId="manager-1" canEdit onSaved={onSaved} />);
    await screen.findByRole('option', { name: 'Alex Manager' });
    fireEvent.change(screen.getByLabelText('Responsible Storm Manager'), { target: { value: 'manager-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save manager' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/saved/i));
    expect(screen.getByRole('alert').textContent).toMatch(/saved.*readback/i);
    fireEvent.click(screen.getByRole('button', { name: /retry.*readback/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2));
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it('keeps stale assignment errors visible without reporting a save', async () => {
    const onSaved = vi.fn(); mocks.save.mockRejectedValue(new Error('Responsible manager changed. Reload before saving.'));
    render(<StormManagerEditor stormId="storm-1" managerId="manager-1" canEdit onSaved={onSaved} />);
    await screen.findByRole('option', { name: 'Alex Manager' });
    fireEvent.change(screen.getByLabelText('Responsible Storm Manager'), { target: { value: 'manager-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save manager' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Reload before saving');
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('retains manager readback without edit controls for view-only/closed storms', async () => {
    render(<StormManagerEditor stormId="storm-1" managerId="manager-1" canEdit={false} onSaved={async () => undefined} />);
    await screen.findByText('Sam Manager');
    expect(screen.queryByRole('button', { name: 'Save manager' })).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(mocks.list).toHaveBeenCalledWith('storm-1');
  });
});
