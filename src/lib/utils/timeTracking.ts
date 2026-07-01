import { APP_CONFIG } from '../config/appConfig';

export interface DurationState {
  elapsedMinutes: number;
  warningThresholdMinutes: number;
  maxDurationMinutes: number;
  isWarning: boolean;
  isExceeded: boolean;
}

export interface TimeEntrySummaryItem {
  clock_in_at: string;
  clock_out_at?: string;
  total_minutes?: number;
  break_minutes?: number;
  billable_minutes?: number;
  billable_amount?: number;
  work_type_rate: number;
  status: string;
}

export interface TimeEntrySummary {
  entryCount: number;
  totalMinutes: number;
  billableMinutes: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export function calculateElapsedMinutes(clockInAt: string | Date, now: Date = new Date()): number {
  const start = clockInAt instanceof Date ? clockInAt : new Date(clockInAt);
  const elapsedMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(elapsedMs / 60000));
}

export function calculateElapsedSeconds(clockInAt: string | Date, now: Date = new Date()): number {
  const start = clockInAt instanceof Date ? clockInAt : new Date(clockInAt);
  const elapsedMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(elapsedMs / 1000));
}

export function calculateBillableMinutes(totalMinutes: number, breakMinutes: number): number {
  return Math.max(0, totalMinutes - Math.max(0, breakMinutes));
}

export function calculateBillableAmount(billableMinutes: number, workTypeRate: number): number {
  const amount = (Math.max(0, billableMinutes) / 60) * Math.max(0, workTypeRate);
  return Number(amount.toFixed(2));
}

export function resolveTotalMinutesForEntry(
  entry: Pick<TimeEntrySummaryItem, 'clock_in_at' | 'clock_out_at' | 'total_minutes'>,
  now: Date = new Date(),
): number {
  if (typeof entry.total_minutes === 'number') {
    return Math.max(0, entry.total_minutes);
  }

  const clockOutAt = entry.clock_out_at ? new Date(entry.clock_out_at) : now;
  const clockInAt = new Date(entry.clock_in_at);
  const durationMs = clockOutAt.getTime() - clockInAt.getTime();
  return Math.max(0, Math.floor(durationMs / 60000));
}

export function resolveBillableMinutesForEntry(
  entry: Pick<TimeEntrySummaryItem, 'clock_in_at' | 'clock_out_at' | 'total_minutes' | 'break_minutes' | 'billable_minutes'>,
  now: Date = new Date(),
): number {
  if (typeof entry.billable_minutes === 'number') {
    return Math.max(0, entry.billable_minutes);
  }

  const totalMinutes = resolveTotalMinutesForEntry(entry, now);
  return calculateBillableMinutes(totalMinutes, entry.break_minutes ?? 0);
}

export function calculateTimeEntrySummary(
  entries: TimeEntrySummaryItem[],
  now: Date = new Date(),
): TimeEntrySummary {
  return entries.reduce<TimeEntrySummary>(
    (summary, entry) => {
      const totalMinutes = resolveTotalMinutesForEntry(entry, now);
      const billableMinutes = resolveBillableMinutesForEntry(entry, now);
      const amount = typeof entry.billable_amount === 'number'
        ? Math.max(0, entry.billable_amount)
        : calculateBillableAmount(billableMinutes, entry.work_type_rate);

      const normalizedStatus = entry.status.toUpperCase();

      return {
        entryCount: summary.entryCount + 1,
        totalMinutes: summary.totalMinutes + totalMinutes,
        billableMinutes: summary.billableMinutes + billableMinutes,
        totalAmount: Number((summary.totalAmount + amount).toFixed(2)),
        pendingCount: summary.pendingCount + (normalizedStatus === 'PENDING' ? 1 : 0),
        approvedCount: summary.approvedCount + (normalizedStatus === 'APPROVED' ? 1 : 0),
        rejectedCount: summary.rejectedCount + (normalizedStatus === 'REJECTED' ? 1 : 0),
      };
    },
    {
      entryCount: 0,
      totalMinutes: 0,
      billableMinutes: 0,
      totalAmount: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    },
  );
}

export function getDurationState(
  elapsedMinutes: number,
  warningHours: number = APP_CONFIG.WARNING_TIME_ENTRY_HOURS,
  maxHours: number = APP_CONFIG.MAX_TIME_ENTRY_HOURS,
): DurationState {
  const warningThresholdMinutes = warningHours * 60;
  const maxDurationMinutes = maxHours * 60;

  return {
    elapsedMinutes,
    warningThresholdMinutes,
    maxDurationMinutes,
    isWarning: elapsedMinutes >= warningThresholdMinutes && elapsedMinutes < maxDurationMinutes,
    isExceeded: elapsedMinutes >= maxDurationMinutes,
  };
}

export function formatTimerClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}
