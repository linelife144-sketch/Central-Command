import { describe, expect, it, vi } from 'vitest';

import {
  createExpenseSubmissionService,
  type ExpenseListItem,
  type CreateExpenseItemInput,
} from './expenseSubmissionService';

function buildExpenseItem(overrides: Partial<ExpenseListItem> = {}): ExpenseListItem {
  return {
    id: 'expense-item-1',
    expense_report_id: 'report-1',
    contractor_id: 'sub-1',
    category: 'FUEL',
    description: 'Fuel purchase',
    amount: 58.5,
    currency: 'USD',
    expense_date: '2026-02-03',
    policy_flags: [],
    requires_approval: false,
    billable_to_client: true,
    report_status: 'DRAFT',
    report_period_start: '2026-02-01',
    report_period_end: '2026-02-28',
    sync_status: 'SYNCED',
    created_at: '2026-02-03T10:00:00.000Z',
    updated_at: '2026-02-03T10:00:00.000Z',
    ...overrides,
  };
}

function buildCreateInput(overrides: Partial<CreateExpenseItemInput> = {}): CreateExpenseItemInput {
  return {
    contractorId: 'sub-1',
    category: 'FUEL',
    description: 'Fuel purchase',
    amount: 58.5,
    expenseDate: '2026-02-03',
    ...overrides,
  };
}

describe('createExpenseSubmissionService', () => {
  it('loads local expenses while offline', async () => {
    const listLocal = vi.fn().mockResolvedValue([buildExpenseItem({ id: 'local-1', sync_status: 'PENDING' })]);
    const service = createExpenseSubmissionService({
      isOnline: () => false,
      listRemote: vi.fn(),
      listLocal,
      createRemote: vi.fn(),
      createLocal: vi.fn(),
    });

    const items = await service.listExpenses({ contractorId: 'sub-1' });

    expect(listLocal).toHaveBeenCalledWith({ contractorId: 'sub-1' });
    expect(items[0]?.id).toBe('local-1');
  });

  it('loads remote expenses while online', async () => {
    const listRemote = vi.fn().mockResolvedValue([buildExpenseItem({ id: 'remote-1' })]);
    const service = createExpenseSubmissionService({
      isOnline: () => true,
      listRemote,
      listLocal: vi.fn(),
      createRemote: vi.fn(),
      createLocal: vi.fn(),
    });

    const items = await service.listExpenses({ contractorId: 'sub-1', status: 'ALL' });

    expect(listRemote).toHaveBeenCalledWith({ contractorId: 'sub-1', status: 'ALL' });
    expect(items[0]?.id).toBe('remote-1');
  });

  it('falls back to local list when remote load fails for contractor views', async () => {
    const listLocal = vi.fn().mockResolvedValue([buildExpenseItem({ id: 'fallback-1' })]);
    const service = createExpenseSubmissionService({
      isOnline: () => true,
      listRemote: vi.fn().mockRejectedValue(new Error('network failure')),
      listLocal,
      createRemote: vi.fn(),
      createLocal: vi.fn(),
    });

    const items = await service.listExpenses({ contractorId: 'sub-1' });

    expect(listLocal).toHaveBeenCalledWith({ contractorId: 'sub-1' });
    expect(items[0]?.id).toBe('fallback-1');
  });

  it('creates remote expenses while online', async () => {
    const createRemote = vi.fn().mockResolvedValue(buildExpenseItem({ id: 'remote-create-1' }));
    const createLocal = vi.fn();

    const service = createExpenseSubmissionService({
      isOnline: () => true,
      listRemote: vi.fn(),
      listLocal: vi.fn(),
      createRemote,
      createLocal,
    });

    const created = await service.createExpenseItem(buildCreateInput());

    expect(createRemote).toHaveBeenCalledTimes(1);
    expect(createLocal).not.toHaveBeenCalled();
    expect(created.id).toBe('remote-create-1');
  });

  it('falls back to local creation when remote create fails', async () => {
    const createLocal = vi.fn().mockResolvedValue(buildExpenseItem({ id: 'local-create-1', sync_status: 'PENDING' }));
    const service = createExpenseSubmissionService({
      isOnline: () => true,
      listRemote: vi.fn(),
      listLocal: vi.fn(),
      createRemote: vi.fn().mockRejectedValue(new Error('timeout')),
      createLocal,
    });

    const created = await service.createExpenseItem(buildCreateInput());

    expect(createLocal).toHaveBeenCalledTimes(1);
    expect(created.id).toBe('local-create-1');
  });

  it('validates expense inputs before creation', async () => {
    const service = createExpenseSubmissionService({
      isOnline: () => true,
      listRemote: vi.fn(),
      listLocal: vi.fn(),
      createRemote: vi.fn(),
      createLocal: vi.fn(),
    });

    await expect(
      service.createExpenseItem(
        buildCreateInput({
          amount: 0,
        }),
      ),
    ).rejects.toThrow('greater than zero');

    await expect(
      service.createExpenseItem(
        buildCreateInput({
          description: '   ',
        }),
      ),
    ).rejects.toThrow('description is required');
  });

  it('accepts mileage entries with odometer values even when manual amount is zero', async () => {
    const createRemote = vi.fn().mockResolvedValue(buildExpenseItem({ id: 'mileage-1', category: 'MILEAGE' }));
    const service = createExpenseSubmissionService({
      isOnline: () => true,
      listRemote: vi.fn(),
      listLocal: vi.fn(),
      createRemote,
      createLocal: vi.fn(),
    });

    await service.createExpenseItem(
      buildCreateInput({
        category: 'MILEAGE',
        amount: 0,
        mileageStart: 10,
        mileageEnd: 20,
      }),
    );

    expect(createRemote).toHaveBeenCalledTimes(1);
  });
});
