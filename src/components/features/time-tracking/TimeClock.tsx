'use client';
import { PhotoCapture } from '@/components/common/forms/PhotoCapture';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APP_CONFIG, WORK_TYPES } from '@/lib/config/appConfig';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { useContractorId } from '@/hooks/useContractorId';
import { ticketService } from '@/lib/services/ticketService';
import { payrollService, type ContractorRateProfile } from '@/lib/services/payrollService';
import { timeEntryService, getLastCompletedEntry } from '@/lib/services/timeEntryService';
import { formatDateTime, formatDuration } from '@/lib/utils/formatters';
import type { Ticket, TimeEntry, WorkType } from '@/types';

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
  const contractorId = resolvedContractorId ?? undefined;
  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([]);
  const [ticketId, setTicketId] = useState('');
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const selectedTicket = assignedTickets.find(ticket => ticket.id === ticketId);
  const stormEventId = selectedTicket?.storm_event_id ?? undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null);
  const [workType, setWorkType] = useState<WorkType>(WORK_TYPES.STANDARD_ASSESSMENT);
  const [clockPhoto, setClockPhoto] = useState<File | null>(null);
  const [breakMinutes, setBreakMinutes] = useState<number>(0);
  const [rateProfile, setRateProfile] = useState<ContractorRateProfile | null>(null);

  useEffect(() => {
    if (!contractorId) return;
    let mounted = true;
    // Loading begins in the asynchronous request to keep effects passive.
    void ticketService.getTicketsByAssignee(contractorId).then(tickets => {
      if (!mounted) return;
      const available = tickets.filter(ticket => ticket.storm_event_id && !['CLOSED', 'ARCHIVED', 'EXPIRED', 'REJECTED'].includes(ticket.status));
      setAssignedTickets(available);
      setTicketId(current => available.some(ticket => ticket.id === current) ? current : available[0]?.id ?? '');
    }).catch(() => { if (mounted) setAssignedTickets([]); })
      .finally(() => { if (mounted) setTicketsLoading(false); });
    return () => { mounted = false; };
  }, [contractorId]);

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
      return;
    }

    let active = true;
    const refreshRates = () => payrollService
      .getContractorRateProfile(contractorId)
      .then((profileResult) => {
        if (active) {
          setRateProfile(profileResult);
        }
      })
      .catch(() => {
        if (active) {
          setRateProfile(current => current);
        }
      });

    void refreshRates();
    const timer = window.setInterval(() => { void refreshRates(); }, 30000);
    window.addEventListener('online', refreshRates);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('online', refreshRates);
    };
  }, [contractorId]);

  const workTypeRate = activeEntry?.pay_rate_applied ?? rateProfile?.workTypeRates[workType];
  const isDriver = rateProfile?.driverEligible === true;
  const canUseVehicle = isDriver && rateProfile?.vehicleAllowanceEnabled === true;
  const onBreak = activeEntry?.activity_intervals?.some(interval => interval.kind === 'BREAK' && !interval.end_at) ?? false;
  const usingVehicle = activeEntry?.activity_intervals?.some(interval => interval.kind === 'VEHICLE_USE' && !interval.end_at) ?? false;

  const loadActiveEntry = useCallback(async () => {
    if (!contractorId) {
      setActiveEntry(null);
      return;
    }

    const entry = await timeEntryService.getActiveEntry(contractorId);
    setActiveEntry(entry);
    if (!entry) setLastEntry(await getLastCompletedEntry(contractorId));

    if (entry) {
      setTicketId(entry.ticket_id ?? '');
      setWorkType(entry.work_type);
      setBreakMinutes(entry.break_minutes ?? 0);
    }
  }, [contractorId]);

  useEffect(() => {
    void Promise.resolve().then(loadActiveEntry).catch(() => undefined);
  }, [loadActiveEntry]);

  useEffect(() => {
    const handleSync = () => { void loadActiveEntry().catch(() => undefined); onEntriesChanged?.(); };
    window.addEventListener('time-entries-synced', handleSync);
    return () => window.removeEventListener('time-entries-synced', handleSync);
  }, [loadActiveEntry, onEntriesChanged]);

  const canClockIn = useMemo(
    () => !activeEntry && !ticketsLoading && !isResolvingContractorId && Boolean(contractorId) && Boolean(stormEventId) && typeof workTypeRate === 'number',
    [activeEntry, ticketsLoading, isResolvingContractorId, contractorId, stormEventId, workTypeRate],
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
        breakMinutes: 0,
        photoFile: clockPhoto ?? undefined,
        ticketId,
        stormEventId,
        location: {
          latitude: gpsSnapshot.reading.latitude as number,
          longitude: gpsSnapshot.reading.longitude as number,
          accuracy: gpsSnapshot.reading.accuracy ?? undefined,
        },
      });

      setActiveEntry(entry);
      setClockPhoto(null);
      setLastEntry(null);
      onEntriesChanged?.();
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
        photoFile: clockPhoto ?? undefined,
        location: {
          latitude: gpsSnapshot.reading.latitude as number,
          longitude: gpsSnapshot.reading.longitude as number,
          accuracy: gpsSnapshot.reading.accuracy ?? undefined,
        },
      });

      setActiveEntry(null);
      setLastEntry(entry);
      setClockPhoto(null);
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

  const recordActivity = async (kind: 'BREAK' | 'VEHICLE_USE', action: 'START' | 'STOP') => {
    if (!activeEntry) return;
    setIsSubmitting(true);
    try { setActiveEntry(await timeEntryService.recordActivity(activeEntry, kind, action)); }
    catch (failure) { toast.error(failure instanceof Error ? failure.message : 'Unable to record activity.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Clock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="clock-ticket">Assigned Ticket</Label>
              <Select value={ticketId} disabled={Boolean(activeEntry) || ticketsLoading} onValueChange={setTicketId}>
                <SelectTrigger id="clock-ticket"><SelectValue placeholder={ticketsLoading ? 'Loading assigned tickets…' : 'No assigned tickets — contact admin'} /></SelectTrigger>
                <SelectContent>{assignedTickets.map(ticket => <SelectItem key={ticket.id} value={ticket.id}>{ticket.ticket_number} — {ticket.address}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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

          </div>
          <PhotoCapture label={activeEntry ? 'Clock-out photo' : 'Clock-in photo'} value={clockPhoto} onChange={setClockPhoto} disabled={isSubmitting} helpMessage="A photo and valid GPS are required for this clock action." />
          {rateProfile?.payPolicy && <p className="text-xs text-grid-body">{rateProfile.payPolicy.mode === 'FLAT' ? `${rateProfile.payPolicy.multiplier}× for all paid hours` : rateProfile.payPolicy.tiers.map(tier => `${tier.after_hours}+ weekly hours: ${tier.multiplier}×`).join(' · ')}. Pay changes are applied at their effective time.</p>}
          {activeEntry?.calculation_version === 'LEGACY' && <p className="text-xs text-grid-warning-ink">This existing shift uses its original payroll rules. New shifts use timed activities.</p>}

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
              disabled={!canClockIn || isSubmitting || !clockPhoto}
              onClick={handleClockIn}
            >
              {isSubmitting && !activeEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Clock In
            </Button>
            <Button
              disabled={!canClockOut || isSubmitting || !clockPhoto}
              variant="outline"
              onClick={handleClockOut}
            >
              {isSubmitting && activeEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Clock Out
            </Button>
            {activeEntry?.calculation_version === 'AGREEMENT' && <>
              <Button variant="outline" disabled={isSubmitting} onClick={() => void recordActivity('BREAK', onBreak ? 'STOP' : 'START')}>{onBreak ? 'End break' : 'Start break'}</Button>
              {(canUseVehicle || usingVehicle) && <Button variant="outline" disabled={isSubmitting || onBreak} onClick={() => void recordActivity('VEHICLE_USE', usingVehicle ? 'STOP' : 'START')}>{usingVehicle ? 'Stop vehicle use' : 'Start vehicle use'}</Button>}
              <span role="status" className="self-center text-sm font-medium text-grid-navy">{onBreak ? 'On unpaid break' : usingVehicle ? 'Working · vehicle in use' : 'Working'}</span>
            </>}
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
            {lastEntry.pay_segments?.map((segment, index) => <p key={index}>{(segment.paid_minutes / 60).toFixed(2)} h × ${segment.base_rate} × {segment.multiplier} = ${segment.wage_amount.toFixed(2)}</p>)}
            <p>
              <span className="font-medium">Clock In:</span> {formatDateTime(lastEntry.clock_in_at)}
            </p>
            <p>
              <span className="font-medium">Clock Out:</span> {formatDateTime(lastEntry.clock_out_at ?? null)}
            </p>
            <p>
              <span className="font-medium">Duration:</span> {formatDuration(lastEntry.total_minutes ?? 0)}
            </p>
            <p>
              <span className="font-medium">Billable:</span> {formatDuration(lastEntry.billable_minutes ?? 0)}
            </p>
            {lastEntry.sync_status === 'SYNCED' && typeof lastEntry.payroll_amount === 'number' ? (
              <p>
                <span className="font-medium">Estimated Pay:</span> ${lastEntry.payroll_amount.toFixed(2)}
              </p>
            ) : null}
            {lastEntry.sync_status === 'SYNCED' && lastEntry.regular_minutes !== undefined ? <p>Regular: {(lastEntry.regular_minutes / 60).toFixed(2)} h · ${lastEntry.regular_pay_amount?.toFixed(2)}</p> : null}
            {lastEntry.sync_status === 'SYNCED' && lastEntry.overtime_minutes !== undefined ? <p>Overtime: {(lastEntry.overtime_minutes / 60).toFixed(2)} h · ${lastEntry.overtime_pay_amount?.toFixed(2)}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {!activeEntry && lastEntry && (lastEntry.calculation_version === 'LEGACY' ? lastEntry.contractor_role === 'DRIVER' : (lastEntry.vehicle_minutes ?? 0) > 0) && contractorId ? (
        <VehicleReimbursementCapture key={`${lastEntry.id}:${lastEntry.sync_status}`} entry={lastEntry} contractorId={contractorId} onSubmitted={() => { setLastEntry(null); onEntriesChanged?.(); }} />
      ) : null}
    </div>
  );
}
