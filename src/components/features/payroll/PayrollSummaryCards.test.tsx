import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { PayrollSummaryCards } from './PayrollSummaryCards';
import type { PayrollTotals } from '@/types';

function buildTotals(overrides: Partial<PayrollTotals> = {}): PayrollTotals {
  return {
    contractorCount: 2,
    entryCount: 5,
    totalMinutes: 600,
    billableMinutes: 540,
    taxablePayroll: 500,
    reimbursementTotal: 25,
    totalPayout: 525,
    utilityBillAmount: 1000,
    marginAmount: 475,
    marginPercent: 47.5,
    ...overrides,
  };
}

afterEach(cleanup);

describe('PayrollSummaryCards', () => {
  it('shows placeholders while loading with no totals yet', () => {
    render(<PayrollSummaryCards totals={null} isLoading />);

    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
  });

  it('shows em-dash placeholders when not loading and there are no totals', () => {
    render(<PayrollSummaryCards totals={null} isLoading={false} />);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders formatted currency and percent values from totals', () => {
    render(<PayrollSummaryCards totals={buildTotals()} />);

    expect(screen.getByText('$500.00')).not.toBeNull();
    expect(screen.getByText('$25.00')).not.toBeNull();
    expect(screen.getByText('$525.00')).not.toBeNull();
    expect(screen.getByText('$1,000.00')).not.toBeNull();
    expect(screen.getByText('$475.00')).not.toBeNull();
    expect(screen.getByText('47.5%')).not.toBeNull();
  });

  it('renders a negative margin in the danger color class', () => {
    render(<PayrollSummaryCards totals={buildTotals({ marginAmount: -50, marginPercent: -10 })} />);

    const marginValue = screen.getByText('-$50.00');
    expect(marginValue.className).toContain('text-grid-danger-ink');
  });
});
