import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ getRoleRateDefaults: vi.fn(), updateRoleRateDefault: vi.fn() }));
vi.mock('@/lib/services/payrollService', () => ({
  payrollService: { getRoleRateDefaults: mocks.getRoleRateDefaults, updateRoleRateDefault: mocks.updateRoleRateDefault },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { RoleRateEditor } from './RoleRateEditor';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RoleRateEditor', () => {
  it('renders all five roles', async () => {
    mocks.getRoleRateDefaults.mockResolvedValue([
      { role: 'DAMAGE_ASSESSER', workType: 'Working', hourlyRate: 85, currency: 'USD' },
    ]);

    render(<RoleRateEditor canEdit />);

    await waitFor(() => expect(screen.queryByText(/loading role rates/i)).toBeNull());

    expect(screen.getByText('Storm Manager')).not.toBeNull();
    expect(screen.getByText('Team Lead')).not.toBeNull();
    expect(screen.getByText('Sr. Damage Assessor')).not.toBeNull();
    expect(screen.getByText('Damage Assessor')).not.toBeNull();
    expect(screen.getByText('Driver')).not.toBeNull();
  });

  it('calls updateRoleRateDefault when a cell is saved', async () => {
    mocks.getRoleRateDefaults.mockResolvedValue([
      { role: 'DRIVER', workType: 'Working', hourlyRate: 65, currency: 'USD' },
    ]);
    mocks.updateRoleRateDefault.mockResolvedValue({
      role: 'DRIVER',
      workType: 'Working',
      hourlyRate: 70,
      currency: 'USD',
    });

    render(<RoleRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading role rates/i)).toBeNull());

    const driverRow = screen.getByText('Driver').closest('tr') as HTMLElement;
    const input = driverRow.querySelector('input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '70' } });

    const saveButton = driverRow.querySelector('button') as HTMLButtonElement;
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(mocks.updateRoleRateDefault).toHaveBeenCalledWith({
        role: 'DRIVER',
        workType: 'Working',
        hourlyRate: 70,
      }),
    );
    expect(mocks.updateRoleRateDefault).toHaveBeenCalledTimes(1);
  });

  it('renders Working, MOB, DE-MOB, and Stand-by as editable rates', async () => {
    mocks.getRoleRateDefaults.mockResolvedValue([
      { role: 'DRIVER', workType: 'Working', hourlyRate: 65, currency: 'USD' },
      { role: 'DRIVER', workType: 'MOB', hourlyRate: 45, currency: 'USD' },
      { role: 'DRIVER', workType: 'DE-MOB', hourlyRate: 45, currency: 'USD' },
      { role: 'DRIVER', workType: 'Stand-by', hourlyRate: 35, currency: 'USD' },
    ]);

    render(<RoleRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading role rates/i)).toBeNull());

    expect(screen.getByRole('columnheader', { name: 'Working' })).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'MOB' })).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'DE-MOB' })).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Stand-by' })).not.toBeNull();
    const driverRow = screen.getByText('Driver').closest('tr') as HTMLElement;
    expect(driverRow.querySelectorAll('input').length).toBe(4);
    expect(driverRow.querySelectorAll('button').length).toBe(4);
  });
});


it('does not offer an emergency response rate', async () => {
  mocks.getRoleRateDefaults.mockResolvedValue([]);
  render(<RoleRateEditor canEdit />);
  await waitFor(() => expect(screen.getByText('Role Wage Defaults')).not.toBeNull());
  expect(screen.queryByText(/emergency response/i)).toBeNull();
});

it('keeps rate changes disabled for a viewer', async () => {
  mocks.getRoleRateDefaults.mockResolvedValue([]);
  render(<RoleRateEditor />);
  await waitFor(() => expect(screen.getByText('Role Wage Defaults')).not.toBeNull());
  expect(screen.getAllByRole('button', { name: /save/i }).every(button => (button as HTMLButtonElement).disabled)).toBe(true);
});
