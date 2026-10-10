import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../db/dexie', () => ({
  addToSyncQueue: vi.fn(),
  db: {
    expenseReports: { where: () => ({ equals: () => ({ toArray: async () => [
      { id: 'a', contractor_id: 'person', storm_event_id: 'storm-a', status: 'SUBMITTED' },
      { id: 'b', contractor_id: 'person', storm_event_id: 'storm-b', status: 'SUBMITTED' },
      { id: 'unknown', contractor_id: 'person', status: 'SUBMITTED' },
    ] }) }) },
    expenseItems: { where: () => ({ anyOf: (ids: string[]) => ({ toArray: async () => ids.map(id => ({ id: `item-${id}`, expense_report_id: id, amount: 10, expense_date: '2026-10-09', category: 'MEALS' })) }) }) },
  },
}));
import { expenseSubmissionService } from './expenseSubmissionService';
afterEach(() => vi.unstubAllGlobals());
describe('offline expense storm scope', () => {
  it('excludes other storms and unlinked reports from a storm-specific read', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const items = await expenseSubmissionService.listExpenses({ contractorId: 'person', stormEventId: 'storm-a' });
    expect(items.map(item => item.expense_report_id)).toEqual(['a']);
    expect(items[0].storm_event_id).toBe('storm-a');
    expect(await expenseSubmissionService.listExpenses({ contractorId: 'person' })).toHaveLength(3);
  });
});
