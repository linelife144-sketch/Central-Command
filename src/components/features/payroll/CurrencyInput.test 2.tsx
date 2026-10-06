import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { CurrencyInput } from './CurrencyInput';
afterEach(cleanup);
function Field() { const [value, setValue] = useState<number | undefined>(85); return <CurrencyInput aria-label="Wage" value={value} onChange={setValue} />; }
it('formats dollars to two decimals and supports normal edits, deletion and pasted currency', () => {
  render(<Field />); const input = screen.getByLabelText('Wage') as HTMLInputElement;
  expect(input.value).toBe('85.00'); fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '$1,234.5' } }); fireEvent.blur(input); expect(input.value).toBe('1,234.50');
  fireEvent.focus(input); fireEvent.change(input, { target: { value: '12.345' } }); expect(input.value).toBe('1234.5');
  fireEvent.change(input, { target: { value: '' } }); fireEvent.blur(input); expect(input.value).toBe('');
});
