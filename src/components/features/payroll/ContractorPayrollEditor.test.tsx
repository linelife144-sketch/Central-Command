import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getContractorRateProfile: vi.fn(),
  updateContractorRole: vi.fn(),
  updateContractorWorkTypeRate: vi.fn(),
}));
vi.mock('@/lib/services/payrollService', () => ({
  payrollService: {
    getContractorRateProfile: mocks.getContractorRateProfile,
    updateContractorRole: mocks.updateContractorRole,
    updateContractorWorkTypeRate: mocks.updateContractorWorkTypeRate,
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
interface MockSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

interface MockSelectItemProps {
  value: string;
  children?: React.ReactNode;
}

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: MockSelectProps) => (
    <select
      aria-label="Role"
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: MockSelectProps) => children,
  SelectValue: () => null,
  SelectContent: ({ children }: MockSelectProps) => children,
  SelectItem: ({ value, children }: MockSelectItemProps) => <option value={value}>{children}</option>,
}));

import { ContractorPayrollEditor } from './ContractorPayrollEditor';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ContractorPayrollEditor', () => {
  it('renders the current role and resolved rates once loaded', async () => {
    mocks.getContractorRateProfile.mockResolvedValue({
      contractorId: 'c-1',
      role: 'DRIVER',
      workTypeRates: { STANDARD_ASSESSMENT: 65 },
      missingWorkTypes: ['EMERGENCY_RESPONSE', 'TRAVEL', 'STANDBY', 'ADMIN', 'TRAINING'],
    });

    render(<ContractorPayrollEditor canEdit canChangeRole contractorId="c-1" currentRole="DRIVER" />);

    await waitFor(() => expect(screen.queryByText(/loading rates/i)).toBeNull());

    expect(screen.getAllByText('No rate configured').length).toBeGreaterThan(0);
  });

  it('surfaces the server guard error message when a role change is rejected', async () => {
    const { toast } = await import('sonner');
    mocks.getContractorRateProfile.mockResolvedValue({
      contractorId: 'c-1',
      role: 'DRIVER',
      workTypeRates: {},
      missingWorkTypes: [],
    });
    mocks.updateContractorRole.mockRejectedValue(
      new Error('Only authorized administrators can approve contractor eligibility'),
    );

    render(<ContractorPayrollEditor canEdit canChangeRole contractorId="c-1" currentRole="DRIVER" />);
    await waitFor(() => expect(screen.queryByText(/loading rates/i)).toBeNull());

    fireEvent.change(screen.getByRole('combobox', { name: 'Role' }), { target: { value: 'TEAM_LEAD' } });

    await waitFor(() =>
      expect(mocks.updateContractorRole).toHaveBeenCalledWith({ contractorId: 'c-1', role: 'TEAM_LEAD' }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Only authorized administrators can approve contractor eligibility'),
    );
  });
});
