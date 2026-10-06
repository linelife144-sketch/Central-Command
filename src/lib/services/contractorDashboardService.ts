import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { round2, timeEntryMoney } from '@/lib/utils/payroll';
import { resolveBillableMinutesForEntry } from '@/lib/utils/timeTracking';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type PersonalTicket = Pick<Row<'tickets'>, 'id' | 'ticket_number' | 'status' | 'address' | 'city' | 'state' | 'utility_client' | 'due_date' | 'updated_at' | 'is_important' | 'storm_event_id'>;
export type PersonalTime = Pick<Row<'time_entries'>, 'id' | 'clock_in_at' | 'clock_out_at' | 'status' | 'total_minutes' | 'break_minutes' | 'paid_minutes_exact' | 'billable_minutes' | 'payroll_amount' | 'billable_amount' | 'sync_status'>;
export type PersonalExpense = Pick<Row<'expense_reports'>, 'id' | 'status' | 'total_amount' | 'item_count'>;
export type PersonalStorm = Pick<Row<'storm_events'>, 'id' | 'name' | 'utility_client' | 'region' | 'status'>;

const CLOSED_TICKET_STATUSES = new Set(['COMPLETE', 'APPROVED', 'CLOSED', 'ARCHIVED', 'EXPIRED']);
export function summarizeTickets(rows: PersonalTicket[]) {
  const open = rows.filter(row => !CLOSED_TICKET_STATUSES.has(row.status));
  const recent = [...open].sort((a, b) =>
    Number(b.is_important) - Number(a.is_important)
    || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
    || (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
    || a.id.localeCompare(b.id),
  ).slice(0, 5);
  return { open: open.length, pendingReview: open.filter(row => row.status === 'PENDING_REVIEW').length,
    needsRework: open.filter(row => row.status === 'NEEDS_REWORK').length,
    completed: rows.filter(row => ['COMPLETE', 'APPROVED', 'CLOSED'].includes(row.status)).length, recent };
}

/** Entire completed shifts ending in this rolling window; rejected and active shifts are excluded. */
export function summarizeTime(rows: PersonalTime[], from: string, to: string) {
  const submitted = rows.filter(row => row.clock_out_at && row.status !== 'REJECTED'
    && Date.parse(row.clock_out_at) >= Date.parse(from) && Date.parse(row.clock_out_at) <= Date.parse(to));
  const money = submitted.map(row => timeEntryMoney({ clock_out_at: row.clock_out_at ?? undefined,
    payroll_amount: row.payroll_amount ?? undefined, billable_amount: row.billable_amount ?? undefined,
    sync_status: row.sync_status ?? undefined }));
  return {
    minutes: submitted.reduce((sum, row) => sum + resolveBillableMinutesForEntry({ ...row,
      clock_out_at: row.clock_out_at ?? undefined, total_minutes: row.total_minutes ?? undefined,
      break_minutes: row.break_minutes ?? undefined, billable_minutes: row.paid_minutes_exact ?? row.billable_minutes ?? undefined }), 0),
    wages: money.some(value => value.wage === undefined) ? null : round2(money.reduce((sum, value) => sum + value.wage!, 0)),
    pendingCount: submitted.filter(row => row.status === 'PENDING').length,
    rejectedCount: rows.filter(row => row.status === 'REJECTED' && row.clock_out_at
      && Date.parse(row.clock_out_at) >= Date.parse(from) && Date.parse(row.clock_out_at) <= Date.parse(to)).length,
    active: [...rows].filter(row => !row.clock_out_at && row.status !== 'REJECTED')
      .sort((a, b) => b.clock_in_at.localeCompare(a.clock_in_at))[0] ?? null,
  };
}

export function summarizeExpenses(rows: PersonalExpense[]) {
  const pending = rows.filter(row => row.status === 'SUBMITTED' || row.status === 'UNDER_REVIEW');
  return { pendingAmount: round2(pending.reduce((sum, row) => sum + (row.total_amount ?? 0), 0)),
    pendingCount: pending.length,
    approvedAmount: round2(rows.filter(row => row.status === 'APPROVED').reduce((sum, row) => sum + (row.total_amount ?? 0), 0)),
    draftCount: rows.filter(row => row.status === 'DRAFT' && (row.item_count ?? 0) > 0).length,
    rejectedCount: rows.filter(row => row.status === 'REJECTED').length };
}

// Paging prevents Supabase's response-row cap from silently truncating summary totals.
export async function readDashboardRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await page(offset, offset + 499);
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error('Dashboard data unavailable.');
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}

