import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { testCompensation, testPayrollConfiguration } from '@/lib/compensation/testFixtures';
const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), config: vi.fn() }));
vi.mock('@/lib/compensation/service', () => ({ getPayAgreements: mocks.get, savePayAgreement: mocks.save, getPayrollConfiguration: mocks.config }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { ContractorPayrollEditor } from './ContractorPayrollEditor';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function setup() { mocks.config.mockResolvedValue(testPayrollConfiguration); mocks.get.mockResolvedValue([{ id: 'agreement', contractor_id: 'c-1', effective_from: '2026-01-01T00:00:00Z', terms: testCompensation }]); mocks.save.mockResolvedValue({}); }
describe('contractor pay agreement editor', () => {
  it('shows immutable history and disables editing for Admin', async () => { setup(); render(<ContractorPayrollEditor contractorId="c-1" currentRole="DRIVER" />); await screen.findByText(/Agreement history \(1\)/); expect(screen.getByLabelText('Base hourly wage ($)').matches(':disabled')).toBe(true); expect(screen.queryByRole('button', { name: 'Save new agreement' })).toBeNull(); });
  it('saves a new effective version instead of overwriting an old wage', async () => { setup(); render(<ContractorPayrollEditor contractorId="c-1" currentRole="DRIVER" canEdit />); await screen.findByText(/Agreement history \(1\)/); await waitFor(() => expect(screen.getByLabelText('Base hourly wage ($)').matches(':disabled')).toBe(false)); fireEvent.change(screen.getByLabelText('Base hourly wage ($)'), { target: { value: '75' } }); fireEvent.change(screen.getByLabelText('Effective time'), { target: { value: '2027-01-04T14:00' } }); fireEvent.click(screen.getByRole('button', { name: 'Save new agreement' })); await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('c-1', expect.objectContaining({ effective_from: new Date('2027-01-04T14:00').toISOString(), terms: expect.objectContaining({ base_hourly_rate: 75, policy: testCompensation.policy }) }))); });
});
