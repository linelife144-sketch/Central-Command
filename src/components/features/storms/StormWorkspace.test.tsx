import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ getStorm: vi.fn(), getTickets: vi.fn(), listRoster: vi.fn(), listOptions: vi.fn(), assign: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({
  profile: { role: 'SUPER_ADMIN' },
  permissions: { 'admin.tickets.view': true, 'admin.tickets.edit': true, 'admin.assignments.view': true, 'admin.assignments.edit': true, 'admin.payroll.view': true, 'admin.payroll.edit': true },
}) }));
vi.mock('@/components/common/layout/PageHeader', () => ({ PageHeader: ({ title }: { title: string }) => <header><h1>{title}</h1></header> }));
vi.mock('@/lib/services/stormEventService', () => ({ stormEventService: { getStormEventById: mocks.getStorm } }));
vi.mock('@/lib/services/ticketService', () => ({ ticketService: { getTickets: mocks.getTickets } }));
vi.mock('@/lib/services/stormRosterService', () => ({ stormRosterService: { list: mocks.listRoster, listOptions: mocks.listOptions, assign: mocks.assign } }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));

import { StormWorkspace } from './StormWorkspace';

const storm = { id: 'storm-1', name: 'Storm One', eventCode: 'S-1', utilityClient: 'ENTERGY', status: 'MOB', activeTickets: 0 };
const driverOption = { id: 'driver-1', displayName: 'Dana Driver', role: 'DRIVER' as const };
const driverMember = { contractorId: 'driver-1', displayName: 'Dana Driver', role: 'DRIVER' as const, payRateOverride: null, vehicleHourlyRate: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStorm.mockResolvedValue(storm);
  mocks.getTickets.mockResolvedValue([]);
  mocks.listRoster.mockResolvedValue([]);
  mocks.listOptions.mockResolvedValue([driverOption]);
  mocks.assign.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('StormWorkspace storm contractor compensation', () => {
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
