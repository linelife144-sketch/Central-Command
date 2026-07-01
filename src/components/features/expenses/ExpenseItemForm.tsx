'use client';

import { APP_CONFIG, EXPENSE_CATEGORIES } from '@/lib/config/appConfig';
import { calculateMileageExpense } from '@/lib/utils/expenseProcessing';
import type { ExpenseCategory } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { ReceiptCapture } from './ReceiptCapture';

export interface ExpenseTicketOption {
  id: string;
  ticketNumber: string;
}

export interface ExpenseItemDraft {
  category: ExpenseCategory;
  description: string;
  amount: string;
  expenseDate: string;
  mileageStart: string;
  mileageEnd: string;
  fromLocation: string;
  toLocation: string;
  ticketId: string;
  billableToClient: boolean;
  receiptFile: File | null;
}

interface ExpenseItemFormProps {
  value: ExpenseItemDraft;
  onChange: (nextValue: ExpenseItemDraft) => void;
  ticketOptions: ExpenseTicketOption[];
  disabled?: boolean;
}

const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: EXPENSE_CATEGORIES.MILEAGE, label: 'Mileage' },
  { value: EXPENSE_CATEGORIES.FUEL, label: 'Fuel' },
  { value: EXPENSE_CATEGORIES.LODGING, label: 'Lodging' },
  { value: EXPENSE_CATEGORIES.MEALS, label: 'Meals' },
  { value: EXPENSE_CATEGORIES.TOLLS, label: 'Tolls' },
  { value: EXPENSE_CATEGORIES.PARKING, label: 'Parking' },
  { value: EXPENSE_CATEGORIES.MATERIALS, label: 'Materials' },
  { value: EXPENSE_CATEGORIES.EQUIPMENT_RENTAL, label: 'Equipment Rental' },
  { value: EXPENSE_CATEGORIES.OTHER, label: 'Other' },
];

function updateDraft<K extends keyof ExpenseItemDraft>(
  value: ExpenseItemDraft,
  onChange: (nextValue: ExpenseItemDraft) => void,
  key: K,
  nextValue: ExpenseItemDraft[K],
) {
  onChange({
    ...value,
    [key]: nextValue,
  });
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export function ExpenseItemForm({ value, onChange, ticketOptions, disabled = false }: ExpenseItemFormProps) {
  const isMileage = value.category === 'MILEAGE';
  const mileageSummary = calculateMileageExpense({
    mileageStart: parseOptionalNumber(value.mileageStart),
    mileageEnd: parseOptionalNumber(value.mileageEnd),
    mileageRate: APP_CONFIG.MILEAGE_RATE,
  });
  const amountInputValue =
    isMileage && mileageSummary.isValid && mileageSummary.calculatedAmount > 0
      ? mileageSummary.calculatedAmount.toFixed(2)
      : value.amount;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expense-category">Category</Label>
          <Select
            value={value.category}
            disabled={disabled}
            onValueChange={(nextValue) =>
              updateDraft(value, onChange, 'category', nextValue as ExpenseCategory)
            }
          >
            <SelectTrigger id="expense-category">
              <SelectValue placeholder="Select expense category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-date">Expense Date</Label>
          <Input
            id="expense-date"
            type="date"
            value={value.expenseDate}
            disabled={disabled}
            onChange={(event) => updateDraft(value, onChange, 'expenseDate', event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expense-description">Description</Label>
        <Textarea
          id="expense-description"
          placeholder="Describe the expense"
          value={value.description}
          disabled={disabled}
          onChange={(event) => updateDraft(value, onChange, 'description', event.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expense-amount">Amount (USD)</Label>
          <Input
            id="expense-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amountInputValue}
            disabled={disabled}
            readOnly={isMileage}
            onChange={(event) => updateDraft(value, onChange, 'amount', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-ticket">Related Ticket (optional)</Label>
          <Select
            value={value.ticketId || 'none'}
            disabled={disabled}
            onValueChange={(nextValue) => updateDraft(value, onChange, 'ticketId', nextValue === 'none' ? '' : nextValue)}
          >
            <SelectTrigger id="expense-ticket">
              <SelectValue placeholder="Select ticket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No related ticket</SelectItem>
              {ticketOptions.map((ticket) => (
                <SelectItem key={ticket.id} value={ticket.id}>
                  {ticket.ticketNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isMileage ? (
        <div className="grid gap-4 rounded-md border bg-slate-50 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mileage-start">Starting Odometer</Label>
            <Input
              id="mileage-start"
              type="number"
              min="0"
              step="0.1"
              value={value.mileageStart}
              disabled={disabled}
              onChange={(event) => updateDraft(value, onChange, 'mileageStart', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mileage-end">Ending Odometer</Label>
            <Input
              id="mileage-end"
              type="number"
              min="0"
              step="0.1"
              value={value.mileageEnd}
              disabled={disabled}
              onChange={(event) => updateDraft(value, onChange, 'mileageEnd', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from-location">From Location</Label>
            <Input
              id="from-location"
              value={value.fromLocation}
              disabled={disabled}
              onChange={(event) => updateDraft(value, onChange, 'fromLocation', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-location">To Location</Label>
            <Input
              id="to-location"
              value={value.toLocation}
              disabled={disabled}
              onChange={(event) => updateDraft(value, onChange, 'toLocation', event.target.value)}
            />
          </div>
          <div className="md:col-span-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            {mileageSummary.isValid && mileageSummary.calculatedAmount > 0 ? (
              <p>
                Total miles: <span className="font-semibold">{mileageSummary.mileageTotal.toFixed(2)}</span> at{' '}
                <span className="font-semibold">${mileageSummary.mileageRate.toFixed(3)}</span>/mile. Calculated amount:{' '}
                <span className="font-semibold">${mileageSummary.calculatedAmount.toFixed(2)}</span>.
              </p>
            ) : (
              <p>Enter starting and ending odometer values to auto-calculate mileage reimbursement.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Checkbox
          id="billable-to-client"
          checked={value.billableToClient}
          disabled={disabled}
          onCheckedChange={(checked) => updateDraft(value, onChange, 'billableToClient', checked === true)}
        />
        <Label htmlFor="billable-to-client">Billable to client</Label>
      </div>

      <ReceiptCapture
        value={value.receiptFile}
        disabled={disabled}
        onChange={(receiptFile) => updateDraft(value, onChange, 'receiptFile', receiptFile)}
      />
    </div>
  );
}
