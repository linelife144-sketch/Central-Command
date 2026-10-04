import { describe, expect, it } from 'vitest';
import {
  timeEntryMoney,
  buildContractorPayrollRow,
  buildPayrollCsv,
  calculateEntryBilling,
  calculateEntryPayroll,
  calculateMargin,
  resolveContractorHourlyRate,
  resolveUtilityBillRate,
  resolveVehicleClaimAmount,
  summarizePayroll,
} from './payroll';

describe('resolveContractorHourlyRate', () => {
  it('prefers an active contractor override over the role default', () => {
    const rate = resolveContractorHourlyRate({
      roleDefaults: [{ role: 'DAMAGE_ASSESSER', workType: 'STANDARD_ASSESSMENT', hourlyRate: 85 }],
      contractorRates: [
        { workType: 'STANDARD_ASSESSMENT', hourlyRate: 100, effectiveFrom: '2026-01-01' },
      ],
      role: 'DAMAGE_ASSESSER',
      workType: 'STANDARD_ASSESSMENT',
      asOf: '2026-06-01',
    });

    expect(rate).toBe(100);
  });

  it('ignores a future-dated contractor override', () => {
    const rate = resolveContractorHourlyRate({
      roleDefaults: [{ role: 'DAMAGE_ASSESSER', workType: 'STANDARD_ASSESSMENT', hourlyRate: 85 }],
      contractorRates: [
        { workType: 'STANDARD_ASSESSMENT', hourlyRate: 100, effectiveFrom: '2027-01-01' },
      ],
      role: 'DAMAGE_ASSESSER',
      workType: 'STANDARD_ASSESSMENT',
      asOf: '2026-06-01',
    });

    expect(rate).toBe(85);
  });

  it('ignores an expired contractor override', () => {
    const rate = resolveContractorHourlyRate({
      roleDefaults: [{ role: 'DAMAGE_ASSESSER', workType: 'STANDARD_ASSESSMENT', hourlyRate: 85 }],
      contractorRates: [
        {
          workType: 'STANDARD_ASSESSMENT',
          hourlyRate: 100,
          effectiveFrom: '2025-01-01',
          effectiveTo: '2025-12-31',
        },
      ],
      role: 'DAMAGE_ASSESSER',
      workType: 'STANDARD_ASSESSMENT',
      asOf: '2026-06-01',
    });

    expect(rate).toBe(85);
  });

  it('falls back to the role default when no contractor override exists', () => {
    const rate = resolveContractorHourlyRate({
      roleDefaults: [{ role: 'TEAM_LEAD', workType: 'TRAVEL', hourlyRate: 60 }],
      contractorRates: [],
      role: 'TEAM_LEAD',
      workType: 'TRAVEL',
      asOf: '2026-06-01',
    });

    expect(rate).toBe(60);
  });

  it('returns null, never a silent 0, when nothing is configured', () => {
    const rate = resolveContractorHourlyRate({
      roleDefaults: [],
      contractorRates: [],
      role: 'DRIVER',
      workType: 'ADMIN',
      asOf: '2026-06-01',
    });

    expect(rate).toBeNull();
  });
});

describe('resolveUtilityBillRate', () => {
  it('prefers a storm-scoped rate over the global fallback', () => {
    const rate = resolveUtilityBillRate({
      rates: [
        { stormEventId: null, workType: 'STANDARD_ASSESSMENT', hourlyRate: 150 },
        { stormEventId: 'storm-1', workType: 'STANDARD_ASSESSMENT', hourlyRate: 175 },
      ],
      stormEventId: 'storm-1',
      workType: 'STANDARD_ASSESSMENT',
    });

    expect(rate).toBe(175);
  });

  it('uses the global fallback when no storm-scoped rate exists', () => {
    const rate = resolveUtilityBillRate({
      rates: [{ stormEventId: null, workType: 'STANDARD_ASSESSMENT', hourlyRate: 150 }],
      stormEventId: 'storm-2',
      workType: 'STANDARD_ASSESSMENT',
    });

    expect(rate).toBe(150);
  });

  it('returns null for an unconfigured work type', () => {
    const rate = resolveUtilityBillRate({
      rates: [{ stormEventId: null, workType: 'STANDARD_ASSESSMENT', hourlyRate: 150 }],
      stormEventId: null,
      workType: 'TRAINING',
    });

    expect(rate).toBeNull();
  });
});

describe('calculateEntryPayroll', () => {
  it('contains zero vehicle money — payroll is wage-only', () => {
    const { payrollAmount } = calculateEntryPayroll({ billableMinutes: 480, payRateApplied: 85 });
    // 8h * $85/hr = $680.00 exactly — no stipend/reimbursement folded in.
    expect(payrollAmount).toBe(680);
  });
});

