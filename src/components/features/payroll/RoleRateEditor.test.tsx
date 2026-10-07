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
      { role: 'DAMAGE_ASSESSER', workType: 'STANDARD_ASSESSMENT', hourlyRate: 85, currency: 'USD' },
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
      { role: 'DRIVER', workType: 'STANDARD_ASSESSMENT', hourlyRate: 65, currency: 'USD' },
    ]);
    mocks.updateRoleRateDefault.mockResolvedValue({
      role: 'DRIVER',
      workType: 'STANDARD_ASSESSMENT',
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
        workType: 'STANDARD_ASSESSMENT',
        hourlyRate: 70,
      }),
    );
    // Saving the Rate also persists the derived columns so stored
    // role_rate_defaults match the displayed formulas.
    await waitFor(() =>
      expect(mocks.updateRoleRateDefault).toHaveBeenCalledWith({
        role: 'DRIVER',
        workType: 'TRAVEL',
        hourlyRate: 105,
      }),
    );
    await waitFor(() =>
      expect(mocks.updateRoleRateDefault).toHaveBeenCalledWith({
        role: 'DRIVER',
        workType: 'STANDBY',
        hourlyRate: 140,
      }),
    );
  });

  it('renders DE-MOB and Standby as static computed values with no editors', async () => {
    mocks.getRoleRateDefaults.mockResolvedValue([
      { role: 'DRIVER', workType: 'STANDARD_ASSESSMENT', hourlyRate: 65, currency: 'USD' },
    ]);

    render(<RoleRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading role rates/i)).toBeNull());

    const driverRow = screen.getByText('Driver').closest('tr') as HTMLElement;
    // 1.5 × 65 = 97.50 (DE-MOB), 2 × 65 = 130.00 (Standby).
    expect(driverRow.textContent).toContain('97.50');
    expect(driverRow.textContent).toContain('130.00');
    // Only the Rate column keeps an input and a Save button.
    expect(driverRow.querySelectorAll('input').length).toBe(1);
    expect(driverRow.querySelectorAll('button').length).toBe(1);
  });

  it('tracks the live Rate input in the derived columns, falling back to the saved rate', async () => {
    mocks.getRoleRateDefaults.mockResolvedValue([
      { role: 'DRIVER', workType: 'STANDARD_ASSESSMENT', hourlyRate: 65, currency: 'USD' },
    ]);

    render(<RoleRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading role rates/i)).toBeNull());

    const driverRow = screen.getByText('Driver').closest('tr') as HTMLElement;
    const input = driverRow.querySelector('input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '100' } });
    await waitFor(() => expect(driverRow.textContent).toContain('150.00'));
    expect(driverRow.textContent).toContain('200.00');

    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(driverRow.textContent).toContain('97.50'));
    expect(driverRow.textContent).toContain('130.00');
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
