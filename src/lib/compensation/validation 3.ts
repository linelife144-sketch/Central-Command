import { v4 as uuid } from 'uuid';
import { z } from 'zod';

export const payRoles = ['STORM_MANAGER', 'TEAM_LEAD', 'SR_DAMAGE_ASSESSER', 'DAMAGE_ASSESSER', 'DRIVER'] as const;
export const payWorkTypes = ['STANDARD_ASSESSMENT', 'EMERGENCY_RESPONSE', 'TRAVEL', 'STANDBY'] as const;
const money = z.number().finite().positive().max(999999).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'Use at most two decimal places.');
const multiplier = z.number().finite().min(0.000001).max(100);
const tier = z.object({ after_hours: z.number().finite().nonnegative().max(168), multiplier }).strict();
export const payPolicySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('FLAT'), multiplier }).strict(),
  z.object({ mode: z.literal('WEEKLY_TIERS'), tiers: z.array(tier).min(1).max(10) }).strict(),
]).superRefine((policy, ctx) => {
  if (policy.mode === 'WEEKLY_TIERS' && (policy.tiers[0].after_hours !== 0 || policy.tiers.some((value, index) => index > 0 && value.after_hours <= policy.tiers[index - 1].after_hours))) {
    ctx.addIssue({ code: 'custom', message: 'Weekly tiers must start at zero and have increasing thresholds.' });
  }
});
export const compensationTermsSchema = z.object({
  role: z.enum(payRoles),
  base_hourly_rate: money,
  work_type_rates: z.partialRecord(z.enum(payWorkTypes), money),
  policy: payPolicySchema,
  driver_eligible: z.boolean(),
  vehicle_allowance_enabled: z.boolean(),
  vehicle_hourly_rate: z.number().finite().nonnegative().max(999999).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'Use at most two decimal places.'),
  week_start_day: z.number().int().min(0).max(6),
  timezone: z.string().min(1).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }, 'Select a valid time zone.'),
}).strict().superRefine((terms, ctx) => {
  if (terms.vehicle_allowance_enabled && (!terms.driver_eligible || terms.vehicle_hourly_rate <= 0)) {
    ctx.addIssue({ code: 'custom', message: 'Vehicle allowance requires driver eligibility and a positive allowance rate.' });
  }
});
export const payAgreementInputSchema = z.object({
  effective_from: z.iso.datetime({ offset: true }), terms: compensationTermsSchema,
}).strict();
export const timeIntervalSchema = z.object({
  id: z.uuid(), kind: z.enum(['BREAK', 'VEHICLE_USE']),
  start_at: z.iso.datetime({ offset: true }), end_at: z.iso.datetime({ offset: true }).nullable(),
}).strict();
export type CompensationTerms = z.infer<typeof compensationTermsSchema>;
export type PayAgreementInput = z.infer<typeof payAgreementInputSchema>;
export type TimeInterval = z.infer<typeof timeIntervalSchema>;
export interface PayAgreement extends PayAgreementInput { id: string; contractor_id: string; created_at: string; created_by: string | null }
export interface PayrollConfiguration { flat_multiplier: number; week_start_day: number; timezone: string; legacy_vehicle_hourly_rate: number; multiplier_options: { label: string; value: number }[] }
export interface PaySegment { agreement_id: string; start_at: string; end_at: string; week_start_at: string; paid_minutes: number; base_rate: number; multiplier: number; wage_amount: number; vehicle_minutes: number; vehicle_rate: number; vehicle_amount: number }

export function changeTimeInterval(intervals: TimeInterval[], kind: TimeInterval['kind'], action: 'START' | 'STOP', at: string): TimeInterval[] {
  const result = intervals.map(value => timeIntervalSchema.parse(value));
  const open = result.find(value => value.kind === kind && !value.end_at);
  if (action === 'STOP') {
    if (!open || Date.parse(at) < Date.parse(open.start_at)) throw new Error('No valid active interval to stop.');
    open.end_at = at;
  } else {
    if (open) throw new Error('This activity is already active.');
    if (kind === 'VEHICLE_USE' && result.some(value => value.kind === 'BREAK' && !value.end_at)) throw new Error('End your break before starting vehicle use.');
    if (kind === 'BREAK') {
      const vehicle = result.find(value => value.kind === 'VEHICLE_USE' && !value.end_at);
      if (vehicle) vehicle.end_at = at;
    }
    result.push({ id: uuid(), kind, start_at: at, end_at: null });
  }
  return result;
}
export function closeTimeIntervals(intervals: TimeInterval[], at: string) {
  return intervals.map(value => ({ ...value, end_at: value.end_at ?? at }));
}
export function breakMinutesFromIntervals(intervals: TimeInterval[], at: string) {
  return intervals.filter(value => value.kind === 'BREAK').reduce((sum, value) => sum + Math.max(0, Date.parse(value.end_at ?? at) - Date.parse(value.start_at)) / 60000, 0);
}
