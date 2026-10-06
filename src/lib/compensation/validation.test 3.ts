import { describe, expect, it } from 'vitest';
import { compensationTermsSchema, changeTimeInterval, closeTimeIntervals, breakMinutesFromIntervals } from './validation';
import { testCompensation } from './testFixtures';
import { scrubBillingFields } from './timeEntryProjection';
describe('saved compensation validation', () => {
  it('accepts configured flat, weekly and custom multipliers', () => {
    for (const policy of [{ mode: 'FLAT', multiplier: 1.7 }, { mode: 'WEEKLY_TIERS', tiers: [{ after_hours: 0, multiplier: 1.2 }, { after_hours: 37.5, multiplier: 1.8 }, { after_hours: 62, multiplier: 2.3 }] }]) expect(compensationTermsSchema.safeParse({ ...testCompensation, policy }).success).toBe(true);
  });
  it('rejects invalid wages, rates, zones, roles and allowance eligibility', () => {
    for (const changes of [{ base_hourly_rate: -1 }, { base_hourly_rate: 1.234 }, { vehicle_hourly_rate: -1 }, { timezone: 'Invalid/Zone' }, { role: 'SUPER_ADMIN' }, { driver_eligible: false }]) expect(compensationTermsSchema.safeParse({ ...testCompensation, ...changes }).success).toBe(false);
  });
  it('requires zero-first increasing weekly thresholds', () => {
    for (const thresholds of [[1,40],[0,40,40],[0,45,40]]) expect(compensationTermsSchema.safeParse({ ...testCompensation, policy: { mode: 'WEEKLY_TIERS', tiers: thresholds.map(after_hours => ({ after_hours, multiplier: 1 })) } }).success).toBe(false);
  });
});
describe('timed activity transitions', () => {
  it('stops vehicle use for a break and requires an explicit restart', () => {
    const vehicle = changeTimeInterval([], 'VEHICLE_USE', 'START', '2026-10-04T12:00:00Z');
    const breakTime = changeTimeInterval(vehicle, 'BREAK', 'START', '2026-10-04T13:00:00Z');
    expect(breakTime[0].end_at).toBe('2026-10-04T13:00:00Z');
    expect(() => changeTimeInterval(breakTime, 'VEHICLE_USE', 'START', '2026-10-04T13:05:00Z')).toThrow('End your break');
    const ended = changeTimeInterval(breakTime, 'BREAK', 'STOP', '2026-10-04T13:30:30Z');
    expect(ended.some(item => item.kind === 'VEHICLE_USE' && item.end_at === null)).toBe(false);
    expect(breakMinutesFromIntervals(ended, '2026-10-04T14:00:00Z')).toBe(30.5);
  });
  it('closes an open break on clock-out and rejects duplicate starts', () => {
    const activities = changeTimeInterval([], 'BREAK', 'START', '2026-10-04T13:00:00Z');
    expect(() => changeTimeInterval(activities, 'BREAK', 'START', '2026-10-04T13:01:00Z')).toThrow('already active');
    expect(closeTimeIntervals(activities, '2026-10-04T13:20:00Z')[0].end_at).toBe('2026-10-04T13:20:00Z');
  });
  it('scrubs old billing cache fields without losing pending time', () => {
    const result = scrubBillingFields({ id: 'pending', payroll_amount: 100, activity_intervals: [], utility_bill_amount: 200, utility_bill_rate_applied: 50 });
    expect(result).toEqual({ id: 'pending', payroll_amount: 100, activity_intervals: [] });
  });
});
