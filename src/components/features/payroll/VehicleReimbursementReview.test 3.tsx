import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ listVehicleClaims: vi.fn(), reviewVehicleClaim: vi.fn() }));
vi.mock('@/lib/services/payrollService', () => ({
  payrollService: { listVehicleClaims: mocks.listVehicleClaims, reviewVehicleClaim: mocks.reviewVehicleClaim },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image, not a real <img> usage
    <img alt={alt} src={src} />
  ),
}));

import { VehicleReimbursementReview } from './VehicleReimbursementReview';

function buildClaim(overrides: Record<string, unknown> = {}) {
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VehicleReimbursementReview', () => {
  it('shows an empty state when there are no pending claims', async () => {
    mocks.listVehicleClaims.mockResolvedValue([]);

    render(<VehicleReimbursementReview canEdit reviewerId="admin-1" />);

    await waitFor(() => expect(screen.getByText(/no pending vehicle reimbursement/i)).not.toBeNull());
  });

  it('shows a Capped badge when the claim was clipped server-side', async () => {
    mocks.listVehicleClaims.mockResolvedValue([buildClaim({ capped: true })]);

    render(<VehicleReimbursementReview canEdit reviewerId="admin-1" />);

    await waitFor(() => expect(screen.getByText('Capped')).not.toBeNull());
  });

  it('does not show a Capped badge for an uncapped claim', async () => {
    mocks.listVehicleClaims.mockResolvedValue([buildClaim({ capped: false })]);

    render(<VehicleReimbursementReview canEdit reviewerId="admin-1" />);

    await waitFor(() => expect(screen.getByText(/declared hours/i)).not.toBeNull());
    expect(screen.queryByText('Capped')).toBeNull();
  });

  it('approves a claim and removes it from the list', async () => {
    mocks.listVehicleClaims.mockResolvedValue([buildClaim()]);
    mocks.reviewVehicleClaim.mockResolvedValue(buildClaim({ status: 'APPROVED' }));

    render(<VehicleReimbursementReview canEdit reviewerId="admin-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /approve/i })).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() =>
      expect(mocks.reviewVehicleClaim).toHaveBeenCalledWith({
        claimId: 'claim-1',
        reviewerId: 'admin-1',
        decision: 'APPROVED',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: /approve/i })).toBeNull());
  });

  it('requires a rejection reason before rejecting', async () => {
    mocks.listVehicleClaims.mockResolvedValue([buildClaim()]);

    render(<VehicleReimbursementReview canEdit reviewerId="admin-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /reject/i })).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    expect(mocks.reviewVehicleClaim).not.toHaveBeenCalled();
  });

  it('rejects a claim with a reason and removes it from the list', async () => {
    mocks.listVehicleClaims.mockResolvedValue([buildClaim()]);
    mocks.reviewVehicleClaim.mockResolvedValue(buildClaim({ status: 'REJECTED' }));

    render(<VehicleReimbursementReview canEdit reviewerId="admin-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /reject/i })).not.toBeNull());

    fireEvent.change(screen.getByPlaceholderText(/rejection reason/i), {
      target: { value: 'Insufficient documentation.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() =>
      expect(mocks.reviewVehicleClaim).toHaveBeenCalledWith({
        claimId: 'claim-1',
        reviewerId: 'admin-1',
        decision: 'REJECTED',
        rejectionReason: 'Insufficient documentation.',
      }),
    );
  });
});