describe('calculateEntryBilling', () => {
  it('computes utility bill amount from billable minutes and bill rate', () => {
    const { utilityBillAmount } = calculateEntryBilling({ billableMinutes: 480, utilityBillRate: 150 });
    expect(utilityBillAmount).toBe(1200);
  });
});

describe('resolveVehicleClaimAmount', () => {
  it('pays declared hours in full when under the shift length (6h shift, 5 declared)', () => {
    const result = resolveVehicleClaimAmount({ declaredHours: 5, billableMinutes: 360 });
    expect(result.amount).toBe(25);
    expect(result.capped).toBe(false);
    expect(result.cappedHours).toBe(5);
  });

  it('caps over-declared hours at the actual shift length (6h shift, 8 declared)', () => {
    const result = resolveVehicleClaimAmount({ declaredHours: 8, billableMinutes: 360 });
    expect(result.amount).toBe(30);
    expect(result.capped).toBe(true);
    expect(result.cappedHours).toBe(6);
  });

  it('applies a flat $5/hr with no overtime multiplier on a 14-hour entry', () => {
    const result = resolveVehicleClaimAmount({ declaredHours: 14, billableMinutes: 14 * 60 });
    expect(result.amount).toBe(70);
    expect(result.capped).toBe(false);
  });

  it('honors a custom hourly rate override', () => {
    const result = resolveVehicleClaimAmount({ declaredHours: 2, billableMinutes: 480, hourlyRate: 10 });
    expect(result.amount).toBe(20);
  });
});

describe('calculateMargin', () => {
  it('computes margin amount and percent from a payout and a bill total', () => {
    const result = calculateMargin({ utilityBillAmount: 1000, totalPayout: 700 });
    expect(result.marginAmount).toBe(300);
    expect(result.marginPercent).toBe(30);
  });

  it('returns 0 percent, not NaN/Infinity, when there is no billing', () => {
    const result = calculateMargin({ utilityBillAmount: 0, totalPayout: 500 });
    expect(result.marginAmount).toBe(-500);
    expect(result.marginPercent).toBe(0);
    expect(Number.isFinite(result.marginPercent)).toBe(true);
  });

  it('preserves a negative margin rather than clamping to zero', () => {
    const result = calculateMargin({ utilityBillAmount: 100, totalPayout: 150 });
    expect(result.marginAmount).toBe(-50);
    expect(result.marginPercent).toBe(-50);
  });
});

describe('buildContractorPayrollRow', () => {
  it('aggregates entries and only approved vehicle claims into one row', () => {
    const row = buildContractorPayrollRow({
      contractorId: 'c-1',
      contractorName: 'Jane Doe',
      role: 'DRIVER',
      entries: [
        {
          contractorId: 'c-1',
          contractorName: 'Jane Doe',
          role: 'DRIVER',
          totalMinutes: 480,
          billableMinutes: 480,
          payrollAmount: 400,
          utilityBillAmount: 800,
          status: 'APPROVED',
        },
        {
          contractorId: 'c-1',
          contractorName: 'Jane Doe',
          role: 'DRIVER',
          totalMinutes: 240,
          billableMinutes: 240,
          payrollAmount: 200,
          utilityBillAmount: 400,
          status: 'PENDING',
        },
        {
          contractorId: 'c-2',
          contractorName: 'Other Contractor',
          role: 'DAMAGE_ASSESSER',
          totalMinutes: 999,
          billableMinutes: 999,
          payrollAmount: 999,
          utilityBillAmount: 999,
          status: 'APPROVED',
        },
      ],
      vehicleClaims: [
        { contractorId: 'c-1', amount: 25, status: 'APPROVED' },
        { contractorId: 'c-1', amount: 40, status: 'PENDING' },
        { contractorId: 'c-1', amount: 15, status: 'REJECTED' },
      ],
    });

    expect(row.entryCount).toBe(2);
    expect(row.taxablePayroll).toBe(600);
    expect(row.reimbursementTotal).toBe(25);
    expect(row.totalPayout).toBe(625);
    expect(row.utilityBillAmount).toBe(1200);
    expect(row.pendingEntries).toBe(1);
    expect(row.approvedEntries).toBe(1);
    expect(row.pendingVehicleClaims).toBe(1);
    expect(row.marginAmount).toBe(575);
  });
});

