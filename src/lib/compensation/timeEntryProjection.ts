import type { Database } from '@/types/database';

/** Every browser time read/RETURNING uses this projection; billing is a separate guarded RPC. */
export const TIME_ENTRY_WAGE_COLUMNS = 'id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_at,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,work_type,work_type_rate,total_minutes,break_minutes,billable_minutes,billable_amount,status,reviewed_by,reviewed_at,rejection_reason,invoice_id,sync_status,created_at,updated_at,contractor_role,pay_rate_applied,payroll_amount,regular_minutes,overtime_minutes,regular_pay_amount,overtime_pay_amount,overtime_rate_applied,activity_intervals,pay_segments,paid_minutes_exact,vehicle_minutes,vehicle_allowance_amount,vehicle_hourly_rate_applied,calculation_version' as const;
type ProjectionKeys<T extends string> = T extends `${infer Head},${infer Tail}` ? Head | ProjectionKeys<Tail> : T;
export type WageTimeEntryRow = Pick<Database['public']['Tables']['time_entries']['Row'], ProjectionKeys<typeof TIME_ENTRY_WAGE_COLUMNS>>;
export function scrubBillingFields<T extends object>(value: T): T {
  const result = { ...value } as T & Record<string, unknown>;
  delete result.utility_bill_amount; delete result.utility_bill_rate_applied;
  return result;
}
