import { describe, expect, it } from 'vitest';

import {
  calculateMileageExpense,
  extractLargestCurrencyAmount,
  validateExpensePolicy,
} from './expenseProcessing';

describe('calculateMileageExpense', () => {
  it('calculates mileage totals and reimbursement amount', () => {
    const result = calculateMileageExpense({
      mileageStart: 45230,
      mileageEnd: 45267,
    });

    expect(result).toEqual({
      isValid: true,
      mileageTotal: 37,
      calculatedAmount: 24.24,
      mileageRate: 0.655,
    });
  });

  it('returns invalid for reversed odometer values', () => {
    const result = calculateMileageExpense({
      mileageStart: 150,
      mileageEnd: 120,
    });

    expect(result.isValid).toBe(false);
    expect(result.mileageTotal).toBe(0);
    expect(result.calculatedAmount).toBe(0);
  });
});

describe('extractLargestCurrencyAmount', () => {
  it('extracts the largest currency-like amount from OCR text', () => {
    const amount = extractLargestCurrencyAmount('Subtotal 18.20 Tax 1.80 Total $20.00');
    expect(amount).toBe(20);
  });

  it('returns null when no valid numeric amount exists', () => {
    expect(extractLargestCurrencyAmount('No totals found')).toBeNull();
  });
});

describe('validateExpensePolicy', () => {
  it('flags receipt threshold, pre-approval, and over-limit policies', () => {
    const result = validateExpensePolicy({
      category: 'LODGING',
      amount: 180,
      expenseDate: '2026-02-10',
      receiptProvided: false,
    });

    expect(result.flags).toEqual(
      expect.arrayContaining(['RECEIPT_REQUIRED', 'PRE_APPROVAL_REQUIRED', 'OVER_LIMIT']),
    );
    expect(result.requiresApproval).toBe(true);
    expect(result.approvalReason).toContain('Receipt is required');
  });

  it('flags duplicates and invalid future dates', () => {
    const result = validateExpensePolicy({
      category: 'FUEL',
      amount: 58.5,
      expenseDate: '2099-01-01',
      receiptProvided: true,
      description: 'Fuel purchase',
      existingItems: [
        {
          category: 'FUEL',
          amount: 58.5,
          expenseDate: '2099-01-01',
          description: 'Fuel purchase',
        },
      ],
    });

    expect(result.flags).toEqual(expect.arrayContaining(['INVALID_DATE', 'DUPLICATE_DETECTED']));
    expect(result.requiresApproval).toBe(true);
  });
});
