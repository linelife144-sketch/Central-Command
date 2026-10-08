'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// Per-row multiplier applied to the entered bill rate (effective rate =
// billRate × multiplier). The multiplier is display-only state and is never
// persisted — a reload shows the stored effective rate at 1x.
const MULTIPLIER_OPTIONS = ['1x', '1.5x', '2x'] as const;
type RateMultiplier = (typeof MULTIPLIER_OPTIONS)[number];

function multiplierFactor(multiplier: RateMultiplier): number {
  return Number(multiplier.slice(0, -1));
}

// Supabase throws plain PostgrestError objects ({ message, code, details, hint }),
// not Error instances — `instanceof Error` drops the real API message and code.
// Prefer an Error's message, then a PostgrestError-shaped message (+ code), then fallback.
function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; code?: unknown };
    if (typeof candidate.message === 'string' && candidate.message) {
      return typeof candidate.code === 'string' && candidate.code
        ? `${candidate.message} (${candidate.code})`
        : candidate.message;
    }
  }
  return fallback;
}

/**
 * Admin editor for utility bill rates — what Central Command charges the
 * utility per contractor role. When stormEventId is provided, edits a
 * storm-scoped rate card; a storm-scoped role rate always wins over the
 * global role fallback (resolveUtilityBillRate in payroll.ts). A role with
 * no stored rate stays empty — nothing is guessed or copied from a work type.
 *
 * Rows save automatically: the persisted hourlyRate is always the effective
 * rate (entered bill rate × multiplier), so stored rates match the math.
 */
export function UtilityBillingRateEditor({ canEdit = false, stormEventId, title }: UtilityBillingRateEditorProps) {
  const [inputs, setInputs] = useState<Map<ContractorRole, string>>(new Map());
  const [multipliers, setMultipliers] = useState<Map<ContractorRole, RateMultiplier>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<ContractorRole | null>(null);
  // Last persisted input/effective pair per role — skips no-op auto-saves
  // (e.g. blur right after a change-triggered save).
  const lastCommitted = useRef(new Map<ContractorRole, { input: string; hourlyRate: number }>());

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const rates: UtilityBillingRate[] = await payrollService.getUtilityBillingRates(stormEventId ?? undefined);
      const scopedRates = rates.filter((rate) =>
        stormEventId ? rate.stormEventId === stormEventId : rate.stormEventId === null,
      );

      const nextInputs = new Map<ContractorRole, string>();
      const nextCommitted = new Map<ContractorRole, { input: string; hourlyRate: number }>();
      for (const rate of scopedRates) {
        if (rate.role) {
          const input = rate.hourlyRate.toFixed(2);
          nextInputs.set(rate.role, input);
          nextCommitted.set(rate.role, { input, hourlyRate: rate.hourlyRate });
        }
      }
      setInputs(nextInputs);
      setMultipliers(new Map());
      lastCommitted.current = nextCommitted;
    } catch (error) {
      toast.error(describeError(error, 'Unable to load utility billing rates.'));
    } finally {
      setIsLoading(false);
    }
  }, [stormEventId]);

  useEffect(() => {
    void Promise.resolve().then(loadRates);
  }, [loadRates]);

  const persistRate = useCallback(
    async (role: ContractorRole, rawValue: string, multiplier: RateMultiplier) => {
      if (!canEdit) return;
      const billRate = Number(rawValue);

      if (!rawValue || Number.isNaN(billRate) || billRate < 0) {
        toast.error('Enter a valid hourly rate.');
        return;
      }

      const hourlyRate = Number((billRate * multiplierFactor(multiplier)).toFixed(2));
      const committed = lastCommitted.current.get(role);
      if (committed && committed.input === rawValue && committed.hourlyRate === hourlyRate) {
        return;
      }

      setSavingRole(role);
      try {
        await payrollService.updateUtilityBillingRate({
          stormEventId: stormEventId ?? null,
          role,
          hourlyRate,
        });
        lastCommitted.current.set(role, { input: rawValue, hourlyRate });
        toast.success(`${ROLE_LABELS[role]} bill rate updated.`);
      } catch (error) {
        toast.error(describeError(error, 'Unable to update bill rate.'));
      } finally {
        setSavingRole(null);
      }
    },
    [canEdit, stormEventId],
  );

  const handleRateChange = (role: ContractorRole, value: string) => {
    setInputs((previous) => new Map(previous).set(role, value));
    const billRate = Number(value);
    if (value && !Number.isNaN(billRate) && billRate >= 0) {
      void persistRate(role, value, multipliers.get(role) ?? '1x');
    }
  };

  const handleRateBlur = (role: ContractorRole) => {
    const value = inputs.get(role) ?? '';
    if ((lastCommitted.current.get(role)?.input ?? '') === value) return;
    void persistRate(role, value, multipliers.get(role) ?? '1x');
  };

  const handleMultiplierChange = (role: ContractorRole, multiplier: RateMultiplier) => {
    setMultipliers((previous) => new Map(previous).set(role, multiplier));
    void persistRate(role, inputs.get(role) ?? '', multiplier);
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
                <TableHead>Multiplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES_ORDER.map((role) => {
                const multiplier = multipliers.get(role) ?? '1x';
                const rawValue = inputs.get(role) ?? '';
                const billRate = Number(rawValue);
                const hasValidRate = Boolean(rawValue) && !Number.isNaN(billRate) && billRate >= 0;
                const effectiveRate = hasValidRate
                  ? Number((billRate * multiplierFactor(multiplier)).toFixed(2))
                  : null;
                return (
                  <TableRow key={role}>
                    <TableCell>{ROLE_LABELS[role]}</TableCell>
                    <TableCell>
                      <Input
                        readOnly={!canEdit}
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-28"
                        value={rawValue}
                        disabled={!canEdit || (savingRole === role)}
                        placeholder="Not configured"
                        onChange={(event) => handleRateChange(role, event.target.value)}
                        onBlur={() => handleRateBlur(role)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={multiplier}
                          onValueChange={(value) => handleMultiplierChange(role, value as RateMultiplier)}
                          disabled={!canEdit || (savingRole === role)}
                        >
                          <SelectTrigger aria-label={`${ROLE_LABELS[role]} rate multiplier`} className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MULTIPLIER_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm whitespace-nowrap">
                          {effectiveRate === null ? '—' : `$${effectiveRate.toFixed(2)}/hr`}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
