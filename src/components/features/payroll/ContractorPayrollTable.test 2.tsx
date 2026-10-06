import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ContractorPayrollTable } from './ContractorPayrollTable';
import type { ContractorPayrollRow } from '@/types';

function buildRow(overrides: Partial<ContractorPayrollRow> = {}): ContractorPayrollRow {
  return {
    contractorId: 'c-1',
    contractorName: 'Jane Doe',
    role: 'DRIVER',
    entryCount: 2,
    totalMinutes: 480,
    billableMinutes: 450,
    taxablePayroll: 400,
    reimbursementTotal: 25,
    totalPayout: 425,
    utilityBillAmount: 800,
    marginAmount: 375,
    marginPercent: 46.9,
    pendingEntries: 1,
    approvedEntries: 1,
    pendingVehicleClaims: 0,
    ...overrides,
  };
}

afterEach(cleanup);

describe('ContractorPayrollTable', () => {
  it('renders a dash for a contractor with no entries rather than $0.00', () => {
    render(<ContractorPayrollTable includeFinancial rows={[buildRow({ entryCount: 0, taxablePayroll: 0, totalPayout: 0 })]} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
    expect(screen.queryByText('$0.00')).toBeNull();
  });

  it('renders formatted amounts for a contractor with activity', () => {
    render(<ContractorPayrollTable includeFinancial rows={[buildRow()]} />);

    expect(screen.getByText('Jane Doe')).not.toBeNull();
    expect(screen.getByText('Driver')).not.toBeNull();
    expect(screen.getByText('$400.00')).not.toBeNull();
    expect(screen.getByText('$425.00')).not.toBeNull();
  });

  it('shows the empty-state message when there are no rows', () => {
    render(<ContractorPayrollTable includeFinancial rows={[]} />);

    expect(screen.getByText(/no payroll activity/i)).not.toBeNull();
  });
});
