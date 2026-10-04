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
import type { ContractorRole, RoleRateDefault, WorkType } from '@/types';

const ROLES_ORDER: ContractorRole[] = [
  'STORM_MANAGER',
  'TEAM_LEAD',
  'SR_DAMAGE_ASSESSER',
  'DAMAGE_ASSESSER',
  'DRIVER',
];

const WORK_TYPES_ORDER: WorkType[] = [
  'STANDARD_ASSESSMENT',
  'EMERGENCY_RESPONSE',
  'TRAVEL',
  'STANDBY',
  'TRAINING',
];

// Display overrides for work types whose column header differs from the
// auto-derived label. STANDARD_ASSESSMENT is shown as "Rate" and TRAVEL as
// "DE-MOB" in the payroll grid.
const WORK_TYPE_LABEL_OVERRIDES: Partial<Record<WorkType, string>> = {
  STANDARD_ASSESSMENT: 'Rate',
  TRAVEL: 'DE-MOB',
};

function toWorkTypeLabel(workType: WorkType): string {
  const override = WORK_TYPE_LABEL_OVERRIDES[workType];
  if (override) return override;
  return workType
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function cellKey(role: ContractorRole, workType: WorkType): string {
  return `${role}:${workType}`;
}

/**
 * Admin editor for the role → work-type default wage grid
 * (role_rate_defaults). This is the fallback every contractor's pay
 * resolves to unless they have an individual contractor_rates override
 * (managed per-contractor in ContractorPayrollEditor).
 */
export function RoleRateEditor({ canEdit = false }: { canEdit?: boolean } = {}) {
  const [inputs, setInputs] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const defaults: RoleRateDefault[] = await payrollService.getRoleRateDefaults();
      const nextInputs = new Map<string, string>();
      for (const entry of defaults) {
        const key = cellKey(entry.role, entry.workType);
        nextInputs.set(key, entry.hourlyRate.toFixed(2));
      }
      setInputs(nextInputs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load role rate defaults.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const handleSave = async (role: ContractorRole, workType: WorkType) => {
    const key = cellKey(role, workType);
    if (!canEdit) return;
    const rawValue = inputs.get(key);
    const hourlyRate = Number(rawValue);

    if (!rawValue || Number.isNaN(hourlyRate) || hourlyRate < 0) {
      toast.error('Enter a valid hourly rate.');
      return;
    }

    setSavingCell(key);
    try {
      await payrollService.updateRoleRateDefault({ role, workType, hourlyRate });
      toast.success(`${ROLE_LABELS[role]} / ${toWorkTypeLabel(workType)} rate updated.`);
      await loadRates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update rate.');
    } finally {
      setSavingCell(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="min-w-0">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading role rates…</CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Role Wage Defaults</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              {WORK_TYPES_ORDER.map((workType) => (
                <TableHead key={workType}>{toWorkTypeLabel(workType)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES_ORDER.map((role) => (
              <TableRow key={role}>
                <TableCell className="font-medium">{ROLE_LABELS[role]}</TableCell>
                {WORK_TYPES_ORDER.map((workType) => {
                  const key = cellKey(role, workType);
                  return (
                    <TableCell key={key}>
                      <div className="flex items-center gap-1">
                        <Input
                      readOnly={!canEdit}
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-20"
                          value={inputs.get(key) ?? ''}
                          disabled={!canEdit || (savingCell === key)}
                          onChange={(event) =>
                            setInputs((previous) => new Map(previous).set(key, event.target.value))
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!canEdit || (savingCell === key)}
                          onClick={() => void handleSave(role, workType)}
                        >
                          Save
                        </Button>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
