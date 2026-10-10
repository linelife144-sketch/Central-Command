import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ getStorm: vi.fn(), getTickets: vi.fn(), listManagers: vi.fn(), saveManager: vi.fn(), listRoster: vi.fn(), listOptions: vi.fn(), assign: vi.fn(), success: vi.fn(), error: vi.fn(),
  permissions: { 'admin.storms.view': true, 'admin.storms.edit': true, 'admin.tickets.view': true, 'admin.tickets.edit': true, 'admin.assignments.view': true, 'admin.assignments.edit': true, 'admin.payroll.view': true, 'admin.payroll.edit': true },
}));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({
  profile: { id: 'actor', role: 'SUPER_ADMIN' },
  permissions: mocks.permissions,
}) }));
vi.mock('@/components/common/layout/PageHeader', () => ({ PageHeader: ({ title }: { title: string }) => <header><h1>{title}</h1></header> }));
vi.mock('@/lib/services/stormEventService', () => ({ stormEventService: { getStormEventById: mocks.getStorm, listStormManagers: mocks.listManagers, setStormManager: mocks.saveManager } }));
vi.mock('@/lib/services/ticketService', () => ({ ticketService: { getTickets: mocks.getTickets } }));
vi.mock('@/lib/services/stormRosterService', () => ({ stormRosterService: { list: mocks.listRoster, listOptions: mocks.listOptions, assign: mocks.assign } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));

import { StormWorkspace } from './StormWorkspace';

const storm = { id: 'storm-1', name: 'Storm One', eventCode: 'S-1', utilityClient: 'ENTERGY', status: 'MOB', activeTickets: 0, responsibleManagerId: 'manager-1' };
const driverOption = { id: 'driver-1', displayName: 'Dana Driver', role: 'DRIVER' as const };
const driverMember = { contractorId: 'driver-1', displayName: 'Dana Driver', role: 'DRIVER' as const, payRateOverride: null, vehicleHourlyRate: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStorm.mockResolvedValue(storm);
  mocks.getTickets.mockResolvedValue([]);
  mocks.listRoster.mockResolvedValue([]);
  mocks.listOptions.mockResolvedValue([driverOption]);
  mocks.assign.mockResolvedValue(undefined);
  mocks.listManagers.mockResolvedValue([
    { id: 'manager-1', displayName: 'Sam Manager', role: 'STORM_MANAGER', eligible: true },
    { id: 'manager-2', displayName: 'Alex Manager', role: 'STORM_MANAGER', eligible: true },
  ]);
  mocks.saveManager.mockResolvedValue({ ...storm, responsibleManagerId: 'manager-2' });
});
afterEach(cleanup);

describe('StormWorkspace storm contractor compensation', () => {
  it.each(['storm', 'related tickets'])('retries only readback after a manager commit followed by failed %s read', async (failedRead) => {
    render(<StormWorkspace stormId="storm-1" />);
    await screen.findByRole('option', { name: 'Alex Manager' });
    const updatedStorm = { ...storm, responsibleManagerId: 'manager-2' };
    if (failedRead === 'storm') {
      mocks.getStorm.mockRejectedValueOnce(new Error('Storm read unavailable')).mockResolvedValue(updatedStorm);
    } else {
      mocks.getStorm.mockResolvedValue(updatedStorm);
      mocks.getTickets.mockRejectedValueOnce(new Error('Ticket read unavailable'));
    }
    fireEvent.change(screen.getByLabelText('Responsible Storm Manager'), { target: { value: 'manager-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save manager' }));

    const retry = await screen.findByRole('button', { name: /retry.*readback/i });
    expect(screen.getByRole('status').textContent).toMatch(/saved/i);
    expect(screen.getAllByRole('alert').some(alert => /saved.*readback/i.test(alert.textContent ?? ''))).toBe(true);
    expect((screen.getByRole('button', { name: 'Save manager' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(retry);

    await waitFor(() => expect(screen.queryByRole('button', { name: /retry.*readback/i })).toBeNull());
    await waitFor(() => expect((screen.getByLabelText('Responsible Storm Manager') as HTMLSelectElement).value).toBe('manager-2'));
    expect(mocks.getStorm).toHaveBeenCalledTimes(3);
    expect(mocks.saveManager).toHaveBeenCalledTimes(1);
  });

  it('shows an initial storm read failure without rejecting the mount effect', async () => {
    mocks.getStorm.mockRejectedValueOnce(new Error('Storm unavailable'));
    render(<StormWorkspace stormId="storm-1" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Storm unavailable');
    expect(screen.queryByRole('button', { name: /retry.*readback/i })).toBeNull();
    expect(mocks.saveManager).not.toHaveBeenCalled();
  });

  it('requires a Driver vehicle allowance and saves it with the storm assignment', async () => {
    render(<StormWorkspace stormId="storm-1" />);
    await screen.findByText('No contractors assigned to this storm yet.');
    fireEvent.change(screen.getByLabelText('Add an active contractor'), { target: { value: 'driver-1' } });

    const addButton = screen.getByRole('button', { name: 'Add to Storm' }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Contractor wage override ($/hr, optional)'), { target: { value: '31.25' } });
    fireEvent.change(screen.getByLabelText('Hourly vehicle allowance ($/hr) *'), { target: { value: '9.50' } });
    fireEvent.click(addButton);

    await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith('storm-1', 'driver-1', {
      payRateOverride: 31.25,
      vehicleHourlyRate: 9.5,
    }));
  });

  it('lets an administrator fill the required allowance for an existing rostered Driver', async () => {
    mocks.listRoster.mockResolvedValue([driverMember]);
    mocks.listOptions.mockResolvedValue([]);
    render(<StormWorkspace stormId="storm-1" />);
    await screen.findByText(/Vehicle allowance not configured/);

    fireEvent.change(screen.getByLabelText('Hourly vehicle allowance ($/hr) *'), { target: { value: '6.75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save contractor rates' }));

    await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith('storm-1', 'driver-1', {
      payRateOverride: null,
      vehicleHourlyRate: 6.75,
    }));
  });
});
