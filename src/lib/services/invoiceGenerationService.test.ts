import { describe, expect, it, vi } from 'vitest';

import {
  createInvoiceGenerationService,
  type InvoiceGenerationCandidate,
  type Tax1099TrackingSummary,
} from './invoiceGenerationService';

function buildCandidate(overrides: Partial<InvoiceGenerationCandidate> = {}): InvoiceGenerationCandidate {
  return {
    contractor_id: 'sub-1',
    contractor_name: 'Alex Carter',
    time_entries: [
      {
        id: 'time-1',
        ticket_id: 'ticket-1',
        ticket_number: 'GES-1001',
        clock_in_at: '2026-02-01T10:00:00.000Z',
        clock_out_at: '2026-02-01T12:00:00.000Z',
        break_minutes: 0,
        billable_minutes: 120,
        billable_amount: 200,
        work_type: 'STANDARD_ASSESSMENT',
        work_type_rate: 100,
      },
    ],
    expense_reports: [
      {
        id: 'exp-1',
        report_period_start: '2026-02-01',
        report_period_end: '2026-02-07',
        total_amount: 75,
      },
    ],
    time_entry_count: 1,
    expense_report_count: 1,
    subtotal_time: 200,
    subtotal_expenses: 75,
    total_amount: 275,
    projected_ytd_payments: 575,
    threshold_warning: false,
    ...overrides,
  };
}

function buildTracking(overrides: Partial<Tax1099TrackingSummary> = {}): Tax1099TrackingSummary {
  return {
    contractor_id: 'sub-1',
    tax_year: 2026,
    total_payments: 500,
    total_invoices: 2,
    threshold_reached: false,
    form_1099_issued: false,
    form_1099_recipient_copy_sent: false,
    form_1099_irs_filed: false,
    ...overrides,
  };
}

describe('createInvoiceGenerationService', () => {
  it('validates billing period order', async () => {
    const service = createInvoiceGenerationService({
      fetchGenerationCandidates: vi.fn(),
    } as never);

    await expect(
      service.listGenerationCandidates({
        billingPeriodStart: '2026-02-20',
        billingPeriodEnd: '2026-02-01',
      }),
    ).rejects.toThrow('Billing period end date must be on or after the start date');
  });

  it('requires online connectivity for invoice generation', async () => {
    const service = createInvoiceGenerationService({
      isOnline: () => false,
    } as never);

    await expect(
      service.generateInvoices({
        billingPeriodStart: '2026-02-01',
        billingPeriodEnd: '2026-02-28',
        contractorIds: ['sub-1'],
      }),
    ).rejects.toThrow('internet connection');
  });

  it('generates invoices from selected candidates and links source records', async () => {
    const fetchGenerationCandidates = vi.fn().mockResolvedValue([buildCandidate()]);
    const fetchExistingInvoiceCount = vi.fn().mockResolvedValue(7);
    const insertInvoice = vi.fn().mockResolvedValue({
      id: 'inv-1',
      invoice_number: 'INV-2026-0008',
      contractor_id: 'sub-1',
      billing_period_start: '2026-02-01',
      billing_period_end: '2026-02-28',
      subtotal_time: 200,
      subtotal_expenses: 75,
      total_amount: 275,
      ytd_payments: 775,
      threshold_warning: true,
      status: 'SUBMITTED',
      created_at: '2026-02-28T18:00:00.000Z',
      updated_at: '2026-02-28T18:00:00.000Z',
    });
    const insertInvoiceLineItems = vi.fn().mockResolvedValue(undefined);
    const linkTimeEntriesToInvoice = vi.fn().mockResolvedValue(undefined);
    const linkExpenseReportsToInvoice = vi.fn().mockResolvedValue(undefined);
    const fetchTax1099Tracking = vi.fn().mockResolvedValue(buildTracking());
    const upsertTax1099Tracking = vi
      .fn()
      .mockResolvedValue(buildTracking({ total_payments: 775, total_invoices: 3, threshold_reached: true }));

    const service = createInvoiceGenerationService({
      isOnline: () => true,
      now: () => new Date('2026-02-28T18:00:00.000Z'),
      fetchGenerationCandidates,
      fetchExistingInvoiceCount,
      insertInvoice,
      insertInvoiceLineItems,
      linkTimeEntriesToInvoice,
      linkExpenseReportsToInvoice,
      fetchTax1099Tracking,
      upsertTax1099Tracking,
      fetchInvoices: vi.fn(),
      fetchInvoiceDetails: vi.fn(),
    } as never);

    const result = await service.generateInvoices({
      billingPeriodStart: '2026-02-01',
      billingPeriodEnd: '2026-02-28',
      contractorIds: ['sub-1'],
      generatedBy: 'admin-1',
    });

    expect(fetchGenerationCandidates).toHaveBeenCalledTimes(1);
    expect(fetchExistingInvoiceCount).toHaveBeenCalledTimes(1);
    expect(insertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: 'INV-2026-0008',
        contractorId: 'sub-1',
        totalAmount: 275,
      }),
    );

    expect(insertInvoiceLineItems).toHaveBeenCalledTimes(1);
    const lineItemPayload = insertInvoiceLineItems.mock.calls[0]?.[1] as Array<{ itemType: string }>;
    expect(lineItemPayload).toHaveLength(2);
    expect(lineItemPayload.map((item) => item.itemType).sort()).toEqual(['EXPENSE_REPORT', 'TIME_ENTRY']);

    expect(linkTimeEntriesToInvoice).toHaveBeenCalledWith(['time-1'], 'inv-1');
    expect(linkExpenseReportsToInvoice).toHaveBeenCalledWith(['exp-1'], 'inv-1');
    expect(upsertTax1099Tracking).toHaveBeenCalledTimes(1);

    expect(result.invoice_count).toBe(1);
    expect(result.total_amount).toBe(275);
  });

  it('returns null tax tracking when offline', async () => {
    const service = createInvoiceGenerationService({
      isOnline: () => false,
      fetchTax1099Tracking: vi.fn(),
    } as never);

    const tracking = await service.getTax1099Tracking('sub-1', 2026);
    expect(tracking).toBeNull();
  });
});
