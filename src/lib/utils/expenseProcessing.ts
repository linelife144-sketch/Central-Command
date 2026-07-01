import { APP_CONFIG } from '../config/appConfig';
import type { ExpenseCategory, PolicyFlag } from '../../types';

export interface MileageCalculationInput {
  mileageStart?: number;
  mileageEnd?: number;
  mileageRate?: number;
}

export interface MileageCalculationResult {
  isValid: boolean;
  mileageTotal: number;
  calculatedAmount: number;
  mileageRate: number;
}

export interface ExpenseDuplicateCandidate {
  category: ExpenseCategory | string;
  amount: number;
  expenseDate: string;
  description?: string;
}

export interface ExpensePolicyValidationInput {
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  receiptProvided: boolean;
  description?: string;
  existingItems?: ExpenseDuplicateCandidate[];
  ocrText?: string;
}

export interface ExpensePolicyValidationResult {
  flags: PolicyFlag[];
  requiresApproval: boolean;
  approvalReason?: string;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeDescription(value?: string): string {
  if (!value) {
    return '';
  }

  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeDateKey(dateValue: string): string | null {
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function pushPolicyFlag(
  target: PolicyFlag[],
  reasons: string[],
  flag: PolicyFlag,
  reason: string,
): void {
  if (!target.includes(flag)) {
    target.push(flag);
  }

  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

export function calculateMileageExpense(input: MileageCalculationInput): MileageCalculationResult {
  const mileageRate =
    typeof input.mileageRate === 'number' && Number.isFinite(input.mileageRate) && input.mileageRate > 0
      ? input.mileageRate
      : APP_CONFIG.MILEAGE_RATE;

  if (
    typeof input.mileageStart !== 'number' ||
    typeof input.mileageEnd !== 'number' ||
    !Number.isFinite(input.mileageStart) ||
    !Number.isFinite(input.mileageEnd) ||
    input.mileageEnd < input.mileageStart
  ) {
    return {
      isValid: false,
      mileageTotal: 0,
      calculatedAmount: 0,
      mileageRate,
    };
  }

  const mileageTotal = round2(input.mileageEnd - input.mileageStart);

  return {
    isValid: true,
    mileageTotal,
    calculatedAmount: round2(mileageTotal * mileageRate),
    mileageRate,
  };
}

export function extractLargestCurrencyAmount(text?: string): number | null {
  if (!text) {
    return null;
  }

  const matches = Array.from(text.matchAll(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/g));
  if (matches.length === 0) {
    return null;
  }

  const amounts = matches
    .map((match) => Number(match[1].replace(/,/g, '')))
    .filter((value) => Number.isFinite(value));

  if (amounts.length === 0) {
    return null;
  }

  return round2(Math.max(...amounts));
}

function hasDuplicateExpense(
  input: ExpensePolicyValidationInput,
  normalizedDate: string,
): boolean {
  const inputDescription = normalizeDescription(input.description);

  return (input.existingItems ?? []).some((candidate) => {
    const candidateDate = normalizeDateKey(candidate.expenseDate);
    if (!candidateDate || candidateDate !== normalizedDate) {
      return false;
    }

    const sameCategory =
      typeof candidate.category === 'string' &&
      candidate.category.toUpperCase() === input.category;
    if (!sameCategory) {
      return false;
    }

    const candidateAmount = Number(candidate.amount);
    if (!Number.isFinite(candidateAmount) || Math.abs(candidateAmount - input.amount) > 0.01) {
      return false;
    }

    const candidateDescription = normalizeDescription(candidate.description);

    if (!candidateDescription || !inputDescription) {
      return true;
    }

    return candidateDescription === inputDescription;
  });
}

export function validateExpensePolicy(
  input: ExpensePolicyValidationInput,
): ExpensePolicyValidationResult {
  const flags: PolicyFlag[] = [];
  const reasons: string[] = [];
  const normalizedDate = normalizeDateKey(input.expenseDate);
  const now = new Date();

  if (!normalizedDate) {
    pushPolicyFlag(flags, reasons, 'INVALID_DATE', 'Expense date is invalid.');
  } else {
    const expenseDate = new Date(`${normalizedDate}T00:00:00.000Z`);
    if (expenseDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
      pushPolicyFlag(flags, reasons, 'INVALID_DATE', 'Expense date cannot be in the future.');
    }
  }

  if (input.amount >= APP_CONFIG.RECEIPT_REQUIRED_THRESHOLD && !input.receiptProvided) {
    pushPolicyFlag(
      flags,
      reasons,
      'RECEIPT_REQUIRED',
      `Receipt is required for expenses >= $${APP_CONFIG.RECEIPT_REQUIRED_THRESHOLD}.`,
    );
  }

  if (input.amount > APP_CONFIG.AUTO_APPROVE_THRESHOLD) {
    pushPolicyFlag(
      flags,
      reasons,
      'OVER_LIMIT',
      `Amount exceeds auto-approve threshold ($${APP_CONFIG.AUTO_APPROVE_THRESHOLD}).`,
    );
  }

  if (['LODGING', 'EQUIPMENT_RENTAL', 'MATERIALS'].includes(input.category)) {
    pushPolicyFlag(
      flags,
      reasons,
      'PRE_APPROVAL_REQUIRED',
      'Category requires pre-approval before reimbursement.',
    );
  }

  if (normalizedDate && hasDuplicateExpense(input, normalizedDate)) {
    pushPolicyFlag(
      flags,
      reasons,
      'DUPLICATE_DETECTED',
      'Potential duplicate expense detected for category/date/amount.',
    );
  }

  const ocrAmount = extractLargestCurrencyAmount(input.ocrText);
  if (ocrAmount !== null && input.amount - ocrAmount > 1) {
    pushPolicyFlag(
      flags,
      reasons,
      'OVER_LIMIT',
      'Claimed amount appears higher than OCR-detected receipt total.',
    );
  }

  return {
    flags,
    requiresApproval: flags.length > 0,
    approvalReason: reasons.length > 0 ? reasons.join(' ') : undefined,
  };
}
