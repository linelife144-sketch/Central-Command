'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, TimerReset } from 'lucide-react';
import { toast } from 'sonner';

import { ActiveTimer } from '@/components/features/time-tracking/ActiveTimer';
import { WorkTypeSelector } from '@/components/features/time-tracking/WorkTypeSelector';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_CONFIG, WORK_TYPES } from '@/lib/config/appConfig';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { useContractorId } from '@/hooks/useContractorId';
import { timeEntryService } from '@/lib/services/timeEntryService';
import { formatDateTime } from '@/lib/utils/formatters';
import type { TimeEntry, WorkType } from '@/types';

const WORK_TYPE_DEFAULT_RATES: Record<WorkType, number> = {
  [WORK_TYPES.STANDARD_ASSESSMENT]: 95,
  [WORK_TYPES.EMERGENCY_RESPONSE]: 135,
  [WORK_TYPES.TRAVEL]: 55,
  [WORK_TYPES.STANDBY]: 45,
  [WORK_TYPES.ADMIN]: 65,
  [WORK_TYPES.TRAINING]: 40,
};

function isGpsReadyForClockAction(
  latitude: number | null,
  longitude: number | null,
  gpsValid: boolean,
): boolean {
  return latitude !== null && longitude !== null && gpsValid;
}

export function TimeClock() {
  const { profile } = useAuth();
  const {
    contractorId: resolvedContractorId,
    isLoading: isResolvingContractorId,
  } = useContractorId(profile?.id);
  const contractorId = resolvedContractorId ?? profile?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null);
  const [workType, setWorkType] = useState<WorkType>(WORK_TYPES.STANDARD_ASSESSMENT);
  const [workTypeRate, setWorkTypeRate] = useState<number>(WORK_TYPE_DEFAULT_RATES[WORK_TYPES.STANDARD_ASSESSMENT]);
  const [breakMinutes, setBreakMinutes] = useState<number>(0);

  const gpsValidation = useGPSValidation({
    minAccuracyMeters: APP_CONFIG.MIN_GPS_ACCURACY_METERS,
  });

  const loadActiveEntry = useCallback(async () => {
    if (!contractorId) {
      setActiveEntry(null);
      return;
    }

    const entry = await timeEntryService.getActiveEntry(contractorId);
    setActiveEntry(entry);

    if (entry) {
      setWorkType(entry.work_type);
      setWorkTypeRate(entry.work_type_rate);
      setBreakMinutes(entry.break_minutes ?? 0);
    }
  }, [contractorId]);

  useEffect(() => {
    void loadActiveEntry();
  }, [loadActiveEntry]);

  const handleWorkTypeChange = (nextWorkType: WorkType) => {
    setWorkType(nextWorkType);
    setWorkTypeRate(WORK_TYPE_DEFAULT_RATES[nextWorkType]);
  };

  const canClockIn = useMemo(
    () => !activeEntry && !isResolvingContractorId && Boolean(contractorId),
    [activeEntry, isResolvingContractorId, contractorId],
  );
  const canClockOut = useMemo(() => Boolean(activeEntry), [activeEntry]);

  const handleClockIn = async () => {
    if (!contractorId) {
      toast.error('Unable to clock in without an authenticated profile.');
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

      const entry = await timeEntryService.clockIn({
        contractorId,
        workType,
        workTypeRate,
        breakMinutes,
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
                onValueChange={handleWorkTypeChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-type-rate">Hourly Rate ($)</Label>
              <Input
                id="work-type-rate"
                type="number"
                min={0}
                step={0.01}
                disabled={Boolean(activeEntry)}
                value={workTypeRate}
                onChange={(event) => setWorkTypeRate(Number(event.target.value))}
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
