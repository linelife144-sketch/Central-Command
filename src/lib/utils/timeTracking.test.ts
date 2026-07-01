import { describe, expect, it } from 'vitest';
import {
  calculateBillableAmount,
  calculateBillableMinutes,
  calculateElapsedMinutes,
  calculateElapsedSeconds,
  calculateTimeEntrySummary,
  formatTimerClock,
  getDurationState,
  resolveBillableMinutesForEntry,
  resolveTotalMinutesForEntry,
} from './timeTracking';

describe('calculateElapsedMinutes', () => {
  it('returns elapsed whole minutes from clock-in time', () => {
    const clockInAt = '2026-02-12T12:00:00.000Z';
    const now = new Date('2026-02-12T12:37:40.000Z');

    expect(calculateElapsedMinutes(clockInAt, now)).toBe(37);
  });
});

describe('calculateElapsedSeconds', () => {
  it('returns elapsed whole seconds from clock-in time', () => {
    const clockInAt = '2026-02-12T12:00:00.000Z';
    const now = new Date('2026-02-12T12:00:45.000Z');

    expect(calculateElapsedSeconds(clockInAt, now)).toBe(45);
  });
});

describe('calculateBillableMinutes', () => {
  it('subtracts break minutes from total duration and never goes below zero', () => {
    expect(calculateBillableMinutes(120, 30)).toBe(90);
    expect(calculateBillableMinutes(20, 30)).toBe(0);
  });
});

describe('calculateBillableAmount', () => {
  it('converts billable minutes and rate into rounded USD amount', () => {
    expect(calculateBillableAmount(90, 100)).toBe(150);
    expect(calculateBillableAmount(70, 87.5)).toBe(102.08);
  });
});

describe('resolveTotalMinutesForEntry', () => {
  it('prefers persisted totals and otherwise calculates from timestamps', () => {
    expect(
      resolveTotalMinutesForEntry({
        clock_in_at: '2026-02-12T12:00:00.000Z',
        total_minutes: 45,
      }),
    ).toBe(45);

    expect(
      resolveTotalMinutesForEntry(
        {
          clock_in_at: '2026-02-12T12:00:00.000Z',
          clock_out_at: '2026-02-12T13:10:00.000Z',
        },
        new Date('2026-02-12T14:00:00.000Z'),
      ),
    ).toBe(70);
  });
});

describe('resolveBillableMinutesForEntry', () => {
  it('uses persisted billable minutes or derives from total and breaks', () => {
    expect(
      resolveBillableMinutesForEntry({
        clock_in_at: '2026-02-12T12:00:00.000Z',
        billable_minutes: 55,
      }),
    ).toBe(55);

    expect(
      resolveBillableMinutesForEntry(
        {
          clock_in_at: '2026-02-12T12:00:00.000Z',
          clock_out_at: '2026-02-12T13:00:00.000Z',
          break_minutes: 10,
        },
        new Date('2026-02-12T14:00:00.000Z'),
      ),
    ).toBe(50);
  });
});

describe('getDurationState', () => {
  it('marks warning before max duration and exceeded at max duration', () => {
    expect(getDurationState(490, 8, 12)).toEqual(
      expect.objectContaining({
        isWarning: true,
        isExceeded: false,
      }),
    );

    expect(getDurationState(720, 8, 12)).toEqual(
      expect.objectContaining({
        isWarning: false,
        isExceeded: true,
      }),
    );
  });
});

describe('formatTimerClock', () => {
  it('formats elapsed seconds as HH:MM:SS', () => {
    expect(formatTimerClock(0)).toBe('00:00:00');
    expect(formatTimerClock(65)).toBe('00:01:05');
    expect(formatTimerClock(3661)).toBe('01:01:01');
  });
});

describe('calculateTimeEntrySummary', () => {
  it('aggregates totals, amounts, and status counts', () => {
    const summary = calculateTimeEntrySummary(
      [
        {
          clock_in_at: '2026-02-12T08:00:00.000Z',
          clock_out_at: '2026-02-12T10:00:00.000Z',
          break_minutes: 15,
          work_type_rate: 100,
          status: 'PENDING',
        },
        {
          clock_in_at: '2026-02-12T11:00:00.000Z',
          total_minutes: 60,
          billable_minutes: 60,
          billable_amount: 90,
          work_type_rate: 90,
          status: 'APPROVED',
        },
        {
          clock_in_at: '2026-02-12T12:00:00.000Z',
          clock_out_at: '2026-02-12T12:30:00.000Z',
          break_minutes: 0,
          work_type_rate: 80,
          status: 'REJECTED',
        },
      ],
      new Date('2026-02-12T14:00:00.000Z'),
    );

    expect(summary).toEqual({
      entryCount: 3,
      totalMinutes: 210,
      billableMinutes: 195,
      totalAmount: 305,
      pendingCount: 1,
      approvedCount: 1,
      rejectedCount: 1,
    });
  });
});
