import { describe, expect, it, vi } from 'vitest';

import { createPayrollService } from './payrollService';
import type { VehicleClaim } from '../../types';

function buildVehicleClaim(overrides: Partial<VehicleClaim> = {}): VehicleClaim {
  return {
    id: 'claim-1',
    time_entry_id: 'time-1',
    contractor_id: 'c-1',
    vehicle_type: 'PERSONAL',
    declared_hours: 5,
    notes: 'Used my truck for the full shift.',
    vehicle_photo_url: 'https://example.com/vehicle.jpg',
    license_plate_photo_url: 'https://example.com/plate.jpg',
    amount: 25,
    capped: false,
    status: 'PENDING',
    is_taxable: false,
    created_at: '2026-02-12T08:00:00.000Z',
    updated_at: '2026-02-12T08:00:00.000Z',
    ...overrides,
  };
}

describe('createPayrollService.getPayrollSummary', () => {
  it('groups time entries into one row per contractor and sums correctly', async () => {
    const service = createPayrollService({
      fetchPayrollTimeEntries: vi.fn().mockResolvedValue([
        {
          id: 't-1',
          contractor_id: 'c-1',
          status: 'APPROVED',
          total_minutes: 480,
          billable_minutes: 480,
          payroll_amount: 400,
          utility_bill_amount: 800,
        },
        {
          id: 't-2',
          contractor_id: 'c-1',
          status: 'APPROVED',
          total_minutes: 120,
          billable_minutes: 120,
          payroll_amount: 100,
          utility_bill_amount: 200,
        },
        {
          id: 't-3',
          contractor_id: 'c-2',
          status: 'PENDING',
          total_minutes: 60,
          billable_minutes: 60,
          payroll_amount: 50,
          utility_bill_amount: 100,
        },
      ]),
      fetchVehicleClaimsForEntries: vi.fn().mockResolvedValue([]),
      fetchContractorNames: vi.fn().mockResolvedValue(
        new Map([
          ['c-1', { name: 'Jane Doe', role: 'DRIVER' as const }],
          ['c-2', { name: 'John Smith', role: 'TEAM_LEAD' as const }],
        ]),
      ),
    });

    const summary = await service.getPayrollSummary();

    expect(summary.rows).toHaveLength(2);
    const janeRow = summary.rows.find((row) => row.contractorId === 'c-1');
    expect(janeRow?.taxablePayroll).toBe(500);
    expect(janeRow?.utilityBillAmount).toBe(1000);
    expect(summary.totals.contractorCount).toBe(2);
    expect(summary.totals.taxablePayroll).toBe(550);
  });

  it('passes date range and stormEventId filters through to the time entry fetch', async () => {
    const fetchPayrollTimeEntries = vi.fn().mockResolvedValue([]);
    const service = createPayrollService({
      fetchPayrollTimeEntries,
      fetchVehicleClaimsForEntries: vi.fn().mockResolvedValue([]),
      fetchContractorNames: vi.fn().mockResolvedValue(new Map()),
    });

    await service.getPayrollSummary({
      from: '2026-01-01',
      to: '2026-01-14',
      stormEventId: 'storm-1',
    });

    expect(fetchPayrollTimeEntries).toHaveBeenCalledWith({
      from: '2026-01-01',
      to: '2026-01-14',
      stormEventId: 'storm-1',
    });
  });

  it('rejects an inverted date range before querying', async () => {
    const fetchPayrollTimeEntries = vi.fn();
    const service = createPayrollService({ fetchPayrollTimeEntries });

    await expect(
      service.getPayrollSummary({ from: '2026-02-01', to: '2026-01-01' }),
    ).rejects.toThrow('Payroll period end must be on or after the period start.');

    expect(fetchPayrollTimeEntries).not.toHaveBeenCalled();
  });

  it('reads the stored payroll_amount/utility_bill_amount rather than recomputing from rate', async () => {
    // Deliberately inconsistent fixture: if the service recomputed from a
    // rate it would not match this payroll_amount. The stored value must win.
    const service = createPayrollService({
      fetchPayrollTimeEntries: vi.fn().mockResolvedValue([
        {
          id: 't-1',
          contractor_id: 'c-1',
          status: 'APPROVED',
          total_minutes: 60,
          billable_minutes: 60,
          payroll_amount: 999.99,
          utility_bill_amount: 111.11,
        },
      ]),
      fetchVehicleClaimsForEntries: vi.fn().mockResolvedValue([]),
      fetchContractorNames: vi.fn().mockResolvedValue(
        new Map([['c-1', { name: 'Jane Doe', role: 'DRIVER' as const }]]),
      ),
    });

    const summary = await service.getPayrollSummary();

    expect(summary.rows[0]?.taxablePayroll).toBe(999.99);
    expect(summary.rows[0]?.utilityBillAmount).toBe(111.11);
  });

  it('includes only APPROVED vehicle claims in total payout', async () => {
    const service = createPayrollService({
      fetchPayrollTimeEntries: vi.fn().mockResolvedValue([
        {
          id: 't-1',
          contractor_id: 'c-1',
          status: 'APPROVED',
          total_minutes: 60,
          billable_minutes: 60,
          payroll_amount: 100,
          utility_bill_amount: 200,
        },
      ]),
      fetchVehicleClaimsForEntries: vi.fn().mockResolvedValue([
        buildVehicleClaim({ status: 'APPROVED', amount: 25 }),
        buildVehicleClaim({ id: 'claim-2', status: 'PENDING', amount: 40 }),
        buildVehicleClaim({ id: 'claim-3', status: 'REJECTED', amount: 15 }),
      ]),
      fetchContractorNames: vi.fn().mockResolvedValue(
        new Map([['c-1', { name: 'Jane Doe', role: 'DRIVER' as const }]]),
      ),
    });

    const summary = await service.getPayrollSummary();

    expect(summary.rows[0]?.reimbursementTotal).toBe(25);
    expect(summary.rows[0]?.totalPayout).toBe(125);
    expect(summary.rows[0]?.pendingVehicleClaims).toBe(1);
  });
});

