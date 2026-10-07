import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ submitVehicleClaim: vi.fn() }));
vi.mock('@/lib/services/payrollService', () => ({
  payrollService: { submitVehicleClaim: mocks.submitVehicleClaim },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { VehicleReimbursementCapture } from './VehicleReimbursementCapture';
import type { TimeEntry } from '@/types';

function buildEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'time-1',
    contractor_id: 'c-1',
    clock_in_at: '2026-02-12T08:00:00.000Z',
    clock_out_at: '2026-02-12T14:00:00.000Z',
    work_type: 'STANDARD_ASSESSMENT',
    work_type_rate: 65,
    break_minutes: 0,
    billable_minutes: 360,
    status: 'PENDING',
    sync_status: 'SYNCED',
    created_at: '2026-02-12T08:00:00.000Z',
    updated_at: '2026-02-12T14:00:00.000Z',
    ...overrides,
  };
}

function buildFile(name = 'photo.jpg'): File {
  return new File(['x'], name, { type: 'image/jpeg' });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VehicleReimbursementCapture', () => {
  it('keeps Submit disabled until vehicle type, hours, notes, and both photos are present', () => {
    render(<VehicleReimbursementCapture entry={buildEntry()} contractorId="c-1" />);

    const submitButton = screen.getByRole('button', { name: /submit vehicle reimbursement/i }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/hours vehicle was used/i), { target: { value: '5' } });
    expect(submitButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Drove to every site today.' } });
    expect(submitButton.disabled).toBe(true);

    const vehicleInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const plateInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;

    fireEvent.change(vehicleInput, { target: { files: [buildFile('vehicle.jpg')] } });
    expect(submitButton.disabled).toBe(true);

    fireEvent.change(plateInput, { target: { files: [buildFile('plate.jpg')] } });
    expect(submitButton.disabled).toBe(false);
  });

  it('shows recorded hours and the saved allowance without editable hours', () => {
    render(<VehicleReimbursementCapture entry={buildEntry({ calculation_version: 'AGREEMENT', vehicle_minutes: 120, vehicle_allowance_amount: 12 })} contractorId="c-1" />);
    expect((screen.getByLabelText(/hours vehicle was used/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/hours vehicle was used/i) as HTMLInputElement).value).toBe('2');
    expect(screen.getByText('$12.00')).not.toBeNull();
  });

  it('submits the claim with the entered values once valid', async () => {
    mocks.submitVehicleClaim.mockResolvedValue({ id: 'claim-1', status: 'PENDING' });

    render(<VehicleReimbursementCapture entry={buildEntry()} contractorId="c-1" />);

    fireEvent.change(screen.getByLabelText(/hours vehicle was used/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Drove to every site today.' } });

    const vehicleInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const plateInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(vehicleInput, { target: { files: [buildFile('vehicle.jpg')] } });
    fireEvent.change(plateInput, { target: { files: [buildFile('plate.jpg')] } });

    fireEvent.click(screen.getByRole('button', { name: /submit vehicle reimbursement/i }));

    await screen.findByText(/pending admin review/i);

    expect(mocks.submitVehicleClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        timeEntryId: 'time-1',
        contractorId: 'c-1',
        vehicleType: 'PERSONAL',
        declaredHours: 5,
        notes: 'Drove to every site today.',
      }),
    );
  });
});

describe('vehicle claim online/sync gate', () => {
  function fillEvidence() {
    fireEvent.change(screen.getByLabelText(/hours vehicle was used/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Drove to every site today.' } });
    const inputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[0], { target: { files: [buildFile('vehicle.jpg')] } });
    fireEvent.change(inputs[1], { target: { files: [buildFile('plate.jpg')] } });
  }
  it('cannot submit evidence for an unsynced closed shift', () => {
    render(<VehicleReimbursementCapture entry={buildEntry({ sync_status: 'PENDING' })} contractorId="c-1" />);
    fillEvidence();
    expect((screen.getByRole('button', { name: /submit vehicle reimbursement/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.submitVehicleClaim).not.toHaveBeenCalled();
  });
  it('cannot submit while disconnected and becomes available again on reconnect', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    try {
      render(<VehicleReimbursementCapture entry={buildEntry()} contractorId="c-1" />);
      fillEvidence();
      const submit = screen.getByRole('button', { name: /submit vehicle reimbursement/i }) as HTMLButtonElement;
      expect(submit.disabled).toBe(true);
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      fireEvent(window, new Event('online'));
      expect(submit.disabled).toBe(false);
    } finally { Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); }
  });
});
