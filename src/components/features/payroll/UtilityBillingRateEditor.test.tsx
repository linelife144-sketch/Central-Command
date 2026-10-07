import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';

const mocks = vi.hoisted(() => ({ getUtilityBillingRates: vi.fn(), updateUtilityBillingRate: vi.fn() }));
vi.mock('@/lib/services/payrollService', () => ({
  payrollService: { getUtilityBillingRates: mocks.getUtilityBillingRates, updateUtilityBillingRate: mocks.updateUtilityBillingRate },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: { value: string; onValueChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) => (
    <select value={value} disabled={disabled} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => children,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => children,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

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

  it('auto-saves a bill rate against the contractor role when the input changes', async () => {
    mocks.getUtilityBillingRates.mockResolvedValue([]);
    mocks.updateUtilityBillingRate.mockResolvedValue({
      stormEventId: null, role: 'DRIVER', workType: null, hourlyRate: 42, currency: 'USD',
    });

    render(<UtilityBillingRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading bill rates/i)).toBeNull());

    const driverRow = screen.getByText('Driver').closest('tr') as HTMLElement;
    fireEvent.change(driverRow.querySelector('input') as HTMLInputElement, { target: { value: '42' } });

    await waitFor(() =>
      expect(mocks.updateUtilityBillingRate).toHaveBeenCalledWith({
        stormEventId: null,
        role: 'DRIVER',
        hourlyRate: 42,
      }),
    );
  });

  it('offers 1x/1.5x/2x multipliers and persists the effective rate', async () => {
    mocks.getUtilityBillingRates.mockResolvedValue([
      { stormEventId: null, role: 'DRIVER', workType: null, hourlyRate: 40, currency: 'USD' },
    ]);
    mocks.updateUtilityBillingRate.mockResolvedValue({
      stormEventId: null, role: 'DRIVER', workType: null, hourlyRate: 180, currency: 'USD',
    });

    render(<UtilityBillingRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading bill rates/i)).toBeNull());

    const driverRow = screen.getByText('Driver').closest('tr') as HTMLElement;
    const multiplierSelect = driverRow.querySelector('select') as HTMLSelectElement;
    expect(Array.from(multiplierSelect.options).map((option) => option.value)).toEqual(['1x', '1.5x', '2x']);
    expect(multiplierSelect.value).toBe('1x');

    fireEvent.change(driverRow.querySelector('input') as HTMLInputElement, { target: { value: '120' } });
    fireEvent.change(multiplierSelect, { target: { value: '1.5x' } });

    // 120 with 1.5x selected → effective rate 180 is what gets stored.
    await waitFor(() =>
      expect(mocks.updateUtilityBillingRate).toHaveBeenLastCalledWith({
        stormEventId: null,
        role: 'DRIVER',
        hourlyRate: 180,
      }),
    );
    expect(driverRow.textContent).toContain('$180.00/hr');
  });

  it('rejects an invalid bill rate on blur without saving', async () => {
    mocks.getUtilityBillingRates.mockResolvedValue([
      { stormEventId: null, role: 'DRIVER', workType: null, hourlyRate: 40, currency: 'USD' },
    ]);

    render(<UtilityBillingRateEditor canEdit />);
    await waitFor(() => expect(screen.queryByText(/loading bill rates/i)).toBeNull());

    const driverRow = screen.getByText('Driver').closest('tr') as HTMLElement;
    const input = driverRow.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.blur(input);

    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Enter a valid hourly rate.'));
    expect(mocks.updateUtilityBillingRate).not.toHaveBeenCalled();
  });

  it('keeps the multiplier disabled for a viewer', async () => {
    mocks.getUtilityBillingRates.mockResolvedValue([]);
    render(<UtilityBillingRateEditor />);
    await waitFor(() => expect(screen.queryByText(/loading bill rates/i)).toBeNull());

    expect(
      screen.getAllByRole('combobox').every((select) => (select as HTMLSelectElement).disabled),
    ).toBe(true);
    expect(mocks.updateUtilityBillingRate).not.toHaveBeenCalled();
  });
});
