import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StormRoleRateFields } from './StormRoleRateFields';
import { CONTRACTOR_ROLES } from '@/lib/compensation/stormRates';

describe('StormRoleRateFields', () => {
  it('shows one pay and bill rate input for each storm role', () => {
    const onChange = vi.fn();
    render(<StormRoleRateFields rates={{}} onChange={onChange} />);

    expect(screen.getByText(/rates belong to this storm/i)).not.toBeNull();
    for (const role of CONTRACTOR_ROLES) {
      expect(screen.getByLabelText(`${role} contractor pay rate`)).not.toBeNull();
      expect(screen.getByLabelText(`${role} utility bill rate`)).not.toBeNull();
    }
  });

  it('emits the edited role and keeps both rates separate', () => {
    const onChange = vi.fn();
    render(<StormRoleRateFields rates={{}} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('DRIVER contractor pay rate'), { target: { value: '28.75' } });

    expect(onChange).toHaveBeenCalledWith('DRIVER', { payRate: '28.75', billRate: '' });
  });
});
