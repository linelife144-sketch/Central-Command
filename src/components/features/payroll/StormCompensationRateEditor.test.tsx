import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ getRates: vi.fn(), saveRates: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('@/lib/services/stormCompensationService', () => ({ stormCompensationService: { getRates: mocks.getRates, saveRates: mocks.saveRates } }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));

import { StormCompensationRateEditor } from './StormCompensationRateEditor';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('StormCompensationRateEditor', () => {
  it('loads and saves a complete storm rate card in one operation', async () => {
    mocks.getRates.mockResolvedValue({
      STORM_MANAGER: { payRate: '50.00', billRate: '100.00' },
      TEAM_LEAD: { payRate: '40.00', billRate: '90.00' },
      SR_DAMAGE_ASSESSER: { payRate: '35.00', billRate: '80.00' },
      DAMAGE_ASSESSER: { payRate: '30.00', billRate: '70.00' },
      DRIVER: { payRate: '25.00', billRate: '60.00' },
    });
    mocks.saveRates.mockResolvedValue(undefined);

    render(<StormCompensationRateEditor stormEventId="storm-1" canEdit />);
    await waitFor(() => expect(screen.getByLabelText('DRIVER contractor pay rate')).toHaveProperty('value', '25.00'));
    fireEvent.click(screen.getByRole('button', { name: /save storm rates/i }));

    await waitFor(() => expect(mocks.saveRates).toHaveBeenCalledTimes(1));
    expect(mocks.saveRates).toHaveBeenCalledWith('storm-1', expect.objectContaining({ DRIVER: { payRate: 25, billRate: 60 } }));
  });

  it('shows the final state without permitting closed-storm edits', async () => {
    mocks.getRates.mockResolvedValue({});
    render(<StormCompensationRateEditor stormEventId="closed-storm" canEdit isClosed />);
    await waitFor(() => expect(screen.getByText(/closed storms retain their final rates/i)).not.toBeNull());
    expect(screen.getByRole('button', { name: /save storm rates/i })).toHaveProperty('disabled', true);
  });
});
