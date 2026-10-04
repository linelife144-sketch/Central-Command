import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getPayrollSummary: vi.fn(),
  getRoleRateDefaults: vi.fn(),
  updateRoleRateDefault: vi.fn(),
  getUtilityBillingRates: vi.fn(),
  updateUtilityBillingRate: vi.fn(),
  listVehicleClaims: vi.fn(),
  listStormEvents: vi.fn(),
  createPayrollCsvExport: vi.fn(),
}));

vi.mock('@/lib/services/payrollService', () => ({
  payrollService: {
    getPayrollSummary: mocks.getPayrollSummary,
    getRoleRateDefaults: mocks.getRoleRateDefaults,
    updateRoleRateDefault: mocks.updateRoleRateDefault,
    getUtilityBillingRates: mocks.getUtilityBillingRates,
    updateUtilityBillingRate: mocks.updateUtilityBillingRate,
    listVehicleClaims: mocks.listVehicleClaims,
    createPayrollCsvExport: mocks.createPayrollCsvExport,
  },
}));
vi.mock('@/lib/services/stormEventService', () => ({
  stormEventService: { listStormEvents: mocks.listStormEvents },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { PayrollDashboard } from './PayrollDashboard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PayrollDashboard', () => {
  it('loads and renders the payroll summary, contractor table, and sub-editors', async () => {
    mocks.listStormEvents.mockResolvedValue([]);
    mocks.getRoleRateDefaults.mockResolvedValue([]);
    mocks.getUtilityBillingRates.mockResolvedValue([]);
    mocks.listVehicleClaims.mockResolvedValue([]);
    mocks.getPayrollSummary.mockResolvedValue({
      periodStart: '2026-01-01',
      periodEnd: '2026-01-14',
      generatedAt: '2026-01-15T00:00:00.000Z',
      rows: [
        {
          contractorId: 'c-1',
          contractorName: 'Jane Doe',
          role: 'DRIVER',
          entryCount: 1,
          totalMinutes: 480,
          billableMinutes: 480,
          taxablePayroll: 400,
          reimbursementTotal: 0,
          totalPayout: 400,
          utilityBillAmount: 800,
          marginAmount: 400,
          marginPercent: 50,
          pendingEntries: 0,
          approvedEntries: 1,
          pendingVehicleClaims: 0,
        },
      ],
      totals: {
        contractorCount: 1,
        entryCount: 1,
        totalMinutes: 480,
        billableMinutes: 480,
        taxablePayroll: 400,
        reimbursementTotal: 0,
        totalPayout: 400,
        utilityBillAmount: 800,
        marginAmount: 400,
        marginPercent: 50,
      },
    });

    render(<PayrollDashboard includeFinancial reviewerId="admin-1" />);

    await waitFor(() => expect(mocks.getPayrollSummary).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Jane Doe')).not.toBeNull());

    expect(screen.getByText('Role Wage Defaults')).not.toBeNull();
    expect(screen.getAllByText(/utility bill rates/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no pending vehicle reimbursement/i)).not.toBeNull();
  });

  it('surfaces a load error without crashing', async () => {
    mocks.listStormEvents.mockResolvedValue([]);
    mocks.getRoleRateDefaults.mockResolvedValue([]);
    mocks.getUtilityBillingRates.mockResolvedValue([]);
    mocks.listVehicleClaims.mockResolvedValue([]);
    mocks.getPayrollSummary.mockRejectedValue(new Error('Unable to load payroll time entries.'));

    render(<PayrollDashboard includeFinancial reviewerId="admin-1" />);

    await waitFor(() => expect(screen.getByText('Unable to load payroll time entries.')).not.toBeNull());
  });
});