export interface ContractorDashboardData {
  firstName: string;
  generatedAt: string;
  periodStart: string;
  tickets: ReturnType<typeof summarizeTickets> | null;
  time: ReturnType<typeof summarizeTime> | null;
  expenses: ReturnType<typeof summarizeExpenses> | null;
  storms: Array<PersonalStorm & { openTickets: number }> | null;
  unavailable: string[];
}

/** The caller supplies the verified linked contractor ID; all reads still use the caller's RLS session. */
export async function loadContractorDashboard(client: SupabaseClient<Database>, contractorId: string, firstName: string, now = new Date()): Promise<ContractorDashboardData> {
  const to = now.toISOString();
  const from = new Date(now.getTime() - 7 * 86400000).toISOString();
  const result: ContractorDashboardData = { firstName, generatedAt: to, periodStart: from, tickets: null, time: null, expenses: null, storms: null, unavailable: [] };
  const [tickets, time, expenses] = await Promise.allSettled([
    readDashboardRows<PersonalTicket>((start, end) => client.from('tickets')
      .select('id,ticket_number,status,address,city,state,utility_client,due_date,updated_at,is_important,storm_event_id')
      .or(`assigned_to.eq.${contractorId},assigned_driver_id.eq.${contractorId}`).eq('is_deleted', false).order('id').range(start, end)),
    readDashboardRows<PersonalTime>((start, end) => client.from('time_entries')
      .select('id,clock_in_at,clock_out_at,status,total_minutes,break_minutes,paid_minutes_exact,billable_minutes,payroll_amount,billable_amount,sync_status')
      .eq('contractor_id', contractorId).eq('is_deleted', false)
      .or(`clock_out_at.gte.${from},clock_out_at.is.null`).lte('clock_in_at', to).order('id').range(start, end)),
    readDashboardRows<PersonalExpense>((start, end) => client.from('expense_reports')
      .select('id,status,total_amount,item_count').eq('contractor_id', contractorId).eq('is_deleted', false).order('id').range(start, end)),
  ]);
  if (time.status === 'fulfilled') result.time = summarizeTime(time.value, from, to);
  else result.unavailable.push('time');
  if (expenses.status === 'fulfilled') result.expenses = summarizeExpenses(expenses.value);
  else result.unavailable.push('expenses');
  if (tickets.status === 'fulfilled') {
    result.tickets = summarizeTickets(tickets.value);
    const counts = new Map<string, number>();
    for (const ticket of tickets.value) {
      if (ticket.storm_event_id && !CLOSED_TICKET_STATUSES.has(ticket.status)) counts.set(ticket.storm_event_id, (counts.get(ticket.storm_event_id) ?? 0) + 1);
    }
    result.storms = [];
    if (counts.size) {
      const storms = await readDashboardRows<PersonalStorm>((start, end) => client.from('storm_events')
        .select('id,name,utility_client,region,status').in('id', [...counts.keys()]).eq('is_deleted', false).order('id').range(start, end)).catch(() => null);
      if (storms) result.storms = storms.map(storm => ({ ...storm, openTickets: counts.get(storm.id) ?? 0 })).sort((a, b) => b.openTickets - a.openTickets);
      else { result.storms = null; result.unavailable.push('storm details'); }
    }
  } else result.unavailable.push('tickets', 'storm details');
  return result;
}
