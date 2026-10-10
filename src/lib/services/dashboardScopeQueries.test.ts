import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ calls: [] as { table: string; columns: string; filters: [string, unknown][]; range?: number[] }[], rows: {} as Record<string, Record<string, unknown>[]>, failTable: '', failOffset: -1, nullTable: '', nullOffset: -1, permissions: { 'admin.assignments.view': true, 'admin.contractors.view': true, 'admin.tickets.view': true, 'admin.time.view': true } as Record<string, boolean> }));
vi.mock('@/lib/db/dexie', () => ({ db: { tickets: { bulkPut: vi.fn() } }, cacheTickets: vi.fn() }));
vi.mock('@/lib/testing/superAdminTesting', () => ({ isSuperAdminTestingEnabled: () => false }));
vi.mock('@/lib/supabase/client', () => {
 const createQuery = (table: string, columns: string, options?: { head?: boolean }) => {
  const call = { table, columns, filters: [] as [string, unknown][], range: undefined as number[] | undefined };
  mocks.calls.push(call);
  const query = {
    eq: (key: string, value: unknown) => { call.filters.push([key, value]); return query; },
    in: (key: string, value: unknown[]) => { call.filters.push([key, value]); return query; }, is: () => query, not: () => query, neq: (key: string, value: unknown) => { call.filters.push([`neq:${key}`, value]); return query; }, gte: () => query, lte: () => query, order: (column: string) => { if (table === 'ticket_payloads' && column !== 'ticket_id') throw new Error('column ticket_payloads.id does not exist'); return query; },
    or: () => query,
    range: (from: number, to: number) => { call.range = [from, to]; return query; },
    then: (resolve: (result: unknown) => unknown) => {
      if (mocks.failTable === table && (call.range?.[0] ?? 0) === mocks.failOffset) return Promise.resolve({ data: null, error: new Error('Required read unavailable') }).then(resolve);
      if (mocks.nullTable === table && call.range?.[0] === mocks.nullOffset) return Promise.resolve({ data: null, error: null }).then(resolve);
      let rows = mocks.rows[table] ?? [];
      rows = rows.filter(row => call.filters.every(([key, value]) => key.startsWith('neq:') ? row[key.slice(4)] !== value : key.includes('.') || (Array.isArray(value) ? value.includes(row[key]) : row[key] === value)));
      const count = rows.length;
      if (call.range) rows = rows.slice(call.range[0], call.range[1] + 1);
      else if (!options?.head) rows = rows.slice(0, 1000);
      return Promise.resolve({ data: options?.head ? null : rows, count, error: null }).then(resolve);
    },
  };
  return query;
 };
 return { supabase: {
   auth: { getSession: async () => ({ data: { session: {} }, error: null }) },
   from: (table: string) => ({ select: (columns: string, options?: { head?: boolean }) => createQuery(table, columns, options) }),
   rpc: (name: string, params: { p_storm?: string; p_storm_id?: string }) => {
     if (name === 'get_my_permissions') return Promise.resolve({ data: mocks.permissions, error: null });
     const query = createQuery(name, '');
     const storm = params.p_storm ?? params.p_storm_id;
     return storm ? query.eq('storm_event_id', storm) : query;
   },
 } };
});
import { supabase } from '@/lib/supabase/client';
import { createDashboardReportingService } from './dashboardReportingService';
import { expenseSubmissionService } from './expenseSubmissionService';
import { payrollService, createPayrollService } from './payrollService';
import { ticketService } from './ticketService';
import { contractorService } from './contractorService';
import { timeEntryManagementService } from './timeEntryManagementService';

