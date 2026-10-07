import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ getUtilityBillingRates: vi.fn(), updateUtilityBillingRate: vi.fn() }));
vi.mock('@/lib/services/payrollService', () => ({
  payrollService: { getUtilityBillingRates: mocks.getUtilityBillingRates, updateUtilityBillingRate: mocks.updateUtilityBillingRate },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { UtilityBillingRateEditor } from './UtilityBillingRateEditor';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UtilityBillingRateEditor', () => {
  it('keys bill rates by contractor role, not work type', async () => {
    mocks.getUtilityBillingRates.mockResolvedValue([
      { stormEventId: null, role: 'DRIVER', workType: null, hourlyRate: 40, currency: 'USD' },
    ]);

    render(<UtilityBillingRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading bill rates/i)).toBeNull());

    expect(screen.getByText('Role')).not.toBeNull();
    expect(screen.queryByText('Work Type')).toBeNull();
    expect(screen.getByText('Storm Manager')).not.toBeNull();
    expect(screen.getByText('Team Lead')).not.toBeNull();
    expect(screen.getByText('Sr. Damage Assessor')).not.toBeNull();
    expect(screen.getByText('Damage Assessor')).not.toBeNull();
    expect(screen.getByText('Driver')).not.toBeNull();
    expect(screen.queryByText(/emergency response/i)).toBeNull();
  });

  it('leaves a role with no stored rate empty', async () => {
    mocks.getUtilityBillingRates.mockResolvedValue([]);

    render(<UtilityBillingRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading bill rates/i)).toBeNull());

    const driverRow = screen.getByText('Driver').closest('tr') as HTMLElement;
    const input = driverRow.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('saves a bill rate against the contractor role', async () => {
    mocks.getUtilityBillingRates.mockResolvedValue([]);
    mocks.updateUtilityBillingRate.mockResolvedValue({
      stormEventId: null, role: 'DRIVER', workType: null, hourlyRate: 42, currency: 'USD',
    });

    render(<UtilityBillingRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading bill rates/i)).toBeNull());

    const driverRow = screen.getByText('Driver').closest('tr') as HTMLElement;
    fireEvent.change(driverRow.querySelector('input') as HTMLInputElement, { target: { value: '42' } });
    fireEvent.click(driverRow.querySelector('button') as HTMLButtonElement);

    await waitFor(() =>
      expect(mocks.updateUtilityBillingRate).toHaveBeenCalledWith({
        stormEventId: null,
        role: 'DRIVER',
        hourlyRate: 42,
      }),
    );
  });
});
