import type { CompensationTerms, PayrollConfiguration } from './validation';
/** Test data only; production reads configuration from Supabase. */
export const testCompensation: CompensationTerms = { role: 'DRIVER', base_hourly_rate: 65, work_type_rates: {}, policy: { mode: 'FLAT', multiplier: 1 }, driver_eligible: true, vehicle_allowance_enabled: true, vehicle_hourly_rate: 5, week_start_day: 1, timezone: 'America/Chicago' };
export const testPayrollConfiguration: PayrollConfiguration = { flat_multiplier: 1, week_start_day: 1, timezone: 'America/Chicago', legacy_vehicle_hourly_rate: 5, multiplier_options: [{ label: 'Straight time', value: 1 }, { label: 'Time and a half', value: 1.5 }, { label: 'Double time', value: 2 }] };