beforeEach(async () => { await import('@/lib/supabase/client'); mocks.calls.length = 0; mocks.rows = {}; mocks.failTable = ''; mocks.failOffset = -1; mocks.nullTable = ''; mocks.nullOffset = -1; mocks.permissions = { 'admin.assignments.view': true, 'admin.contractors.view': true, 'admin.tickets.view': true, 'admin.time.view': true }; });
describe('storm-scoped database reads', () => {
  it.each(['crew', 'teamLead', 'assignee'] as const)('paginates the %s field queue while retaining assignment and cache behavior', async assignment => {
    mocks.rows.tickets = Array.from({ length: 1001 }, (_, i) => ({ id: `ticket-${i}`, crew_id: 'crew', team_lead_id: 'reviewer', assigned_to: 'person' }));
    const rows = assignment === 'crew' ? await ticketService.getTicketsByCrew('crew') : assignment === 'teamLead'
      ? await ticketService.getTicketsByTeamLead('reviewer') : await ticketService.getTicketsByAssignee('person');
    expect(rows).toHaveLength(1001);
    const { db, cacheTickets } = await import('@/lib/db/dexie');
    expect(assignment === 'assignee' ? db.tickets.bulkPut : cacheTickets).toHaveBeenCalled();
  });
  it('paginates the operational ticket queue after applying storm scope', async () => {
    mocks.rows.tickets = Array.from({ length: 1002 }, (_, i) => ({ id: `ticket-${i}`, storm_event_id: i === 1001 ? 'storm-b' : 'storm-a' }));
    expect(await ticketService.getTickets({ stormEventId: 'storm-a' })).toHaveLength(1001);
    expect(await ticketService.getTickets({ stormEventId: 'storm-b' })).toHaveLength(1);
    expect(await ticketService.getTickets()).toHaveLength(1002);
  });
  it('reads current roster members without inferring membership from tickets and counts both crew members', async () => {
    mocks.rows.storm_event_roster_revisions = [{ id: 'old-a', storm_event_id: 'storm-a', revision_number: 1 }, { id: 'new-a', storm_event_id: 'storm-a', revision_number: 2 }, { id: 'b', storm_event_id: 'storm-b', revision_number: 1 }];
    mocks.rows.storm_event_roster_members = [{ id: '1', contractor_id: 'driver', roster_revision_id: 'new-a' }, { id: '2', contractor_id: 'planned', roster_revision_id: 'new-a' }, { id: '3', contractor_id: 'assessor', roster_revision_id: 'old-a' }, { id: '4', contractor_id: 'assessor', roster_revision_id: 'new-a', member_status: 'REMOVED' }];
    mocks.rows.contractors = ['driver', 'planned', 'assessor'].map(id => ({ id, profile_id: null, first_name: id, business_name: id, is_deleted: false }));
    mocks.rows.tickets = [{ id: 'paired', assigned_to: 'assessor', assigned_driver_id: 'driver', storm_event_id: 'storm-a', status: 'ASSIGNED', is_deleted: false }, { id: 'other', assigned_to: 'driver', storm_event_id: 'storm-b', status: 'ASSIGNED', is_deleted: false }];
    const members = await contractorService.listContractors({ stormEventId: 'storm-a' });
    expect(members.map(row => row.id)).toEqual(['driver', 'planned']);
    expect(members[0].assignedTicketCount).toBe(1);
    expect(members[1].assignedTicketCount).toBe(0);
    expect(await contractorService.listContractors()).toHaveLength(3);
  });
  it('does not truncate the company contractor directory or related profiles and assignments', async () => {
    mocks.rows.contractors = Array.from({ length: 1001 }, (_, i) => ({ id: `person-${i}`, profile_id: `profile-${i}`, business_name: 'Company', is_deleted: false }));
    mocks.rows.profiles = mocks.rows.contractors.map((row, i) => ({ id: row.profile_id, first_name: String(i), last_name: 'Worker', email: 'qa@example.test', is_active: true }));
    mocks.rows.tickets = Array.from({ length: 1001 }, (_, i) => ({ id: `ticket-${i}`, assigned_driver_id: 'person-1000', status: 'ASSIGNED', is_deleted: false }));
    const people = await contractorService.listContractors();
    expect(people).toHaveLength(1001);
    expect(people.find(person => person.id === 'person-1000')).toMatchObject({ fullName: '1000 Worker', assignedTicketCount: 1001 });
  });
  it('reports revoked management time visibility instead of an empty successful read', async () => {
    mocks.permissions['admin.time.view'] = false;
    await expect(timeEntryManagementService.listEntries({ stormEventId: 'storm-a' })).rejects.toThrow(/permission/i);
    expect(mocks.calls.some(call => call.table === 'time_entries')).toBe(false);
  });
  it('scopes and paginates recorded time before enriching the complete result', async () => {
    mocks.rows.time_entries = Array.from({ length: 1002 }, (_, i) => ({ id: `time-${i}`, contractor_id: 'person', storm_event_id: i === 1001 ? 'storm-b' : 'storm-a', status: 'APPROVED', clock_in_at: '2026-10-09T08:00:00Z', work_type: 'Working' }));
    expect(await timeEntryManagementService.listEntries({ stormEventId: 'storm-a' })).toHaveLength(1001);
    expect(await timeEntryManagementService.listEntries({ stormEventId: 'storm-b' })).toHaveLength(1);
  });
  it('reads all related utility payloads without exceeding bounded ID batches', async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => `ticket-${i}`);
    mocks.rows.ticket_payloads = ids.map(ticket_id => ({ ticket_id, payload: { circuit: ticket_id } }));
    expect(Object.keys(await ticketService.getUtilityPayloadsByTicketIds(ids))).toHaveLength(1001);
    for (const call of mocks.calls) {
      const values = call.filters.find(([key]) => key === 'ticket_id')?.[1] as string[];
      expect(values.length).toBeLessThanOrEqual(100);
    }
  });
  it('does not return partial tickets when a later page fails', async () => {
    mocks.rows.tickets = Array.from({ length: 1001 }, (_, i) => ({ id: `ticket-${i}` }));
    mocks.failTable = 'tickets'; mocks.failOffset = 500;
    await expect(ticketService.getTickets()).rejects.toThrow('Required read unavailable');
  });
  it('rejects a null later page rather than claiming a complete ticket result', async () => {
    mocks.rows.tickets = Array.from({ length: 1001 }, (_, i) => ({ id: `ticket-${i}` }));
    mocks.nullTable = 'tickets'; mocks.nullOffset = 500;
    await expect(ticketService.getTickets()).rejects.toThrow(/unavailable/i);
  });
  it('does not infer an inactive contractor from a missing required linked profile', async () => {
    mocks.rows.contractors = [{ id: 'person', profile_id: 'profile', business_name: 'Company', is_deleted: false }];
    await expect(contractorService.listContractors()).rejects.toThrow(/profile.*unavailable/i);
  });
  it.each(['storm_event_roster_revisions', 'storm_event_roster_members', 'profiles', 'tickets'])('surfaces failed required contractor reads from %s', async table => {
    mocks.rows.storm_event_roster_revisions = [{ id: 'revision', storm_event_id: 'storm-a', revision_number: 1 }];
    mocks.rows.storm_event_roster_members = [{ id: 'member', contractor_id: 'person', roster_revision_id: 'revision' }];
    mocks.rows.contractors = [{ id: 'person', profile_id: 'profile', business_name: 'Company', is_deleted: false }];
    mocks.rows.profiles = [{ id: 'profile', first_name: 'Required', last_name: 'Profile' }];
    mocks.failTable = table; mocks.failOffset = 0;
    await expect(contractorService.listContractors({ stormEventId: 'storm-a' })).rejects.toThrow('Required read unavailable');
  });
  it('does not confuse permitted roster access with denied contractor visibility', async () => {
    mocks.permissions['admin.contractors.view'] = false;
    await expect(contractorService.listContractors({ stormEventId: 'storm-a' })).rejects.toThrow(/permission/i);
  });
  it('does not present denied roster visibility as an empty storm directory', async () => {
    mocks.permissions['admin.assignments.view'] = false;
    await expect(contractorService.listContractors({ stormEventId: 'storm-a' })).rejects.toThrow(/permission/i);
  });
  it('loads complete time labels and reimbursement claims past the server row limit', async () => {
    mocks.rows.time_entries = Array.from({ length: 1001 }, (_, i) => ({ id: `time-${i}`, contractor_id: `person-${i}`, ticket_id: `ticket-${i}`, storm_event_id: 'storm-a', status: 'APPROVED', clock_in_at: '2026-10-09T08:00:00Z', work_type: 'Working' }));
    mocks.rows.tickets = mocks.rows.time_entries.map((row, i) => ({ id: row.ticket_id, ticket_number: `Number ${i}` }));
    mocks.rows.contractors = mocks.rows.time_entries.map((row, i) => ({ id: row.contractor_id, profile_id: `profile-${i}` }));
    mocks.rows.profiles = mocks.rows.contractors.map((row, i) => ({ id: row.profile_id, first_name: 'Worker', last_name: String(i) }));
    mocks.rows.time_entry_vehicle_claims = mocks.rows.time_entries.map(row => ({ id: `claim-${row.id}`, time_entry_id: row.id, amount: 3, status: 'APPROVED' }));
    const entries = await timeEntryManagementService.listEntries({ stormEventId: 'storm-a' });
    expect(entries.find(row => row.id === 'time-1000')).toMatchObject({ ticket_number: 'Number 1000', contractor_name: 'Worker 1000', vehicle_reimbursement_amount: 3 });
  });
  it('paginates privileged financial snapshots without mixing storms', async () => {
    mocks.rows.get_privileged_payroll_entries = Array.from({ length: 1002 }, (_, i) => ({ id: `shift-${i}`, contractor_id: 'person', storm_event_id: i === 1001 ? 'storm-b' : 'storm-a', status: 'APPROVED', total_minutes: 60, paid_minutes_exact: 60, payroll_amount: 1, utility_bill_amount: 2 }));
    const service = createPayrollService({ fetchVehicleClaimsForEntries: async () => [], fetchContractorNames: async () => new Map() });
    const summary = await service.getPayrollSummary({ stormEventId: 'storm-a', includeFinancial: true });
    expect(summary.totals.taxablePayroll).toBe(1001);
    expect(summary.totals.utilityBillAmount).toBe(2002);
    expect(mocks.calls.filter(call => call.table === 'get_privileged_payroll_entries').map(call => call.range)).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });
  it('does not truncate expense or recorded-payroll totals at the API row limit', async () => {
    mocks.rows.expense_reports = Array.from({ length: 1001 }, (_, i) => ({ id: `expense-${i}`, contractor_id: 'person', is_deleted: false, storm_event_id: 'storm-a', status: 'SUBMITTED', expense_items: [{ id: `item-${i}`, expense_report_id: `expense-${i}`, category: 'MEALS', amount: 1, expense_date: '2026-10-09', updated_at: '2026-10-09' }] }));
    expect(await expenseSubmissionService.listExpenses({ stormEventId: 'storm-a' })).toHaveLength(1001);
    mocks.rows.time_entries = Array.from({ length: 1001 }, (_, i) => ({ id: `shift-${i}`, contractor_id: 'person', is_deleted: false, storm_event_id: 'storm-a', status: 'APPROVED', total_minutes: 60, paid_minutes_exact: 60, payroll_amount: 1 }));
    const service = createPayrollService({ fetchVehicleClaimsForEntries: async () => [], fetchContractorNames: async () => new Map() });
    expect((await service.getPayrollSummary({ stormEventId: 'storm-a' })).totals.taxablePayroll).toBe(1001);
  });
  it('filters two storms independently and reads ticket totals past the server page size', async () => {
    mocks.rows.tickets = Array.from({ length: 1001 }, (_, i) => ({ id: String(i), status: 'ASSIGNED', assigned_to: 'assessor', crew_id: 'crew-a', is_deleted: false, storm_event_id: i === 1000 ? 'storm-b' : 'storm-a', created_at: '2026-10-09' }));
    const service = createDashboardReportingService({ getClient: async () => supabase });
    expect((await service.getDashboardMetrics({ stormEventId: 'storm-a' })).total_tickets).toBe(1000);
    expect((await service.getDashboardMetrics({ stormEventId: 'storm-b' })).total_tickets).toBe(1);
    expect((await service.getDashboardMetrics()).total_tickets).toBe(1001);
    expect(mocks.calls.filter(call => call.table === 'damage_assessments')).toHaveLength(3);
    const assessment = mocks.calls.find(call => call.table === 'damage_assessments' && call.filters.some(([key]) => key === 'tickets.storm_event_id'));
    expect(assessment?.columns).toContain('tickets!inner');
    for (const table of ['time_entries', 'expense_reports']) expect(mocks.calls.find(call => call.table === table)?.filters).toContainEqual(['storm_event_id', 'storm-a']);
  });

  it('filters expense reports by their persisted storm and vehicle claims by their shift storm', async () => {
    await expenseSubmissionService.listExpenses({ stormEventId: 'storm-a', status: 'SUBMITTED' });
    expect(mocks.calls.find(call => call.table === 'expense_reports')?.filters).toContainEqual(['storm_event_id', 'storm-a']);
    await payrollService.listVehicleClaims({ stormEventId: 'storm-a' });
    const claim = mocks.calls.find(call => call.table === 'time_entry_vehicle_claims');
    expect(claim?.columns).toContain('time_entries!inner');
    expect(claim?.filters).toContainEqual(['time_entries.storm_event_id', 'storm-a']);
  });
});
