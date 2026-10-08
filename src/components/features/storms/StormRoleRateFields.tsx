'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTRACTOR_ROLES, type StormRoleRateDraft, type StormRoleRateDrafts } from '@/lib/compensation/stormRates';
import { ROLE_LABELS } from '@/lib/config/appConfig';
import type { ContractorRole } from '@/types';

interface StormRoleRateFieldsProps {
  rates: StormRoleRateDrafts;
  onChange: (role: ContractorRole, rates: StormRoleRateDraft) => void;
  disabled?: boolean;
}

export function StormRoleRateFields({ rates, onChange, disabled = false }: StormRoleRateFieldsProps) {
  return (
    <section className="space-y-4" aria-labelledby="storm-role-rates-title">
      <div>
        <h2 id="storm-role-rates-title" className="text-lg font-semibold">Storm compensation rates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rates belong to this storm. Each role has one hourly contractor wage for every work type and one utility bill rate.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th scope="col" className="p-3 font-medium">Contractor role</th>
              <th scope="col" className="p-3 font-medium">Contractor wage ($/hr)</th>
              <th scope="col" className="p-3 font-medium">Utility bill rate ($/hr)</th>
            </tr>
          </thead>
          <tbody>
            {CONTRACTOR_ROLES.map((role) => {
              const value = rates[role] ?? { payRate: '', billRate: '' };
              return (
                <tr key={role} className="border-b last:border-b-0">
                  <th scope="row" className="p-3 text-left font-medium">{ROLE_LABELS[role]}</th>
                  <td className="p-3">
                    <Label className="sr-only" htmlFor={`storm-pay-rate-${role}`}>{`${role} contractor pay rate`}</Label>
                    <Input
                      id={`storm-pay-rate-${role}`}
                      aria-label={`${role} contractor pay rate`}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      required
                      disabled={disabled}
                      value={value.payRate}
                      onChange={(event) => onChange(role, { ...value, payRate: event.target.value })}
                    />
                  </td>
                  <td className="p-3">
                    <Label className="sr-only" htmlFor={`storm-bill-rate-${role}`}>{`${role} utility bill rate`}</Label>
                    <Input
                      id={`storm-bill-rate-${role}`}
                      aria-label={`${role} utility bill rate`}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      required
                      disabled={disabled}
                      value={value.billRate}
                      onChange={(event) => onChange(role, { ...value, billRate: event.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
