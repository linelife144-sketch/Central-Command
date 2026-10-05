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
import { payrollService } from '@/lib/services/payrollService';
import type { UtilityBillingRate, WorkType } from '@/types';

export interface UtilityBillingRateEditorProps {
  canEdit?: boolean;
  /** undefined/null = editing the global fallback rate card. */
  stormEventId?: string | null;
  title?: string;
}

const WORK_TYPES_ORDER: WorkType[] = [
  'STANDARD_ASSESSMENT',
  'EMERGENCY_RESPONSE',
  'TRAVEL',
  'STANDBY',
];

function toWorkTypeLabel(workType: WorkType): string {
  return workType
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Admin editor for utility bill rates — what Central Command charges the
 * utility per work type. When stormEventId is provided, edits a
 * storm-scoped rate card; a storm-scoped rate always wins over the global
 * fallback (resolveUtilityBillRate in payroll.ts), so this same component
 * edits either tier depending on the prop.
 */
export function UtilityBillingRateEditor({ canEdit = false, stormEventId, title }: UtilityBillingRateEditorProps) {
  const [inputs, setInputs] = useState<Map<WorkType, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [savingWorkType, setSavingWorkType] = useState<WorkType | null>(null);

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const rates: UtilityBillingRate[] = await payrollService.getUtilityBillingRates(stormEventId ?? undefined);
      const scopedRates = rates.filter((rate) =>
        stormEventId ? rate.stormEventId === stormEventId : rate.stormEventId === null,
      );

      const nextInputs = new Map<WorkType, string>();
      for (const rate of scopedRates) {
        nextInputs.set(rate.workType, rate.hourlyRate.toFixed(2));
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

  const handleSave = async (workType: WorkType) => {
    if (!canEdit) return;
    const rawValue = inputs.get(workType);
    const hourlyRate = Number(rawValue);

    if (!rawValue || Number.isNaN(hourlyRate) || hourlyRate < 0) {
      toast.error('Enter a valid hourly rate.');
      return;
    }

    setSavingWorkType(workType);
    try {
      await payrollService.updateUtilityBillingRate({
        stormEventId: stormEventId ?? null,
        workType,
        hourlyRate,
      });
      toast.success(`${toWorkTypeLabel(workType)} bill rate updated.`);
      await loadRates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update bill rate.');
    } finally {
      setSavingWorkType(null);
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
                <TableHead>Work Type</TableHead>
                <TableHead>Bill Rate ($/hr)</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {WORK_TYPES_ORDER.map((workType) => (
                <TableRow key={workType}>
                  <TableCell>{toWorkTypeLabel(workType)}</TableCell>
                  <TableCell>
                    <Input
                      readOnly={!canEdit}
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-28"
                      value={inputs.get(workType) ?? ''}
                      disabled={!canEdit || (savingWorkType === workType)}
                      placeholder="Not configured"
                      onChange={(event) =>
                        setInputs((previous) => new Map(previous).set(workType, event.target.value))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canEdit || (savingWorkType === workType)}
                      onClick={() => void handleSave(workType)}
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