describe('summarizePayroll', () => {
  it('reconciles totals with the sum of the rows, including reimbursementTotal', () => {
    const rows = [
      buildContractorPayrollRow({
        contractorId: 'c-1',
        contractorName: 'A',
        role: 'DRIVER',
        entries: [
          {
            contractorId: 'c-1',
            contractorName: 'A',
            role: 'DRIVER',
            totalMinutes: 60,
            billableMinutes: 60,
            payrollAmount: 65,
            utilityBillAmount: 150,
            status: 'APPROVED',
          },
        ],
        vehicleClaims: [{ contractorId: 'c-1', amount: 25, status: 'APPROVED' }],
      }),
      buildContractorPayrollRow({
        contractorId: 'c-2',
        contractorName: 'B',
        role: 'TEAM_LEAD',
        entries: [
          {
            contractorId: 'c-2',
            contractorName: 'B',
            role: 'TEAM_LEAD',
            totalMinutes: 120,
            billableMinutes: 120,
            payrollAmount: 210,
            utilityBillAmount: 300,
            status: 'APPROVED',
          },
        ],
        vehicleClaims: [],
      }),
    ];

    const totals = summarizePayroll(rows);

    expect(totals.contractorCount).toBe(2);
    expect(totals.taxablePayroll).toBe(275);
    expect(totals.reimbursementTotal).toBe(25);
    expect(totals.totalPayout).toBe(300);
    expect(totals.utilityBillAmount).toBe(450);
    expect(totals.marginAmount).toBe(150);
  });
});

describe('buildPayrollCsv', () => {
  it('escapes a CSV-injection attempt in a contractor name', () => {
    const row = buildContractorPayrollRow({
      contractorId: 'c-1',
      contractorName: "=cmd|'/c calc'",
      role: 'DAMAGE_ASSESSER',
      entries: [],
      vehicleClaims: [],
    });

    const csv = buildPayrollCsv([row], { periodStart: '2026-01-01', periodEnd: '2026-01-14' });

    // Leading '=' is replaced with a leading apostrophe so spreadsheet apps
    // treat the cell as text instead of evaluating it as a formula.
    expect(csv).toContain("\"'cmd|'/c calc'\"");
    expect(csv).not.toMatch(/,=cmd/);
  });

  it('includes taxablePayroll, reimbursementTotal, and totalPayout columns', () => {
    const row = buildContractorPayrollRow({
      contractorId: 'c-1',
      contractorName: 'Jane Doe',
      role: 'DRIVER',
      entries: [
        {
          contractorId: 'c-1',
          contractorName: 'Jane Doe',
          role: 'DRIVER',
          totalMinutes: 60,
          billableMinutes: 60,
          payrollAmount: 65,
          utilityBillAmount: 150,
          status: 'APPROVED',
        },
      ],
      vehicleClaims: [{ contractorId: 'c-1', amount: 25, status: 'APPROVED' }],
    });

    const csv = buildPayrollCsv([row], { periodStart: '2026-01-01', periodEnd: '2026-01-14' });

    expect(csv).toContain('Taxable Payroll');
    expect(csv).toContain('Vehicle Reimbursement');
    expect(csv).toContain('Total Payout');
    expect(csv).toContain('65.00');
    expect(csv).toContain('25.00');
    expect(csv).toContain('90.00');
  });
});

describe('persisted time-entry money', () => {
  it('keeps wages, approved reimbursement, payout, and margin separate', () => {
    expect(timeEntryMoney({ clock_out_at: '2026-10-03T17:00:00Z', payroll_amount: 200, billable_amount: 999, vehicle_reimbursement_amount: 25, utility_bill_amount: 350 }))
      .toEqual({ wage: 200, reimbursement: 25, payout: 225, margin: 125 });
  });
  it('does not invent a wage or margin for an unsynced or open entry', () => {
    expect(timeEntryMoney({ vehicle_reimbursement_amount: 0, utility_bill_amount: 350 }).wage).toBeUndefined();
    expect(timeEntryMoney({ clock_out_at: '2026-10-03T17:00:00Z', payroll_amount: 200 }).margin).toBeUndefined();
  });
});


it('excludes rejected shifts from payroll totals', () => {
  const result = buildContractorPayrollRow({ contractorId: 'c-1', contractorName: 'Pilot Driver', role: 'DRIVER', entries: [{ contractorId: 'c-1', contractorName: 'Pilot Driver', role: 'DRIVER', totalMinutes: 60, billableMinutes: 60, payrollAmount: 100, utilityBillAmount: 150, status: 'REJECTED' }], vehicleClaims: [] });
  expect(result.entryCount).toBe(0);
  expect(result.taxablePayroll).toBe(0);
  expect(result.utilityBillAmount).toBe(0);
});


it('does not display the open-shift zero snapshot as final wages after offline clock-out', () => {
  expect(timeEntryMoney({ clock_out_at: '2026-10-03T17:00:00Z', sync_status: 'PENDING', payroll_amount: 0, billable_amount: 200 }).wage).toBeUndefined();
});