describe('createPayrollService rate management', () => {
  it('forwards updateContractorRole to the write dependency', async () => {
    const writeContractorRole = vi.fn().mockResolvedValue(undefined);
    const service = createPayrollService({ writeContractorRole });

    await service.updateContractorRole({ contractorId: 'c-1', role: 'TEAM_LEAD' });

    expect(writeContractorRole).toHaveBeenCalledWith({ contractorId: 'c-1', role: 'TEAM_LEAD' });
  });

  it('surfaces the database guard rejection message when a non-admin role change is denied', async () => {
    const writeContractorRole = vi.fn().mockRejectedValue(
      new Error('Only authorized administrators can approve contractor eligibility'),
    );
    const service = createPayrollService({ writeContractorRole });

    await expect(
      service.updateContractorRole({ contractorId: 'c-1', role: 'TEAM_LEAD' }),
    ).rejects.toThrow('Only authorized administrators');
  });
});

describe('createPayrollService.submitVehicleClaim', () => {
  function buildFile(name = 'photo.jpg'): File {
    return new File(['data'], name, { type: 'image/jpeg' });
  }

  it('rejects when either photo is missing', async () => {
    const service = createPayrollService();

    await expect(
      service.submitVehicleClaim({
        timeEntryId: 'time-1',
        contractorId: 'c-1',
        vehicleType: 'PERSONAL',
        declaredHours: 5,
        notes: 'Used my truck.',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vehiclePhotoFile: null as any,
        licensePlatePhotoFile: buildFile(),
      }),
    ).rejects.toThrow('both required');
  });

  it('rejects when declared hours are zero or missing', async () => {
    const service = createPayrollService();

    await expect(
      service.submitVehicleClaim({
        timeEntryId: 'time-1',
        contractorId: 'c-1',
        vehicleType: 'PERSONAL',
        declaredHours: 0,
        notes: 'Used my truck.',
        vehiclePhotoFile: buildFile(),
        licensePlatePhotoFile: buildFile(),
      }),
    ).rejects.toThrow('Declared vehicle hours');
  });

  it('uploads both photos and inserts the claim when valid', async () => {
    const uploadVehicleClaimPhoto = vi.fn().mockResolvedValue('https://example.com/photo.jpg');
    const insertVehicleClaim = vi.fn().mockResolvedValue(buildVehicleClaim());

    const service = createPayrollService({ uploadVehicleClaimPhoto, insertVehicleClaim });

    await service.submitVehicleClaim({
      timeEntryId: 'time-1',
      contractorId: 'c-1',
      vehicleType: 'PERSONAL',
      declaredHours: 5,
      notes: 'Used my truck.',
      vehiclePhotoFile: buildFile('vehicle.jpg'),
      licensePlatePhotoFile: buildFile('plate.jpg'),
    });

    expect(uploadVehicleClaimPhoto).toHaveBeenCalledTimes(2);
    expect(insertVehicleClaim).toHaveBeenCalledTimes(1);
  });
});

describe('createPayrollService.reviewVehicleClaim', () => {
  it('requires a rejection reason when rejecting a claim', async () => {
    const updateVehicleClaimStatus = vi.fn();
    const service = createPayrollService({ updateVehicleClaimStatus });

    await expect(
      service.reviewVehicleClaim({ claimId: 'claim-1', reviewerId: 'admin-1', decision: 'REJECTED' }),
    ).rejects.toThrow('Rejection reason is required');

    expect(updateVehicleClaimStatus).not.toHaveBeenCalled();
  });

  it('approves without requiring a rejection reason', async () => {
    const updateVehicleClaimStatus = vi.fn().mockResolvedValue(buildVehicleClaim({ status: 'APPROVED' }));
    const service = createPayrollService({ updateVehicleClaimStatus });

    const result = await service.reviewVehicleClaim({
      claimId: 'claim-1',
      reviewerId: 'admin-1',
      decision: 'APPROVED',
    });

    expect(result.status).toBe('APPROVED');
    expect(updateVehicleClaimStatus).toHaveBeenCalledTimes(1);
  });
});

describe('createPayrollService.createPayrollCsvExport', () => {
  it('builds a CSV artifact with a timestamped filename', () => {
    const service = createPayrollService();
    const artifact = service.createPayrollCsvExport(
      {
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        generatedAt: '2026-01-15T00:00:00.000Z',
        rows: [],
        totals: {
          contractorCount: 0,
          entryCount: 0,
          totalMinutes: 0,
          billableMinutes: 0,
          taxablePayroll: 0,
          reimbursementTotal: 0,
          totalPayout: 0,
          utilityBillAmount: 0,
          marginAmount: 0,
          marginPercent: 0,
        },
      },
      new Date('2026-01-15T00:00:00.000Z'),
    );

    expect(artifact.mimeType).toBe('text/csv');
    expect(artifact.fileName).toMatch(/^payroll-.*\.csv$/);
    expect(artifact.content).toContain('Payroll Period: 2026-01-01 to 2026-01-14');
  });
});
