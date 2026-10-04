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
  });
});


it('keeps rate changes disabled for a viewer', async () => {
  mocks.getRoleRateDefaults.mockResolvedValue([]);
  render(<RoleRateEditor />);
  await waitFor(() => expect(screen.getByText('Role Wage Defaults')).not.toBeNull());
  expect(screen.getAllByRole('button', { name: /save/i }).every(button => (button as HTMLButtonElement).disabled)).toBe(true);
});
