'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

export function CurrencyInput({ value, onChange, ...props }: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & { value: number | undefined; onChange: (value: number | undefined) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const formatted = value === undefined ? '' : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <div className="relative"><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-grid-body">$</span><Input {...props} type="text" inputMode="decimal" className="pl-7" value={editing ?? formatted}
    onFocus={() => setEditing(value === undefined ? '' : String(value))}
    onBlur={() => setEditing(null)}
    onChange={event => { const raw = event.target.value.replace(/[$,]/g, ''); if (!/^\d{0,6}(?:\.\d{0,2})?$/.test(raw)) return; setEditing(raw); onChange(raw === '' || raw === '.' ? undefined : Number(raw)); }} /></div>;
}
