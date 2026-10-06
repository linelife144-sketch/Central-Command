import { uploadClockPhoto } from '../compensation/clockPhotos';
import { TIME_ENTRY_WAGE_COLUMNS, type WageTimeEntryRow } from '../compensation/timeEntryProjection';
import { db, getPendingTimeEntries, markTimeEntryFailed, type LocalTimeEntry } from '../db/dexie';

type RemoteEntry = WageTimeEntryRow;
interface Dependencies {
  isOnline: () => boolean;
  getOwnContractorId: () => Promise<string | null>;
  getPending: () => Promise<LocalTimeEntry[]>;
  saveRemote: (entry: LocalTimeEntry) => Promise<RemoteEntry>;
  markSynced: (entry: LocalTimeEntry, remote: RemoteEntry) => Promise<void>;
  markFailed: (id: string, message: string) => Promise<void>;
}

async function saveRemote(entry: LocalTimeEntry): Promise<RemoteEntry> {
  const { supabase } = await import('../supabase/client');
  if (entry.clock_in_photo_file) await uploadClockPhoto(entry.contractor_id, entry.id, 'in', entry.clock_in_photo_file);
  if (entry.clock_out_photo_file) await uploadClockPhoto(entry.contractor_id, entry.id, 'out', entry.clock_out_photo_file);
  const { data: existing, error: lookupError } = await supabase.from('time_entries').select(TIME_ENTRY_WAGE_COLUMNS).eq('id', entry.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.clock_out_at) {
    if (Date.parse(existing.clock_out_at) !== Date.parse(entry.clock_out_at ?? '')) throw new Error('The completed server shift differs from the queued shift. Staff review is required.');
    return existing;
  }
  const clockOut = {
    clock_out_at: entry.clock_out_at ?? null,
    clock_out_latitude: entry.clock_out_latitude ?? null,
    clock_out_longitude: entry.clock_out_longitude ?? null,
    clock_out_accuracy: entry.clock_out_accuracy ?? null,
    break_minutes: Math.round(entry.break_minutes),
    activity_intervals: entry.activity_intervals ?? [],
    clock_out_photo_url: entry.clock_out_photo_url ?? null,
    sync_status: 'SYNCED' as const,
  };
  if (existing) {
    const { data, error } = await supabase.from('time_entries').update(clockOut).eq('id', entry.id).select(TIME_ENTRY_WAGE_COLUMNS).single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('time_entries').insert({
    id: entry.id, contractor_id: entry.contractor_id, ticket_id: entry.ticket_id ?? null,
    storm_event_id: entry.storm_event_id ?? null, clock_in_at: entry.clock_in_at,
    clock_in_latitude: entry.clock_in_latitude ?? null, clock_in_longitude: entry.clock_in_longitude ?? null,
    clock_in_accuracy: entry.clock_in_accuracy ?? null,
    work_type: entry.work_type as RemoteEntry['work_type'], work_type_rate: entry.work_type_rate,
    clock_in_photo_url: entry.clock_in_photo_url ?? null,
    status: 'PENDING', ...clockOut,
  }).select(TIME_ENTRY_WAGE_COLUMNS).single();
  if (error) throw error;
  return data;
}

const defaults: Dependencies = {
  isOnline: () => typeof navigator === 'undefined' || navigator.onLine,
  async getOwnContractorId() {
    const { supabase } = await import('../supabase/client');
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const { data, error: lookupError } = await supabase.from('contractors').select('id').eq('profile_id', user.id).single();
    if (lookupError) return null;
    return data.id;
  },
  getPending: getPendingTimeEntries,
  saveRemote,
  async markSynced(entry, remote) {
    await db.transaction('rw', db.timeEntries, db.syncQueue, async () => {
      await db.timeEntries.put({ ...entry, status: remote.status ?? 'PENDING',
        clock_out_at: remote.clock_out_at ?? undefined,
        contractor_role: remote.contractor_role ?? undefined, pay_rate_applied: remote.pay_rate_applied ?? undefined,
        payroll_amount: remote.payroll_amount ?? undefined,
        activity_intervals: remote.activity_intervals as unknown as LocalTimeEntry['activity_intervals'],
        pay_segments: remote.pay_segments as unknown as LocalTimeEntry['pay_segments'],
        billable_minutes: remote.paid_minutes_exact ?? remote.billable_minutes ?? undefined,
        total_minutes: remote.clock_out_at ? (Date.parse(remote.clock_out_at) - Date.parse(remote.clock_in_at)) / 60000 : 0,
        paid_minutes_exact: remote.paid_minutes_exact ?? undefined, vehicle_minutes: remote.vehicle_minutes ?? undefined,
        vehicle_allowance_amount: remote.vehicle_allowance_amount ?? undefined, calculation_version: remote.calculation_version,
        regular_minutes: remote.regular_minutes ?? undefined,
        overtime_minutes: remote.overtime_minutes ?? undefined, regular_pay_amount: remote.regular_pay_amount ?? undefined,
        overtime_pay_amount: remote.overtime_pay_amount ?? undefined, overtime_rate_applied: remote.overtime_rate_applied ?? undefined,
        clock_in_photo_file: undefined, clock_out_photo_file: undefined,
        synced: true, sync_status: 'synced', retry_count: 0, last_error: undefined });
      // Clock-in and clock-out can each have a queue item for the same shift.
      await db.syncQueue.where('[entity_type+entity_id]').equals(['time_entry', entry.id]).modify({ status: 'synced', last_error: undefined });
    });
  },
  markFailed: markTimeEntryFailed,
};

export function createTimeEntryUploadQueue(overrides: Partial<Dependencies> = {}) {
  const dependencies = { ...defaults, ...overrides };
  let running = false;
  return { async process() {
    const result = { uploaded: 0, failed: 0 };
    if (running || !dependencies.isOnline()) return result;
    running = true;
    try {
      const owner = await dependencies.getOwnContractorId();
      if (!owner) return result;
      const entries = (await dependencies.getPending()).filter(entry => entry.contractor_id === owner)
        .sort((a, b) => Date.parse(a.clock_in_at) - Date.parse(b.clock_in_at));
      for (const entry of entries) {
        try {
          const remote = await dependencies.saveRemote(entry);
          await dependencies.markSynced(entry, remote);
          result.uploaded++;
        } catch (error) {
          await dependencies.markFailed(entry.id, error instanceof Error ? error.message : String(error));
          result.failed++;
          // Never allocate a later shift's overtime before an earlier failed shift.
          break;
        }
      }
      if (result.uploaded && typeof window !== 'undefined') window.dispatchEvent(new Event('time-entries-synced'));
      return result;
    } finally { running = false; }
  } };
}
export const timeEntryUploadQueue = createTimeEntryUploadQueue();
