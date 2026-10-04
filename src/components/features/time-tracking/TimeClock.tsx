'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, TimerReset } from 'lucide-react';
import { toast } from 'sonner';

import { ActiveTimer } from '@/components/features/time-tracking/ActiveTimer';
import { WorkTypeSelector } from '@/components/features/time-tracking/WorkTypeSelector';
import { VehicleReimbursementCapture } from '@/components/features/payroll/VehicleReimbursementCapture';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_CONFIG, WORK_TYPES } from '@/lib/config/appConfig';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { useContractorId } from '@/hooks/useContractorId';
import { useActiveStormEventId } from '@/hooks/useActiveStormEventId';
import { payrollService, type ContractorRateProfile } from '@/lib/services/payrollService';
import { timeEntryService } from '@/lib/services/timeEntryService';
import { formatDateTime } from '@/lib/utils/formatters';
import type { TimeEntry, WorkType } from '@/types';

function isGpsReadyForClockAction(
  latitude: number | null,
  longitude: number | null,
  gpsValid: boolean,
): boolean {
  return latitude !== null && longitude !== null && gpsValid;
}

export function TimeClock({ onEntriesChanged }: { onEntriesChanged?: () => void } = {}) {
  const { profile } = useAuth();
  const {
    contractorId: resolvedContractorId,
    isLoading: isResolvingContractorId,
  } = useContractorId(profile?.id);
  const contractorId = resolvedContractorId ?? profile?.id;
  const { stormEventId } = useActiveStormEventId(contractorId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null);
  const [workType, setWorkType] = useState<WorkType>(WORK_TYPES.STANDARD_ASSESSMENT);
  const [breakMinutes, setBreakMinutes] = useState<number>(0);
  const [rateProfile, setRateProfile] = useState<ContractorRateProfile | null>(null);

  const gpsValidation = useGPSValidation({
    minAccuracyMeters: APP_CONFIG.MIN_GPS_ACCURACY_METERS,
  });

  // Hourly wage is resolved server-side (role default, overridden by any
  // effective-dated contractor_rates row) and displayed read-only here.
  // Contractors can no longer type their own rate — the clock-out trigger
  // (private.apply_time_entry_costing) would overwrite it anyway, so an
  // editable field here was misleading, not just insecure.
  useEffect(() => {
    if (!contractorId) {
      setRateProfile(null);
      return;
    }

    let active = true;
    void payrollService
      .getContractorRateProfile(contractorId)
      .then((profileResult) => {
        if (active) {
          setRateProfile(profileResult);
        }
      })
      .catch(() => {
        if (active) {
          setRateProfile(null);
        }
      });

    return () => {
      active = false;
    };
  }, [contractorId]);

  const workTypeRate = rateProfile?.workTypeRates[workType];
  const isDriver = rateProfile?.role === 'DRIVER';

  const loadActiveEntry = useCallback(async () => {
    if (!contractorId) {
      setActiveEntry(null);
      return;
    }

    const entry = await timeEntryService.getActiveEntry(contractorId);
    setActiveEntry(entry);

    if (entry) {
      setWorkType(entry.work_type);
      setBreakMinutes(entry.break_minutes ?? 0);
    }
  }, [contractorId]);

  useEffect(() => {
    void loadActiveEntry();
  }, [loadActiveEntry]);

  const canClockIn = useMemo(
    () => !activeEntry && !isResolvingContractorId && Boolean(contractorId) && typeof workTypeRate === 'number',
    [activeEntry, isResolvingContractorId, contractorId, workTypeRate],
  );
  const canClockOut = useMemo(() => Boolean(activeEntry), [activeEntry]);

  const handleClockIn = async () => {
    if (!contractorId) {
      toast.error('Unable to clock in without an authenticated profile.');
      return;
    }

    if (typeof workTypeRate !== 'number') {
      toast.error('No wage is configured for this role and work type yet. Contact an admin before clocking in.');
      return;
    }

    setIsSubmitting(true);
    try {
      const gpsSnapshot = await gpsValidation.refreshAndValidate();
      if (!gpsSnapshot.validation.gpsValid || !isGpsReadyForClockAction(
        gpsSnapshot.reading.latitude,
        gpsSnapshot.reading.longitude,
        gpsSnapshot.validation.gpsValid,
      )) {
        throw new Error(gpsSnapshot.validation.gpsError ?? 'Valid GPS is required to clock in.');
      }

      // workTypeRate is sent for backward-compatible schema shape only —
      // private.apply_time_entry_costing() always overwrites it server-side
      // from role_rate_defaults/contractor_rates, so a stale or manipulated
      // client value here can never affect payroll.
      const entry = await timeEntryService.clockIn({
        contractorId,
        workType,
        workTypeRate,
        breakMinutes,
        stormEventId,
        location: {
          latitude: gpsSnapshot.reading.latitude as number,
          longitude: gpsSnapshot.reading.longitude as number,
          accuracy: gpsSnapshot.reading.accuracy ?? undefined,
        },
      });

      setActiveEntry(entry);
      setLastEntry(null);
      toast.success(
        entry.sync_status === 'PENDING'
          ? 'Clocked in offline. Entry queued for sync.'
          : 'Clocked in successfully.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to clock in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) {
      return;
    }

    setIsSubmitting(true);
    try {
      const gpsSnapshot = await gpsValidation.refreshAndValidate();
      if (!gpsSnapshot.validation.gpsValid || !isGpsReadyForClockAction(
        gpsSnapshot.reading.latitude,
        gpsSnapshot.reading.longitude,
        gpsSnapshot.validation.gpsValid,
      )) {
        throw new Error(gpsSnapshot.validation.gpsError ?? 'Valid GPS is required to clock out.');
      }

      const entry = await timeEntryService.clockOut({
        entry: activeEntry,
        breakMinutes,
        location: {
          latitude: gpsSnapshot.reading.latitude as number,
          longitude: gpsSnapshot.reading.longitude as number,
          accuracy: gpsSnapshot.reading.accuracy ?? undefined,
        },
      });

      setActiveEntry(null);
      setLastEntry(entry);
      onEntriesChanged?.();
      toast.success(
        entry.sync_status === 'PENDING'
          ? 'Clocked out offline. Update queued for sync.'
          : 'Clocked out successfully.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to clock out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Clock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="work-type">Work Type</Label>
              <WorkTypeSelector
                value={workType}
                disabled={Boolean(activeEntry)}
                onValueChange={setWorkType}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-type-rate">Hourly Rate ($)</Label>
              <Input
                id="work-type-rate"
                type="text"
                readOnly
                disabled
                value={
                  typeof workTypeRate === 'number'
                    ? workTypeRate.toFixed(2)
                    : 'No rate configured — contact admin'
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="break-minutes">Break Minutes</Label>
              <Input
                id="break-minutes"
                type="number"
                min={0}
                max={120}
                step={5}
                value={breakMinutes}
                onChange={(event) => setBreakMinutes(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="rounded-md border border-dashed border-grid-blue/40 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-medium text-grid-navy">GPS Verification</p>
            <p>
              Latest status: {gpsValidation.status}.{' '}
              {gpsValidation.reading.accuracy !== null
                ? `Accuracy ${Math.round(gpsValidation.reading.accuracy)}m`
                : 'No current accuracy reading'}
              .
            </p>
            <p className="flex items-center gap-1 pt-1">
              <MapPin className="h-3.5 w-3.5" />
              GPS accuracy must be within {APP_CONFIG.MIN_GPS_ACCURACY_METERS}m.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!canClockIn || isSubmitting}
              onClick={handleClockIn}
            >
              {isSubmitting && !activeEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Clock In
            </Button>
            <Button
              disabled={!canClockOut || isSubmitting}
              variant="outline"
              onClick={handleClockOut}
            >
              {isSubmitting && activeEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Clock Out
            </Button>
            <Button
              disabled={isSubmitting}
              variant="ghost"
              onClick={() => {
                void gpsValidation.refreshAndValidate();
              }}
            >
              <TimerReset className="mr-2 h-4 w-4" />
              Refresh GPS
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeEntry && <ActiveTimer clockInAt={activeEntry.clock_in_at} />}

      {activeEntry ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Clock In:</span> {formatDateTime(activeEntry.clock_in_at)}
            </p>
            <p>
              <span className="font-medium">Work Type:</span> {activeEntry.work_type.replace(/_/g, ' ')}
            </p>
            <p>
              <span className="font-medium">Sync:</span> {activeEntry.sync_status}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!activeEntry && lastEntry ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last Completed Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Clock In:</span> {formatDateTime(lastEntry.clock_in_at)}
            </p>
            <p>
              <span className="font-medium">Clock Out:</span> {formatDateTime(lastEntry.clock_out_at ?? null)}
            </p>
            <p>
              <span className="font-medium">Duration:</span> {lastEntry.total_minutes ?? 0} minutes
            </p>
            <p>
              <span className="font-medium">Billable:</span> {lastEntry.billable_minutes ?? 0} minutes
            </p>
            {typeof lastEntry.payroll_amount === 'number' ? (
              <p>
                <span className="font-medium">Estimated Pay:</span> ${lastEntry.payroll_amount.toFixed(2)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!activeEntry && lastEntry && isDriver && contractorId ? (
        <VehicleReimbursementCapture entry={lastEntry} contractorId={contractorId} onSubmitted={() => { setLastEntry(null); onEntriesChanged?.(); }} />
      ) : null}
    </div>
  );
}
