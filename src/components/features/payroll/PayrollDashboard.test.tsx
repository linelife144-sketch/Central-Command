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
  listContractors: vi.fn(),
  getStormRates: vi.fn(),
  saveStormRates: vi.fn(),
  listRoster: vi.fn(),
  stormEventId: undefined as string | undefined,
}));

vi.mock('@/components/providers/StormContextProvider', () => ({ useStormContext: () => ({
  ready: true, selection: mocks.stormEventId ?? 'ALL', stormEventId: mocks.stormEventId, selectStorm: vi.fn(),
  selectedStorm: mocks.stormEventId ? { id: mocks.stormEventId, status: 'ACTIVE' } : undefined,
  storms: mocks.stormEventId ? [{ id: mocks.stormEventId, eventCode: 'STORM-A', status: 'ACTIVE' }] : [],
}) }));
vi.mock('@/lib/services/stormRosterService', () => ({ stormRosterService: { list: mocks.listRoster } }));

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
vi.mock('@/lib/services/contractorService', () => ({
  contractorService: { listContractors: mocks.listContractors },
}));
vi.mock('@/lib/services/stormCompensationService', () => ({
  stormCompensationService: { getRates: mocks.getStormRates, saveRates: mocks.saveStormRates },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { PayrollDashboard } from './PayrollDashboard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.stormEventId = undefined;
});

describe('PayrollDashboard', () => {
  it('uses the shared storm for payroll, roster count, and vehicle review', async () => {
    mocks.stormEventId = 'storm-a';
    mocks.listStormEvents.mockResolvedValue([]);
    mocks.listContractors.mockResolvedValue([]);
    mocks.listRoster.mockResolvedValue([{ contractorId: 'member' }]);
    mocks.listVehicleClaims.mockResolvedValue([]);
    mocks.getStormRates.mockResolvedValue([]);
    mocks.getPayrollSummary.mockResolvedValue({ periodStart: '2026-10-01', periodEnd: '2026-10-09', totals: {}, rows: [] });
    render(<PayrollDashboard reviewerId="manager" />);
    await waitFor(() => expect(mocks.getPayrollSummary).toHaveBeenCalled());
    expect(mocks.getPayrollSummary).toHaveBeenCalledWith(expect.objectContaining({ stormEventId: 'storm-a' }));
    expect(mocks.listRoster).toHaveBeenCalledWith('storm-a');
    expect(mocks.listContractors).not.toHaveBeenCalled();
    expect(mocks.listVehicleClaims).toHaveBeenCalledWith({ status: 'PENDING', stormEventId: 'storm-a' });
  });
  it('loads and renders the payroll summary, contractor table, and sub-editors', async () => {
    mocks.listStormEvents.mockResolvedValue([]);
    mocks.listContractors.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }, { id: 'c-3' }, { id: 'c-4' }]);
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

    expect(screen.queryByText('Role Wage Defaults')).toBeNull();
    expect(screen.getByText(/select a storm to view or edit its compensation rates/i)).not.toBeNull();
    expect(screen.getByText(/no pending vehicle reimbursement/i)).not.toBeNull();
    // Active roster count, not the period row count (totals.contractorCount is 1).
    expect(screen.getByText('4')).not.toBeNull();
    expect(mocks.listContractors).toHaveBeenCalledWith({ activeOnly: true });
  });

  it('surfaces a load error without crashing', async () => {
    mocks.listStormEvents.mockResolvedValue([]);
    mocks.listContractors.mockResolvedValue([]);
    mocks.listVehicleClaims.mockResolvedValue([]);
    mocks.getPayrollSummary.mockRejectedValue(new Error('Unable to load payroll time entries.'));

    render(<PayrollDashboard includeFinancial reviewerId="admin-1" />);

    await waitFor(() => expect(screen.getByText('Unable to load payroll time entries.')).not.toBeNull());
  });
});
