import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const remote = vi.hoisted(() => ({ fetch: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
const router = { replace: remote.replace, refresh: remote.refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
import { ContractorOnboardingForm } from './ContractorOnboardingForm';

const details = { id: '33333333-3333-4333-8333-333333333333', first_name: 'QA', last_name: 'Added', address_line1: '123 Main Street', address_line2: 'Unit 4', city: 'Shreveport', state: 'LA', zip_code: '71101', onboarding_completed_at: null };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('fetch', remote.fetch); });

async function load(driverRequired = false) {
  remote.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ contractor: details, driverRequired }) });
  render(<ContractorOnboardingForm />); await screen.findByLabelText('First name');
}

describe('minimal onboarding', () => {
  it('prefills names and address, allows edits, and submits onboarding without photo', async () => {
    await load(false); expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('QA');
    expect(screen.queryByLabelText('Registration tag photo')).toBeNull();
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Updated' } });
    remote.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ next: '/contractor/time' }) });
    fireEvent.submit(screen.getByRole('button', { name: 'Finish setup' }).closest('form')!);
    await waitFor(() => expect(remote.replace).toHaveBeenCalledWith('/contractor/time'));
    const posted = JSON.parse(remote.fetch.mock.calls[1][1].body);
    expect(posted).toMatchObject({ first_name: 'Updated', address_line1: details.address_line1 });
    expect(screen.queryByLabelText('Registration tag photo')).toBeNull();
  });

  it('does not render vehicle registration tag section even if driverRequired is returned', async () => {
    await load(true);
    expect(screen.queryByLabelText('Registration tag photo')).toBeNull();
    expect(screen.queryByText('Vehicle registration tag')).toBeNull();
  });

  it('renders state dropdown with abbreviations', async () => {
    await load(false);
    const stateTrigger = screen.getByLabelText('State');
    expect(stateTrigger).toBeDefined();
    expect(stateTrigger.textContent).toContain('LA');
  });
});
