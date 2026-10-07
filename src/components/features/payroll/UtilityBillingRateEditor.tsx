'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ROLE_LABELS } from '@/lib/config/appConfig';
import { payrollService } from '@/lib/services/payrollService';
import type { ContractorRole, UtilityBillingRate } from '@/types';

export interface UtilityBillingRateEditorProps {
  canEdit?: boolean;
  /** undefined/null = editing the global fallback rate card. */
  stormEventId?: string | null;
  title?: string;
}

// Same role order and labels as RoleRateEditor. Bill rates are keyed by
// contractor role; a role with no stored rate renders empty.
const ROLES_ORDER: ContractorRole[] = [
  'STORM_MANAGER',
  'TEAM_LEAD',
  'SR_DAMAGE_ASSESSER',
  'DAMAGE_ASSESSER',
  'DRIVER',
];

/**
 * Admin editor for utility bill rates — what Central Command charges the
 * utility per contractor role. When stormEventId is provided, edits a
 * storm-scoped rate card; a storm-scoped role rate always wins over the
 * global role fallback (resolveUtilityBillRate in payroll.ts). A role with
 * no stored rate stays empty — nothing is guessed or copied from a work type.
 */
export function UtilityBillingRateEditor({ canEdit = false, stormEventId, title }: UtilityBillingRateEditorProps) {
  const [inputs, setInputs] = useState<Map<ContractorRole, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<ContractorRole | null>(null);

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const rates: UtilityBillingRate[] = await payrollService.getUtilityBillingRates(stormEventId ?? undefined);
      const scopedRates = rates.filter((rate) =>
        stormEventId ? rate.stormEventId === stormEventId : rate.stormEventId === null,
      );

      const nextInputs = new Map<ContractorRole, string>();
      for (const rate of scopedRates) {
        if (rate.role) {
          nextInputs.set(rate.role, rate.hourlyRate.toFixed(2));
        }
      }
      setInputs(nextInputs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load utility billing rates.');
    } finally {
      setIsLoading(false);
    }
  }, [stormEventId]);

  useEffect(() => {
    void Promise.resolve().then(loadRates);
  }, [loadRates]);

  const handleSave = async (role: ContractorRole) => {
    if (!canEdit) return;
    const rawValue = inputs.get(role);
    const hourlyRate = Number(rawValue);

    if (!rawValue || Number.isNaN(hourlyRate) || hourlyRate < 0) {
      toast.error('Enter a valid hourly rate.');
      return;
    }

    setSavingRole(role);
    try {
      await payrollService.updateUtilityBillingRate({
        stormEventId: stormEventId ?? null,
        role,
        hourlyRate,
      });
      toast.success(`${ROLE_LABELS[role]} bill rate updated.`);
      await loadRates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update bill rate.');
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">{title ?? (stormEventId ? 'Storm Utility Bill Rates' : 'Global Utility Bill Rates')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading bill rates…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Bill Rate ($/hr)</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES_ORDER.map((role) => (
                <TableRow key={role}>
                  <TableCell>{ROLE_LABELS[role]}</TableCell>
                  <TableCell>
                    <Input
                      readOnly={!canEdit}
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-28"
                      value={inputs.get(role) ?? ''}
                      disabled={!canEdit || (savingRole === role)}
                      placeholder="Not configured"
                      onChange={(event) =>
                        setInputs((previous) => new Map(previous).set(role, event.target.value))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canEdit || (savingRole === role)}
                      onClick={() => void handleSave(role)}
                    >
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
