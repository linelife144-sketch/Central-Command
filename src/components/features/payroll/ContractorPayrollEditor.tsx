'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_LABELS } from '@/lib/config/appConfig';
import { payrollService, type ContractorRateProfile } from '@/lib/services/payrollService';
import type { ContractorRole, WorkType } from '@/types';

export interface ContractorPayrollEditorProps {
  canEdit?: boolean;
  canChangeRole?: boolean;
  contractorId: string;
  currentRole: ContractorRole;
  onRoleChanged?: (role: ContractorRole) => void;
}

const WORK_TYPES_ORDER: WorkType[] = [
  'STANDARD_ASSESSMENT',
  'EMERGENCY_RESPONSE',
  'TRAVEL',
  'STANDBY',
  'ADMIN',
  'TRAINING',
];

function toWorkTypeLabel(workType: WorkType): string {
  return workType
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Per-contractor payroll controls on the admin contractor detail page:
 * role selector (drives the role-default wage) and per-work-type rate
 * overrides. Role changes are guarded server-side by
 * private.guard_contractor_eligibility() — a rejected update surfaces the
 * database's own error message rather than a generic failure.
 */
export function ContractorPayrollEditor({ contractorId, currentRole, onRoleChanged, canEdit = false, canChangeRole = false }: ContractorPayrollEditorProps) {
  const [role, setRole] = useState<ContractorRole>(currentRole);
  const [profile, setProfile] = useState<ContractorRateProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [rateInputs, setRateInputs] = useState<Partial<Record<WorkType, string>>>({});
  const [savingWorkType, setSavingWorkType] = useState<WorkType | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const result = await payrollService.getContractorRateProfile(contractorId);
      setProfile(result);
      setRole(result.role);
      setRateInputs(
        Object.fromEntries(
          WORK_TYPES_ORDER.map((workType) => [workType, result.workTypeRates[workType]?.toString() ?? '']),
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load payroll profile.');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [contractorId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleRoleChange = async (nextRole: ContractorRole) => {
    if (!canEdit || !canChangeRole) return;
    setIsSavingRole(true);
    try {
      await payrollService.updateContractorRole({ contractorId, role: nextRole });
      setRole(nextRole);
      onRoleChanged?.(nextRole);
      toast.success('Role updated.');
      await loadProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update role.');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleSaveRate = async (workType: WorkType) => {
    if (!canEdit) return;
    const rawValue = rateInputs[workType];
    const hourlyRate = Number(rawValue);

    if (!rawValue || Number.isNaN(hourlyRate) || hourlyRate < 0) {
      toast.error('Enter a valid hourly rate.');
      return;
    }

    setSavingWorkType(workType);
    try {
      await payrollService.updateContractorWorkTypeRate({ contractorId, workType, hourlyRate });
      toast.success(`${toWorkTypeLabel(workType)} rate updated.`);
      await loadProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update rate.');
    } finally {
      setSavingWorkType(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payroll &amp; Role</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contractor-role">Role</Label>
          <Select
            value={role}
            onValueChange={(value) => void handleRoleChange(value as ContractorRole)}
            disabled={!canEdit || !canChangeRole || isSavingRole}
          >
            <SelectTrigger id="contractor-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Hourly Rate Overrides</Label>
          {isLoadingProfile ? (
            <p className="text-xs text-muted-foreground">Loading rates…</p>
          ) : (
            <div className="space-y-2">
              {WORK_TYPES_ORDER.map((workType) => {
                const isMissing = profile?.missingWorkTypes.includes(workType);
                return (
                  <div key={workType} className="flex items-center gap-2">
                    <span className="w-40 text-xs text-muted-foreground">{toWorkTypeLabel(workType)}</span>
                    <Input
                      readOnly={!canEdit}
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-28"
                      value={rateInputs[workType] ?? ''}
                      disabled={!canEdit || (savingWorkType === workType)}
                      onChange={(event) =>
                        setRateInputs((previous) => ({ ...previous, [workType]: event.target.value }))
                      }
                      placeholder={isMissing ? 'Not configured' : undefined}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canEdit || (savingWorkType === workType)}
                      onClick={() => void handleSaveRate(workType)}
                    >
                      Save
                    </Button>
                    {isMissing ? <span className="text-xs text-grid-warning-ink">No rate configured</span> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
